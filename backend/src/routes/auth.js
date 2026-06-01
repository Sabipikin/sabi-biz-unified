// backend/src/routes/auth.js
// Authentication routes

const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const authService = require('../services/authService');
const { authMiddleware } = require('../middleware/auth');

// Register
router.post('/register', async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      token: result.token,
      user: result.user,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, token: result.token, user: result.user });
  } catch (err) {
    next(err);
  }
});

// Google OAuth
router.post('/google', async (req, res, next) => {
  try {
    logger.info('Google OAuth endpoint called');
    res.status(501).json({
      success: false,
      message: 'Google OAuth not yet implemented',
    });
  } catch (err) {
    next(err);
  }
});

// Apple Sign-In
router.post('/apple', async (req, res, next) => {
  try {
    logger.info('Apple Sign-In endpoint called');
    res.status(501).json({
      success: false,
      message: 'Apple Sign-In not yet implemented',
    });
  } catch (err) {
    next(err);
  }
});

// Neon SSO
router.post('/neon', async (req, res, next) => {
  try {
    logger.info('Neon SSO endpoint called');
    res.status(501).json({
      success: false,
      message: 'Neon SSO not yet implemented',
    });
  } catch (err) {
    next(err);
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
