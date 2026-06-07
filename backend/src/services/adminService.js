// backend/src/services/adminService.js

const { query } = require('../config/db');
const logger = require('../config/logger');
const { ValidationError } = require('../utils/errors');
const { v4: uuidv4 } = require('uuid');

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

  async updateUser(id, updates = {}, actorId = null) {
    const allowed = ['name', 'email', 'phone', 'shop_name', 'subscription_plan', 'subscription_status', 'status', 'subscription_expires_at'];
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(updates[key]);
        idx += 1;
      }
    }

    // Validation
    if (updates.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(updates.email)) {
      throw new ValidationError('Invalid email address');
    }

    if (updates.status && !['active', 'suspended', 'deleted'].includes(updates.status)) {
      throw new ValidationError('Invalid status');
    }

    if (updates.subscription_expires_at) {
      const d = new Date(updates.subscription_expires_at);
      if (Number.isNaN(d.getTime())) throw new ValidationError('Invalid subscription_expires_at date');
    }

    if (!fields.length) {
      // nothing to update
      return this.getUserById(id);
    }

    const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, email, name, shop_name, subscription_plan, subscription_status, subscription_expires_at, status`;
    values.push(id);

    const result = await query(sql, values);
    if (result.rows.length === 0) throw new Error('User not found');
    const updated = result.rows[0];

    // Record admin audit (best effort)
    try {
      await this.recordAdminAudit(actorId, 'update_user', id, { updates: Object.keys(updates) });
    } catch (e) {
      logger.warn('Failed to record admin audit for updateUser', { error: e.message });
    }

    return result.rows[0];
  }

  async deleteUser(id, actorId = null) {
    // Soft-delete: mark status = 'deleted' and clear sensitive fields
    const result = await query(
      `UPDATE users SET status = 'deleted', email = NULL, name = NULL, phone = NULL, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) throw new Error('User not found');
    // Optionally remove subscriptions
    await query('DELETE FROM subscriptions WHERE user_id = $1', [id]);
    const out = { id: result.rows[0].id, deleted: true };
    try {
      await this.recordAdminAudit(actorId, 'delete_user', id, { deleted: true });
    } catch (e) {
      logger.warn('Failed to record admin audit for deleteUser', { error: e.message });
    }
    return out;
  }

  async recordAdminAudit(actorId, action, targetUserId = null, details = {}) {
    // best-effort insert into admin_audit table; if table doesn't exist, just log
    try {
      const id = uuidv4();
      await query(
        `INSERT INTO admin_audit (id, actor_id, action, target_user_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [id, actorId, action, targetUserId, JSON.stringify(details)]
      );
    } catch (err) {
      // if admin_audit table doesn't exist or insert fails, fall back to logger
      logger.info('[admin_audit] %s by %s on %s -- %o', action, actorId || 'system', targetUserId || '-', details);
    }
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

  async suspendUserWithAudit(id, actorId = null) {
    const user = await this.suspendUser(id);
    try {
      await this.recordAdminAudit(actorId, 'suspend_user', id, { status: user.status });
    } catch (e) {
      logger.warn('Failed to record admin audit for suspendUser', { error: e.message });
    }
    return user;
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

      const user = result.rows[0];
      return user;
  }

    async activateUserWithAudit(id, expiresAt = null, actorId = null) {
      const user = await this.activateUser(id, expiresAt);
      try {
        await this.recordAdminAudit(actorId, 'activate_user', id, { expiresAt: user.subscription_expires_at });
      } catch (e) {
        logger.warn('Failed to record admin audit for activateUser', { error: e.message });
      }
      return user;
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
