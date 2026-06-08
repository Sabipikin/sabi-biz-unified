const billingService = require('./billingService');

const recommendedPlans = {
  crm: 'starter',
  contacts: 'starter',
  leads: 'starter',
  basic_analytics: 'starter',
  broadcast_messaging: 'starter',
  knowledge_base: 'starter',
  knowledge_base_upload: 'starter',
  ai_assistant: 'starter',
  lead_pipeline: 'starter',
  shared_inbox: 'growth',
  workflow_automation: 'growth',
  advanced_automations: 'growth',
  lead_scoring: 'growth',
  campaign_analytics: 'growth',
  custom_branding: 'growth',
  ai_sales_agent: 'business',
  ai_support_agent: 'business',
  team_permissions: 'business',
  advanced_reporting: 'business',
  integrations: 'business',
  api_access: 'business',
  white_label: 'enterprise',
  custom_ai_models: 'enterprise',
};

const metricLabels = {
  conversations: 'AI conversations',
  users: 'users',
  whatsapp_numbers: 'WhatsApp numbers',
  ai_assistants: 'AI assistants',
};

class SubscriptionEntitlementService {
  async getCurrentPlan(organizationId) {
    return billingService.getCurrentSubscription(organizationId);
  }

  async getPlanLimits(organizationId) {
    const plan = await this.getCurrentPlan(organizationId);
    if (!plan) return {};
    return {
      users: plan.max_users,
      whatsapp_numbers: plan.max_whatsapp_numbers,
      ai_assistants: plan.max_ai_assistants,
      conversations: plan.monthly_conversation_limit,
    };
  }

  async getUsage(organizationId) {
    return billingService.getUsage(organizationId);
  }

  async hasFeature(organizationId, featureKey) {
    const plan = await this.getCurrentPlan(organizationId);
    if (!plan) return false;
    return !!(plan.feature_flags || {})[featureKey];
  }

  async isTrialExpired(organizationId) {
    const plan = await this.getCurrentPlan(organizationId);
    if (!plan || plan.status !== 'trialing') return false;
    return !!plan.trial_end && new Date(plan.trial_end) < new Date();
  }

  async isReadOnly(organizationId) {
    const plan = await this.getCurrentPlan(organizationId);
    if (!plan) return true;
    if (['cancelled', 'expired', 'suspended'].includes(plan.status)) return true;
    return this.isTrialExpired(organizationId);
  }

  async getRemainingUsage(organizationId, metricType) {
    const usage = await this.getUsage(organizationId);
    const metric = usage[metricType] || { used: 0, limit: null };
    if (metric.limit === null || metric.limit === undefined) return null;
    return Math.max(0, Number(metric.limit) - Number(metric.used || 0));
  }

  async canPerformAction(organizationId, action) {
    return this.validateAction(organizationId, action).then(() => true).catch(() => false);
  }

  async validateAction(organizationId, action = {}) {
    const plan = await this.getCurrentPlan(organizationId);
    if (!plan) {
      const err = new Error('Upgrade your plan to continue.');
      err.statusCode = 403;
      throw err;
    }

    const readOnly = await this.isReadOnly(organizationId);
    if (readOnly && action.mutates !== false) {
      const err = new Error('Your workspace is read-only. Upgrade your plan to continue.');
      err.statusCode = 403;
      err.code = 'WORKSPACE_READ_ONLY';
      err.upgrade = { currentPlan: plan.plan_slug, recommendedPlan: 'starter' };
      throw err;
    }

    if (action.feature) {
      const enabled = !!(plan.feature_flags || {})[action.feature];
      if (!enabled) {
        const err = new Error(`${action.featureName || action.feature} is not available on your current plan.`);
        err.statusCode = 403;
        err.code = 'FEATURE_LOCKED';
        err.upgrade = {
          feature: action.feature,
          currentPlan: plan.plan_slug,
          recommendedPlan: recommendedPlans[action.feature] || 'growth',
        };
        throw err;
      }
    }

    if (action.metricType) {
      const usage = await this.getUsage(organizationId);
      const metric = usage[action.metricType] || { used: 0, limit: null };
      const requested = Number(action.increment || 1);
      if (metric.limit !== null && metric.limit !== undefined && Number(metric.used || 0) + requested > Number(metric.limit)) {
        const err = new Error(`You have exhausted your monthly ${metricLabels[action.metricType] || action.metricType}.`);
        err.statusCode = 403;
        err.code = 'USAGE_LIMIT_REACHED';
        err.upgrade = {
          metricType: action.metricType,
          currentPlan: plan.plan_slug,
          recommendedPlan: action.recommendedPlan || 'growth',
        };
        throw err;
      }
    }

    return {
      allowed: true,
      plan,
    };
  }

  async getEntitlementSummary(organizationId) {
    const [plan, usage, limits] = await Promise.all([
      this.getCurrentPlan(organizationId),
      this.getUsage(organizationId),
      this.getPlanLimits(organizationId),
    ]);
    const readOnly = await this.isReadOnly(organizationId);
    const trialExpired = await this.isTrialExpired(organizationId);

    return {
      plan,
      feature_flags: plan?.feature_flags || {},
      usage,
      limits,
      read_only: readOnly,
      trial_expired: trialExpired,
      recommended_plans: recommendedPlans,
    };
  }
}

module.exports = new SubscriptionEntitlementService();
