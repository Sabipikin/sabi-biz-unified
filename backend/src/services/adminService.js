// backend/src/services/adminService.js

const { query } = require('../config/db');

class AdminService {
  async getDashboardOverview() {
    const users = await query('SELECT COUNT(*) AS total FROM users');
    const subscriptions = await query('SELECT COUNT(*) AS total, SUM(CASE WHEN status = $1 THEN 1 ELSE 0 END) AS active FROM subscriptions', ['active']);
    const messages = await query('SELECT COUNT(*) AS total FROM whatsapp_messages');
    const invoices = await query('SELECT COUNT(*) AS total FROM invoices');

    return {
      totalUsers: Number(users.rows[0].total),
      totalSubscriptions: Number(subscriptions.rows[0].total),
      activeSubscriptions: Number(subscriptions.rows[0].active),
      totalMessages: Number(messages.rows[0].total),
      totalInvoices: Number(invoices.rows[0].total),
    };
  }

  async getRevenueSummary() {
    const revenue = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total_revenue,
              COUNT(*) FILTER (WHERE status = 'paid') AS paid_invoices
       FROM invoices`
    );

    return {
      totalRevenue: Number(revenue.rows[0].total_revenue),
      paidInvoices: Number(revenue.rows[0].paid_invoices),
    };
  }

  async getSubscriptionsSummary() {
    const result = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active') AS active,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending,
         COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
         COUNT(*) AS total
       FROM subscriptions`
    );

    return {
      active: Number(result.rows[0].active),
      pending: Number(result.rows[0].pending),
      cancelled: Number(result.rows[0].cancelled),
      total: Number(result.rows[0].total),
    };
  }

  async listInvoices() {
    const result = await query(
      `SELECT id, user_id, customer_name, customer_phone, amount, currency, status, due_date, paid_date, created_at
       FROM invoices
       ORDER BY created_at DESC
       LIMIT 100`
    );
    return result.rows;
  }

  async getUsers() {
    const result = await query(
      `SELECT id, email, name, shop_name, subscription_plan, subscription_status, subscription_expires_at, status, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT 100`
    );
    return result.rows;
  }

  async getUserById(id) {
    const result = await query(
      `SELECT id, email, name, shop_name, subscription_plan, subscription_status, subscription_expires_at, status, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  }

  async suspendUser(id) {
    const result = await query(
      `UPDATE users SET status = 'suspended', updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, name, status`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  }

  /**
   * Activate a user. Options: { days } or { expires_at }
   * If days provided, set subscription_expires_at to NOW() + days
   * Also ensures `status` and `subscription_status` are active.
   */
  async activateUser(id, opts = {}) {
    let expiresAt = null;

    if (opts.expires_at) {
      expiresAt = new Date(opts.expires_at);
    } else if (opts.days && Number(opts.days) > 0) {
      const d = new Date();
      d.setDate(d.getDate() + Number(opts.days));
      expiresAt = d;
    }

    const result = await query(
      `UPDATE users
       SET status = 'active', subscription_status = 'active', subscription_expires_at = COALESCE($2, subscription_expires_at), updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, name, status, subscription_status, subscription_expires_at`,
      [id, expiresAt]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  }

  async listSubscriptions() {
    const result = await query(
      `SELECT id, user_id, plan, status, payment_method, created_at, updated_at
       FROM subscriptions
       ORDER BY created_at DESC
       LIMIT 100`
    );
    return result.rows;
  }

  async getSubscriptionById(id) {
    const result = await query(
      `SELECT id, user_id, plan, status, payment_method, created_at, updated_at
       FROM subscriptions
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('Subscription not found');
    }

    return result.rows[0];
  }
}

module.exports = new AdminService();
