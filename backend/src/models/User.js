// backend/src/models/User.js
// User model and database helpers

const { query } = require('../config/db');

class User {
  /**
   * Find user by ID
   */
  static async findById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    return result.rows[0] || null;
  }

  /**
   * Create user
   */
  static async create(data) {
    const { id, name, email, phone, passwordHash } = data;
    const result = await query(
      `INSERT INTO users (id, name, email, phone, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [id, name, email, phone, passwordHash]
    );
    return result.rows[0];
  }

  /**
   * Update user
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(data)) {
      updates.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }

    values.push(id);
    updates.push('updated_at = NOW()');

    const query_str = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await query(query_str, values);
    return result.rows[0];
  }

  /**
   * Get all users (admin)
   */
  static async getAll(limit = 50, offset = 0) {
    const result = await query(
      `SELECT id, name, email, phone, shop_name, subscription_plan, 
              subscription_status, status, created_at, last_login_at
       FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  /**
   * Count total users
   */
  static async count() {
    const result = await query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count, 10);
  }
}

module.exports = User;
