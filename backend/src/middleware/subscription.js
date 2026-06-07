const billingService = require('../services/billingService');

function userIdFromReq(req) {
  return req.user?.userId || req.user?.id;
}

async function checkSubscription(req, res, next) {
  try {
    const subscription = await billingService.getCurrentSubscription(userIdFromReq(req));
    if (!subscription) {
      return res.status(403).json({ success: false, message: 'Upgrade your plan to continue.' });
    }

    const now = new Date();
    const expiresAt = subscription.current_period_end || subscription.trial_end;
    if (['cancelled', 'expired', 'suspended'].includes(subscription.status) || (expiresAt && new Date(expiresAt) < now)) {
      return res.status(403).json({ success: false, message: 'Upgrade your plan to continue.' });
    }

    req.subscription = subscription;
    next();
  } catch (err) {
    next(err);
  }
}

function checkPlanFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const subscription = req.subscription || await billingService.getCurrentSubscription(userIdFromReq(req));
      const flags = subscription?.feature_flags || {};
      if (!flags[featureKey]) {
        return res.status(403).json({ success: false, message: 'Upgrade your plan to continue.' });
      }
      req.subscription = subscription;
      next();
    } catch (err) {
      next(err);
    }
  };
}

function checkUsageLimit(metricType) {
  return async (req, res, next) => {
    try {
      const usage = await billingService.getUsage(userIdFromReq(req));
      const metric = usage[metricType];
      if (metric && metric.limit !== null && metric.limit !== undefined && Number(metric.used) >= Number(metric.limit)) {
        return res.status(403).json({ success: false, message: 'Upgrade your plan to continue.' });
      }
      req.usage = usage;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  checkSubscription,
  checkPlanFeature,
  checkUsageLimit,
};
