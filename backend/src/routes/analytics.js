// backend/src/routes/analytics.js

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');
const customerIntelligenceService = require('../services/customerIntelligenceService');

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const analytics = await analyticsService.getMetrics(req.user.userId);
    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

router.get('/customer-intelligence', authMiddleware, async (req, res, next) => {
  try {
    const widgets = await customerIntelligenceService.widgets(req.user.userId);
    res.json({ success: true, data: widgets });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
