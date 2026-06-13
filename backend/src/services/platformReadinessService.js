const { testConnection } = require('../config/db');
const whatsappOnboardingService = require('./whatsappOnboardingService');

function configured(...names) {
  return names.some(name => !!process.env[name]);
}

class PlatformReadinessService {
  async checkDatabase() {
    try {
      const ok = await testConnection();
      return { configured: true, status: ok ? 'connected' : 'error' };
    } catch (err) {
      return { configured: true, status: 'error', error: err.message };
    }
  }

  checkAuth() {
    const jwtConfigured = configured('JWT_SECRET');
    const refreshConfigured = configured('REFRESH_TOKEN_SECRET', 'JWT_SECRET');
    return {
      configured: jwtConfigured,
      status: jwtConfigured ? 'configured' : 'missing_jwt_secret',
      checks: {
        jwt_secret: jwtConfigured,
        refresh_token_secret: refreshConfigured,
      },
    };
  }

  checkPayments() {
    const ready = configured('PAYSTACK_SECRET');
    return {
      configured: ready,
      status: ready ? 'configured' : 'missing_paystack_secret',
    };
  }

  checkAI() {
    const ready = configured('OPENAI_API_KEY');
    return {
      configured: ready,
      status: ready ? 'configured' : 'missing_openai_api_key',
    };
  }

  async overview() {
    const [database, whatsapp] = await Promise.all([
      this.checkDatabase(),
      Promise.resolve(whatsappOnboardingService.readiness()),
    ]);

    const auth = this.checkAuth();
    const payments = this.checkPayments();
    const ai = this.checkAI();

    const modules = {
      database,
      auth,
      whatsapp: {
        configured: whatsapp.status !== 'configuration_required',
        status: whatsapp.status,
        provider: whatsapp.provider,
        verification_state: whatsapp.verification_state,
        missing: whatsapp.missing,
      },
      payments,
      ai,
    };

    const blockers = Object.entries(modules)
      .filter(([, mod]) => !mod.configured || mod.status === 'error')
      .map(([key, mod]) => ({ module: key, status: mod.status }));

    return {
      ready: blockers.length === 0,
      blockers,
      modules,
    };
  }
}

module.exports = new PlatformReadinessService();
