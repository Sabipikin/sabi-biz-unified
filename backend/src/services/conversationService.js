const { query } = require('../config/db');
const conversationEngine = require('./conversationEngine');
const whatsappService = require('./whatsappService');

class ConversationService {
  async list(userId) {
    const result = await query(
      `SELECT c.*,
              cu.name AS customer_name,
              cu.phone AS customer_phone,
              cm.message_text AS last_message_text,
              cm.sender_type AS last_sender_type,
              stats.message_count,
              stats.ai_message_count
       FROM conversations c
       LEFT JOIN customers cu ON cu.id = c.customer_id
       LEFT JOIN LATERAL (
         SELECT message_text, sender_type
         FROM conversation_messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
       ) cm ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS message_count,
                COUNT(*) FILTER (WHERE sender_type = 'ai') AS ai_message_count
         FROM conversation_messages
         WHERE conversation_id = c.id
       ) stats ON true
       WHERE c.user_id = $1
       ORDER BY c.last_message_at DESC
       LIMIT 100`,
      [userId]
    );

    const summary = {
      active_chats: 0,
      ai_handled_chats: 0,
      human_takeover: 0,
      unread_messages: 0,
    };

    result.rows.forEach(row => {
      if (row.status === 'active') summary.active_chats += 1;
      if (row.status === 'open') summary.active_chats += 1;
      if (row.ai_status === 'ai_handled') summary.ai_handled_chats += 1;
      if (row.ai_status === 'human_takeover' || row.status === 'needs_human' || row.human_state === 'human_assigned' || row.human_state === 'human_escalated') summary.human_takeover += 1;
      summary.unread_messages += Number(row.unread_count || 0);
    });

    return {
      summary,
      conversations: result.rows,
    };
  }

  async create(userId, data = {}) {
    const externalPhone = String(data.external_contact_phone || data.phone || '').replace(/[^0-9+]/g, '').replace(/^\+/, '');
    if (!externalPhone) {
      throw new Error('Customer phone is required');
    }

    let customerId = data.customer_id || null;
    if (!customerId && data.customer_name) {
      const customerResult = await query(
        `INSERT INTO customers (user_id, name, phone, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [userId, data.customer_name, externalPhone]
      );
      customerId = customerResult.rows[0]?.id || null;
    }

    const result = await query(
      `INSERT INTO conversations (
         user_id, customer_id, whatsapp_account_id, channel, external_contact_phone,
         contact_name, status, ai_status, assigned_to, ai_enabled, human_state,
         last_message_at, unread_count, metadata, created_at, updated_at
       )
       VALUES ($1, $2, $3, 'whatsapp', $4, $5, 'open', 'ai_handled', $6, $7, 'ai_active',
               NOW(), 0, $8::jsonb, NOW(), NOW())
       RETURNING *`,
      [
        userId,
        customerId,
        data.whatsapp_account_id || null,
        externalPhone,
        data.contact_name || data.customer_name || null,
        data.assigned_to || null,
        data.ai_enabled !== false,
        JSON.stringify(data.metadata || {}),
      ]
    );
    return result.rows[0];
  }

  async getById(userId, conversationId) {
    const conversationResult = await query(
      `SELECT c.*, cu.name AS customer_name, cu.phone AS customer_phone, cu.email AS customer_email
       FROM conversations c
       LEFT JOIN customers cu ON cu.id = c.customer_id
       WHERE c.id = $1 AND c.user_id = $2
       LIMIT 1`,
      [conversationId, userId]
    );

    const conversation = conversationResult.rows[0] || null;
    if (!conversation) return null;

    const [messagesResult, aiResult] = await Promise.all([
      query(
        `SELECT id, direction, sender_type, message_text, is_read, metadata, created_at
         FROM conversation_messages
         WHERE conversation_id = $1 AND user_id = $2
         ORDER BY created_at ASC`,
        [conversationId, userId]
      ),
      query(
        `SELECT id, model, intent, response_text, invoice_draft, escalated, status, created_at
         FROM ai_interactions
         WHERE conversation_id = $1 AND user_id = $2
         ORDER BY created_at DESC
         LIMIT 20`,
        [conversationId, userId]
      ),
    ]);

    await query(
      `UPDATE conversations SET unread_count = 0, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
    await query(
      `UPDATE conversation_messages SET is_read = true
       WHERE conversation_id = $1 AND user_id = $2 AND direction = 'inbound'`,
      [conversationId, userId]
    );

    return {
      ...conversation,
      messages: messagesResult.rows,
      ai_interactions: aiResult.rows,
    };
  }

  async assign(userId, conversationId, assignedTo = null) {
    const result = await query(
      `UPDATE conversations
       SET assigned_to = COALESCE($1, $2),
           ai_status = 'human_takeover',
           status = 'needs_human',
           human_state = 'human_assigned',
           ai_enabled = false,
           updated_at = NOW()
       WHERE id = $3 AND user_id = $2
       RETURNING *`,
      [assignedTo, userId, conversationId]
    );
    return result.rows[0] || null;
  }

  async close(userId, conversationId) {
    const result = await query(
      `UPDATE conversations
       SET status = 'resolved',
           human_state = CASE WHEN human_state = 'ai_active' THEN human_state ELSE 'human_assigned' END,
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [conversationId, userId]
    );
    return result.rows[0] || null;
  }

  async resumeAi(userId, conversationId) {
    const result = await query(
      `UPDATE conversations
       SET ai_status = 'ai_handled',
           status = 'open',
           human_state = 'ai_active',
           ai_enabled = true,
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [conversationId, userId]
    );
    return result.rows[0] || null;
  }

  async addNote(userId, conversationId, note) {
    const payload = {
      note,
      user_id: userId,
      created_at: new Date().toISOString(),
    };
    const result = await query(
      `UPDATE conversations
       SET internal_notes = internal_notes || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [JSON.stringify([payload]), conversationId, userId]
    );
    return result.rows[0] || null;
  }

  async updateTags(userId, conversationId, tags = []) {
    const normalized = Array.isArray(tags)
      ? tags.map(tag => String(tag).trim()).filter(Boolean).slice(0, 12)
      : String(tags).split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 12);
    const result = await query(
      `UPDATE conversations
       SET tags = $1::text[],
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [normalized, conversationId, userId]
    );
    return result.rows[0] || null;
  }

  async reply(userId, conversationId, messageText, useAI = false) {
    const conversationResult = await query(
      `SELECT * FROM conversations WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [conversationId, userId]
    );
    const conversation = conversationResult.rows[0] || null;
    if (!conversation) return null;

    const senderType = useAI ? 'ai' : 'agent';
    const storedMessage = await conversationEngine.addMessage({
      userId,
      conversationId,
      direction: 'outbound',
      senderType,
      messageText,
      isRead: true,
    });

    await whatsappService.sendMessage(userId, conversation.external_contact_phone, messageText, useAI);

    await query(
      `UPDATE conversations
       SET ai_status = $1,
           status = 'open',
           human_state = $2,
           ai_enabled = $3,
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5`,
      [useAI ? 'ai_handled' : 'human_takeover', useAI ? 'ai_active' : 'human_assigned', useAI, conversationId, userId]
    );

    return storedMessage;
  }
}

module.exports = new ConversationService();
