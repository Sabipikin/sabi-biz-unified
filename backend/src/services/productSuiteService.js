const crypto = require('crypto');
const { query } = require('../config/db');
const whatsappService = require('./whatsappService');

const RESOURCE_CONFIG = {
  leads: { table: 'leads', orgColumn: 'organization_id', orderBy: 'updated_at DESC', filters: ['status'] },
  opportunities: { table: 'opportunities', orgColumn: 'organization_id', orderBy: 'updated_at DESC', filters: ['status', 'stage'] },
  activities: { table: 'customer_activities', orgColumn: 'organization_id', orderBy: 'created_at DESC', noUpdatedAt: true },
  templates: { table: 'message_templates', orgColumn: 'organization_id', orderBy: 'updated_at DESC', filters: ['category', 'approval_status'] },
  segments: { table: 'audience_segments', orgColumn: 'organization_id', orderBy: 'updated_at DESC' },
  campaigns: { table: 'campaigns', orgColumn: 'organization_id', orderBy: 'updated_at DESC', filters: ['status'] },
  broadcasts: { table: 'broadcasts', orgColumn: 'organization_id', orderBy: 'updated_at DESC', filters: ['status'] },
  assistants: { table: 'ai_assistants', orgColumn: 'organization_id', orderBy: 'updated_at DESC', filters: ['status'] },
  knowledge: { table: 'knowledge_resources', orgColumn: 'organization_id', orderBy: 'updated_at DESC', filters: ['category', 'index_status'] },
  workflows: { table: 'automation_workflows', orgColumn: 'organization_id', orderBy: 'updated_at DESC', filters: ['status'] },
  integrations: { table: 'integration_connections', orgColumn: 'organization_id', orderBy: 'updated_at DESC', filters: ['provider', 'status'] },
  webhooks: { table: 'webhook_subscriptions', orgColumn: 'organization_id', orderBy: 'updated_at DESC', filters: ['status'] },
  reports: { table: 'reports', orgColumn: 'organization_id', orderBy: 'updated_at DESC', filters: ['report_type'] },
  team: { table: 'team_members', orgColumn: 'organization_id', orderBy: 'updated_at DESC', filters: ['role', 'status'] },
  tickets: { table: 'support_tickets', orgColumn: 'organization_id', orderBy: 'updated_at DESC', filters: ['priority', 'status'] },
};

const ALLOWED_FIELDS = {
  leads: ['customer_id', 'owner_id', 'name', 'email', 'phone', 'company', 'status', 'source', 'tags', 'score', 'notes', 'converted_customer_id', 'converted_at'],
  opportunities: ['customer_id', 'lead_id', 'owner_id', 'title', 'stage', 'value', 'probability', 'expected_close_date', 'status'],
  activities: ['customer_id', 'actor_id', 'activity_type', 'title', 'body', 'metadata'],
  templates: ['name', 'category', 'language', 'body', 'variables', 'whatsapp_template_id', 'approval_status'],
  segments: ['name', 'description', 'rules', 'estimated_size'],
  campaigns: ['name', 'channel', 'status', 'template_id', 'segment_id', 'message_body', 'scheduled_at', 'sent_at', 'metrics'],
  broadcasts: ['campaign_id', 'name', 'message_body', 'audience', 'scheduled_at', 'status', 'sent_count', 'delivered_count', 'read_count', 'failed_count'],
  assistants: ['name', 'personality', 'instructions', 'whatsapp_account_ids', 'support_enabled', 'sales_enabled', 'appointment_booking_enabled', 'follow_up_enabled', 'status'],
  knowledge: ['assistant_id', 'title', 'resource_type', 'source_url', 'content', 'category', 'version', 'index_status', 'metadata'],
  workflows: ['name', 'description', 'trigger_type', 'conditions', 'actions', 'status', 'last_run_at'],
  integrations: ['provider', 'status', 'config', 'connected_at'],
  webhooks: ['name', 'target_url', 'events', 'secret', 'status'],
  reports: ['name', 'report_type', 'filters', 'schedule', 'export_format', 'last_generated_at'],
  team: ['user_id', 'email', 'name', 'role', 'status', 'permissions', 'joined_at'],
  tickets: ['title', 'priority', 'status', 'description', 'sla_due_at', 'resolved_at'],
};

