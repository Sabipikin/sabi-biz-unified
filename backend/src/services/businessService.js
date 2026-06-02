// backend/src/services/businessService.js

const { query, getClient } = require('../config/db');
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
      `SELECT id, product_name, quantity, unit_price, cost_price, reorder_level, supplier, created_at
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
         user_id, product_name, quantity, unit_price, cost_price, reorder_level, supplier, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, product_name, quantity, unit_price, cost_price, reorder_level, supplier, created_at`,
      [
        userId,
        item.product_name,
        Number(item.quantity || 0),
        item.unit_price || 0,
        item.cost_price || 0,
        item.reorder_level || 10,
        item.supplier || null,
      ]
    );
    return result.rows[0];
  }

  async getSales(userId) {
    logger.debug(`Fetching sales for user ${userId}`);
    const result = await query(
      `SELECT id, inventory_id, product_name, unit, quantity, unit_price, cost_price, total_amount, profit, sale_date, sale_time, created_at
       FROM sales
       WHERE user_id = $1
       ORDER BY sale_date DESC, created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async createSale(userId, sale) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const quantity = Number(sale.quantity || 0);
      const saleDate = sale.sale_date || new Date().toISOString().slice(0, 10);
      let inventoryId = sale.inventory_id || null;
      let productName = sale.product_name || '';
      let unitPrice = Number(sale.unit_price || 0);
      let costPrice = Number(sale.cost_price || 0);
      const totalAmount = Number(sale.total_amount || unitPrice * quantity);
      const profit = Number((unitPrice - costPrice) * quantity);

      if (inventoryId) {
        const productResult = await client.query(
          `SELECT id, product_name, quantity, unit_price, cost_price
           FROM inventory
           WHERE id = $1 AND user_id = $2`,
          [inventoryId, userId]
        );

        if (!productResult.rows.length) {
          throw new Error('Product not found');
        }

        const product = productResult.rows[0];
        productName = productName || product.product_name;
        unitPrice = Number(unitPrice || product.unit_price || 0);
        costPrice = Number(costPrice || product.cost_price || 0);

        const updatedQuantity = Math.max(0, Number(product.quantity || 0) - quantity);
        await client.query(
          `UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2`,
          [updatedQuantity, inventoryId]
        );
      }

      const result = await client.query(
        `INSERT INTO sales (
           user_id, inventory_id, product_name, unit, quantity, sale_date, sale_time, unit_price, cost_price, total_amount, profit, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, NOW(), NOW())
         RETURNING id, inventory_id, product_name, unit, quantity, sale_date, sale_time, unit_price, cost_price, total_amount, profit, created_at`,
        [
          userId,
          inventoryId,
          productName,
          sale.unit || null,
          quantity,
          saleDate,
          unitPrice,
          costPrice,
          totalAmount,
          profit,
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getSalesAnalytics(userId) {
    logger.debug(`Calculating sales analytics for user ${userId}`);
    const result = await query(
      `SELECT product_name, quantity, unit_price, cost_price, total_amount, profit, sale_date, sale_time
       FROM sales
       WHERE user_id = $1`,
      [userId]
    );

    const sales = result.rows;
    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
    const totalProfit = sales.reduce((sum, sale) => sum + Number(sale.profit || 0), 0);
    const totalLoss = sales.reduce((sum, sale) => sum + (Number(sale.profit || 0) < 0 ? Number(sale.profit || 0) : 0), 0);
    const avgMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    const productTotals = sales.reduce((acc, sale) => {
      const key = sale.product_name || 'Unknown';
      acc[key] = (acc[key] || 0) + Number(sale.quantity || 0);
      return acc;
    }, {});
    const topProduct = Object.keys(productTotals).reduce((best, product) => {
      return productTotals[product] > (productTotals[best] || 0) ? product : best;
    }, '');

    const hourTotals = sales.reduce((acc, sale) => {
      const timestamp = new Date(sale.sale_time || sale.sale_date || new Date());
      const hour = timestamp.getHours();
      acc[hour] = (acc[hour] || 0) + Number(sale.total_amount || 0);
      return acc;
    }, {});
    const highestHour = Object.keys(hourTotals).reduce((best, hour) => {
      return hourTotals[hour] > (hourTotals[best] || 0) ? hour : best;
    }, null);
    const highestSaleTime = highestHour != null ? `${highestHour}:00` : null;

    return {
      total_sales: totalSales,
      total_profit: totalProfit,
      total_loss: totalLoss,
      avg_margin: Number(avgMargin.toFixed(2)),
      top_product: topProduct || null,
      highest_sale_time: highestSaleTime,
    };
  }
}

module.exports = new BusinessService();
