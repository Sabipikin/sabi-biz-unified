const logger = require('../config/logger');

class ConditionEvaluator {
  async evaluate(configuration = {}, context = {}) {
    const { condition_type } = configuration || {};
    try {
      switch (condition_type) {
        case 'contact_tag': {
          const tag = configuration.tag;
          const contact = context.contact || {};
          return Array.isArray(contact.tags) && contact.tags.includes(tag);
        }
        case 'lead_score': {
          const min = Number(configuration.min || 0);
          const lead = context.lead || {};
          return Number(lead.score || 0) >= min;
        }
        case 'lead_status': {
          const status = configuration.status;
          const lead = context.lead || {};
          return lead.status === status;
        }
        case 'message_contains': {
          const keyword = (configuration.keyword || '').toLowerCase();
          const message = (context.message && (context.message.text?.body || context.message.text)) || '';
          return message.toLowerCase().includes(keyword);
        }
        default:
          return false;
      }
    } catch (err) {
      logger.error('Condition evaluation error', err);
      return false;
    }
  }
}

module.exports = new ConditionEvaluator();