const SEARCH_SQL = {
  leads: "LOWER(COALESCE(name, email, phone, company, ''))",
  opportunities: "LOWER(COALESCE(title, stage, status, ''))",
  activities: "LOWER(COALESCE(title, body, activity_type, ''))",
  templates: "LOWER(COALESCE(name, category, body, ''))",
  segments: "LOWER(COALESCE(name, description, ''))",
  campaigns: "LOWER(COALESCE(name, channel, status, message_body, ''))",
  broadcasts: "LOWER(COALESCE(name, message_body, status, ''))",
  assistants: "LOWER(COALESCE(name, personality, instructions, status, ''))",
  knowledge: "LOWER(COALESCE(title, resource_type, source_url, category, content, ''))",
  workflows: "LOWER(COALESCE(name, description, trigger_type, status, ''))",
  integrations: "LOWER(COALESCE(provider, status, ''))",
  webhooks: "LOWER(COALESCE(name, target_url, status, ''))",
  reports: "LOWER(COALESCE(name, report_type, export_format, ''))",
  team: "LOWER(COALESCE(name, email, role, status, ''))",
  tickets: "LOWER(COALESCE(title, priority, status, description, ''))",
};

function userIdFrom(value) {
  return value?.userId || value?.id || value;
}

function assertResource(resource) {
  const config = RESOURCE_CONFIG[resource];
  if (!config) {
    const err = new Error('Unknown product resource');
    err.statusCode = 404;
    throw err;
  }
  return config;
}

function pickFields(resource, input = {}) {
  const allowed = ALLOWED_FIELDS[resource] || [];
  return allowed.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      acc[field] = input[field];
    }
    return acc;
  }, {});
}

