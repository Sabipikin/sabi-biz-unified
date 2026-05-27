// backend/src/routes/whatsapp.js

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');
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

// Send WhatsApp message
router.post('/send', authMiddleware, async (req, res, next) => {
  try {
    const { toPhone, message, useAI = false } = req.body;
    const result = await whatsappService.sendMessage(req.user.userId, toPhone, message, useAI);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
