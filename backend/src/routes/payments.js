const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const paystackService = require('../services/paystackService');
const subscriptionService = require('../services/subscriptionService');
const billingService = require('../services/billingService');

const PLAN_PRICING = {
  starter: 10000,
  growth: 25000,
  business: 60000,
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
    const billingCycle = req.body.billingCycle || req.body.billing_cycle || 'monthly';
    const billingPlan = await billingService.getPlanBySlug(plan);
    const amount = billingPlan
      ? Number(billingCycle === 'yearly' ? billingPlan.yearly_price : billingPlan.monthly_price)
      : getPlanAmount(plan);
    const email = req.user.email;
    const userId = req.user.id || req.user.userId;

    if (billingPlan) {
      const billing = await billingService.createPendingPlanChange(userId, {
        planSlug: plan,
        billingCycle,
        paymentProvider: 'paystack',
        action: 'upgrade',
      });

      return res.status(201).json({
        success: true,
        data: {
          authorization_url: billing.authorization_url,
          reference: billing.reference,
          access_code: billing.access_code,
          subscription: billing.subscription,
          billing,
          publicKey: process.env.PAYSTACK_PUBLIC_KEY,
        },
      });
    }

    const payment = await paystackService.initializePayment({
      email,
      amount,
      plan,
      userId,
      metadata: {
        billingCycle,
        source: 'legacy_payments_endpoint',
      },
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
