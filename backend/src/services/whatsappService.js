// backend/src/services/whatsappService.js

const axios = require('axios');
const { query } = require('../config/db');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

class WhatsAppService {
  async handleWebhook(payload) {
    logger.info('Received WhatsApp webhook payload');

    const entries = payload.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value || {};
        const messages = value.messages || [];
        for (const message of messages) {
          await this.saveIncomingMessage(message);
        }
      }
    }
  }

  async saveIncomingMessage(message) {
    const { from, id, timestamp, text } = message;
    const messageText = text?.body || null;

    await query(
      `INSERT INTO whatsapp_messages (id, from_phone, message_text, message_type, is_incoming, created_at)
       VALUES ($1, $2, $3, $4, true, TO_TIMESTAMP($5::double precision))`,
      [uuidv4(), from, messageText, 'text', timestamp]
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

    if (process.env.WHATSAPP_TOKEN && process.env.PHONE_NUMBER_ID) {
      try {
        const url = `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`;
        await axios.post(url, {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: { body: messageText },
        }, {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });
        logger.info(`Sent WhatsApp message to ${formattedPhone}`);
      } catch (err) {
        logger.error('WhatsApp API send failed:', err.message);
      }
    }

    return result.rows[0];
  }
}

module.exports = new WhatsAppService();
