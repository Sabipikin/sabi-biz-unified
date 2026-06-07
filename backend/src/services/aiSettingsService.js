const { query } = require('../config/db');

const allowedTones = new Set(['Friendly', 'Professional', 'Sales-focused']);
const allowedLanguages = new Set(['English', 'Pidgin', 'Yoruba', 'Hausa', 'Igbo']);

function normalizeArray(value, fallback = []) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean);
  return fallback;
}

class AiSettingsService {
  async get(userId) {
    const result = await query(
      `INSERT INTO ai_settings (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING *`,
      [userId]
    );
    if (result.rows[0]) return result.rows[0];

    const existing = await query('SELECT * FROM ai_settings WHERE user_id = $1 LIMIT 1', [userId]);
    return existing.rows[0] || null;
  }

  async save(userId, data = {}) {
    const tone = allowedTones.has(data.tone) ? data.tone : 'Friendly';
    const language = allowedLanguages.has(data.language) ? data.language : 'English';
    const result = await query(
      `INSERT INTO ai_settings (
         user_id, enabled, assistant_name, business_context, business_category,
         tone, language, business_hours, escalation_enabled, escalation_keywords,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::text[], NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         assistant_name = EXCLUDED.assistant_name,
         business_context = EXCLUDED.business_context,
         business_category = EXCLUDED.business_category,
         tone = EXCLUDED.tone,
         language = EXCLUDED.language,
         business_hours = EXCLUDED.business_hours,
         escalation_enabled = EXCLUDED.escalation_enabled,
         escalation_keywords = EXCLUDED.escalation_keywords,
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        data.enabled !== false,
        data.assistant_name || 'Sabi Assistant',
        data.business_context || null,
        data.business_category || null,
        tone,
        language,
        JSON.stringify(data.business_hours || {}),
        data.escalation_enabled !== false,
        normalizeArray(data.escalation_keywords, ['human', 'agent', 'complaint', 'refund']),
      ]
    );
    return result.rows[0];
  }
}

module.exports = new AiSettingsService();
