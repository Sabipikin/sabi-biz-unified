const { query } = require('../config/db');

const FB_API_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v17.0';

function configured(name, aliases = []) {
  return [name, ...aliases].some(key => !!process.env[key]);
}

function publicBackendUrl() {
  return (process.env.BACKEND_URL || '').replace(/\/+$/, '');
}

function publicFrontendUrl() {
  return (process.env.FRONTEND_URL || process.env.APP_URL || process.env.ADMIN_URL || '').replace(/\/+$/, '');
}

function envStatus() {
  return {
    WHATSAPP_CLIENT_ID: configured('WHATSAPP_CLIENT_ID', ['META_APP_ID']),
    WHATSAPP_CLIENT_SECRET: configured('WHATSAPP_CLIENT_SECRET'),
    WEBHOOK_VERIFY_TOKEN: configured('WEBHOOK_VERIFY_TOKEN', ['VERIFY_TOKEN']),
    WHATSAPP_EMBEDDED_CONFIG_ID: configured('WHATSAPP_EMBEDDED_CONFIG_ID', ['META_EMBEDDED_SIGNUP_CONFIG_ID']),
    TOKEN_MASTER_KEY: configured('TOKEN_MASTER_KEY', ['CRYPTO_MASTER_KEY', 'ENCRYPTION_KEY']),
    BACKEND_URL: configured('BACKEND_URL'),
  };
}

function tokenStatusFor(tokenExpiresAt) {
  if (!tokenExpiresAt) return 'unknown';
  const expiresAt = new Date(tokenExpiresAt).getTime();
  const now = Date.now();
  if (expiresAt <= now) return 'expired';
  if (expiresAt - now <= 7 * 24 * 60 * 60 * 1000) return 'expiring';
  return 'valid';
}

function readiness() {
  const env = envStatus();
  const missing = Object.entries(env)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  const embeddedReady = env.WHATSAPP_CLIENT_ID && env.WHATSAPP_CLIENT_SECRET && env.WHATSAPP_EMBEDDED_CONFIG_ID && env.BACKEND_URL;
  const oauthReady = env.WHATSAPP_CLIENT_ID && env.WHATSAPP_CLIENT_SECRET && env.BACKEND_URL;

  return {
    provider: embeddedReady ? 'embedded_signup' : 'oauth',
    status: embeddedReady ? 'ready' : oauthReady ? 'oauth_fallback_ready' : 'configuration_required',
    verification_state: process.env.META_BUSINESS_VERIFICATION_STATUS || 'pending',
    meta_verification_status: process.env.META_BUSINESS_VERIFICATION_STATUS || 'pending',
    graph_version: FB_API_VERSION,
    env,
    missing,
    checks: {
      oauth_ready: oauthReady,
      embedded_signup_ready: embeddedReady,
      webhook_ready: env.WEBHOOK_VERIFY_TOKEN,
      token_encryption_ready: env.TOKEN_MASTER_KEY,
    },
  };
}

class OAuthProvider {
  constructor(userId) {
    this.userId = userId;
    this.name = 'oauth';
  }

  async start() {
    return {
      provider: this.name,
      method: 'redirect',
      url: `${publicBackendUrl()}/api/whatsapp/oauth/start`,
    };
  }
}

class EmbeddedSignupProvider {
  constructor(userId) {
    this.userId = userId;
    this.name = 'embedded_signup';
  }

  async start() {
    return {
      provider: this.name,
      method: 'hosted_page',
      url: `${publicFrontendUrl()}/settings/whatsapp/connect`,
    };
  }
}

class WhatsAppOnboardingService {
  readiness() {
    return readiness();
  }

  providerFor(userId) {
    const state = readiness();
    return state.checks.embedded_signup_ready
      ? new EmbeddedSignupProvider(userId)
      : new OAuthProvider(userId);
  }

  async status(userId) {
    const accounts = await query(
      `SELECT id, waba_id, phone_number_id, display_phone_number, status, connected_at, updated_at,
              token_expires_at, webhook_subscribed, quality_rating, business_name, last_diagnostics_at,
              connection_history
       FROM whatsapp_accounts
       WHERE user_id = $1
       ORDER BY updated_at DESC, created_at DESC`,
      [userId]
    );

    const rows = accounts.rows.map(row => ({
      ...row,
      token_status: tokenStatusFor(row.token_expires_at),
    }));

    const connected = rows.filter(row => row.status === 'connected');
    const state = readiness();
    return {
      provider: state.provider,
      status: connected.length ? 'connected' : 'disconnected',
      verification_state: state.verification_state,
      configuration_readiness: state,
      accounts: rows,
    };
  }

  async start(userId) {
    const provider = this.providerFor(userId);
    const start = await provider.start();
    return {
      ...start,
      readiness: readiness(),
    };
  }

  async adminHealth() {
    const state = readiness();
    const [accountStats, tokenStats, webhookStats, logs] = await Promise.all([
      query(
        `SELECT status, COUNT(*)::INT AS total
         FROM whatsapp_accounts
         GROUP BY status`
      ),
      query(
        `SELECT
           COUNT(*) FILTER (WHERE access_token IS NOT NULL AND (token_expires_at IS NULL OR token_expires_at > NOW() + INTERVAL '7 days'))::INT AS valid_tokens,
           COUNT(*) FILTER (WHERE token_expires_at IS NOT NULL AND token_expires_at <= NOW() + INTERVAL '7 days' AND token_expires_at > NOW())::INT AS expiring_tokens,
           COUNT(*) FILTER (WHERE token_expires_at IS NOT NULL AND token_expires_at <= NOW())::INT AS expired_tokens
         FROM whatsapp_accounts`
      ),
      query(
        `SELECT
           MAX(created_at) AS last_webhook,
           COUNT(*) FILTER (WHERE status = 'failed')::INT AS failed_deliveries
         FROM whatsapp_messages`
      ).catch(() => ({ rows: [{ last_webhook: null, failed_deliveries: 0 }] })),
      query(
        `SELECT wa.id, wa.user_id, u.email AS tenant, wa.connection_history
         FROM whatsapp_accounts wa
         LEFT JOIN users u ON u.id = wa.user_id
         ORDER BY wa.updated_at DESC
         LIMIT 50`
      ),
    ]);

    const statusCounts = { connected: 0, pending: 0, disconnected: 0, suspended: 0 };
    accountStats.rows.forEach(row => {
      statusCounts[row.status] = Number(row.total || 0);
    });

    const connectionLogs = [];
    logs.rows.forEach(row => {
      const history = Array.isArray(row.connection_history) ? row.connection_history : [];
      history.forEach(event => {
        connectionLogs.push({
          account_id: row.id,
          tenant: row.tenant || row.user_id,
          event: event.note || event.status,
          status: event.status,
          at: event.at,
        });
      });
    });

    connectionLogs.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());

    return {
      readiness: state,
      statistics: statusCounts,
      token_health: tokenStats.rows[0] || { valid_tokens: 0, expiring_tokens: 0, expired_tokens: 0 },
      webhook_health: {
        last_webhook: webhookStats.rows[0]?.last_webhook || null,
        failed_deliveries: Number(webhookStats.rows[0]?.failed_deliveries || 0),
        verification_status: state.checks.webhook_ready ? 'configured' : 'missing_verify_token',
      },
      logs: connectionLogs.slice(0, 100),
    };
  }
}

module.exports = new WhatsAppOnboardingService();
