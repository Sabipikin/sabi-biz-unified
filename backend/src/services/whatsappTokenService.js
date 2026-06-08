const axios = require('axios');
const logger = require('../config/logger');

const FB_GRAPH = 'https://graph.facebook.com';

class WhatsAppTokenService {
  async exchangeForLongLivedToken(shortLivedToken) {
    try {
      const clientId = process.env.WHATSAPP_CLIENT_ID;
      const clientSecret = process.env.WHATSAPP_CLIENT_SECRET;
      const resp = await axios.get(`${FB_GRAPH}/v17.0/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: clientId,
          client_secret: clientSecret,
          fb_exchange_token: shortLivedToken,
        },
      });

      // resp.data: { access_token, token_type, expires_in }
      return resp.data;
    } catch (err) {
      logger.error('Failed to exchange token for long-lived token', err?.response?.data || err.message);
      throw err;
    }
  }

  async inspectToken(accessToken) {
    try {
      const clientId = process.env.WHATSAPP_CLIENT_ID;
      const clientSecret = process.env.WHATSAPP_CLIENT_SECRET;
      const resp = await axios.get(`${FB_GRAPH}/debug_token`, {
        params: {
          input_token: accessToken,
          access_token: `${clientId}|${clientSecret}`,
        },
      });
      return resp.data;
    } catch (err) {
      logger.error('Failed to debug token', err?.response?.data || err.message);
      return null;
    }
  }
}

module.exports = new WhatsAppTokenService();
