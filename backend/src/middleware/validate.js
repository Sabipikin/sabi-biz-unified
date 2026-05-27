// backend/src/middleware/validate.js
// Request validation middleware

/**
 * Validate request body against schema
 * @param {object} schema - Validation schema
 */
exports.validate = (schema) => {
  return (req, res, next) => {
    // Simple validation - can be replaced with joi/zod
    const errors = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && !value) {
        errors[field] = `${field} is required`;
        continue;
      }

      if (rules.type && value && typeof value !== rules.type) {
        errors[field] = `${field} must be ${rules.type}`;
      }

      if (rules.min && value && value.length < rules.min) {
        errors[field] = `${field} must be at least ${rules.min} characters`;
      }

      if (rules.max && value && value.length > rules.max) {
        errors[field] = `${field} must be at most ${rules.max} characters`;
      }

      if (rules.pattern && value && !rules.pattern.test(value)) {
        errors[field] = rules.message || `${field} is invalid`;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
    }

    next();
  };
};

// Common validation schemas
exports.schemas = {
  register: {
    name: { required: true, type: 'string', min: 2, max: 100 },
    email: {
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Invalid email address',
    },
    password: { required: true, type: 'string', min: 8 },
    phone: { type: 'string', min: 10 },
  },
  login: {
    email: { required: true, type: 'string' },
    password: { required: true, type: 'string' },
  },
};

module.exports = exports;
