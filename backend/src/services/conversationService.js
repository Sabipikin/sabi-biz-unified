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
      if (row.ai_status === 'ai_handled') summary.ai_handled_chats += 1;
      if (row.ai_status === 'human_takeover' || row.status === 'needs_human') summary.human_takeover += 1;
      summary.unread_messages += Number(row.unread_count || 0);
    });

    return {
      summary,
      conversations: result.rows,
    };
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
           updated_at = NOW()
       WHERE id = $3 AND user_id = $2
       RETURNING *`,
      [assignedTo, userId, conversationId]
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
           status = 'active',
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [useAI ? 'ai_handled' : 'human_takeover', conversationId, userId]
    );

    return storedMessage;
  }
}

module.exports = new ConversationService();
