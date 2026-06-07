const express = require('express');
const router = express.Router();
const paystackService = require('../services/paystackService');
const subscriptionService = require('../services/subscriptionService');
const billingService = require('../services/billingService');

router.post('/paystack', async (req, res, next) => {
  try {
    const rawBody = req.body;
    const signature = req.headers['x-paystack-signature'];

    if (!paystackService.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid Paystack signature' });
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    const paystackEvent = event.event;
    const data = event.data;

    if (paystackEvent === 'charge.success') {
      await subscriptionService.handlePaystackChargeSuccess(data);
      await billingService.handleProviderPaymentSuccess(data);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
