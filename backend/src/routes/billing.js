const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const billingService = require('../services/billingService');

router.use(authMiddleware);

router.get('/plans', async (req, res, next) => {
  try {
    const plans = await billingService.listPlans();
    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
});

router.get('/current-plan', async (req, res, next) => {
  try {
    const plan = await billingService.getCurrentPlan(req.user.userId || req.user.id);
    res.json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
});

router.get('/usage', async (req, res, next) => {
  try {
    const usage = await billingService.getUsage(req.user.userId || req.user.id);
    res.json({ success: true, data: usage });
  } catch (err) {
    next(err);
  }
});

router.get('/invoices', async (req, res, next) => {
  try {
    const invoices = await billingService.listInvoices(req.user.userId || req.user.id);
    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
});

router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await billingService.listNotifications(req.user.userId || req.user.id);
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
});

router.post('/upgrade', async (req, res, next) => {
  try {
    const result = await billingService.createPendingPlanChange(req.user.userId || req.user.id, {
      planSlug: req.body.plan || req.body.planSlug,
      billingCycle: req.body.billingCycle || req.body.billing_cycle || 'monthly',
      paymentProvider: req.body.paymentProvider || 'paystack',
      action: 'upgrade',
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/downgrade', async (req, res, next) => {
  try {
    const result = await billingService.createPendingPlanChange(req.user.userId || req.user.id, {
      planSlug: req.body.plan || req.body.planSlug,
      billingCycle: req.body.billingCycle || req.body.billing_cycle || 'monthly',
      paymentProvider: req.body.paymentProvider || 'paystack',
      action: 'downgrade',
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/cancel', async (req, res, next) => {
  try {
    const result = await billingService.cancel(req.user.userId || req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/reactivate', async (req, res, next) => {
  try {
    const result = await billingService.reactivate(req.user.userId || req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
