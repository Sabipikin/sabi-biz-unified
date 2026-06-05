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

const customerSchemaCache = new Set();
async function customerHasColumn(column) {
  if (customerSchemaCache.has(column)) {
    return true;
  }

  const schemaResult = await query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'customers' AND column_name = $1
     LIMIT 1`,
    [column]
  );

  const hasColumn = schemaResult.rows.length > 0;
  if (hasColumn) {
    customerSchemaCache.add(column);
  }
  return hasColumn;
}

const userSchemaCache = new Set();
async function userHasColumn(column) {
  if (userSchemaCache.has(column)) {
    return true;
  }

  const schemaResult = await query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'users' AND column_name = $1
     LIMIT 1`,
    [column]
  );

  const hasColumn = schemaResult.rows.length > 0;
  if (hasColumn) {
    userSchemaCache.add(column);
  }
  return hasColumn;
}

async function buildCustomerSelectFields() {
  const baseFields = ['c.id', 'c.name', 'c.phone', 'c.email'];
  const optionalColumns = ['city', 'region', 'delivery_address', 'birthday', 'anniversary', 'auto_birthday', 'auto_anniversary'];
  const hasColumns = await Promise.all(optionalColumns.map(customerHasColumn));

  optionalColumns.forEach((column, index) => {
    if (hasColumns[index]) {
      baseFields.push(`c.${column}`);
    } else {
      baseFields.push(`NULL AS ${column}`);
    }
  });

  return baseFields.join(', ');
}

async function buildCustomerReturningFields() {
  const fields = ['id', 'name', 'phone', 'email'];
  const optionalColumns = ['city', 'region', 'delivery_address', 'birthday', 'anniversary', 'auto_birthday', 'auto_anniversary'];
  const hasColumns = await Promise.all(optionalColumns.map(customerHasColumn));

  optionalColumns.forEach((column, index) => {
    if (hasColumns[index]) {
      fields.push(column);
    } else {
      fields.push(`NULL AS ${column}`);
    }
  });

  fields.push('created_at', 'updated_at');
  return fields.join(', ');
}

function replaceTemplateVariables(template, vars = {}) {
  return String(template || '').replace(/\{\{\s*([^\}]+)\s*\}\}/g, (_, key) => {
    const normalizedKey = key.trim();
    return vars[normalizedKey] != null ? String(vars[normalizedKey]) : '';
  });
}

function getDefaultMilestoneTemplate(type) {
  if (type === 'anniversary') {
    return 'Happy Anniversary {{name}}! Warm wishes from {{business_name}} on this special milestone.';
  }
  return 'Happy Birthday {{name}}! Warm wishes from {{business_name}} on your special day.';
}

function formatMilestoneDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
  const formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${weekday}, ${formatted}`;
}

async function getUserMilestoneTemplates(userId) {
  const hasBirthdayTemplate = await userHasColumn('birthday_message_template');
  const hasAnniversaryTemplate = await userHasColumn('anniversary_message_template');
  const hasShopName = await userHasColumn('shop_name');

  const birthdayDefault = getDefaultMilestoneTemplate('birthday');
  const anniversaryDefault = getDefaultMilestoneTemplate('anniversary');
  const businessDefault = 'Your business';

  const selectColumns = [
    hasBirthdayTemplate ? 'birthday_message_template' : '$2::text AS birthday_message_template',
    hasAnniversaryTemplate ? 'anniversary_message_template' : '$3::text AS anniversary_message_template',
    hasShopName ? 'shop_name' : '$4::text AS shop_name',
  ].join(', ');

  const result = await query(
    `SELECT ${selectColumns}
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId, birthdayDefault, anniversaryDefault, businessDefault]
  );

  const userRow = result.rows[0] || {};
  return {
    birthday_message_template: userRow.birthday_message_template || birthdayDefault,
    anniversary_message_template: userRow.anniversary_message_template || anniversaryDefault,
    business_name: userRow.shop_name || businessDefault,
  };
}

