// backend/src/middleware/auth.js
// JWT authentication middleware

const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Verify JWT token from Authorization header
 * Usage: app.use(authMiddleware) or router.use(authMiddleware)
 */
exports.authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [process.env.JWT_ALGORITHM || 'HS256'],
    });

    // Attach user data to request
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn('Auth middleware error:', { error: err.message });
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
};

/**
 * Verify user is admin
 * Usage: router.use(authMiddleware, adminMiddleware)
 */
exports.adminMiddleware = (req, res, next) => {
  const adminRoles = ['admin', 'super_admin'];

  if (!adminRoles.includes(req.user?.role)) {
    logger.warn('Unauthorized admin access attempt', { userId: req.user?.id });
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
  next();
};

/**
 * Verify subscription is active
 * Usage: router.use(authMiddleware, subscriptionMiddleware)
 */
exports.subscriptionMiddleware = (req, res, next) => {
  if (req.user?.subscription_status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Active subscription required',
    });
  }
  next();
};

module.exports = exports;
