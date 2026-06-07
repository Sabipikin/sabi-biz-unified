const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const aiSettingsService = require('../services/aiSettingsService');

router.get('/settings', authMiddleware, async (req, res, next) => {
  try {
    const settings = await aiSettingsService.get(req.user.userId);
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', authMiddleware, async (req, res, next) => {
  try {
    const settings = await aiSettingsService.save(req.user.userId, req.body);
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
