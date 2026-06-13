const { query, getClient } = require('../config/db');
const { getIo } = require('../config/socket');
const logger = require('../config/logger');
const aiContextGenerator = require('./aiContextGenerator');
const conversationAIService = require('./ConversationAIService');
const billingService = require('./billingService');
const entitlementService = require('./subscriptionEntitlementService');

function normalizePhone(phone = '') {
  return String(phone || '').replace(/[^0-9+]/g, '').replace(/^\+/, '');
}

function money(value) {
  return `NGN ${Number(value || 0).toLocaleString()}`;
}

function classifyIntent(messageText = '') {
  const text = messageText.toLowerCase();
  if (/(agent|human|person|manager|complain|complaint|refund|angry|upset)/.test(text)) return 'escalate';
  if (/(invoice|bill|receipt|quote|quotation|order)/.test(text)) return 'invoice_draft';
  if (/(recommend|suggest|best|which|advice)/.test(text)) return 'recommendation';
  if (/(price|cost|how much|amount|rate)/.test(text)) return 'price_quote';
  if (/(available|stock|inventory|have it|in stock)/.test(text)) return 'availability';
  return 'product_question';
}

function findMentionedProducts(messageText, products) {
  const text = String(messageText || '').toLowerCase();
  return products.filter(product => text.includes(String(product.product_name || '').toLowerCase()));
}

function buildInvoiceDraft(customer, messageText, products) {
  const mentioned = findMentionedProducts(messageText, products).slice(0, 5);
  if (!mentioned.length) return null;

  const items = mentioned.map(product => ({
    inventory_id: product.id,
    product_name: product.product_name,
    quantity: 1,
    unit_price: Number(product.unit_price || 0),
    total_price: Number(product.unit_price || 0),
  }));

  return {
    customer_name: customer?.name || 'WhatsApp lead',
    customer_phone: customer?.phone || null,
    status: 'draft',
    amount: items.reduce((sum, item) => sum + item.total_price, 0),
    invoice_items: items,
    source: 'ai_whatsapp_conversation',
  };
}

function buildFallbackResponse(context, messageText, intent, invoiceDraft) {
  const products = context.products || [];
  const businessName = context.business_name || 'our business';
  const mentioned = findMentionedProducts(messageText, products);

  if (intent === 'escalate') {
    return {
      text: `Thanks for reaching out. I am handing this over to a human agent from ${businessName} so they can help properly.`,
      escalated: true,
    };
  }

  if (invoiceDraft) {
    const lines = invoiceDraft.invoice_items.map(item => `${item.product_name} - ${money(item.unit_price)}`);
    return {
      text: `I can draft that invoice for you. Here is the quote:\n${lines.join('\n')}\nTotal: ${money(invoiceDraft.amount)}\nA team member can confirm and send the final invoice.`,
      escalated: false,
    };
  }

  if (mentioned.length) {
    const lines = mentioned.map(product => {
      const stock = Number(product.quantity || 0) > 0 ? `${product.quantity} available` : 'currently out of stock';
      return `${product.product_name}: ${money(product.unit_price)} (${stock})`;
    });
    return {
      text: `Here are the details from ${businessName}:\n${lines.join('\n')}`,
      escalated: false,
    };
  }

  if (products.length) {
    const available = products.filter(product => Number(product.quantity || 0) > 0).slice(0, 4);
    const list = available.map(product => `${product.product_name} at ${money(product.unit_price)}`).join(', ');
    return {
      text: `Thanks for messaging ${businessName}. We can help with product questions, prices, recommendations, and invoice drafts. Popular available items include: ${list}.`,
      escalated: false,
    };
  }

  return {
    text: `Thanks for messaging ${businessName}. A team member will follow up with product and pricing details shortly.`,
    escalated: true,
  };
}

function buildPrompt(context, messageText, intent) {
  return [
    `You are an AI sales assistant for ${context.business_name}.`,
    'Use only the supplied business context. Be concise, friendly, and sales-oriented.',
    'You can answer product questions, quote prices, recommend products, draft invoice summaries, capture leads, and escalate when a human is needed.',
    'If inventory is unavailable, say so clearly. Never invent prices or stock.',
    `Detected intent: ${intent}`,
    `Customer message: ${messageText}`,
  ].join('\n');
}

