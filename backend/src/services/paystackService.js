const axios = require('axios');
const crypto = require('crypto');
const logger = require('../config/logger');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;

class PaystackService {
  constructor() {
    if (!PAYSTACK_SECRET) {
      logger.warn('Paystack secret is not configured. Paystack endpoints will fail until PAYSTACK_SECRET is set.');
    }
  }

  async initializePayment({ email, amount, plan, userId, currency = 'NGN' }) {
    if (!PAYSTACK_SECRET) {
      throw new Error('Paystack secret key is not configured');
    }

    if (!email) {
      throw new Error('User email is required to initialize Paystack payment');
    }

    if (!amount || Number(amount) <= 0) {
      throw new Error('Valid payment amount is required');
    }

    if (!plan) {
      throw new Error('Subscription plan is required');
    }

    const payload = {
      email,
      amount: Math.round(Number(amount) * 100),
      currency,
      metadata: {
        userId,
        plan,
      },
    };

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data || !response.data.status) {
      throw new Error(response.data?.message || 'Unable to initialize Paystack transaction');
    }

    return response.data.data;
  }

  verifyWebhookSignature(rawBody, signature) {
    if (!PAYSTACK_SECRET || !signature || !rawBody) {
      return false;
    }

    const expected = crypto
      .createHmac('sha512', PAYSTACK_SECRET)
      .update(rawBody)
      .digest('hex');

    return expected === signature;
  }

  async verifyTransaction(reference) {
    if (!PAYSTACK_SECRET) {
      throw new Error('Paystack secret key is not configured');
    }

    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data || !response.data.status) {
      throw new Error(response.data?.message || 'Unable to verify Paystack transaction');
    }

    return response.data.data;
  }
}

module.exports = new PaystackService();
