// backend/src/routes/analytics.js

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const analytics = await analyticsService.getMetrics(req.user.userId);
    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