class ConversationEngine {
  async resolveTenantFromWebhookValue(value = {}) {
    const metadata = value.metadata || {};
    const phoneNumberId = metadata.phone_number_id || null;
    const displayPhone = normalizePhone(metadata.display_phone_number || '');

    if (phoneNumberId) {
      const byPhoneNumberId = await query(
        `SELECT user_id AS id FROM whatsapp_accounts
         WHERE phone_number_id = $1 AND status = 'connected'
         ORDER BY updated_at DESC
         LIMIT 1`,
        [phoneNumberId]
      );
      if (byPhoneNumberId.rows[0]) return byPhoneNumberId.rows[0].id;

      const legacyByPhoneNumberId = await query(
        `SELECT id FROM users
         WHERE whatsapp_phone_number_id = $1 OR whatsapp_phone = $1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [phoneNumberId]
      );
      if (legacyByPhoneNumberId.rows[0]) return legacyByPhoneNumberId.rows[0].id;
    }

    if (displayPhone) {
      const byDisplayPhone = await query(
        `SELECT id FROM users
         WHERE regexp_replace(COALESCE(whatsapp_phone, phone, ''), '[^0-9]', '', 'g') = $1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [displayPhone]
      );
      if (byDisplayPhone.rows[0]) return byDisplayPhone.rows[0].id;
    }

    return null;
  }

  async handleIncomingWhatsAppMessage(userId, message, contact = {}) {
    const fromPhone = normalizePhone(message.from);
    const messageText = message.text?.body || message.button?.text || message.interactive?.button_reply?.title || '';
    if (!userId || !fromPhone || !messageText) {
      return null;
    }

    const customer = await this.findOrCreateLead(userId, fromPhone, contact);
    const conversation = await this.findOrCreateConversation(userId, customer, fromPhone, contact);
    const inboundMessage = await this.addMessage({
      userId,
      conversationId: conversation.id,
      direction: 'inbound',
      senderType: 'customer',
      messageText,
      externalMessageId: message.id,
      isRead: false,
      metadata: { whatsapp_timestamp: message.timestamp },
    });

    const aiResult = await this.runAiWorkflow(userId, conversation.id, customer, inboundMessage, messageText);

    return {
      conversation,
      inboundMessage,
      aiResult,
    };
  }

  async findOrCreateLead(userId, phone, contact = {}) {
    const existing = await aiContextGenerator.getCustomerByPhone(userId, phone);
    if (existing) return existing;

    const profileName = contact.profile?.name || contact.wa_id || `WhatsApp lead ${phone}`;
    const result = await query(
      `INSERT INTO customers (user_id, name, phone, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, name, phone, email, created_at, updated_at`,
      [userId, profileName, phone]
    );
    return result.rows[0];
  }

  async findOrCreateConversation(userId, customer, phone, contact = {}) {
    const existing = await query(
      `SELECT * FROM conversations
       WHERE user_id = $1 AND channel = 'whatsapp' AND external_contact_phone = $2 AND status NOT IN ('closed', 'resolved', 'archived')
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId, phone]
    );
    if (existing.rows[0]) return existing.rows[0];

    const result = await query(
      `INSERT INTO conversations (
         user_id, customer_id, channel, external_contact_phone, contact_name,
         status, ai_status, ai_enabled, human_state, last_message_at, unread_count, metadata, created_at, updated_at
       )
       VALUES ($1, $2, 'whatsapp', $3, $4, 'open', 'ai_handled', true, 'ai_active', NOW(), 0, $5::jsonb, NOW(), NOW())
       RETURNING *`,
      [
        userId,
        customer?.id || null,
        phone,
        customer?.name || contact.profile?.name || null,
        JSON.stringify({ wa_id: contact.wa_id || null }),
      ]
    );
    return result.rows[0];
  }

  async addMessage({ userId, conversationId, direction, senderType, messageText, externalMessageId = null, isRead = true, metadata = {}, messageType = 'text' }) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const messageResult = await client.query(
        `INSERT INTO conversation_messages (
           conversation_id, user_id, direction, sender_type, message_text,
           external_message_id, is_read, metadata, message_type, ai_generated, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, NOW())
         RETURNING *`,
        [conversationId, userId, direction, senderType, messageText, externalMessageId, isRead, JSON.stringify(metadata), messageType, senderType === 'ai']
      );

      const unreadIncrement = direction === 'inbound' && !isRead ? 1 : 0;
      await client.query(
        `UPDATE conversations
       SET last_message_at = NOW(),
             unread_count = unread_count + $1,
             updated_at = NOW()
         WHERE id = $2 AND user_id = $3`,
        [unreadIncrement, conversationId, userId]
      );
      await client.query('COMMIT');
      if (senderType === 'ai') {
        billingService.incrementUsage(userId, 'conversations', 1).catch(err => {
          logger.warn('Failed to increment AI conversation usage', { error: err.message, userId });
        });
      }

      const message = messageResult.rows[0];
      getIo()?.to(`user_${userId}`).emit('inbox:update', {
        conversationId,
        messageId: message.id,
        direction: message.direction,
        senderType: message.sender_type,
        messageText: message.message_text,
        createdAt: message.created_at,
      });

      return message;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async runAiWorkflow(userId, conversationId, customer, inboundMessage, messageText) {
    try {
      await entitlementService.validateAction(userId, {
        metricType: 'conversations',
        increment: 1,
        recommendedPlan: 'growth',
      });
    } catch (err) {
      logger.warn('AI generation blocked by subscription entitlement', { userId, conversationId, error: err.message });
      await query(
        `UPDATE conversations
         SET ai_status = 'human_takeover',
             status = 'needs_human',
             human_state = 'human_escalated',
             ai_enabled = false,
             updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [conversationId, userId]
      );
      return {
        responseText: null,
        outboundMessage: null,
        invoiceDraft: null,
        escalated: true,
        intent: 'subscription_limit',
        error: err.message,
      };
    }

