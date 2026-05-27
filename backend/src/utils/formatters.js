// backend/src/utils/formatters.js
// Data formatting utilities

/**
 * Format phone number to international format
 */
exports.formatPhone = (phone) => {
  if (!phone) return null;
  
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle Nigerian numbers
  if (cleaned.startsWith('234')) {
    return `+${cleaned}`;
  }
  
  if (cleaned.startsWith('0')) {
    return `+234${cleaned.slice(1)}`;
  }
  
  return `+234${cleaned}`;
};

/**
 * Format currency (NGN)
 */
exports.formatCurrency = (amount, currency = 'NGN') => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Format date
 */
exports.formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return null;
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * Sanitize user data (remove sensitive fields)
 */
exports.sanitizeUser = (user) => {
  const { password_hash, openai_api_key, ...safe } = user;
  return safe;
};

module.exports = exports;
