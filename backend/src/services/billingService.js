const { query } = require('../config/db');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');
const { getPaymentProvider } = require('./paymentProviders');

const metricMap = {
  conversations: 'monthly_conversation_limit',
  users: 'max_users',
  whatsapp_numbers: 'max_whatsapp_numbers',
  ai_assistants: 'max_ai_assistants',
};

function getPeriod(date = new Date()) {
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

function addPeriod(start, billingCycle) {
  const end = new Date(start);
  if (billingCycle === 'yearly') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

function planPrice(plan, billingCycle) {
  if (billingCycle === 'yearly') return Number(plan.yearly_price || 0);
  return Number(plan.monthly_price || 0);
}

function invoiceNumber() {
  return `SABI-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

class BillingService {
  async listPlans() {
    const result = await query(
      `SELECT *
       FROM subscription_plans
       WHERE active = true
       ORDER BY COALESCE(monthly_price, 999999999), name`
    );
    return result.rows;
  }

  async getPlanBySlug(slug) {
    const result = await query(
      `SELECT * FROM subscription_plans WHERE slug = $1 AND active = true LIMIT 1`,
      [slug]
    );
    return result.rows[0] || null;
  }

  async getUser(userId) {
    const result = await query(
      `SELECT id, email, name, subscription_plan, subscription_status, subscription_expires_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async ensureTrialSubscription(userId) {
    const existing = await this.getCurrentSubscription(userId, false);
    if (existing) return existing;

    const trialPlan = await this.getPlanBySlug('trial');
    if (!trialPlan) return null;

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 14);

    const result = await query(
      `INSERT INTO organization_subscriptions (
         organization_id, plan_id, status, billing_cycle, trial_start, trial_end,
         current_period_start, current_period_end, next_billing_date, payment_provider,
         created_at, updated_at
       )
       VALUES ($1, $2, 'trialing', 'monthly', $3, $4, $3, $4, $4, 'paystack', NOW(), NOW())
       RETURNING *`,
      [userId, trialPlan.id, now, trialEnd]
    );

    await query(
      `UPDATE users
       SET subscription_plan = 'trial',
           subscription_status = 'trialing',
           subscription_expires_at = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [trialEnd, userId]
    );

    return { ...result.rows[0], plan: trialPlan };
  }

  async getCurrentSubscription(userId, createTrial = true) {
    const result = await query(
      `SELECT os.*, sp.name AS plan_name, sp.slug AS plan_slug, sp.description,
              sp.monthly_price, sp.yearly_price, sp.max_users, sp.max_whatsapp_numbers,
              sp.max_ai_assistants, sp.monthly_conversation_limit, sp.feature_flags
       FROM organization_subscriptions os
       JOIN subscription_plans sp ON sp.id = os.plan_id
       WHERE os.organization_id = $1
       ORDER BY os.created_at DESC
       LIMIT 1`,
      [userId]
    );

    const subscription = result.rows[0] || null;
    if (!subscription && createTrial) {
      return this.ensureTrialSubscription(userId);
    }
    return subscription;
  }

  async getCurrentPlan(userId) {
    const [subscription, plans, usage] = await Promise.all([
      this.getCurrentSubscription(userId),
      this.listPlans(),
      this.getUsage(userId),
    ]);

    return {
      subscription,
      plans,
      usage,
    };
  }

  async recalculateUsage(userId) {
    const period = getPeriod();
    const [conversationUsage, whatsappUsage] = await Promise.all([
      query(
        `SELECT COUNT(*) AS total
         FROM conversation_messages
         WHERE user_id = $1
           AND ai_generated = true
           AND EXTRACT(MONTH FROM created_at) = $2
           AND EXTRACT(YEAR FROM created_at) = $3`,
        [userId, period.month, period.year]
      ),
      query(
        `SELECT COUNT(*) AS total
         FROM whatsapp_accounts
         WHERE user_id = $1 AND status = 'connected'`,
        [userId]
      ),
    ]);

    const metrics = [
      ['conversations', Number(conversationUsage.rows[0]?.total || 0)],
      ['users', 1],
      ['whatsapp_numbers', Number(whatsappUsage.rows[0]?.total || 0)],
      ['ai_assistants', 1],
    ];

    for (const [type, value] of metrics) {
      await this.setUsageMetric(userId, type, value, period);
    }
  }

  async setUsageMetric(userId, metricType, value, period = getPeriod()) {
    const result = await query(
      `INSERT INTO usage_metrics (
         organization_id, metric_type, metric_value, period_month, period_year, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (organization_id, metric_type, period_month, period_year)
       DO UPDATE SET metric_value = EXCLUDED.metric_value, updated_at = NOW()
       RETURNING *`,
      [userId, metricType, value, period.month, period.year]
    );
    return result.rows[0];
  }

  async incrementUsage(userId, metricType, increment = 1) {
    const period = getPeriod();
    const result = await query(
      `INSERT INTO usage_metrics (
         organization_id, metric_type, metric_value, period_month, period_year, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (organization_id, metric_type, period_month, period_year)
       DO UPDATE SET metric_value = usage_metrics.metric_value + EXCLUDED.metric_value, updated_at = NOW()
       RETURNING *`,
      [userId, metricType, increment, period.month, period.year]
    );
    await this.maybeCreateUsageNotification(userId, metricType, Number(result.rows[0]?.metric_value || 0)).catch(err => {
      logger.warn('Failed to create usage notification', { error: err.message, userId, metricType });
    });
    return result.rows[0];
  }

  async maybeCreateUsageNotification(userId, metricType, used) {
    const subscription = await this.getCurrentSubscription(userId);
    const limitColumn = metricMap[metricType];
    const limit = subscription?.[limitColumn];
    if (!limit || Number(limit) <= 0) return null;

    const percent = (used / Number(limit)) * 100;
    const threshold = percent >= 100 ? '100' : percent >= 95 ? '95' : percent >= 80 ? '80' : null;
    if (!threshold) return null;

    const type = `usage_${metricType}_${threshold}`;
    const existing = await query(
      `SELECT id
       FROM billing_notifications
       WHERE organization_id = $1
         AND notification_type = $2
         AND EXTRACT(MONTH FROM created_at) = $3
         AND EXTRACT(YEAR FROM created_at) = $4
       LIMIT 1`,
      [userId, type, getPeriod().month, getPeriod().year]
    );
    if (existing.rows[0]) return existing.rows[0];

    const result = await query(
      `INSERT INTO billing_notifications (
         organization_id, notification_type, channel, title, message, created_at
       )
       VALUES ($1, $2, 'in_app', $3, $4, NOW())
       RETURNING *`,
      [
        userId,
        type,
        `Usage reached ${threshold}%`,
        `${metricType.replace(/_/g, ' ')} usage is at ${used.toLocaleString()} of ${Number(limit).toLocaleString()}.`,
      ]
    );
    return result.rows[0];
  }

  async getUsage(userId) {
    await this.recalculateUsage(userId);
    const subscription = await this.getCurrentSubscription(userId);
    const period = getPeriod();
    const result = await query(
      `SELECT metric_type, metric_value
       FROM usage_metrics
       WHERE organization_id = $1 AND period_month = $2 AND period_year = $3`,
      [userId, period.month, period.year]
    );

    const usage = {};
    for (const [metric, limitColumn] of Object.entries(metricMap)) {
      const row = result.rows.find(item => item.metric_type === metric);
      usage[metric] = {
        used: Number(row?.metric_value || 0),
        limit: subscription ? subscription[limitColumn] : null,
      };
    }
    return usage;
  }

  async createPendingPlanChange(userId, { planSlug, billingCycle = 'monthly', paymentProvider = 'paystack', action = 'upgrade' }) {
    const plan = await this.getPlanBySlug(planSlug);
    if (!plan) {
      throw new Error('Plan not found');
    }
    if (plan.slug === 'enterprise') {
      throw new Error('Enterprise plan requires a custom sales contact');
    }

    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const amount = planPrice(plan, billingCycle);
    const provider = getPaymentProvider(paymentProvider);
    const payment = await provider.createSubscription({
      user,
      plan,
      billingCycle,
      amount,
      metadata: { action },
    });

    const now = new Date();
    const periodEnd = addPeriod(now, billingCycle);
    const subResult = await query(
      `INSERT INTO organization_subscriptions (
         organization_id, plan_id, status, billing_cycle, current_period_start,
         current_period_end, next_billing_date, auto_renew, payment_provider,
         provider_reference, created_at, updated_at
       )
       VALUES ($1, $2, 'suspended', $3, $4, $5, $5, true, $6, $7, NOW(), NOW())
       RETURNING *`,
      [userId, plan.id, billingCycle, now, periodEnd, paymentProvider, payment.reference]
    );

    const invoice = await this.createInvoice({
      organizationId: userId,
      subscriptionId: subResult.rows[0].id,
      amount,
      status: 'pending',
      provider: paymentProvider,
      providerReference: payment.reference,
    });

    return {
      authorization_url: payment.authorization_url,
      reference: payment.reference,
      access_code: payment.access_code,
      subscription: subResult.rows[0],
      invoice,
    };
  }

  async createInvoice({ organizationId, subscriptionId, amount, status, provider = 'paystack', providerReference = null }) {
    const result = await query(
      `INSERT INTO billing_invoices (
         id, organization_id, subscription_id, amount, currency, status,
         invoice_number, provider, provider_reference, paid_at, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, 'NGN', $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [
        uuidv4(),
        organizationId,
        subscriptionId,
        amount,
        status,
        invoiceNumber(),
        provider,
        providerReference,
        status === 'paid' ? new Date() : null,
      ]
    );
    return result.rows[0];
  }

  async listInvoices(userId) {
    const result = await query(
      `SELECT *
       FROM billing_invoices
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );
    return result.rows;
  }

  async listNotifications(userId) {
    const result = await query(
      `SELECT *
       FROM billing_notifications
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    return result.rows;
  }

  async cancel(userId) {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) return null;

    const provider = getPaymentProvider(subscription.payment_provider);
    await provider.cancelSubscription({ subscription });

    const result = await query(
      `UPDATE organization_subscriptions
       SET status = 'cancelled', auto_renew = false, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [subscription.id, userId]
    );

    await query(
      `UPDATE users
       SET subscription_status = 'cancelled', updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  async reactivate(userId) {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) return null;

    const status = subscription.current_period_end && new Date(subscription.current_period_end) < new Date()
      ? 'expired'
      : 'active';

    const result = await query(
      `UPDATE organization_subscriptions
       SET status = $1, auto_renew = true, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [status, subscription.id, userId]
    );

    await query(
      `UPDATE users
       SET subscription_status = $1, updated_at = NOW()
       WHERE id = $2`,
      [status, userId]
    );

    return result.rows[0] || null;
  }

  async handleProviderPaymentSuccess(data) {
    const reference = data.reference;
    if (!reference) return null;

    const subResult = await query(
      `SELECT os.*, sp.slug AS plan_slug
       FROM organization_subscriptions os
       JOIN subscription_plans sp ON sp.id = os.plan_id
       WHERE os.provider_reference = $1
       LIMIT 1`,
      [reference]
    );
    const subscription = subResult.rows[0] || null;
    if (!subscription) {
      logger.warn(`Billing payment success for unknown reference ${reference}`);
      return null;
    }

    const now = new Date();
    const periodEnd = addPeriod(now, subscription.billing_cycle);
    const updateResult = await query(
      `UPDATE organization_subscriptions
       SET status = 'active',
           provider_subscription_id = COALESCE($1, provider_subscription_id),
           current_period_start = $2,
           current_period_end = $3,
           next_billing_date = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [data.subscription || null, now, periodEnd, subscription.id]
    );

    await query(
      `UPDATE billing_invoices
       SET status = 'paid',
           paid_at = NOW(),
           amount = COALESCE($1, amount),
           currency = COALESCE($2, currency),
           updated_at = NOW()
       WHERE provider_reference = $3`,
      [
        data.amount ? Number(data.amount) / 100 : null,
        data.currency || 'NGN',
        reference,
      ]
    );

    await query(
      `UPDATE users
       SET subscription_plan = $1,
           subscription_status = 'active',
           subscription_expires_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [subscription.plan_slug, periodEnd, subscription.organization_id]
    );

    return updateResult.rows[0];
  }

  async getAdminAnalytics() {
    const [revenue, subs, byPlan] = await Promise.all([
      query(`SELECT COALESCE(SUM(amount), 0) AS total_revenue FROM billing_invoices WHERE status = 'paid'`),
      query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'active') AS active_subscriptions,
           COUNT(*) FILTER (WHERE status = 'trialing') AS trial_accounts,
           COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
           COUNT(*) AS total
         FROM organization_subscriptions`
      ),
      query(
        `SELECT sp.slug, sp.name, COUNT(os.id) AS subscriptions, COALESCE(SUM(bi.amount) FILTER (WHERE bi.status = 'paid'), 0) AS revenue
         FROM subscription_plans sp
         LEFT JOIN organization_subscriptions os ON os.plan_id = sp.id
         LEFT JOIN billing_invoices bi ON bi.subscription_id = os.id
         GROUP BY sp.slug, sp.name
         ORDER BY revenue DESC`
      ),
    ]);

    const active = Number(subs.rows[0]?.active_subscriptions || 0);
    const total = Number(subs.rows[0]?.total || 0);
    const cancelled = Number(subs.rows[0]?.cancelled || 0);
    const trial = Number(subs.rows[0]?.trial_accounts || 0);

    return {
      total_revenue: Number(revenue.rows[0]?.total_revenue || 0),
      mrr: Number(revenue.rows[0]?.total_revenue || 0),
      active_subscriptions: active,
      trial_accounts: trial,
      churn_rate: total ? Number(((cancelled / total) * 100).toFixed(2)) : 0,
      conversion_rate: total ? Number(((active / total) * 100).toFixed(2)) : 0,
      revenue_by_plan: byPlan.rows,
    };
  }
}

module.exports = new BillingService();
