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

  async createInvoice(userId, invoice) {
    const result = await query(
      `INSERT INTO invoices (
         user_id, customer_name, customer_phone, amount, description, status, due_date, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, customer_name, customer_phone, amount, description, status, due_date, paid_date, created_at`,
      [
        userId,
        invoice.customer_name,
        invoice.customer_phone || null,
        invoice.amount,
        invoice.description || null,
        invoice.status || 'draft',
        invoice.due_date || null,
      ]
    );
    return result.rows[0];
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

  async createInventoryItem(userId, item) {
    const result = await query(
      `INSERT INTO inventory (
         user_id, product_name, quantity, unit_price, reorder_level, supplier, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, product_name, quantity, unit_price, reorder_level, supplier, created_at`,
      [
        userId,
        item.product_name,
        Number(item.quantity || 0),
        item.unit_price || 0,
        item.reorder_level || 10,
        item.supplier || null,
      ]
    );
    return result.rows[0];
  }
}

module.exports = new BusinessService();
