// backend/src/routes/admin.js

const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const adminService = require('../services/adminService');
const billingService = require('../services/billingService');
const whatsappOnboardingService = require('../services/whatsappOnboardingService');

router.use(authMiddleware, adminMiddleware);

// Admin dashboard overview
router.get('/analytics/dashboard', async (req, res, next) => {
  try {
    const overview = await adminService.getDashboardOverview();
    res.json({ success: true, data: overview });
  } catch (err) {
    next(err);
  }
});

router.get('/analytics/revenue', async (req, res, next) => {
  try {
    const revenue = await adminService.getRevenueSummary();
    res.json({ success: true, data: revenue });
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await adminService.getUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// Update user (admin)
router.put('/users/:id', async (req, res, next) => {
  try {
    const updates = req.body || {};
    const actorId = req.user && req.user.id ? req.user.id : null;
    const user = await adminService.updateUser(req.params.id, updates, actorId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// Delete (soft) user
router.delete('/users/:id', async (req, res, next) => {
  try {
    const actorId = req.user && req.user.id ? req.user.id : null;
    const result = await adminService.deleteUser(req.params.id, actorId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/users/:id/suspend', async (req, res, next) => {
  try {
    const actorId = req.user && req.user.id ? req.user.id : null;
    const user = await adminService.suspendUserWithAudit(req.params.id, actorId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.post('/users/:id/activate', async (req, res, next) => {
  try {
    // body may include { days: number } or { expires_at: ISOString }
    const opts = req.body || {};
    const actorId = req.user && req.user.id ? req.user.id : null;
    const user = await adminService.activateUserWithAudit(req.params.id, opts, actorId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.get('/subscriptions', async (req, res, next) => {
  try {
    const subscriptions = await adminService.listSubscriptions();
    res.json({ success: true, data: subscriptions });
  } catch (err) {
    next(err);
  }
});

router.get('/subscriptions/:id', async (req, res, next) => {
  try {
    const subscription = await adminService.getSubscriptionById(req.params.id);
    res.json({ success: true, data: subscription });
  } catch (err) {
    next(err);
  }
});

router.get('/payments', async (req, res, next) => {
  try {
    const invoices = await adminService.listInvoices();
    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
});

router.get('/analytics/subscriptions', async (req, res, next) => {
  try {
    const subscriptionStats = await adminService.getSubscriptionsSummary();
    res.json({ success: true, data: subscriptionStats });
  } catch (err) {
    next(err);
  }
});

router.get('/analytics/billing', async (req, res, next) => {
  try {
    const billing = await billingService.getAdminAnalytics();
    res.json({ success: true, data: billing });
  } catch (err) {
    next(err);
  }
});

// WhatsApp accounts management (admin)
router.get('/whatsapp/accounts', async (req, res, next) => {
  try {
    const accounts = await adminService.getWhatsappAccounts();
    res.json({ success: true, data: accounts });
  } catch (err) {
    next(err);
  }
});

router.get('/whatsapp/infrastructure', async (req, res, next) => {
  try {
    const health = await whatsappOnboardingService.adminHealth();
    res.json({ success: true, data: health });
  } catch (err) {
    next(err);
  }
});

router.get('/whatsapp/accounts/:id/logs', async (req, res, next) => {
  try {
    const logs = await adminService.getWhatsappAccountLogs(req.params.id);
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

router.delete('/whatsapp/accounts/:id', async (req, res, next) => {
  try {
    const result = await adminService.removeWhatsappAccount(req.params.id, req.user && req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
