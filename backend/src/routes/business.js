// backend/src/routes/business.js

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const businessService = require('../services/businessService');

// Get current user invoices
router.get('/invoices', authMiddleware, async (req, res, next) => {
  try {
    const invoices = await businessService.getInvoices(req.user.userId);
    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
});

router.post('/invoices', authMiddleware, async (req, res, next) => {
  try {
    const invoice = await businessService.createInvoice(req.user.userId, req.body);
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// Get inventory items
router.get('/inventory', authMiddleware, async (req, res, next) => {
  try {
    const items = await businessService.getInventory(req.user.userId);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

router.post('/inventory', authMiddleware, async (req, res, next) => {
  try {
    const item = await businessService.createInventoryItem(req.user.userId, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
