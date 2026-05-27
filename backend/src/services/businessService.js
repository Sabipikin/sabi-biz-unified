// backend/src/services/businessService.js

const { query } = require('../config/db');
const logger = require('../config/logger');

class BusinessService {
  async getInvoices(userId) {
    logger.debug(`Fetching invoices for user ${userId}`);
    const result = await query(
      `SELECT id, customer_name, customer_phone, amount, description, status, due_date, paid_date, created_at
       FROM invoices
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async getInventory(userId) {
    logger.debug(`Fetching inventory for user ${userId}`);
    const result = await query(
      `SELECT id, product_name, quantity, unit_price, reorder_level, supplier, created_at
       FROM inventory
       WHERE user_id = $1
       ORDER BY product_name ASC`,
      [userId]
    );
    return result.rows;
  }
}

module.exports = new BusinessService();
