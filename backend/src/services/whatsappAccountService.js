const { query } = require('../config/db');

const allowedStatuses = new Set(['pending', 'connected', 'disconnected', 'suspended']);

function normalizeStatus(status) {
  return allowedStatuses.has(status) ? status : 'pending';
}

function eventFor(status, note = null) {
  return {
    status,
    note,
    at: new Date().toISOString(),
  };
}

class WhatsAppAccountService {
  async list(userId) {
    const result = await query(
      `SELECT id, user_id, business_id, waba_id, phone_number_id, display_phone_number,
              status, connected_at, connection_history, created_at, updated_at
       FROM whatsapp_accounts
       WHERE user_id = $1
       ORDER BY updated_at DESC, created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async create(userId, data = {}) {
    const status = normalizeStatus(data.status);
    const result = await query(
      `INSERT INTO whatsapp_accounts (
         user_id, business_id, waba_id, phone_number_id, display_phone_number,
         status, access_token, connection_history, connected_at, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, NOW(), NOW())
       RETURNING id, user_id, business_id, waba_id, phone_number_id, display_phone_number,
                 status, connected_at, connection_history, created_at, updated_at`,
      [
        userId,
        data.business_id || userId,
        data.waba_id || null,
        data.phone_number_id || null,
        data.display_phone_number || null,
        status,
        data.access_token || null,
        JSON.stringify([eventFor(status, 'Account record created')]),
        status === 'connected' ? new Date() : null,
      ]
    );
    return result.rows[0];
  }

  async update(userId, id, data = {}) {
    const status = data.status ? normalizeStatus(data.status) : null;
    const result = await query(
      `UPDATE whatsapp_accounts
       SET business_id = COALESCE($1, business_id),
           waba_id = COALESCE($2, waba_id),
           phone_number_id = COALESCE($3, phone_number_id),
           display_phone_number = COALESCE($4, display_phone_number),
           status = COALESCE($5, status),
           access_token = COALESCE($6, access_token),
           connected_at = CASE
             WHEN $5 = 'connected' AND connected_at IS NULL THEN NOW()
             WHEN $5 IN ('pending', 'disconnected', 'suspended') THEN NULL
             ELSE connected_at
           END,
           connection_history = CASE
             WHEN $5 IS NULL THEN connection_history
             ELSE connection_history || $7::jsonb
           END,
           updated_at = NOW()
       WHERE id = $8 AND user_id = $9
       RETURNING id, user_id, business_id, waba_id, phone_number_id, display_phone_number,
                 status, connected_at, connection_history, created_at, updated_at`,
      [
        data.business_id || null,
        data.waba_id || null,
        data.phone_number_id || null,
        data.display_phone_number || null,
        status,
        data.access_token || null,
        JSON.stringify([eventFor(status, data.note || 'Status updated')]),
        id,
        userId,
      ]
    );
    return result.rows[0] || null;
  }

  async remove(userId, id) {
    const result = await query(
      `DELETE FROM whatsapp_accounts
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    );
    return result.rows[0] || null;
  }

  async findConnectedForUser(userId) {
    const result = await query(
      `SELECT *
       FROM whatsapp_accounts
       WHERE user_id = $1 AND status = 'connected' AND access_token IS NOT NULL AND phone_number_id IS NOT NULL
       ORDER BY connected_at DESC NULLS LAST, updated_at DESC
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new WhatsAppAccountService();
