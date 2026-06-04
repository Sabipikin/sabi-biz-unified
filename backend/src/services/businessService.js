// backend/src/services/businessService.js

const { query, getClient } = require('../config/db');
const logger = require('../config/logger');
const whatsappService = require('./whatsappService');

function parseBool(value) {
  return value === true || value === 'true' || value === 'on' || value === 1 || value === '1';
}

function round(value) {
  return Number(Number(value || 0).toFixed(2));
}

const invoiceSchemaCache = new Set();
async function invoiceHasColumn(column) {
  if (invoiceSchemaCache.has(column)) {
    return true;
  }

  const schemaResult = await query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'invoices' AND column_name = $1
     LIMIT 1`,
    [column]
  );

  const hasColumn = schemaResult.rows.length > 0;
  if (hasColumn) {
    invoiceSchemaCache.add(column);
  }
  return hasColumn;
}

class BusinessService {
  async getCustomers(userId) {
    logger.debug(`Fetching customers for user ${userId}`);
    const result = await query(
      `SELECT c.id, c.name, c.phone, c.email, c.city, c.region, c.delivery_address,
              c.birthday, c.anniversary, c.auto_birthday, c.auto_anniversary,
              c.created_at, c.updated_at,
              COALESCE((SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id AND i.user_id = $1), 0) AS invoice_count,
              COALESCE((SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id AND i.user_id = $1 AND i.status = 'paid'), 0) AS paid_invoices,
              COALESCE((SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id AND i.user_id = $1 AND i.status != 'paid'), 0) AS pending_invoices,
              COALESCE((SELECT SUM(amount) FROM invoices i WHERE i.customer_id = c.id AND i.user_id = $1), 0) AS total_spent,
              COALESCE((SELECT SUM(ii.total_price - ii.cost_price) FROM invoices i JOIN invoice_items ii ON ii.invoice_id = i.id WHERE i.customer_id = c.id AND i.user_id = $1), 0) AS total_profit
       FROM customers c
       WHERE c.user_id = $1
       ORDER BY c.name ASC`,
      [userId]
    );
    return result.rows;
  }

  async getCustomerById(userId, customerId) {
    logger.debug(`Fetching customer ${customerId} for user ${userId}`);

    const customerResult = await query(
      `SELECT c.id, c.name, c.phone, c.email, c.city, c.region, c.delivery_address,
              c.birthday, c.anniversary, c.auto_birthday, c.auto_anniversary,
              COALESCE((SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id AND i.user_id = $1), 0) AS invoice_count,
              COALESCE((SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id AND i.user_id = $1 AND i.status = 'paid'), 0) AS paid_invoices,
              COALESCE((SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id AND i.user_id = $1 AND i.status != 'paid'), 0) AS pending_invoices,
              COALESCE((SELECT SUM(amount) FROM invoices i WHERE i.customer_id = c.id AND i.user_id = $1), 0) AS total_spent,
              COALESCE((SELECT SUM(ii.total_price - ii.cost_price) FROM invoices i JOIN invoice_items ii ON ii.invoice_id = i.id WHERE i.customer_id = c.id AND i.user_id = $1), 0) AS total_profit,
              c.created_at, c.updated_at
       FROM customers c
       WHERE c.user_id = $1 AND c.id = $2
       LIMIT 1`,
      [userId, customerId]
    );

    if (!customerResult.rows.length) {
      return null;
    }

    const invoicesResult = await query(
      `SELECT i.id, i.customer_id, i.amount, i.status, i.due_date, i.paid_date, i.created_at
       FROM invoices i
       WHERE i.user_id = $1 AND i.customer_id = $2
       ORDER BY i.created_at DESC`,
      [userId, customerId]
    );

    return {
      ...customerResult.rows[0],
      invoices: invoicesResult.rows,
    };
  }

  async updateCustomer(userId, customerId, customer) {
    const result = await query(
      `UPDATE customers
       SET name = $1,
           phone = $2,
           email = $3,
           city = $4,
           region = $5,
           delivery_address = $6,
           birthday = $7,
           anniversary = $8,
           auto_birthday = $9,
           auto_anniversary = $10,
           updated_at = NOW()
       WHERE user_id = $11 AND id = $12
       RETURNING id, name, phone, email, city, region, delivery_address, birthday, anniversary, auto_birthday, auto_anniversary, created_at, updated_at`,
      [
        customer.name,
        customer.phone || null,
        customer.email || null,
        customer.city || null,
        customer.region || null,
        customer.delivery_address || null,
        customer.birthday || null,
        customer.anniversary || null,
        parseBool(customer.auto_birthday),
        parseBool(customer.auto_anniversary),
        userId,
        customerId,
      ]
    );

    return result.rows[0] || null;
  }

  async createCustomer(userId, customer) {
    const result = await query(
      `INSERT INTO customers (user_id, name, phone, email, city, region, delivery_address, birthday, anniversary, auto_birthday, auto_anniversary, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING id, name, phone, email, city, region, delivery_address, birthday, anniversary, auto_birthday, auto_anniversary, created_at, updated_at`,
      [
        userId,
        customer.name,
        customer.phone || null,
        customer.email || null,
        customer.city || null,
        customer.region || null,
        customer.delivery_address || null,
        customer.birthday || null,
        customer.anniversary || null,
        parseBool(customer.auto_birthday),
        parseBool(customer.auto_anniversary),
      ]
    );
    return result.rows[0];
  }

  async findOrCreateCustomer(userId, customer) {
    if (!customer) {
      return null;
    }

    if (customer.customer_id) {
      const result = await query(
        `SELECT id, name, phone, email, city, region, delivery_address, birthday, anniversary
         FROM customers
         WHERE id = $1 AND user_id = $2
         LIMIT 1`,
        [customer.customer_id, userId]
      );
      if (result.rows.length) {
        return result.rows[0];
      }
    }

    const phone = customer.customer_phone?.trim();
    const name = customer.customer_name?.trim();

    if (phone) {
      const existing = await query(
        `SELECT id, name, phone, email
         FROM customers
         WHERE user_id = $1 AND phone = $2
         LIMIT 1`,
        [userId, phone]
      );
      if (existing.rows.length) {
        return existing.rows[0];
      }
    }

    if (!name) {
      return null;
    }

    return this.createCustomer(userId, {
      name,
      phone: phone || null,
      email: customer.customer_email || null,
      city: customer.city || null,
      region: customer.region || null,
      delivery_address: customer.delivery_address || null,
      birthday: customer.birthday || null,
      anniversary: customer.anniversary || null,
      auto_birthday: customer.auto_birthday || false,
      auto_anniversary: customer.auto_anniversary || false,
    });
  }

  async getInvoiceById(userId, invoiceId) {
    logger.debug(`Fetching invoice ${invoiceId} for user ${userId}`);
    const hasEmailColumn = await invoiceHasColumn('customer_email');
    const hasDeliveryColumn = await invoiceHasColumn('delivery_address');

    const emailSelect = hasEmailColumn
      ? `COALESCE(c.email, i.customer_email) AS customer_email,`
      : `c.email AS customer_email,`;
    const deliverySelect = hasDeliveryColumn
      ? `i.delivery_address,`
      : `NULL AS delivery_address,`;

    const invoiceResult = await query(
      `SELECT i.id, i.customer_id, COALESCE(c.name, i.customer_name) AS customer_name,
              COALESCE(c.phone, i.customer_phone) AS customer_phone,
              ${emailSelect}
              ${deliverySelect}
              i.amount, i.description, i.status, i.due_date, i.paid_date,
              i.auto_mail, i.auto_whatsapp, i.sent_count, i.last_sent_method,
              i.created_at, i.updated_at
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       WHERE i.id = $1 AND i.user_id = $2`,
      [invoiceId, userId]
    );

    if (!invoiceResult.rows.length) {
      return null;
    }

    const itemResult = await query(
      `SELECT id, inventory_id, product_name, unit, quantity, unit_price, cost_price, total_price, created_at
       FROM invoice_items
       WHERE invoice_id = $1
       ORDER BY created_at ASC`,
      [invoiceId]
    );

    return {
      ...invoiceResult.rows[0],
      items: itemResult.rows,
    };
  }

  async getInvoices(userId) {
    logger.debug(`Fetching invoices for user ${userId}`);
    const hasEmailColumn = await invoiceHasColumn('customer_email');
    const hasDeliveryColumn = await invoiceHasColumn('delivery_address');

    const emailSelect = hasEmailColumn
      ? `COALESCE(c.email, i.customer_email) AS customer_email,`
      : `c.email AS customer_email,`;
    const deliverySelect = hasDeliveryColumn
      ? `i.delivery_address,`
      : `NULL AS delivery_address,`;

    const result = await query(
      `SELECT i.id, i.customer_id, COALESCE(c.name, i.customer_name) AS customer_name,
              COALESCE(c.phone, i.customer_phone) AS customer_phone,
              ${emailSelect}
              ${deliverySelect}
              i.amount, i.description, i.status, i.due_date, i.paid_date,
              i.auto_mail, i.auto_whatsapp, i.sent_count, i.last_sent_method,
              i.created_at, i.updated_at,
              (SELECT COUNT(*) FROM invoice_items ii WHERE ii.invoice_id = i.id) AS item_count
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async createInvoice(userId, invoice) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const customer = await this.findOrCreateCustomer(userId, invoice);
      const invoiceItems = Array.isArray(invoice.invoice_items) ? invoice.invoice_items : [];

      const amount = round(invoice.amount || invoiceItems.reduce((sum, item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const totalPrice = Number(item.total_price || (quantity * unitPrice));
        return sum + totalPrice;
      }, 0));

      const autoMail = parseBool(invoice.auto_mail);
      const autoWhatsapp = parseBool(invoice.auto_whatsapp);
      const customerName = customer?.name || invoice.customer_name || null;
      const customerPhone = customer?.phone || invoice.customer_phone || null;
      const customerEmail = customer?.email || invoice.customer_email || null;
      const deliveryAddress = invoice.delivery_address || null;
      const hasInvoiceEmailColumn = await invoiceHasColumn('customer_email');
      const hasInvoiceDeliveryColumn = await invoiceHasColumn('delivery_address');

      const columns = [
        'user_id',
        'customer_id',
        'customer_name',
        'customer_phone',
      ];
      const values = [
        userId,
        customer?.id || null,
        customerName,
        customerPhone,
      ];
      const placeholders = ['$1', '$2', '$3', '$4'];
      let index = 4;

      if (hasInvoiceEmailColumn) {
        columns.push('customer_email');
        values.push(customerEmail);
        placeholders.push(`$${++index}`);
      }
      if (hasInvoiceDeliveryColumn) {
        columns.push('delivery_address');
        values.push(deliveryAddress);
        placeholders.push(`$${++index}`);
      }

      columns.push('amount', 'description', 'status', 'due_date', 'auto_mail', 'auto_whatsapp');
      values.push(amount, invoice.description || null, invoice.status || 'draft', invoice.due_date || null, autoMail, autoWhatsapp);
      placeholders.push(`$${++index}`, `$${++index}`, `$${++index}`, `$${++index}`, `$${++index}`, `$${++index}`);

      const insertQuery = `INSERT INTO invoices (
           ${columns.join(', ')}, sent_count, last_sent_method, created_at, updated_at
         )
         VALUES (${placeholders.join(', ')}, 0, NULL, NOW(), NOW())
         RETURNING id`;

      const insertInvoice = await client.query(insertQuery, values);

      const invoiceId = insertInvoice.rows[0].id;

      for (const item of invoiceItems) {
        const quantity = Number(item.quantity || 0);
        const unitPrice = round(item.unit_price || 0);
        const costPrice = round(item.cost_price || 0);
        const totalPrice = round(item.total_price || (quantity * unitPrice));

        await client.query(
          `INSERT INTO invoice_items (
             invoice_id, inventory_id, product_name, unit, quantity,
             unit_price, cost_price, total_price, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [
            invoiceId,
            item.inventory_id || null,
            item.product_name || 'Unknown product',
            item.unit || null,
            quantity,
            unitPrice,
            costPrice,
            totalPrice,
          ]
        );

        if (item.inventory_id) {
          await client.query(
            `UPDATE inventory
             SET quantity = GREATEST(0, quantity - $1), updated_at = NOW()
             WHERE id = $2 AND user_id = $3`,
            [quantity, item.inventory_id, userId]
          );
        }
      }

      await client.query('COMMIT');

      if (autoWhatsapp) {
        await this.sendInvoice(userId, invoiceId, 'whatsapp').catch(err => logger.warn('Auto WhatsApp send failed:', err.message));
      }
      if (autoMail) {
        await this.sendInvoice(userId, invoiceId, 'email').catch(err => logger.warn('Auto email send failed:', err.message));
      }

      return this.getInvoiceById(userId, invoiceId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateInvoice(userId, invoiceId, invoice) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT * FROM invoices WHERE id = $1 AND user_id = $2`,
        [invoiceId, userId]
      );
      if (!existing.rows.length) {
        throw new Error('Invoice not found');
      }

      const customer = await this.findOrCreateCustomer(userId, invoice);
      const invoiceItems = Array.isArray(invoice.invoice_items) ? invoice.invoice_items : [];
      const amount = round(invoice.amount || invoiceItems.reduce((sum, item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const totalPrice = Number(item.total_price || (quantity * unitPrice));
        return sum + totalPrice;
      }, 0));
      const autoMail = parseBool(invoice.auto_mail);
      const autoWhatsapp = parseBool(invoice.auto_whatsapp);
      const customerName = customer?.name || invoice.customer_name || null;
      const customerPhone = customer?.phone || invoice.customer_phone || null;
      const customerEmail = customer?.email || invoice.customer_email || null;
      const deliveryAddress = invoice.delivery_address || null;
      const hasInvoiceEmailColumn = await invoiceHasColumn('customer_email');
      const hasInvoiceDeliveryColumn = await invoiceHasColumn('delivery_address');

      const previousItems = await client.query(
        `SELECT inventory_id, quantity FROM invoice_items WHERE invoice_id = $1`,
        [invoiceId]
      );

      for (const item of previousItems.rows) {
        if (item.inventory_id) {
          await client.query(
            `UPDATE inventory
             SET quantity = GREATEST(0, quantity + $1), updated_at = NOW()
             WHERE id = $2 AND user_id = $3`,
            [item.quantity || 0, item.inventory_id, userId]
          );
        }
      }

      await client.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [invoiceId]);

      for (const item of invoiceItems) {
        const quantity = Number(item.quantity || 0);
        const unitPrice = round(item.unit_price || 0);
        const costPrice = round(item.cost_price || 0);
        const totalPrice = round(item.total_price || (quantity * unitPrice));

        await client.query(
          `INSERT INTO invoice_items (
             invoice_id, inventory_id, product_name, unit, quantity,
             unit_price, cost_price, total_price, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [
            invoiceId,
            item.inventory_id || null,
            item.product_name || 'Unknown product',
            item.unit || null,
            quantity,
            unitPrice,
            costPrice,
            totalPrice,
          ]
        );

        if (item.inventory_id) {
          await client.query(
            `UPDATE inventory
             SET quantity = GREATEST(0, quantity - $1), updated_at = NOW()
             WHERE id = $2 AND user_id = $3`,
            [quantity, item.inventory_id, userId]
          );
        }
      }

      const updateColumns = [
        'customer_id = $1',
        'customer_name = $2',
        'customer_phone = $3',
      ];
      const updateValues = [
        customer?.id || null,
        customerName,
        customerPhone,
      ];
      let paramIndex = 3;

      if (hasInvoiceEmailColumn) {
        updateColumns.push(`customer_email = $${++paramIndex}`);
        updateValues.push(customerEmail);
      }
      if (hasInvoiceDeliveryColumn) {
        updateColumns.push(`delivery_address = $${++paramIndex}`);
        updateValues.push(deliveryAddress);
      }

      updateColumns.push(
        `amount = $${++paramIndex}`,
        `description = $${++paramIndex}`,
        `status = $${++paramIndex}`,
        `due_date = $${++paramIndex}`,
        `auto_mail = $${++paramIndex}`,
        `auto_whatsapp = $${++paramIndex}`,
        'updated_at = NOW()'
      );
      updateValues.push(
        amount,
        invoice.description || null,
        invoice.status || 'draft',
        invoice.due_date || null,
        autoMail,
        autoWhatsapp
      );

      const updateQuery = `UPDATE invoices SET
           ${updateColumns.join(',\n           ')}
         WHERE id = $${++paramIndex} AND user_id = $${++paramIndex}`;
      updateValues.push(invoiceId, userId);

      await client.query(updateQuery, updateValues);

      await client.query('COMMIT');
      return this.getInvoiceById(userId, invoiceId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async sendInvoice(userId, invoiceId, method) {
    const invoice = await this.getInvoiceById(userId, invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const recipientName = invoice.customer_name || 'Customer';
    const messageLines = [
      `Invoice #${invoice.id}`,
      `Customer: ${recipientName}`,
      `Amount: NGN ${round(invoice.amount)}`,
      `Status: ${invoice.status || 'draft'}`,
    ];

    if (invoice.items?.length) {
      messageLines.push('Items:');
      invoice.items.forEach(item => {
        messageLines.push(`${item.product_name} x${item.quantity} @ NGN ${round(item.unit_price)} = NGN ${round(item.total_price)}`);
      });
    }

    if (invoice.due_date) {
      messageLines.push(`Due: ${invoice.due_date}`);
    }

    const messageText = messageLines.join('\n');
    let sendResult = null;

    if (method === 'whatsapp') {
      if (!invoice.customer_phone) {
        throw new Error('Customer phone number is required to send WhatsApp');
      }
      sendResult = await whatsappService.sendMessage(userId, invoice.customer_phone, messageText);
    } else if (method === 'email') {
      logger.info(`Email send placeholder for invoice ${invoiceId} to ${invoice.customer_phone || 'unknown recipient'}`);
      sendResult = { placeholder: true, message: 'Email send requested' };
    } else {
      throw new Error('Invalid send method');
    }

    await query(
      `UPDATE invoices
       SET sent_count = COALESCE(sent_count, 0) + 1,
           last_sent_method = $1,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [method, invoiceId, userId]
    );

    return sendResult;
  }

  async getCustomerAnalytics(userId) {
    logger.debug(`Calculating customer analytics for user ${userId}`);

    const summaryResult = await query(
      `SELECT
         COUNT(*) AS total_customers
       FROM customers
       WHERE user_id = $1`,
      [userId]
    );

    const invoiceResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'paid') AS paid_invoices,
         COUNT(*) FILTER (WHERE status != 'paid') AS pending_invoices,
         COALESCE(SUM(amount), 0) AS total_revenue
       FROM invoices
       WHERE user_id = $1`,
      [userId]
    );

    const profitResult = await query(
      `SELECT COALESCE(SUM(ii.total_price - ii.cost_price), 0) AS total_profit
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE i.user_id = $1`,
      [userId]
    );

    const topProductResult = await query(
      `SELECT ii.product_name, SUM(ii.quantity) AS quantity_sold
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE i.user_id = $1 AND i.status = 'paid'
       GROUP BY ii.product_name
       ORDER BY quantity_sold DESC
       LIMIT 1`,
      [userId]
    );

    const topCities = await query(
      `SELECT c.city, COUNT(*) AS customers, COALESCE(SUM(i.amount), 0) AS revenue
       FROM customers c
       LEFT JOIN invoices i ON i.customer_id = c.id AND i.user_id = $1
       WHERE c.user_id = $1 AND c.city IS NOT NULL AND c.city <> ''
       GROUP BY c.city
       ORDER BY revenue DESC
       LIMIT 5`,
      [userId]
    );

    const topRegions = await query(
      `SELECT c.region, COUNT(*) AS customers, COALESCE(SUM(i.amount), 0) AS revenue
       FROM customers c
       LEFT JOIN invoices i ON i.customer_id = c.id AND i.user_id = $1
       WHERE c.user_id = $1 AND c.region IS NOT NULL AND c.region <> ''
       GROUP BY c.region
       ORDER BY revenue DESC
       LIMIT 5`,
      [userId]
    );

    const upcomingBirthdays = await query(
      `SELECT id, name, phone, email, birthday
       FROM customers
       WHERE user_id = $1 AND birthday IS NOT NULL
       ORDER BY birthday ASC
       LIMIT 5`,
      [userId]
    );

    const upcomingAnniversaries = await query(
      `SELECT id, name, phone, email, anniversary
       FROM customers
       WHERE user_id = $1 AND anniversary IS NOT NULL
       ORDER BY anniversary ASC
       LIMIT 5`,
      [userId]
    );

    return {
      total_customers: Number(summaryResult.rows[0].total_customers || 0),
      paid_invoices: Number(invoiceResult.rows[0].paid_invoices || 0),
      pending_invoices: Number(invoiceResult.rows[0].pending_invoices || 0),
      total_revenue: round(invoiceResult.rows[0].total_revenue || 0),
      total_profit: round(profitResult.rows[0].total_profit || 0),
      top_product: topProductResult.rows[0]?.product_name || null,
      top_cities: topCities.rows,
      top_regions: topRegions.rows,
      upcoming_birthdays: upcomingBirthdays.rows,
      upcoming_anniversaries: upcomingAnniversaries.rows,
    };
  }

  async getInvoiceAnalytics(userId) {
    logger.debug(`Calculating invoice analytics for user ${userId}`);
    const invoiceResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status IS NOT NULL) AS total_invoices,
         COUNT(*) FILTER (WHERE status = 'paid') AS paid_invoices,
         COUNT(*) FILTER (WHERE status = 'sent') AS sent_invoices,
         COUNT(*) FILTER (WHERE status = 'draft') AS draft_invoices,
         COALESCE(SUM(amount), 0) AS total_amount,
         COALESCE(SUM(amount) FILTER (WHERE status != 'paid'), 0) AS pending_amount,
         COALESCE(SUM(amount) FILTER (WHERE due_date < NOW()::date AND status != 'paid'), 0) AS overdue_amount,
         COUNT(DISTINCT customer_id) AS total_customers
       FROM invoices
       WHERE user_id = $1`,
      [userId]
    );

    const productResult = await query(
      `SELECT product_name, SUM(quantity) AS quantity_sold
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE i.user_id = $1 AND i.status = 'paid'
       GROUP BY product_name
       ORDER BY quantity_sold DESC
       LIMIT 1`,
      [userId]
    );

    const totalItemsResult = await query(
      `SELECT COALESCE(SUM(ii.quantity), 0) AS total_items
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE i.user_id = $1 AND i.status = 'paid'`,
      [userId]
    );

    return {
      total_invoices: Number(invoiceResult.rows[0].total_invoices || 0),
      paid_invoices: Number(invoiceResult.rows[0].paid_invoices || 0),
      sent_invoices: Number(invoiceResult.rows[0].sent_invoices || 0),
      draft_invoices: Number(invoiceResult.rows[0].draft_invoices || 0),
      total_amount: round(invoiceResult.rows[0].total_amount || 0),
      pending_amount: round(invoiceResult.rows[0].pending_amount || 0),
      overdue_amount: round(invoiceResult.rows[0].overdue_amount || 0),
      total_customers: Number(invoiceResult.rows[0].total_customers || 0),
      top_product: productResult.rows[0]?.product_name || null,
      total_items_sold: Number(totalItemsResult.rows[0]?.total_items || 0),
    };
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
           user_id, inventory_id, product_name, unit, quantity, sale_date, sale_time,
           unit_price, cost_price, total_amount, profit, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, NOW(), NOW())
         RETURNING id, inventory_id, product_name, unit, quantity, sale_date, sale_time,
                   unit_price, cost_price, total_amount, profit, created_at`,
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

module.exports = new BusinessService();
