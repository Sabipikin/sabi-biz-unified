// backend/src/config/migrate.js
// Database migration runner

const fs = require('fs');
const path = require('path');
const { query } = require('./db');
const logger = require('./logger');

/**
 * Run all pending migrations
 */
async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get all migration files
    const migrationsDir = path.join(__dirname, '../../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      // Check if migration has already been run
      const result = await query(
        'SELECT * FROM migrations WHERE name = $1',
        [file]
      );

      if (result.rows.length === 0) {
        logger.info(`Running migration: ${file}`);
        
        const sql = fs.readFileSync(
          path.join(migrationsDir, file),
          'utf-8'
        );

        // Execute migration
        await query(sql);

        // Record migration
        await query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        );

        logger.info(`✓ Completed: ${file}`);
      } else {
        logger.debug(`Skipped (already run): ${file}`);
      }
    }

    logger.info('✓ All migrations completed successfully');
    process.exit(0);
  } catch (err) {
    logger.error(`Migration failed: ${err.message || err}`);
    if (err.stack) {
      logger.error(err.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
