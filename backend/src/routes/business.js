// backend/src/routes/business.js

const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
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

router.get('/customers/analytics', authMiddleware, async (req, res, next) => {
  try {
    const analytics = await businessService.getCustomerAnalytics(req.user.userId);
    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

router.get('/customers/export', authMiddleware, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const customers = await businessService.getCustomersExport(req.user.userId, from, to);
    const rows = customers.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      city: c.city || '',
      region: c.region || '',
      delivery_address: c.delivery_address || '',
      birthday: c.birthday || '',
      anniversary: c.anniversary || '',
      auto_birthday: c.auto_birthday ? 'Yes' : 'No',
      auto_anniversary: c.auto_anniversary ? 'Yes' : 'No',
      invoice_count: c.invoice_count,
      paid_invoices: c.paid_invoices,
      pending_invoices: c.pending_invoices,
      total_spent: c.total_spent,
      total_profit: c.total_profit,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    const filename = `customers_export_${new Date().toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.get('/milestones', authMiddleware, async (req, res, next) => {
  try {
    const milestones = await businessService.getMilestoneMessages(req.user.userId);
    res.json({ success: true, data: milestones });
  } catch (err) {
    next(err);
  }
});

router.get('/milestones/templates', authMiddleware, async (req, res, next) => {
  try {
    const templates = await businessService.getMilestoneTemplates(req.user.userId);
    res.json({ success: true, data: templates });
  } catch (err) {
    next(err);
  }
});

router.put('/milestones/templates', authMiddleware, async (req, res, next) => {
  try {
    const templates = await businessService.saveMilestoneTemplates(req.user.userId, req.body);
    res.json({ success: true, data: templates });
  } catch (err) {
    next(err);
  }
});

router.get('/milestones/generate', authMiddleware, async (req, res, next) => {
  try {
    const { customerId, type } = req.query;
    const message = await businessService.generateMilestoneMessage(req.user.userId, customerId, type);
    res.json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});

router.post('/milestones/send', authMiddleware, async (req, res, next) => {
  try {
    const { customerId, milestoneType, messageText } = req.body;
    const result = await businessService.sendMilestoneMessage(req.user.userId, customerId, milestoneType, messageText);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/customers/:id', authMiddleware, async (req, res, next) => {
  try {
    const customer = await businessService.getCustomerById(req.user.userId, req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

router.put('/customers/:id', authMiddleware, async (req, res, next) => {
  try {
    const customer = await businessService.updateCustomer(req.user.userId, req.params.id, req.body);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

router.delete('/customers/:id', authMiddleware, async (req, res, next) => {
  try {
    const deleted = await businessService.deleteCustomer(req.user.userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: { id: deleted.id } });
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

router.post('/sales/bulk', authMiddleware, async (req, res, next) => {
  try {
    const sales = await businessService.createBulkSales(req.user.userId, req.body);
    res.status(201).json({ success: true, data: sales });
  } catch (err) {
    next(err);
  }
});

router.put('/sales/:id', authMiddleware, async (req, res, next) => {
  try {
    const sale = await businessService.updateSale(req.user.userId, req.params.id, req.body);
    res.json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
});

router.delete('/sales/:id', authMiddleware, async (req, res, next) => {
  try {
    const result = await businessService.deleteSale(req.user.userId, req.params.id);
    res.json({ success: true, data: result });
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

router.get('/sales/export', authMiddleware, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const rows = await businessService.getSalesByDateRange(req.user.userId, from || null, to || null);

    // generate xlsx using SheetJS
    const XLSX = require('xlsx');
    const wsData = [];
    const headers = ['ID','Product','Quantity','Unit Price','Total Amount','Profit','Bonus Adjustment','Adjustment Reason','Customer ID','Sale Date'];
    wsData.push(headers);
    rows.forEach(r => {
      wsData.push([
        r.id,
        r.product_name || '',
        r.quantity || 0,
        r.unit_price || 0,
        r.total_amount || 0,
        r.profit || 0,
        r.bonus_adjustment || 0,
        r.adjustment_reason || '',
        r.customer_id || '',
        r.sale_date || r.sale_time || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="sales_${from||'start'}_to_${to||'end'}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
