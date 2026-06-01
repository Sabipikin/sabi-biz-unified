// backend/src/middleware/errorHandler.js
// Global error handling middleware

const logger = require('../config/logger');

/**
 * Global error handler
 * Must be placed last in middleware chain
 * Usage: app.use(errorHandler)
 */
exports.errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Log error
  logger.error(message, {
    status,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    error: err.stack,
  });

  // Send error response
  res.status(status).json({
    success: false,
    message,
    status,
    ...(process.env.NODE_ENV === 'development' && { error: err.stack }),
  });
};

/**
 * 404 handler
 * Usage: app.use(notFound)
 */
exports.notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
};

/**
 * Custom error class
 */
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}

exports.AppError = AppError;
