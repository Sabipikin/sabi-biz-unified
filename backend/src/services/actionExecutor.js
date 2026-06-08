const whatsappService = require('./whatsappService');
const { query } = require('../config/db');
const logger = require('../config/logger');

class ActionExecutor {
  async executeAction(configuration = {}, context = {}) {
    const type = configuration.action_type;
    try {
      switch (type) {
        case 'send_message': {
          const to = configuration.to || (context.contact && context.contact.phone);
          const message = configuration.message || context.payload?.message || '';
          if (!to) throw new Error('No recipient');
          await whatsappService.sendMessage(context.organizationId || context.userId, to, message, false);
          return { success: true };
        }
        case 'create_lead': {
          const leadData = configuration.lead || {};
          const res = await query(`INSERT INTO leads (id, organization_id, name, phone, email, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) RETURNING id`, [context.organizationId, leadData.name || null, leadData.phone || null, leadData.email || null]);
          return { success: true, id: res.rows[0].id };
        }
        case 'update_lead': {
          const leadId = configuration.lead_id || (context.lead && context.lead.id);
          const updates = configuration.updates || {};
          if (!leadId) throw new Error('No lead id');
          await query(`UPDATE leads SET status = COALESCE($1, status), score = COALESCE($2, score), updated_at = NOW() WHERE id = $3`, [updates.status || null, updates.score || null, leadId]);
          return { success: true };
        }
        case 'assign_user': {
          const leadId = configuration.lead_id || (context.lead && context.lead.id);
          const userId = configuration.user_id;
          if (!leadId || !userId) throw new Error('Missing lead or user id');
          await query(`UPDATE leads SET owner_id = $1 WHERE id = $2`, [userId, leadId]);
          return { success: true };
        }
        case 'add_tag': {
          const contactId = configuration.contact_id || (context.contact && context.contact.id);
          const tag = configuration.tag;
          if (!contactId || !tag) throw new Error('Missing contact or tag');
          await query(`INSERT INTO contact_tags (id, contact_id, tag, created_at) VALUES (gen_random_uuid(), $1, $2, NOW())`, [contactId, tag]);
          return { success: true };
        }
        case 'create_task': {
          const task = configuration.task || {};
          await query(`INSERT INTO tasks (id, organization_id, title, description, assigned_to, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`, [context.organizationId, task.title || 'Task', task.description || null, task.assigned_to || null]);
          return { success: true };
        }
        case 'notify_user': {
          // fire a simple notification record
          await query(`INSERT INTO notifications (id, user_id, organization_id, type, message, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`, [configuration.user_id || context.userId, context.organizationId, configuration.notification_type || 'workflow', configuration.message || 'You have a notification']);
          return { success: true };
        }
        default:
          throw new Error('Unknown action type');
      }
    } catch (err) {
      logger.error('Action execution failed', err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new ActionExecutor();
