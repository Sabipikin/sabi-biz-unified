const crypto = require('crypto');
const { query } = require('../config/db');
const logger = require('../config/logger');

const STATE_SECRET = process.env.WHATSAPP_STATE_SECRET || process.env.JWT_SECRET || process.env.APP_SECRET || 'change-me';
const STATE_TTL_MIN = parseInt(process.env.WHATSAPP_STATE_TTL_MIN || '15', 10);

function makeNonce(len = 32) {
  return crypto.randomBytes(len).toString('hex');
}

function hmacFor(id, nonce) {
  return crypto.createHmac('sha256', STATE_SECRET).update(`${id}:${nonce}`).digest('hex');
}

class OAuthStateService {
  async create(userId) {
    const nonce = makeNonce(16);
    const expiresAt = new Date(Date.now() + STATE_TTL_MIN * 60 * 1000);
    const result = await query(
      `INSERT INTO oauth_states (nonce, user_id, expires_at) VALUES ($1, $2, $3) RETURNING id, nonce, user_id, expires_at, created_at`,
      [nonce, userId, expiresAt]
    );
    const row = result.rows[0];
    const sig = hmacFor(row.id, row.nonce);
    const token = Buffer.from(`${row.id}:${sig}`).toString('base64');
    return { token, id: row.id, expires_at: row.expires_at };
  }

  async verifyAndConsume(stateToken) {
    if (!stateToken) return null;
    let decoded;
    try {
      decoded = Buffer.from(String(stateToken), 'base64').toString('utf8');
    } catch (err) {
      return null;
    }
    const parts = decoded.split(':');
    if (parts.length !== 2) return null;
    const [id, sig] = parts;

    const res = await query(`SELECT id, nonce, user_id, used, expires_at FROM oauth_states WHERE id = $1`, [id]);
    const row = res.rows[0];
    if (!row) return null;
    if (row.used) return null;
    if (row.expires_at && new Date(row.expires_at) < new Date()) return null;

    const expected = hmacFor(row.id, row.nonce);
    try {
      const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
      if (!ok) return null;
    } catch (err) {
      return null;
    }

    // mark consumed
    await query(`UPDATE oauth_states SET used = true WHERE id = $1`, [row.id]);
    return row.user_id;
  }
}

module.exports = new OAuthStateService();