async function recordActivity(organizationId, actorId, activity) {
  await query(
    `INSERT INTO customer_activities (organization_id, customer_id, actor_id, activity_type, title, body, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      organizationId,
      activity.customer_id || null,
      actorId || null,
      activity.activity_type,
      activity.title,
      activity.body || null,
      activity.metadata || {},
    ]
  );
}

class ProductSuiteService {
  async list(resource, user, filters = {}) {
    const organizationId = userIdFrom(user);
    const config = assertResource(resource);
    const clauses = [`${config.orgColumn} = $1`];
    const params = [organizationId];

    (config.filters || []).forEach((field) => {
      if (filters[field]) {
        params.push(filters[field]);
        clauses.push(`${field} = $${params.length}`);
      }
    });

    if (filters.search) {
      params.push(`%${String(filters.search).toLowerCase()}%`);
      const searchable = SEARCH_SQL[resource];
      clauses.push(`${searchable} LIKE $${params.length}`);
    }

    const result = await query(
      `SELECT *
       FROM ${config.table}
       WHERE ${clauses.join(' AND ')}
       ORDER BY ${config.orderBy}
       LIMIT 200`,
      params
    );
    return result.rows;
  }

  async create(resource, user, payload = {}) {
    const organizationId = userIdFrom(user);
    const actorId = userIdFrom(user);
    const config = assertResource(resource);
    const data = pickFields(resource, payload);
    const fields = [config.orgColumn, ...Object.keys(data)];
    const values = [organizationId, ...Object.values(data)];
    const placeholders = fields.map((_, index) => `$${index + 1}`);

    const result = await query(
      `INSERT INTO ${config.table} (${fields.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      values
    );

    if (resource !== 'activities') {
      await recordActivity(organizationId, actorId, {
        customer_id: payload.customer_id,
        activity_type: `${resource}_created`,
        title: `Created ${resource}`,
        metadata: { resource, id: result.rows[0].id },
      }).catch(() => {});
    }

    return result.rows[0];
  }

  async update(resource, user, id, payload = {}) {
    const organizationId = userIdFrom(user);
    const config = assertResource(resource);
    const data = pickFields(resource, payload);
    const fields = Object.keys(data);
    if (!fields.length) return this.get(resource, user, id);

    const assignments = fields.map((field, index) => `${field} = $${index + 3}`);
    if (!config.noUpdatedAt) {
      assignments.push('updated_at = NOW()');
    }

    const result = await query(
      `UPDATE ${config.table}
       SET ${assignments.join(', ')}
       WHERE id = $1 AND ${config.orgColumn} = $2
       RETURNING *`,
      [id, organizationId, ...Object.values(data)]
    );
    return result.rows[0] || null;
  }

  async get(resource, user, id) {
    const organizationId = userIdFrom(user);
    const config = assertResource(resource);
    const result = await query(
      `SELECT * FROM ${config.table} WHERE id = $1 AND ${config.orgColumn} = $2 LIMIT 1`,
      [id, organizationId]
    );
    return result.rows[0] || null;
  }

  async remove(resource, user, id) {
    const organizationId = userIdFrom(user);
    const config = assertResource(resource);
    const result = await query(
      `DELETE FROM ${config.table} WHERE id = $1 AND ${config.orgColumn} = $2 RETURNING id`,
      [id, organizationId]
    );
    return result.rows[0] ? { id: result.rows[0].id, removed: true } : null;
  }

  async convertLead(user, id) {
    const organizationId = userIdFrom(user);
    const lead = await this.get('leads', user, id);
    if (!lead) return null;

    const customerResult = await query(
      `INSERT INTO customers (user_id, name, email, phone, company, tags, notes, lead_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [organizationId, lead.name, lead.email, lead.phone, lead.company, lead.tags || [], lead.notes, lead.score || 0]
    );

    const updatedLead = await query(
      `UPDATE leads
       SET status = 'won', converted_customer_id = $1, converted_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [customerResult.rows[0].id, id, organizationId]
    );

    await recordActivity(organizationId, userIdFrom(user), {
      customer_id: customerResult.rows[0].id,
      activity_type: 'lead_converted',
      title: 'Lead converted to customer',
      metadata: { lead_id: id },
    });

    return { lead: updatedLead.rows[0], customer: customerResult.rows[0] };
  }

  async getBranding(user) {
    const organizationId = userIdFrom(user);
    const result = await query(
      `SELECT * FROM brand_settings WHERE organization_id = $1 LIMIT 1`,
      [organizationId]
    );
    return result.rows[0] || {
      organization_id: organizationId,
      logo_url: null,
      primary_color: null,
      secondary_color: null,
      email_from_name: null,
      custom_domain: null,
      white_label_enabled: false,
      remove_sabireply_branding: false,
    };
  }

  async saveBranding(user, payload = {}) {
    const organizationId = userIdFrom(user);
    const fields = ['logo_url', 'primary_color', 'secondary_color', 'email_from_name', 'custom_domain', 'white_label_enabled', 'remove_sabireply_branding'];
    const values = fields.map(field => payload[field] ?? null);
    const result = await query(
      `INSERT INTO brand_settings (
         organization_id, logo_url, primary_color, secondary_color, email_from_name,
         custom_domain, white_label_enabled, remove_sabireply_branding, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, false), COALESCE($8, false), NOW())
       ON CONFLICT (organization_id)
       DO UPDATE SET
         logo_url = EXCLUDED.logo_url,
         primary_color = EXCLUDED.primary_color,
         secondary_color = EXCLUDED.secondary_color,
         email_from_name = EXCLUDED.email_from_name,
         custom_domain = EXCLUDED.custom_domain,
         white_label_enabled = EXCLUDED.white_label_enabled,
         remove_sabireply_branding = EXCLUDED.remove_sabireply_branding,
         updated_at = NOW()
       RETURNING *`,
      [organizationId, ...values]
    );
    return result.rows[0];
  }

  async createApiKey(user, payload = {}) {
    const organizationId = userIdFrom(user);
    const rawKey = `sabi_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const result = await query(
      `INSERT INTO api_keys (organization_id, name, key_prefix, key_hash, permissions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, organization_id, name, key_prefix, permissions, last_used_at, revoked_at, created_at`,
      [organizationId, payload.name || 'API Key', rawKey.slice(0, 12), keyHash, payload.permissions || []]
    );
    return { ...result.rows[0], api_key: rawKey };
  }

  async listApiKeys(user) {
    const organizationId = userIdFrom(user);
    const result = await query(
      `SELECT id, organization_id, name, key_prefix, permissions, last_used_at, revoked_at, created_at
       FROM api_keys
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [organizationId]
    );
    return result.rows;
  }

  async revokeApiKey(user, id) {
    const organizationId = userIdFrom(user);
    const result = await query(
      `UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND organization_id = $2 RETURNING id, revoked_at`,
      [id, organizationId]
    );
    return result.rows[0] || null;
  }

  async resolveAudience(organizationId, audience = {}) {
    const conditions = ['user_id = $1', "phone IS NOT NULL", "phone <> ''"];
    const params = [organizationId];

    if (Array.isArray(audience?.tags) && audience.tags.length) {
      params.push(audience.tags);
      conditions.push(`tags && $${params.length}::text[]`);
    }

    const result = await query(
      `SELECT id, name, phone FROM customers WHERE ${conditions.join(' AND ')}`,
      params
    );

    const explicitPhones = Array.isArray(audience?.phones) ? audience.phones : [];
    const seen = new Set(result.rows.map(row => row.phone));
    explicitPhones.forEach(phone => {
      if (phone && !seen.has(phone)) {
        seen.add(phone);
        result.rows.push({ id: null, name: null, phone });
      }
    });

    return result.rows;
  }

  async sendBroadcast(user, id) {
    const organizationId = userIdFrom(user);
    const broadcast = await this.get('broadcasts', user, id);
    if (!broadcast) return null;

    if (broadcast.status === 'sending' || broadcast.status === 'sent') {
      const err = new Error('This broadcast has already been sent.');
      err.statusCode = 409;
      throw err;
    }

    const recipients = await this.resolveAudience(organizationId, broadcast.audience);
    if (!recipients.length) {
      const err = new Error('No recipients match this broadcast audience.');
      err.statusCode = 400;
      throw err;
    }

    await query(`UPDATE broadcasts SET status = 'sending', updated_at = NOW() WHERE id = $1`, [id]);

    let sent = 0;
    let failed = 0;
    for (const recipient of recipients) {
      try {
        await whatsappService.sendMessage(organizationId, recipient.phone, broadcast.message_body, false);
        sent += 1;
      } catch (err) {
        failed += 1;
      }
    }

    const result = await query(
      `UPDATE broadcasts
       SET status = 'sent', sent_count = $1, failed_count = $2, scheduled_at = COALESCE(scheduled_at, NOW()), updated_at = NOW()
       WHERE id = $3 AND organization_id = $4
       RETURNING *`,
      [sent, failed, id, organizationId]
    );

    await recordActivity(organizationId, userIdFrom(user), {
      activity_type: 'broadcast_sent',
      title: `Broadcast "${broadcast.name}" sent`,
      metadata: { broadcast_id: id, sent, failed, total: recipients.length },
    }).catch(() => {});

    return result.rows[0];
  }

  async analyticsSummary(user) {
    const organizationId = userIdFrom(user);
    const [messages, contacts, leads, campaigns, opportunities, conversations] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM conversation_messages WHERE user_id = $1`, [organizationId]),
      query(`SELECT COUNT(*) AS total FROM customers WHERE user_id = $1`, [organizationId]),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'won') AS won FROM leads WHERE organization_id = $1`, [organizationId]),
      query(`SELECT COUNT(*) AS total, COALESCE(SUM((metrics->>'sent')::INT), 0) AS sent FROM campaigns WHERE organization_id = $1`, [organizationId]),
      query(`SELECT COALESCE(SUM(value), 0) AS pipeline_value, COUNT(*) FILTER (WHERE status = 'won') AS won_deals FROM opportunities WHERE organization_id = $1`, [organizationId]),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE ai_status = 'ai_handled') AS ai, COUNT(*) FILTER (WHERE ai_status = 'human_takeover') AS human FROM conversations WHERE user_id = $1`, [organizationId]),
    ]);

    return {
      messages: Number(messages.rows[0]?.total || 0),
      contacts: Number(contacts.rows[0]?.total || 0),
      leads: Number(leads.rows[0]?.total || 0),
      leads_won: Number(leads.rows[0]?.won || 0),
      campaigns: Number(campaigns.rows[0]?.total || 0),
      campaign_messages_sent: Number(campaigns.rows[0]?.sent || 0),
      pipeline_value: Number(opportunities.rows[0]?.pipeline_value || 0),
      won_deals: Number(opportunities.rows[0]?.won_deals || 0),
      conversations: Number(conversations.rows[0]?.total || 0),
      ai_conversations: Number(conversations.rows[0]?.ai || 0),
      human_conversations: Number(conversations.rows[0]?.human || 0),
    };
  }
}

module.exports = new ProductSuiteService();
