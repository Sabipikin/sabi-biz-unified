// backend/src/utils/validators.js
// Reusable validation functions

/**
 * Validate email format
 */
exports.isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
exports.isStrongPassword = (password) => {
  return password && password.length >= 8;
};

/**
 * Validate phone number (Nigerian format)
 */
exports.isValidPhone = (phone) => {
  // Accept +234, 0234, or just the digits
  const phoneRegex = /^(?:\+234|0)?[789]\d{9}$/;
  return phoneRegex.test(phone?.replace(/\s/g, ''));
};

/**
 * Validate UUID v4
 */
exports.isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate amount (positive number)
 */
exports.isValidAmount = (amount) => {
  return !isNaN(amount) && parseFloat(amount) > 0;
};

module.exports = exports;
