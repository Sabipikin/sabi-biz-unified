const axios = require('axios');
const logger = require('../config/logger');

const FB_GRAPH = 'https://graph.facebook.com';
const FB_API_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v17.0';

class WhatsAppTokenService {
  async exchangeForLongLivedToken(shortLivedToken) {
    try {
      const clientId = process.env.WHATSAPP_CLIENT_ID;
      const clientSecret = process.env.WHATSAPP_CLIENT_SECRET;
      const resp = await axios.get(`${FB_GRAPH}/${FB_API_VERSION}/oauth/access_token`, {
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

  // Subscribe SabiReply's app to webhook events for a WhatsApp Business Account
  async subscribeAppToWaba(wabaId, accessToken) {
    try {
      const resp = await axios.post(`${FB_GRAPH}/${FB_API_VERSION}/${wabaId}/subscribed_apps`, {}, {
        params: { access_token: accessToken },
      });
      return resp.data;
    } catch (err) {
      logger.error('Failed to subscribe app to WABA webhooks', err?.response?.data || err.message);
      return null;
    }
  }

  // Check which apps are currently subscribed to webhook events for a WABA
  async getSubscribedApps(wabaId, accessToken) {
    try {
      const resp = await axios.get(`${FB_GRAPH}/${FB_API_VERSION}/${wabaId}/subscribed_apps`, {
        params: { access_token: accessToken },
      });
      return resp.data?.data || [];
    } catch (err) {
      logger.error('Failed to fetch subscribed apps for WABA', err?.response?.data || err.message);
      return null;
    }
  }

  // Fetch phone number details (verified name, quality rating) for diagnostics
  async getPhoneNumberDetails(phoneNumberId, accessToken) {
    try {
      const resp = await axios.get(`${FB_GRAPH}/${FB_API_VERSION}/${phoneNumberId}`, {
        params: {
          access_token: accessToken,
          fields: 'display_phone_number,verified_name,quality_rating,code_verification_status',
        },
      });
      return resp.data;
    } catch (err) {
      logger.error('Failed to fetch phone number details', err?.response?.data || err.message);
      return null;
    }
  }
}

module.exports = new WhatsAppTokenService();