function buildMilestoneMessage(customer, userTemplates, type, targetDate) {
  const template = (type === 'anniversary'
    ? userTemplates.anniversary_message_template
    : userTemplates.birthday_message_template) || getDefaultMilestoneTemplate(type);

  const nextDate = targetDate ? new Date(targetDate) : null;
  const dateText = nextDate ? nextDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  const weekday = nextDate ? nextDate.toLocaleDateString(undefined, { weekday: 'long' }) : '';
  const eventName = type === 'anniversary' ? 'anniversary' : 'birthday';

  let years = '';
  if (customer[type]) {
    const original = new Date(customer[type]);
    if (!Number.isNaN(original.getFullYear()) && nextDate) {
      years = String(nextDate.getFullYear() - original.getFullYear());
    }
  }

  return replaceTemplateVariables(template, {
    name: customer.name || '',
    business_name: userTemplates.business_name,
    date: dateText,
    weekday,
    event: eventName,
    age: years,
    years,
    city: customer.city || '',
    phone: customer.phone || '',
    email: customer.email || '',
  });
}

async function buildUpcomingMilestones(userId) {
  const hasBirthday = await customerHasColumn('birthday');
  const hasAnniversary = await customerHasColumn('anniversary');

  const upcomingBirthdays = hasBirthday ? await query(
    `SELECT id, name, phone, email, birthday,
            CASE
              WHEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM birthday)::int, EXTRACT(DAY FROM birthday)::int) >= CURRENT_DATE
                THEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM birthday)::int, EXTRACT(DAY FROM birthday)::int)
              ELSE make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1, EXTRACT(MONTH FROM birthday)::int, EXTRACT(DAY FROM birthday)::int)
            END AS next_date
     FROM customers
     WHERE user_id = $1
       AND birthday IS NOT NULL
       AND (
         CASE
           WHEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM birthday)::int, EXTRACT(DAY FROM birthday)::int) >= CURRENT_DATE
             THEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM birthday)::int, EXTRACT(DAY FROM birthday)::int)
           ELSE make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1, EXTRACT(MONTH FROM birthday)::int, EXTRACT(DAY FROM birthday)::int)
         END
       ) <= CURRENT_DATE + INTERVAL '30 days'
     ORDER BY next_date ASC
     LIMIT 10`,
    [userId]
  ) : { rows: [] };

  const upcomingAnniversaries = hasAnniversary ? await query(
    `SELECT id, name, phone, email, anniversary,
            CASE
              WHEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM anniversary)::int, EXTRACT(DAY FROM anniversary)::int) >= CURRENT_DATE
                THEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM anniversary)::int, EXTRACT(DAY FROM anniversary)::int)
              ELSE make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1, EXTRACT(MONTH FROM anniversary)::int, EXTRACT(DAY FROM anniversary)::int)
            END AS next_date
     FROM customers
     WHERE user_id = $1
       AND anniversary IS NOT NULL
       AND (
         CASE
           WHEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM anniversary)::int, EXTRACT(DAY FROM anniversary)::int) >= CURRENT_DATE
             THEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM anniversary)::int, EXTRACT(DAY FROM anniversary)::int)
           ELSE make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1, EXTRACT(MONTH FROM anniversary)::int, EXTRACT(DAY FROM anniversary)::int)
         END
       ) <= CURRENT_DATE + INTERVAL '30 days'
     ORDER BY next_date ASC
     LIMIT 10`,
    [userId]
  ) : { rows: [] };

  return {
    upcoming_birthdays: upcomingBirthdays.rows,
    upcoming_anniversaries: upcomingAnniversaries.rows,
  };
}

