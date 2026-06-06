const { query } = require('../config/db');

function normalizePhone(phone = '') {
  return String(phone || '').replace(/[^0-9+]/g, '').replace(/^\+/, '');
}

function compactRows(rows, mapper) {
  return rows.map(mapper).filter(Boolean);
}

class AiContextGenerator {
  async generate(userId, customerId, conversationId) {
    const [business, customer, purchaseHistory, recentInvoices, products, recentMessages] = await Promise.all([
      this.getBusiness(userId),
      this.getCustomer(userId, customerId),
      this.getPurchaseHistory(userId, customerId),
      this.getRecentInvoices(userId, customerId),
      this.getProductCatalog(userId),
      this.getRecentConversationMessages(userId, conversationId),
    ]);

    return {
      business_name: business?.shop_name || business?.name || 'Your business',
      business_type: business?.business_type || null,
      products,
      prices: products.map(product => ({
        product_name: product.product_name,
        unit_price: product.unit_price,
      })),
      available_inventory: products.map(product => ({
        product_name: product.product_name,
        quantity: product.quantity,
        available: Number(product.quantity || 0) > 0,
      })),
      customer_profile: customer,
      customer_history: purchaseHistory,
      recent_invoices: recentInvoices,
      recent_conversations: recentMessages,
    };
  }

  async getBusiness(userId) {
    const result = await query(
      `SELECT id, name, shop_name, business_type, ai_enabled, openai_api_key
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async getCustomer(userId, customerId) {
    if (!customerId) return null;
    const result = await query(
      `SELECT id, name, phone, email, created_at, updated_at
       FROM customers
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [customerId, userId]
    );
    return result.rows[0] || null;
  }

  async getCustomerByPhone(userId, phone) {
    const normalized = normalizePhone(phone);
    const result = await query(
      `SELECT id, name, phone, email, created_at, updated_at
       FROM customers
       WHERE user_id = $1 AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = $2
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId, normalized]
    );
    return result.rows[0] || null;
  }

  async getPurchaseHistory(userId, customerId) {
    if (!customerId) return [];
    const result = await query(
      `SELECT product_name, quantity, unit_price, total_amount, sale_date, created_at
       FROM sales
       WHERE user_id = $1 AND customer_id = $2
       ORDER BY sale_date DESC, created_at DESC
       LIMIT 10`,
      [userId, customerId]
    );
    return compactRows(result.rows, row => ({
      product_name: row.product_name,
      quantity: Number(row.quantity || 0),
      unit_price: Number(row.unit_price || 0),
      total_amount: Number(row.total_amount || 0),
      sale_date: row.sale_date,
    }));
  }

  async getRecentInvoices(userId, customerId) {
    const params = [userId];
    let customerFilter = '';
    if (customerId) {
      params.push(customerId);
      customerFilter = ` AND i.customer_id = $${params.length}`;
    }

    const result = await query(
      `SELECT i.id, i.customer_id, i.customer_name, i.customer_phone, i.amount,
              i.description, i.status, i.due_date, i.created_at
       FROM invoices i
       WHERE i.user_id = $1${customerFilter}
       ORDER BY i.created_at DESC
       LIMIT 10`,
      params
    );
    return compactRows(result.rows, row => ({
      id: row.id,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      amount: Number(row.amount || 0),
      description: row.description,
      status: row.status,
      due_date: row.due_date,
      created_at: row.created_at,
    }));
  }

  async getProductCatalog(userId) {
    const result = await query(
      `SELECT id, product_name, quantity, unit_price, cost_price, reorder_level, supplier
       FROM inventory
       WHERE user_id = $1
       ORDER BY product_name ASC
       LIMIT 100`,
      [userId]
    );
    return compactRows(result.rows, row => ({
      id: row.id,
      product_name: row.product_name,
      quantity: Number(row.quantity || 0),
      unit_price: Number(row.unit_price || 0),
      cost_price: Number(row.cost_price || 0),
      reorder_level: Number(row.reorder_level || 0),
      supplier: row.supplier,
    }));
  }

  async getRecentConversationMessages(userId, conversationId) {
    if (!conversationId) return [];
    const result = await query(
      `SELECT direction, sender_type, message_text, created_at
       FROM conversation_messages
       WHERE user_id = $1 AND conversation_id = $2
       ORDER BY created_at DESC
       LIMIT 12`,
      [userId, conversationId]
    );
    return result.rows.reverse().map(row => ({
      direction: row.direction,
      sender_type: row.sender_type,
      message_text: row.message_text,
      created_at: row.created_at,
    }));
  }
}

module.exports = new AiContextGenerator();
