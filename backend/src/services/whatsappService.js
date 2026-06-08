// backend/src/services/whatsappService.js

const axios = require('axios');
const { query } = require('../config/db');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');
const conversationEngine = require('./conversationEngine');
const whatsappAccountService = require('./whatsappAccountService');
const triggerEngine = require('./triggerEngine');
const whatsappTokenService = require('./whatsappTokenService');

class WhatsAppService {
  async handleWebhook(payload) {
    logger.info('Received WhatsApp webhook payload');

    const entries = payload.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value || {};
        const messages = value.messages || [];
        const contacts = value.contacts || [];
        const userId = await conversationEngine.resolveTenantFromWebhookValue(value);

        if (!userId && messages.length) {
          logger.warn('WhatsApp webhook could not be mapped to a tenant');
        }

        for (const message of messages) {
          if (!userId) {
            continue;
          }

          const contact = contacts.find(item => item.wa_id === message.from) || {};
          await this.saveIncomingMessage(userId, message);
          const workflow = await conversationEngine.handleIncomingWhatsAppMessage(userId, message, contact);

          // Emit message.received trigger for workflows
          try {
            triggerEngine.emitTrigger('message.received', { organizationId: userId, userId, message, contact, workflow });
          } catch (err) {
            logger.error('Failed to emit message.received trigger', err);
          }

          if (workflow?.aiResult?.responseText) {
            await this.sendMessage(userId, message.from, workflow.aiResult.responseText, true);
          }
        }
      }
    }
  }

  async saveIncomingMessage(userId, message) {
    const { from, id, timestamp, text } = message;
    const messageText = text?.body || null;

    await query(
      `INSERT INTO whatsapp_messages (id, user_id, from_phone, message_text, message_type, message_id, is_incoming, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, TO_TIMESTAMP($7::double precision))`,
      [uuidv4(), userId, from, messageText, 'text', id, timestamp]
    );

    logger.info(`Saved incoming WhatsApp message from ${from}`);
  }

  async sendMessage(userId, toPhone, messageText, useAI = false) {
    if (!toPhone || !messageText) {
      throw new Error('toPhone and message are required');
    }

    const formattedPhone = toPhone.replace(/\D/g, '');
    const now = new Date();

    const result = await query(
      `INSERT INTO whatsapp_messages (id, user_id, to_phone, message_text, message_type, is_from_ai, is_incoming, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, false, 'sent', $7)
       RETURNING *`,
      [uuidv4(), userId, formattedPhone, messageText, 'text', useAI, now]
    );

    logger.info(`Stored outgoing WhatsApp message to ${formattedPhone}`);

    const account = await whatsappAccountService.findConnectedForUser(userId);
    if (account?.access_token && account?.phone_number_id) {
      // Ensure token freshness: refresh if expired or near expiry (within 48 hours)
      try {
        const now = new Date();
        const nearlyExpired = account.token_expires_at ? (new Date(account.token_expires_at) - now) < (48 * 60 * 60 * 1000) : false;
        if (nearlyExpired) {
          try {
            const exchanged = await whatsappTokenService.exchangeForLongLivedToken(account.access_token);
            if (exchanged && exchanged.access_token) {
              const newExpires = exchanged.expires_in ? new Date(Date.now() + exchanged.expires_in * 1000) : null;
              await whatsappAccountService.update(userId, account.id, {
                access_token: exchanged.access_token,
                token_expires_at: newExpires,
                token_type: exchanged.token_type || null,
                token_last_refreshed: new Date(),
                note: 'Automated token refresh',
              });
              account.access_token = exchanged.access_token;
              account.token_expires_at = newExpires;
            }
          } catch (err) {
            logger.warn('Failed to refresh WhatsApp access token', err?.message || err);
          }
        }
      } catch (err) {
        logger.debug('Token refresh check failed', err?.message || err);
      }
      try {
        const url = `https://graph.facebook.com/v17.0/${account.phone_number_id}/messages`;
        await axios.post(url, {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: { body: messageText },
        }, {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        logger.info(`Sent WhatsApp message to ${formattedPhone}`);
      } catch (err) {
        logger.error('WhatsApp API send failed:', err.message);
      }
    } else {
      logger.info('No connected WhatsApp account found; message stored for later delivery.');
    }

    return result.rows[0];
  }
}

module.exports = new WhatsAppService();
