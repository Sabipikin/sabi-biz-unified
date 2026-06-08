// backend/src/routes/whatsapp.js

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const { authMiddleware } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');
const whatsappAccountService = require('../services/whatsappAccountService');
const oauthStateService = require('../services/oauthStateService');
const whatsappTokenService = require('../services/whatsappTokenService');
const whatsappOnboardingService = require('../services/whatsappOnboardingService');
const { checkSubscription, checkPlanFeature, checkUsageLimit, enforceWritableWorkspace } = require('../middleware/subscription');
const logger = require('../config/logger');

const FB_GRAPH = 'https://graph.facebook.com';
const FB_API_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v17.0';

function getBackendUrl() {
  return (process.env.BACKEND_URL || '').replace(/\/+$/, '');
}

function getEmbeddedSignupConfig() {
  const appId = process.env.WHATSAPP_CLIENT_ID || process.env.META_APP_ID;
  const configId = process.env.WHATSAPP_EMBEDDED_CONFIG_ID || process.env.META_EMBEDDED_SIGNUP_CONFIG_ID;
  const redirectUri = `${getBackendUrl()}/api/whatsapp/oauth/callback`;
  const missing = [];

  if (!appId) missing.push('WHATSAPP_CLIENT_ID');
  if (!process.env.WHATSAPP_CLIENT_SECRET) missing.push('WHATSAPP_CLIENT_SECRET');
  if (!configId) missing.push('WHATSAPP_EMBEDDED_CONFIG_ID');
  if (!getBackendUrl()) missing.push('BACKEND_URL');

  return {
    appId,
    configId,
    graphVersion: FB_API_VERSION,
    redirectUri,
    scope: 'whatsapp_business_messaging,whatsapp_business_management,business_management',
    missing,
    ready: missing.length === 0,
  };
}

function pickFirstPhoneNumber(waba) {
  const numbers = waba?.phone_numbers?.data || waba?.phone_numbers || [];
  return Array.isArray(numbers) && numbers.length ? numbers[0] : null;
}

async function getAccessTokenFromCode(code, redirectUri) {
  const tokenResp = await axios.get(`${FB_GRAPH}/${FB_API_VERSION}/oauth/access_token`, {
    params: {
      client_id: process.env.WHATSAPP_CLIENT_ID,
      client_secret: process.env.WHATSAPP_CLIENT_SECRET,
      redirect_uri: redirectUri,
      code,
    },
  });

  const accessToken = tokenResp.data && tokenResp.data.access_token;
  if (!accessToken) {
    throw new Error('Meta did not return an access token');
  }

  return accessToken;
}

async function exchangeForFinalToken(accessToken) {
  let finalAccessToken = accessToken;
  const tokenMeta = {};

  try {
    const exchanged = await whatsappTokenService.exchangeForLongLivedToken(accessToken);
    if (exchanged && exchanged.access_token) {
      finalAccessToken = exchanged.access_token;
      tokenMeta.token_type = exchanged.token_type || null;
      tokenMeta.expires_in = exchanged.expires_in || null;
    }
  } catch (err) {
    logger.warn('Long-lived token exchange failed; using short-lived token');
  }

  return { finalAccessToken, tokenMeta };
}

async function findWhatsAppBusinessAccount(accessToken) {
  const meResp = await axios.get(`${FB_GRAPH}/${FB_API_VERSION}/me`, {
    params: {
      fields: 'whatsapp_business_accounts{phone_numbers{display_phone_number,id}}',
      access_token: accessToken,
    },
  });

  const wabas = meResp.data.whatsapp_business_accounts?.data || meResp.data.whatsapp_business_accounts || [];
  if (!wabas.length) {
    throw new Error('No WhatsApp Business Account found');
  }

  return wabas[0];
}