async function loadMilestoneMessages(userId) {
  const summaryResult = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'pending') AS pending,
       COUNT(*) FILTER (WHERE status = 'sent') AS sent
     FROM milestone_messages
     WHERE user_id = $1`,
    [userId]
  );

  const messageResult = await query(
    `SELECT m.id, m.customer_id, c.name AS customer_name, m.milestone_type, m.target_date,
            m.scheduled_for, m.sent_at, m.status, m.message_text
     FROM milestone_messages m
     LEFT JOIN customers c ON c.id = m.customer_id
     WHERE m.user_id = $1
     ORDER BY m.created_at DESC
     LIMIT 10`,
    [userId]
  );

  return {
    pending: Number(summaryResult.rows[0]?.pending || 0),
    sent: Number(summaryResult.rows[0]?.sent || 0),
    messages: messageResult.rows,
  };
}

function buildScheduledForTimestamp(targetDate) {
  const date = new Date(targetDate);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 7, 0, 0);
}

async function insertMilestoneMessage(userId, customerId, type, targetDate, messageText, status, sentAt = null, scheduledFor = null) {
  const scheduledTimestamp = scheduledFor || buildScheduledForTimestamp(targetDate);
  const result = await query(
    `INSERT INTO milestone_messages (user_id, customer_id, milestone_type, target_date, scheduled_for, sent_at, status, message_text, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING *`,
    [userId, customerId, type, targetDate, scheduledTimestamp, sentAt, status, messageText]
  );
  return result.rows[0];
}

async function updateMilestoneMessageStatus(messageId, status, sentAt = null) {
  await query(
    `UPDATE milestone_messages
     SET status = $1, sent_at = $2, updated_at = NOW()
     WHERE id = $3`,
    [status, sentAt, messageId]
  );
}

async function queueMilestoneMessage(userId, customer, type) {
  if (!customer || !customer.id) {
    return null;
  }

  const targetDate = type === 'anniversary' ? customer.anniversary : customer.birthday;
  if (!targetDate) {
    return null;
  }

  const nextDate = await getNextMilestoneDate(targetDate);
  if (!nextDate) {
    return null;
  }

  if (await hasMilestoneMessageBeenRecorded(userId, customer.id, type, nextDate)) {
    return null;
  }

  const userTemplates = await getUserMilestoneTemplates(userId);
  const messageText = buildMilestoneMessage(customer, userTemplates, type, nextDate);
  const scheduledFor = buildScheduledForTimestamp(nextDate);

  return await insertMilestoneMessage(userId, customer.id, type, nextDate, messageText, 'pending', null, scheduledFor);
}

async function getPendingMilestoneMessagesForDate(dateValue) {
  const result = await query(
    `SELECT m.*, c.name AS customer_name, c.phone, c.email, c.city, c.birthday, c.anniversary,
            u.shop_name, u.birthday_message_template, u.anniversary_message_template
     FROM milestone_messages m
     LEFT JOIN customers c ON c.id = m.customer_id
     LEFT JOIN users u ON u.id = m.user_id
     WHERE m.channel = 'whatsapp'
       AND m.target_date = $1
       AND m.status IN ('pending', 'failed')`,
    [dateValue]
  );
  return result.rows;
}

async function sendExistingMilestoneMessage(record) {
  if (!record || !record.phone) {
    await updateMilestoneMessageStatus(record.id, 'failed', null);
    return null;
  }

  try {
    await whatsappService.sendMessage(record.user_id, record.phone, record.message_text);
    await updateMilestoneMessageStatus(record.id, 'sent', new Date());
    return record;
  } catch (err) {
    logger.error('Failed to send existing milestone message:', err.message);
    await updateMilestoneMessageStatus(record.id, 'failed', null);
    return null;
  }
}

async function hasMilestoneMessageBeenRecorded(userId, customerId, type, targetDate) {
  const result = await query(
    `SELECT 1 FROM milestone_messages
     WHERE user_id = $1 AND customer_id = $2 AND milestone_type = $3 AND target_date = $4
     LIMIT 1`,
    [userId, customerId, type, targetDate]
  );
  return result.rows.length > 0;
}

async function getCustomerForMilestone(userId, customerId) {
  const result = await query(
    `SELECT id, name, phone, email, city, birthday, anniversary
     FROM customers
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [customerId, userId]
  );
  return result.rows[0] || null;
}

async function getNextMilestoneDate(dateValue) {
  if (!dateValue) return null;
  const original = new Date(dateValue);
  if (Number.isNaN(original.getTime())) return null;

  const now = new Date();
  const thisYear = new Date(now.getFullYear(), original.getMonth(), original.getDate());
  if (thisYear >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    return thisYear.toISOString().slice(0, 10);
  }

  const nextYear = new Date(now.getFullYear() + 1, original.getMonth(), original.getDate());
  return nextYear.toISOString().slice(0, 10);
}

