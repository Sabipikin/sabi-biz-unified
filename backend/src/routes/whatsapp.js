// backend/src/routes/whatsapp.js

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');
const whatsappAccountService = require('../services/whatsappAccountService');
const { checkSubscription, checkUsageLimit } = require('../middleware/subscription');
const logger = require('../config/logger');

// Verify webhook for WhatsApp
router.get('/webhook', (req, res) => {
  const verifyToken = process.env.VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    logger.info('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  return res.status(403).send('Forbidden');
});

// Receive webhook events
router.post('/webhook', async (req, res, next) => {
  try {
    await whatsappService.handleWebhook(req.body);
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/accounts', authMiddleware, async (req, res, next) => {
  try {
    const accounts = await whatsappAccountService.list(req.user.userId);
    res.json({ success: true, data: accounts });
  } catch (err) {
    next(err);
  }
});

router.post('/accounts', authMiddleware, checkSubscription, checkUsageLimit('whatsapp_numbers'), async (req, res, next) => {
  try {
    const account = await whatsappAccountService.create(req.user.userId, req.body);
    res.status(201).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

router.put('/accounts/:id', authMiddleware, async (req, res, next) => {
  try {
    const account = await whatsappAccountService.update(req.user.userId, req.params.id, req.body);
    if (!account) {
      return res.status(404).json({ success: false, message: 'WhatsApp account not found' });
    }
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

router.delete('/accounts/:id', authMiddleware, async (req, res, next) => {
  try {
    const account = await whatsappAccountService.remove(req.user.userId, req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'WhatsApp account not found' });
    }
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

// Send WhatsApp message
router.post('/send', authMiddleware, checkSubscription, async (req, res, next) => {
  try {
    const { toPhone, message, useAI = false } = req.body;
    // basic phone validation (E.164-like) - allow optional + and 7-15 digits
    const normalized = String(toPhone || '').replace(/[^0-9+]/g, '');
    if (!/^\+?[1-9][0-9]{6,14}$/.test(normalized)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
    }
    const result = await whatsappService.sendMessage(req.user.userId, toPhone, message, useAI);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
