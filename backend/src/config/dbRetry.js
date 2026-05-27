const logger = require('./logger');
const { testConnection } = require('./db');

const DEFAULT_RETRIES = 5;
const DEFAULT_DELAY_MS = 2000;

async function retryWithBackoff(
  fn,
  maxRetries = DEFAULT_RETRIES,
  delayMs = DEFAULT_DELAY_MS
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) {
        logger.error(`DB retry exhausted after ${maxRetries} attempts:`, err);
        throw err;
      }
      const nextDelay = delayMs * attempt;
      logger.warn(`DB attempt ${attempt}/${maxRetries} failed, retrying in ${nextDelay}ms:`, {
        error: err.message,
      });
      await new Promise((resolve) => setTimeout(resolve, nextDelay));
    }
  }
}

async function ensureDbConnected(maxRetries = DEFAULT_RETRIES) {
  return retryWithBackoff(() => testConnection(), maxRetries);
}

module.exports = {
  retryWithBackoff,
  ensureDbConnected,
};
