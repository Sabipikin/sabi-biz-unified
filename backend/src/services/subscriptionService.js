// backend/src/services/subscriptionService.js

const { query } = require('../config/db');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

class SubscriptionService {
  async listSubscriptions(userId) {
    const result = await query(
      `SELECT id, plan, status, payment_method, started_at, expires_at, created_at
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async createSubscription(userId, plan, paymentMethod) {
    if (!plan) {
      throw new Error('Plan is required');
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const result = await query(
      `INSERT INTO subscriptions (id, user_id, plan, status, payment_method, started_at, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [uuidv4(), userId, plan, 'active', paymentMethod || 'manual', startedAt, expiresAt, startedAt]
    );

    logger.info(`Created subscription for user ${userId} plan ${plan}`);
    return result.rows[0];
  }

  async createPaystackPendingSubscription(userId, plan, amount, paystackReference) {
    const createdAt = new Date();
    const result = await query(
      `INSERT INTO subscriptions (
         id, user_id, plan, status, payment_method, paystack_reference, amount, currency, billing_cycle,
         next_billing_date, last_payment_date, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        uuidv4(),
        userId,
        plan,
        'pending',
        'paystack',
        paystackReference,
        amount,
        'NGN',
        'monthly',
        null,
        null,
        createdAt,
        createdAt,
      ]
    );

    logger.info(`Created paystack pending subscription ${paystackReference} for user ${userId}`);
    return result.rows[0];
  }

  async getSubscriptionByPaystackReference(reference) {
    const result = await query(
      `SELECT * FROM subscriptions WHERE paystack_reference = $1 LIMIT 1`,
      [reference]
    );
    return result.rows[0];
  }

  async handlePaystackChargeSuccess(data) {
    const reference = data.reference;
    const subscription = await this.getSubscriptionByPaystackReference(reference);
    if (!subscription) {
      logger.warn(`Paystack webhook charge.success received for unknown reference ${reference}`);
      return null;
    }

    if (subscription.status === 'active') {
      logger.info(`Paystack subscription ${reference} is already active`);
      return subscription;
    }

    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const updateResult = await query(
      `UPDATE subscriptions
       SET status = $1,
           paystack_subscription_id = $2,
           last_payment_date = $3,
           next_billing_date = $4,
           amount = $5,
           currency = $6,
           updated_at = $7
       WHERE id = $8
       RETURNING *`,
      [
        'active',
        data.subscription || null,
        now,
        nextBillingDate,
        Number(data.amount) / 100,
        data.currency || 'NGN',
        now,
        subscription.id,
      ]
    );

    await query(
      `UPDATE users
       SET subscription_plan = $1,
           subscription_status = $2,
           subscription_expires_at = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [subscription.plan, 'active', nextBillingDate, subscription.user_id]
    );

    const userResult = await query(
      `SELECT name, phone FROM users WHERE id = $1 LIMIT 1`,
      [subscription.user_id]
    );

    const user = userResult.rows[0] || {};
    await query(
      `INSERT INTO invoices (
         id, user_id, customer_name, customer_phone, amount, description, status, due_date, paid_date, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        uuidv4(),
        subscription.user_id,
        user.name || 'Customer',
        user.phone || null,
        Number(data.amount) / 100,
        `Paystack subscription payment for ${subscription.plan}`,
        'paid',
        now,
        now,
        now,
        now,
      ]
    );

    logger.info(`Activated Paystack subscription ${reference} for user ${subscription.user_id}`);
    return updateResult.rows[0];
  }
}

module.exports = new SubscriptionService();
