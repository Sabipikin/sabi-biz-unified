const entitlementService = require('../services/subscriptionEntitlementService');

function userIdFromReq(req) {
  return req.user?.userId || req.user?.id;
}

function sendEntitlementError(res, err) {
  return res.status(err.statusCode || 403).json({
    success: false,
    message: err.message || 'Upgrade your plan to continue.',
    code: err.code,
    upgrade: err.upgrade,
  });
}

async function checkSubscription(req, res, next) {
  try {
    const subscription = await entitlementService.getCurrentPlan(userIdFromReq(req));
    if (!subscription) {
      return res.status(403).json({ success: false, message: 'Upgrade your plan to continue.' });
    }

    if (await entitlementService.isReadOnly(userIdFromReq(req))) {
      return res.status(403).json({ success: false, message: 'Upgrade your plan to continue.' });
    }

    req.subscription = subscription;
    next();
  } catch (err) {
    sendEntitlementError(res, err);
  }
}

function checkPlanFeature(featureKey) {
  return async (req, res, next) => {
    try {
      await entitlementService.validateAction(userIdFromReq(req), { feature: featureKey, featureName: featureKey, mutates: false });
      next();
    } catch (err) {
      sendEntitlementError(res, err);
    }
  };
}

function checkUsageLimit(metricType) {
  return async (req, res, next) => {
    try {
      req.usage = await entitlementService.getUsage(userIdFromReq(req));
      await entitlementService.validateAction(userIdFromReq(req), { metricType, increment: 1 });
      next();
    } catch (err) {
      sendEntitlementError(res, err);
    }
  };
}

async function enforceWritableWorkspace(req, res, next) {
  try {
    await entitlementService.validateAction(userIdFromReq(req), { mutates: true });
    next();
  } catch (err) {
    sendEntitlementError(res, err);
  }
}

module.exports = {
  checkSubscription,
  checkPlanFeature,
  checkUsageLimit,
  enforceWritableWorkspace,
};
