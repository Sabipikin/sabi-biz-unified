const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { checkPlanFeature, enforceWritableWorkspace } = require('../middleware/subscription');
const productSuiteService = require('../services/productSuiteService');

const featureByResource = {
  leads: 'leads',
  opportunities: 'lead_pipeline',
  activities: 'crm',
  templates: 'broadcast_messaging',
  segments: 'campaign_analytics',
  campaigns: 'broadcast_messaging',
  broadcasts: 'broadcast_messaging',
  assistants: 'ai_assistant',
  knowledge: 'knowledge_base',
  workflows: 'workflow_automation',
  integrations: 'integrations',
  webhooks: 'api_access',
  reports: 'advanced_reporting',
  team: 'team_permissions',
  tickets: 'dedicated_support',
};

const resourcePaths = [
  'leads',
  'opportunities',
  'activities',
  'templates',
  'segments',
  'campaigns',
  'broadcasts',
  'assistants',
  'knowledge',
  'workflows',
  'integrations',
  'webhooks',
  'reports',
  'team',
  'tickets',
];

function featureGate(resource) {
  return checkPlanFeature(featureByResource[resource] || 'crm');
}

function sendNotFound(res, resource) {
  return res.status(404).json({ success: false, message: `${resource} not found` });
}

router.use(authMiddleware);

router.get('/analytics/summary', checkPlanFeature('basic_analytics'), async (req, res, next) => {
  try {
    const summary = await productSuiteService.analyticsSummary(req.user);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

router.get('/branding', checkPlanFeature('custom_branding'), async (req, res, next) => {
  try {
    const branding = await productSuiteService.getBranding(req.user);
    res.json({ success: true, data: branding });
  } catch (err) {
    next(err);
  }
});

router.put('/branding', enforceWritableWorkspace, checkPlanFeature('custom_branding'), async (req, res, next) => {
  try {
    const branding = await productSuiteService.saveBranding(req.user, req.body);
    res.json({ success: true, data: branding });
  } catch (err) {
    next(err);
  }
});

router.get('/api-keys', checkPlanFeature('api_access'), async (req, res, next) => {
  try {
    const keys = await productSuiteService.listApiKeys(req.user);
    res.json({ success: true, data: keys });
  } catch (err) {
    next(err);
  }
});

router.post('/api-keys', enforceWritableWorkspace, checkPlanFeature('api_access'), async (req, res, next) => {
  try {
    const key = await productSuiteService.createApiKey(req.user, req.body);
    res.status(201).json({ success: true, data: key });
  } catch (err) {
    next(err);
  }
});

router.delete('/api-keys/:id', enforceWritableWorkspace, checkPlanFeature('api_access'), async (req, res, next) => {
  try {
    const key = await productSuiteService.revokeApiKey(req.user, req.params.id);
    if (!key) return sendNotFound(res, 'API key');
    res.json({ success: true, data: key });
  } catch (err) {
    next(err);
  }
});

router.post('/leads/:id/convert', enforceWritableWorkspace, featureGate('leads'), async (req, res, next) => {
  try {
    const result = await productSuiteService.convertLead(req.user, req.params.id);
    if (!result) return sendNotFound(res, 'Lead');
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

for (const resource of resourcePaths) {
  router.get(`/${resource}`, featureGate(resource), async (req, res, next) => {
    try {
      const items = await productSuiteService.list(resource, req.user, req.query);
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  });

  router.post(`/${resource}`, enforceWritableWorkspace, featureGate(resource), async (req, res, next) => {
    try {
      const item = await productSuiteService.create(resource, req.user, req.body);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  });

  router.get(`/${resource}/:id`, featureGate(resource), async (req, res, next) => {
    try {
      const item = await productSuiteService.get(resource, req.user, req.params.id);
      if (!item) return sendNotFound(res, resource);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  });

  router.put(`/${resource}/:id`, enforceWritableWorkspace, featureGate(resource), async (req, res, next) => {
    try {
      const item = await productSuiteService.update(resource, req.user, req.params.id, req.body);
      if (!item) return sendNotFound(res, resource);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  });

  router.delete(`/${resource}/:id`, enforceWritableWorkspace, featureGate(resource), async (req, res, next) => {
    try {
      const item = await productSuiteService.remove(resource, req.user, req.params.id);
      if (!item) return sendNotFound(res, resource);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = router;
