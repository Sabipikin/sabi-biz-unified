// backend/src/routes/admin.js

const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const adminService = require('../services/adminService');

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

router.post('/users/:id/suspend', async (req, res, next) => {
  try {
    const user = await adminService.suspendUser(req.params.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.post('/users/:id/activate', async (req, res, next) => {
  try {
    // body may include { days: number } or { expires_at: ISOString }
    const opts = req.body || {};
    const user = await adminService.activateUser(req.params.id, opts);
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

module.exports = router;
