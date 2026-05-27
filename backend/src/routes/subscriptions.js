// backend/src/routes/subscriptions.js

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const subscriptionService = require('../services/subscriptionService');

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const subscriptions = await subscriptionService.listSubscriptions(req.user.userId);
    res.json({ success: true, data: subscriptions });
  } catch (err) {
    next(err);
  }
});

router.post('/subscribe', authMiddleware, async (req, res, next) => {
  try {
    const { plan, paymentMethod } = req.body;
    const subscription = await subscriptionService.createSubscription(req.user.userId, plan, paymentMethod);
    res.status(201).json({ success: true, data: subscription });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
