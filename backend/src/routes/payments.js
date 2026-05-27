const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const paystackService = require('../services/paystackService');
const subscriptionService = require('../services/subscriptionService');

const PLAN_PRICING = {
  starter: 2990,
  growth: 4990,
  pro: 9990,
};

const getPlanAmount = (plan) => {
  return PLAN_PRICING[plan] || PLAN_PRICING.starter;
};

router.get('/paystack/public-key', (req, res) => {
  res.json({
    success: true,
    data: {
      publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    },
  });
});

router.post('/paystack/initialize', authMiddleware, async (req, res, next) => {
  try {
    const plan = req.body.plan || 'starter';
    const amount = getPlanAmount(plan);
    const email = req.user.email;
    const userId = req.user.id || req.user.userId;

    const payment = await paystackService.initializePayment({
      email,
      amount,
      plan,
      userId,
    });

    const subscription = await subscriptionService.createPaystackPendingSubscription(
      userId,
      plan,
      amount,
      payment.reference
    );

    res.status(201).json({
      success: true,
      data: {
        authorization_url: payment.authorization_url,
        reference: payment.reference,
        access_code: payment.access_code,
        subscription,
        publicKey: process.env.PAYSTACK_PUBLIC_KEY,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