async function sendMilestoneMessageRecord(userId, customer, type, messageText, targetDate) {
  if (!customer.phone) {
    return await insertMilestoneMessage(userId, customer.id, type, targetDate, messageText, 'failed', null);
  }

  try {
    await whatsappService.sendMessage(userId, customer.phone, messageText);
    return await insertMilestoneMessage(userId, customer.id, type, targetDate, messageText, 'sent', new Date());
  } catch (err) {
    logger.error('Failed to send milestone message:', err.message);
    return await insertMilestoneMessage(userId, customer.id, type, targetDate, messageText, 'failed', null);
  }
}

class BusinessService {
  async getCustomers(userId) {
    logger.debug(`Fetching customers for user ${userId}`);
    const customerSelectFields = await buildCustomerSelectFields();
    const result = await query(
      `SELECT ${customerSelectFields},
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
    const customerSelectFields = await buildCustomerSelectFields();

    const customerResult = await query(
      `SELECT ${customerSelectFields},
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
    const optionalColumns = ['city', 'region', 'delivery_address', 'birthday', 'anniversary', 'auto_birthday', 'auto_anniversary'];
    const hasColumns = await Promise.all(optionalColumns.map(customerHasColumn));

    const updateColumns = ['name = $1', 'phone = $2', 'email = $3'];
    const values = [customer.name, customer.phone || null, customer.email || null];

    optionalColumns.forEach((column, index) => {
      if (hasColumns[index]) {
        updateColumns.push(`${column} = $${values.length + 1}`);
        let value = customer[column];
        if (column === 'auto_birthday' || column === 'auto_anniversary') {
          value = parseBool(value);
        }
        values.push(value || null);
      }
    });

    values.push(userId, customerId);
    const returningFields = await buildCustomerReturningFields();

    const result = await query(
      `UPDATE customers
       SET ${updateColumns.join(', ')},
           updated_at = NOW()
       WHERE user_id = $${values.length - 1} AND id = $${values.length}
       RETURNING ${returningFields}`,
      values
    );

    const updatedCustomer = result.rows[0] || null;
    if (updatedCustomer) {
      if (updatedCustomer.auto_birthday && updatedCustomer.birthday) {
        await queueMilestoneMessage(userId, updatedCustomer, 'birthday');
      }
      if (updatedCustomer.auto_anniversary && updatedCustomer.anniversary) {
        await queueMilestoneMessage(userId, updatedCustomer, 'anniversary');
      }
    }

    return updatedCustomer;
  }

  async createCustomer(userId, customer) {
    const optionalColumns = ['city', 'region', 'delivery_address', 'birthday', 'anniversary', 'auto_birthday', 'auto_anniversary'];
    const hasColumns = await Promise.all(optionalColumns.map(customerHasColumn));

    const insertColumns = ['user_id', 'name', 'phone', 'email'];
    const values = [userId, customer.name, customer.phone || null, customer.email || null];

    optionalColumns.forEach((column, index) => {
      if (hasColumns[index]) {
        insertColumns.push(column);
        let value = customer[column];
        if (column === 'auto_birthday' || column === 'auto_anniversary') {
          value = parseBool(value);
        }
        values.push(value || null);
      }
    });

    const placeholders = values.map((_, idx) => `$${idx + 1}`);
    const returningFields = await buildCustomerReturningFields();

    const result = await query(
      `INSERT INTO customers (${insertColumns.join(', ')}, created_at, updated_at)
       VALUES (${placeholders.join(', ')}, NOW(), NOW())
       RETURNING ${returningFields}`,
      values
    );
    const createdCustomer = result.rows[0];

    if (createdCustomer) {
      if (createdCustomer.auto_birthday && createdCustomer.birthday) {
        await queueMilestoneMessage(userId, createdCustomer, 'birthday');
      }
      if (createdCustomer.auto_anniversary && createdCustomer.anniversary) {
        await queueMilestoneMessage(userId, createdCustomer, 'anniversary');
      }
    }

    return createdCustomer;
  }

  async findOrCreateCustomer(userId, customer) {
    if (!customer) {
      return null;
    }

    if (customer.customer_id) {
      const returningFields = await buildCustomerReturningFields();
      const result = await query(
        `SELECT ${returningFields}
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

      // Auto-record sales if invoice status is being changed to "paid"
      const oldStatus = existing.rows[0].status;
      const newStatus = invoice.status || 'draft';
      const shouldAutoRecord = oldStatus !== 'paid' && newStatus === 'paid';

      await client.query('COMMIT');
      client.release();

      if (shouldAutoRecord) {
        try {
          await this.autoRecordSalesFromInvoice(userId, invoiceId);
          logger.info(`Auto-recorded sales from invoice ${invoiceId}`);
        } catch (err) {
          logger.warn(`Failed to auto-record sales from invoice ${invoiceId}:`, err.message);
          // Don't fail the update if auto-recording fails
        }
      }
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

    const hasCity = await customerHasColumn('city');
    const hasRegion = await customerHasColumn('region');
    const hasBirthday = await customerHasColumn('birthday');
    const hasAnniversary = await customerHasColumn('anniversary');

    const topCities = hasCity ? await query(
      `SELECT c.city, COUNT(*) AS customers, COALESCE(SUM(i.amount), 0) AS revenue
       FROM customers c
       LEFT JOIN invoices i ON i.customer_id = c.id AND i.user_id = $1
       WHERE c.user_id = $1 AND c.city IS NOT NULL AND c.city <> ''
       GROUP BY c.city
       ORDER BY revenue DESC
       LIMIT 5`,
      [userId]
    ) : { rows: [] };

    const topRegions = hasRegion ? await query(
      `SELECT c.region, COUNT(*) AS customers, COALESCE(SUM(i.amount), 0) AS revenue
       FROM customers c
       LEFT JOIN invoices i ON i.customer_id = c.id AND i.user_id = $1
       WHERE c.user_id = $1 AND c.region IS NOT NULL AND c.region <> ''
       GROUP BY c.region
       ORDER BY revenue DESC
       LIMIT 5`,
      [userId]
    ) : { rows: [] };

    const upcoming = await buildUpcomingMilestones(userId);

    return {
      total_customers: Number(summaryResult.rows[0].total_customers || 0),
      paid_invoices: Number(invoiceResult.rows[0].paid_invoices || 0),
      pending_invoices: Number(invoiceResult.rows[0].pending_invoices || 0),
      total_revenue: round(invoiceResult.rows[0].total_revenue || 0),
      total_profit: round(profitResult.rows[0].total_profit || 0),
      top_product: topProductResult.rows[0]?.product_name || null,
      top_cities: topCities.rows,
      top_regions: topRegions.rows,
      upcoming_birthdays: upcoming.upcoming_birthdays,
      upcoming_anniversaries: upcoming.upcoming_anniversaries,
    };
  }

  async getMilestoneMessages(userId) {
    logger.debug(`Fetching milestone messages for user ${userId}`);
    return await loadMilestoneMessages(userId);
  }

  async generateMilestoneMessage(userId, customerId, milestoneType) {
    logger.debug(`Generating milestone message for user ${userId}, customer ${customerId}, type ${milestoneType}`);

    const customer = await getCustomerForMilestone(userId, customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const targetDate = milestoneType === 'anniversary' ? customer.anniversary : customer.birthday;
    if (!targetDate) {
      throw new Error(`${milestoneType} date is not available for this customer`);
    }

    const nextDate = await getNextMilestoneDate(targetDate);
    const userTemplates = await getUserMilestoneTemplates(userId);
    const messageText = buildMilestoneMessage(customer, userTemplates, milestoneType, nextDate);

    return {
      customer_id: customer.id,
      customer_name: customer.name,
      milestone_type: milestoneType,
      target_date: nextDate,
      message_text: messageText,
      day_name: formatMilestoneDate(nextDate),
    };
  }

  async sendMilestoneMessage(userId, customerId, milestoneType, messageText) {
    logger.debug(`Sending milestone message for user ${userId}, customer ${customerId}, type ${milestoneType}`);

    const customer = await getCustomerForMilestone(userId, customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const targetDate = milestoneType === 'anniversary' ? customer.anniversary : customer.birthday;
    if (!targetDate) {
      throw new Error(`${milestoneType} date is not available for this customer`);
    }

    const nextDate = await getNextMilestoneDate(targetDate);
    const textToSend = messageText || buildMilestoneMessage(customer, await getUserMilestoneTemplates(userId), milestoneType, nextDate);
    return await sendMilestoneMessageRecord(userId, customer, milestoneType, textToSend, nextDate);
  }

  async saveMilestoneTemplates(userId, templates) {
    const fields = [];
    const values = [];

    if (typeof templates.birthday_message_template === 'string') {
      fields.push('birthday_message_template = $' + (values.length + 1));
      values.push(templates.birthday_message_template);
    }
    if (typeof templates.anniversary_message_template === 'string') {
      fields.push('anniversary_message_template = $' + (values.length + 1));
      values.push(templates.anniversary_message_template);
    }

    if (!fields.length) {
      return null;
    }

    const hasBirthdayTemplate = await userHasColumn('birthday_message_template');
    const hasAnniversaryTemplate = await userHasColumn('anniversary_message_template');
    if (!hasBirthdayTemplate && !hasAnniversaryTemplate) {
      return null;
    }

    values.push(userId);
    const result = await query(
      `UPDATE users
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING birthday_message_template, anniversary_message_template`,
      values
    );
    return result.rows[0];
  }

  async getMilestoneTemplates(userId) {
    return await getUserMilestoneTemplates(userId);
  }

  async runScheduledMilestoneMessages() {
    logger.debug('Running scheduled milestone message delivery');

    const today = new Date().toISOString().slice(0, 10);
    const pendingMessages = await getPendingMilestoneMessagesForDate(today);

    for (const message of pendingMessages) {
      await sendExistingMilestoneMessage(message);
    }

    const result = await query(
      `SELECT c.id AS customer_id,
              c.user_id,
              c.name,
              c.phone,
              c.email,
              c.city,
              c.birthday,
              c.anniversary,
              c.auto_birthday,
              c.auto_anniversary,
              u.shop_name,
              u.birthday_message_template,
              u.anniversary_message_template
       FROM customers c
       JOIN users u ON u.id = c.user_id
       WHERE (c.auto_birthday = TRUE AND c.birthday IS NOT NULL AND EXTRACT(MONTH FROM c.birthday) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM c.birthday) = EXTRACT(DAY FROM CURRENT_DATE))
          OR (c.auto_anniversary = TRUE AND c.anniversary IS NOT NULL AND EXTRACT(MONTH FROM c.anniversary) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM c.anniversary) = EXTRACT(DAY FROM CURRENT_DATE))`,
      []
    );

    for (const row of result.rows) {
      const milestoneType = row.auto_birthday && row.birthday && new Date(row.birthday).getMonth() === new Date().getMonth() && new Date(row.birthday).getDate() === new Date().getDate()
        ? 'birthday'
        : 'anniversary';

      const targetDate = milestoneType === 'anniversary' ? row.anniversary : row.birthday;
      const nextDate = await getNextMilestoneDate(targetDate);
      if (!nextDate) {
        continue;
      }

      const alreadyRecorded = await hasMilestoneMessageBeenRecorded(row.user_id, row.customer_id, milestoneType, nextDate);
      if (alreadyRecorded) {
        continue;
      }

      const messageText = buildMilestoneMessage(
        row,
        {
          birthday_message_template: row.birthday_message_template || getDefaultMilestoneTemplate('birthday'),
          anniversary_message_template: row.anniversary_message_template || getDefaultMilestoneTemplate('anniversary'),
          business_name: row.shop_name || 'Your business',
        },
        milestoneType,
        nextDate
      );

      await insertMilestoneMessage(row.user_id, row.customer_id, milestoneType, nextDate, messageText, 'pending', null, buildScheduledForTimestamp(nextDate));
    }
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
      const bonusAdjustment = Number(sale.bonus_adjustment || 0);
      const profit = Number((unitPrice - costPrice) * quantity) + bonusAdjustment;
      const customerId = sale.customer_id || null;
      const invoiceId = sale.invoice_id || null;

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
           user_id, inventory_id, product_name, quantity, sale_date, sale_time,
           unit_price, cost_price, total_amount, profit, customer_id, 
           bonus_adjustment, adjustment_reason, invoice_id, auto_recorded,
           created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
         RETURNING id, inventory_id, product_name, quantity, sale_date, sale_time,
                   unit_price, cost_price, total_amount, profit, customer_id,
                   bonus_adjustment, adjustment_reason, invoice_id, auto_recorded, created_at`,
        [
          userId,
          inventoryId,
          productName,
          quantity,
          saleDate,
          unitPrice,
          costPrice,
          totalAmount,
          profit,
          customerId,
          bonusAdjustment,
          sale.adjustment_reason || null,
          invoiceId,
          sale.auto_recorded || false,
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

  async createBulkSales(userId, salesBatch) {
    // Expects array of sales with same customer but different products
    // salesBatch structure: { customerId, saleDate, products: [{ inventoryId, quantity, unitPrice, costPrice, bonusAdjustment, adjustmentReason }] }
    if (!Array.isArray(salesBatch) || !salesBatch.products || salesBatch.products.length === 0) {
      throw new Error('Invalid bulk sales format');
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const customerId = salesBatch.customerId || null;
      const saleDate = salesBatch.saleDate || new Date().toISOString().slice(0, 10);
      const invoiceId = salesBatch.invoiceId || null;
      const autoRecorded = salesBatch.autoRecorded || false;
      const results = [];

      for (const product of salesBatch.products) {
        const quantity = Number(product.quantity || 0);
        if (quantity <= 0) continue;

        let inventoryId = product.inventoryId || null;
        let productName = product.productName || '';
        let unitPrice = Number(product.unitPrice || 0);
        let costPrice = Number(product.costPrice || 0);
        const bonusAdjustment = Number(product.bonusAdjustment || 0);
        const totalAmount = Number(quantity * unitPrice);
        const profit = Number((unitPrice - costPrice) * quantity) + bonusAdjustment;

        if (inventoryId) {
          const productResult = await client.query(
            `SELECT id, product_name, quantity, unit_price, cost_price
             FROM inventory
             WHERE id = $1 AND user_id = $2`,
            [inventoryId, userId]
          );

          if (productResult.rows.length) {
            const invItem = productResult.rows[0];
            productName = productName || invItem.product_name;
            unitPrice = Number(unitPrice || invItem.unit_price || 0);
            costPrice = Number(costPrice || invItem.cost_price || 0);

            const updatedQuantity = Math.max(0, Number(invItem.quantity || 0) - quantity);
            await client.query(
              `UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2`,
              [updatedQuantity, inventoryId]
            );
          }
        }

        const result = await client.query(
          `INSERT INTO sales (
             user_id, inventory_id, product_name, quantity, sale_date, sale_time,
             unit_price, cost_price, total_amount, profit, customer_id,
             bonus_adjustment, adjustment_reason, invoice_id, auto_recorded,
             created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
           RETURNING id, inventory_id, product_name, quantity, sale_date, sale_time,
                     unit_price, cost_price, total_amount, profit, customer_id,
                     bonus_adjustment, adjustment_reason, invoice_id, auto_recorded, created_at`,
          [
            userId,
            inventoryId,
            productName,
            quantity,
            saleDate,
            unitPrice,
            costPrice,
            totalAmount,
            profit,
            customerId,
            bonusAdjustment,
            product.adjustmentReason || null,
            invoiceId,
            autoRecorded,
          ]
        );

        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async autoRecordSalesFromInvoice(userId, invoiceId) {
    try {
      const invoiceResult = await query(
        `SELECT id, customer_id, amount FROM invoices WHERE id = $1 AND user_id = $2`,
        [invoiceId, userId]
      );

      if (!invoiceResult.rows.length) {
        throw new Error('Invoice not found');
      }

      const invoice = invoiceResult.rows[0];
      const invoiceItemsResult = await query(
        `SELECT inventory_id, product_name, unit, quantity, unit_price, cost_price, total_price
         FROM invoice_items
         WHERE invoice_id = $1`,
        [invoiceId]
      );

      const products = invoiceItemsResult.rows.map(item => ({
        inventoryId: item.inventory_id,
        productName: item.product_name,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unit_price || 0),
        costPrice: Number(item.cost_price || 0),
        bonusAdjustment: 0,
      }));

      const salesBatch = {
        customerId: invoice.customer_id,
        saleDate: new Date().toISOString().slice(0, 10),
        invoiceId: invoiceId,
        autoRecorded: true,
        products,
      };

      return await this.createBulkSales(userId, salesBatch);
    } catch (err) {
      logger.error(`Failed to auto-record sales from invoice ${invoiceId}:`, err);
      throw err;
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