async function createConnectedAccount(userId, accessToken) {
  const { finalAccessToken, tokenMeta } = await exchangeForFinalToken(accessToken);
  const waba = await findWhatsAppBusinessAccount(accessToken);
  const phone = pickFirstPhoneNumber(waba);
  const tokenExpiresAt = tokenMeta.expires_in ? new Date(Date.now() + (tokenMeta.expires_in * 1000)) : null;

  return whatsappAccountService.create(userId, {
    business_id: userId,
    waba_id: waba.id,
    phone_number_id: phone ? phone.id : null,
    display_phone_number: phone ? phone.display_phone_number : null,
    access_token: finalAccessToken,
    token_expires_at: tokenExpiresAt,
    token_type: tokenMeta.token_type || null,
    token_scope: null,
    token_last_refreshed: tokenExpiresAt ? new Date() : null,
    status: 'connected',
  });
}

// Verify webhook for WhatsApp
router.get('/webhook', (req, res) => {
  const verifyToken = process.env.VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    logger.info('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  return res.status(403).send('Forbidden');
});

// Receive webhook events
router.post('/webhook', async (req, res, next) => {
  try {
    // Verify X-Hub-Signature-256
    const signature = req.get('x-hub-signature-256') || req.get('x-hub-signature');
    const appSecret = process.env.WHATSAPP_CLIENT_SECRET || process.env.APP_SECRET || process.env.JWT_SECRET;
    if (signature && appSecret) {
      const expected = signature.startsWith('sha256=') ? signature.split('=')[1] : signature;
      const raw = req.body && Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
      const hmac = crypto.createHmac('sha256', appSecret).update(raw).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) {
        logger.warn('Invalid WhatsApp webhook signature');
        return res.status(401).send('Invalid signature');
      }
    } else {
      logger.debug('No webhook signature or app secret configured; skipping verification');
    }

    // Parse JSON body (raw middleware provides Buffer)
    const payload = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
    await whatsappService.handleWebhook(payload);
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Start OAuth flow for WhatsApp/Meta (redirects admin to Meta consent)
// Redirect-based start (keeps compatibility with admin UI)
router.get('/oauth/start', authMiddleware, async (req, res, next) => {
  try {
    const clientId = process.env.WHATSAPP_CLIENT_ID;
    const redirectUri = `${getBackendUrl()}/api/whatsapp/oauth/callback`;
    const { token: state } = await oauthStateService.create(req.user.userId);
    const scope = encodeURIComponent('whatsapp_business_messaging,whatsapp_business_management,business_management');
    const url = `https://www.facebook.com/${FB_API_VERSION}/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;
    return res.redirect(url);
  } catch (err) {
    next(err);
  }
});

// Return a tenant-scoped OAuth URL (for mobile clients to open)
router.get('/oauth/url', authMiddleware, async (req, res, next) => {
  try {
    const clientId = process.env.WHATSAPP_CLIENT_ID;
    const redirectUri = `${getBackendUrl()}/api/whatsapp/oauth/callback`;
    const { token: state } = await oauthStateService.create(req.user.userId);
    const scope = 'whatsapp_business_messaging,whatsapp_business_management,business_management';
    const url = `https://www.facebook.com/${FB_API_VERSION}/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;
    return res.json({ success: true, data: { url } });
  } catch (err) {
    next(err);
  }
});

router.get('/embedded/config', authMiddleware, async (req, res, next) => {
  try {
    const config = getEmbeddedSignupConfig();
    const { token: state } = await oauthStateService.create(req.user.userId);
    return res.json({
      success: true,
      data: {
        ...config,
        state,
        status: config.ready ? 'ready' : 'waiting_for_meta_setup',
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/onboarding/readiness', authMiddleware, async (req, res, next) => {
  try {
    res.json({ success: true, data: whatsappOnboardingService.readiness() });
  } catch (err) {
    next(err);
  }
});

router.get('/onboarding/status', authMiddleware, async (req, res, next) => {
  try {
    const status = await whatsappOnboardingService.status(req.user.userId);
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
});

router.get('/onboarding/start', authMiddleware, checkSubscription, checkUsageLimit('whatsapp_numbers'), async (req, res, next) => {
  try {
    const start = await whatsappOnboardingService.start(req.user.userId);
    res.json({ success: true, data: start });
  } catch (err) {
    next(err);
  }
});

router.get('/onboarding/callback', async (req, res, next) => {
  try {
    const query = new URLSearchParams(req.query).toString();
    res.redirect(`/api/whatsapp/oauth/callback${query ? `?${query}` : ''}`);
  } catch (err) {
    next(err);
  }
});

router.post('/embedded/exchange', authMiddleware, checkSubscription, checkUsageLimit('whatsapp_numbers'), async (req, res, next) => {
  try {
    const { code, state } = req.body || {};
    const config = getEmbeddedSignupConfig();

    if (!config.ready) {
      return res.status(400).json({
        success: false,
        message: 'Embedded Meta signup is not fully configured yet.',
        data: { missing: config.missing },
      });
    }

    if (!code) {
      return res.status(400).json({ success: false, message: 'Missing Meta signup code.' });
    }

    const stateUserId = state ? await oauthStateService.verifyAndConsume(state) : req.user.userId;
    if (!stateUserId || String(stateUserId) !== String(req.user.userId)) {
      logger.warn('Invalid or expired Embedded Signup state token');
      return res.status(400).json({ success: false, message: 'Invalid state.' });
    }

    const accessToken = await getAccessTokenFromCode(code, config.redirectUri);
    const account = await createConnectedAccount(req.user.userId, accessToken);
    return res.status(201).json({ success: true, data: account });
  } catch (err) {
    if (err.message === 'No WhatsApp Business Account found') {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
});

// OAuth callback - exchange code for access token and register WhatsApp account
router.get('/oauth/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing code');

    const userId = await oauthStateService.verifyAndConsume(state);
    if (!userId) {
      logger.warn('Invalid or expired OAuth state token');
      return res.status(400).send('Invalid state');
    }

    const redirectUri = `${getBackendUrl()}/api/whatsapp/oauth/callback`;

    // Exchange code for access token
    const accessToken = await getAccessTokenFromCode(code, redirectUri);

    // Persist or update account record with token metadata
    if (userId) {
      await createConnectedAccount(userId, accessToken);
    } else {
      logger.warn('OAuth callback received without state.userId; skipping automatic account creation');
    }

    // Redirect back to admin UI (if configured)
    const adminUrl = process.env.ADMIN_URL || '/admin';
    return res.redirect(adminUrl + '?whatsapp_connected=1');
  } catch (err) {
    next(err);
  }
});

router.get('/accounts', authMiddleware, async (req, res, next) => {
  try {
    const accounts = await whatsappAccountService.list(req.user.userId);
    res.json({ success: true, data: accounts });
  } catch (err) {
    next(err);
  }
});

router.post('/accounts', authMiddleware, checkSubscription, checkUsageLimit('whatsapp_numbers'), async (req, res, next) => {
  try {
    const account = await whatsappAccountService.create(req.user.userId, req.body);
    res.status(201).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

router.put('/accounts/:id', authMiddleware, enforceWritableWorkspace, async (req, res, next) => {
  try {
    const account = await whatsappAccountService.update(req.user.userId, req.params.id, req.body);
    if (!account) {
      return res.status(404).json({ success: false, message: 'WhatsApp account not found' });
    }
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

router.delete('/accounts/:id', authMiddleware, enforceWritableWorkspace, async (req, res, next) => {
  try {
    const account = await whatsappAccountService.remove(req.user.userId, req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'WhatsApp account not found' });
    }
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

// Send WhatsApp message
router.post('/send', authMiddleware, checkSubscription, checkPlanFeature('broadcast_messaging'), async (req, res, next) => {
  try {
    const { toPhone, message, useAI = false } = req.body;
    // basic phone validation (E.164-like) - allow optional + and 7-15 digits
    const normalized = String(toPhone || '').replace(/[^0-9+]/g, '');
    if (!/^\+?[1-9][0-9]{6,14}$/.test(normalized)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
    }
    const result = await whatsappService.sendMessage(req.user.userId, toPhone, message, useAI);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
