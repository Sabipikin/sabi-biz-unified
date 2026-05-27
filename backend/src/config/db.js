// backend/src/config/db.js
// PostgreSQL connection pool configuration

const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'sabibiz',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        ssl: process.env.DB_SSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
      }
);

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

// Test connection
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    logger.error(`Database connection failed: ${err.message || err}`);
    if (err.stack) {
      logger.error(err.stack);
    }
  } else {
    logger.info('Database connected successfully');
  }
});

/**
 * Execute a query with parameterized statements (prevents SQL injection)
 * @param {string} text - SQL query
 * @param {array} params - Query parameters
 * @returns {Promise}
 */
exports.query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Executed query in ${duration}ms`);
    return result;
  } catch (err) {
    logger.error(`Database error: ${err.message}`, { query: text });
    throw err;
  }
};

/**
 * Get a client for transaction handling
 * @returns {Promise<Client>}
 */
exports.getClient = async () => {
  return await pool.connect();
};

/**
 * Close the pool
 */
exports.closePool = async () => {
  return await pool.end();
};

module.exports = {
  query: exports.query,
  getClient: exports.getClient,
  closePool: exports.closePool,
  pool,
};
