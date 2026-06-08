const { query } = require('../config/db');
const logger = require('../config/logger');
const whatsappTokenService = require('./whatsappTokenService');
const whatsappAccountService = require('./whatsappAccountService');
const cryptoConfig = require('../config/crypto');

class TokenRefresher {
  // Find accounts with tokens expiring within `days` and attempt refresh
  async refreshExpiringTokens({ days = 7, limit = 100 } = {}) {
    try {
      // Ensure master key is initialized so we can encrypt/decrypt tokens
      try { await cryptoConfig.initMasterKey(); } catch (e) { logger.debug('crypto init failed', e?.message || e); }
      const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const res = await query(
        `SELECT id, user_id, access_token, token_expires_at
         FROM whatsapp_accounts
         WHERE access_token IS NOT NULL AND token_expires_at IS NOT NULL
           AND token_expires_at <= $1
         ORDER BY token_expires_at ASC
         LIMIT $2`,
        [cutoff, limit]
      );

      const accounts = res.rows || [];
      logger.info(`TokenRefresher: found ${accounts.length} expiring account(s) within ${days} days`);

      for (const acct of accounts) {
        try {
          const exchanged = await whatsappTokenService.exchangeForLongLivedToken(acct.access_token);
          if (exchanged && exchanged.access_token) {
            const newExpires = exchanged.expires_in ? new Date(Date.now() + exchanged.expires_in * 1000) : null;
            await whatsappAccountService.update(acct.user_id, acct.id, {
              access_token: exchanged.access_token,
              token_expires_at: newExpires,
              token_type: exchanged.token_type || null,
              token_last_refreshed: new Date(),
              note: 'Automated scheduled refresh',
            });
            logger.info(`TokenRefresher: refreshed token for account ${acct.id}`);
          } else {
            logger.warn(`TokenRefresher: no token returned for account ${acct.id}`);
          }
        } catch (err) {
          logger.warn(`TokenRefresher: failed to refresh token for account ${acct.id}: ${err.message || err}`);
        }
      }

      return { success: true, refreshed: accounts.length };
    } catch (err) {
      logger.error('TokenRefresher failed', err?.message || err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new TokenRefresher();
