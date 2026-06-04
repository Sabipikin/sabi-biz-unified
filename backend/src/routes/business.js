// backend/src/routes/business.js

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const businessService = require('../services/businessService');

router.get('/customers', authMiddleware, async (req, res, next) => {
  try {
    const customers = await businessService.getCustomers(req.user.userId);
    res.json({ success: true, data: customers });
  } catch (err) {
    next(err);
  }
});

router.post('/customers', authMiddleware, async (req, res, next) => {
  try {
    const customer = await businessService.createCustomer(req.user.userId, req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

router.get('/invoices', authMiddleware, async (req, res, next) => {
  try {
    const invoices = await businessService.getInvoices(req.user.userId);
    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
});

router.get('/invoices/analytics', authMiddleware, async (req, res, next) => {
  try {
    const analytics = await businessService.getInvoiceAnalytics(req.user.userId);
    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

router.get('/invoices/:id', authMiddleware, async (req, res, next) => {
  try {
    const invoice = await businessService.getInvoiceById(req.user.userId, req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.json({ success: true, data: invoice });
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

router.put('/invoices/:id', authMiddleware, async (req, res, next) => {
  try {
    const invoice = await businessService.updateInvoice(req.user.userId, req.params.id, req.body);
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

router.post('/invoices/:id/send', authMiddleware, async (req, res, next) => {
  try {
    const { method } = req.body;
    const result = await businessService.sendInvoice(req.user.userId, req.params.id, method);
    res.json({ success: true, data: result });
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

router.get('/sales', authMiddleware, async (req, res, next) => {
  try {
    const sales = await businessService.getSales(req.user.userId);
    res.json({ success: true, data: sales });
  } catch (err) {
    next(err);
  }
});

router.post('/sales', authMiddleware, async (req, res, next) => {
  try {
    const sale = await businessService.createSale(req.user.userId, req.body);
    res.status(201).json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
});

router.get('/sales/analytics', authMiddleware, async (req, res, next) => {
  try {
    const analytics = await businessService.getSalesAnalytics(req.user.userId);
    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