    const context = await aiContextGenerator.generate(userId, customer?.id, conversationId);
    const intent = classifyIntent(messageText);
    const invoiceDraft = intent === 'invoice_draft'
      ? buildInvoiceDraft(customer, messageText, context.products || [])
      : null;
    const prompt = buildPrompt(context, messageText, intent);

    let model = 'rule-based-fallback';
    let responseText;
    let escalated = intent === 'escalate';
    let status = 'completed';
    let errorMessage = null;

    try {
      const aiConfig = await this.getAiConfig(userId);
      const apiKey = aiConfig?.openai_api_key || process.env.OPENAI_API_KEY;
      model = aiConfig?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

      if (apiKey) {
        const providerResult = await conversationAIService.generateReply({
          config: { apiKey, model },
          prompt,
          context,
        });
        responseText = providerResult.text;
      }
    } catch (err) {
      status = 'fallback';
      errorMessage = err.message;
      logger.warn('AI provider failed, using fallback response:', err.message);
    }

    if (!responseText) {
      const fallback = buildFallbackResponse(context, messageText, intent, invoiceDraft);
      responseText = fallback.text;
      escalated = escalated || fallback.escalated;
      if (status === 'completed') status = 'fallback';
    }

    if (escalated) {
      await query(
        `UPDATE conversations
         SET ai_status = 'human_takeover',
             status = 'needs_human',
             human_state = 'human_escalated',
             ai_enabled = false,
             updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [conversationId, userId]
      );
    }

    const outboundMessage = await this.addMessage({
      userId,
      conversationId,
      direction: 'outbound',
      senderType: 'ai',
      messageText: responseText,
      isRead: true,
      metadata: { intent, escalated },
    });

    await this.logAiInteraction({
      userId,
      conversationId,
      customerId: customer?.id || null,
      inboundMessageId: inboundMessage.id,
      model,
      intent,
      prompt,
      context,
      responseText,
      invoiceDraft,
      escalated,
      status,
      errorMessage,
    });

    return {
      responseText,
      outboundMessage,
      invoiceDraft,
      escalated,
      intent,
    };
  }

  async getAiConfig(userId) {
    const result = await query(
      `SELECT u.openai_api_key,
              COALESCE(c.model, 'gpt-4o-mini') AS model,
              COALESCE(c.temperature, 0.7) AS temperature,
              COALESCE(s.enabled, c.enabled, u.ai_enabled, true) AS enabled,
              s.assistant_name,
              s.business_context,
              s.tone,
              s.language,
              s.escalation_enabled,
              s.escalation_keywords
       FROM users u
       LEFT JOIN ai_configs c ON c.user_id = u.id
       LEFT JOIN ai_settings s ON s.user_id = u.id
       WHERE u.id = $1
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async logAiInteraction({ userId, conversationId, customerId, inboundMessageId, model, intent, prompt, context, responseText, invoiceDraft, escalated, status, errorMessage }) {
    const result = await query(
      `INSERT INTO ai_interactions (
         conversation_id, conversation_message_id, user_id, customer_id,
         provider, model, intent, prompt, context, response_text,
         invoice_draft, escalated, status, error_message, response, created_at
       )
       VALUES ($1, $2, $3, $4, 'openai', $5, $6, $7, $8::jsonb, $9, $10::jsonb, $11, $12, $13, $9, NOW())
       RETURNING *`,
      [
        conversationId,
        inboundMessageId,
        userId,
        customerId,
        model,
        intent,
        prompt,
        JSON.stringify(context),
        responseText,
        invoiceDraft ? JSON.stringify(invoiceDraft) : null,
        escalated,
        status,
        errorMessage,
      ]
    );
    return result.rows[0];
  }
}

module.exports = new ConversationEngine();
