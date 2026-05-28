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

    // Create migrations table if it doesn't exist (ignore errors)
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (err) {
      // Table might already exist, which is fine
      if (!err.message.includes('already exists')) {
        logger.warn('Migration table creation warning:', err.message);
      }
    }

    // Get all migration files
    const migrationsDir = path.join(__dirname, '../../migrations');
    if (!fs.existsSync(migrationsDir)) {
      logger.info('No migrations directory found, skipping migrations');
      return { success: true, skipped: true };
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      logger.info('No migration files found');
      return { success: true, migrations: 0 };
    }

    let migrationCount = 0;
    for (const file of files) {
      try {
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
          migrationCount++;
        } else {
          logger.debug(`Skipped (already run): ${file}`);
        }
      } catch (err) {
        logger.warn(`Migration ${file} failed: ${err.message}`);
        // Continue with other migrations
      }
    }

    logger.info(`✓ Migrations completed: ${migrationCount} new migrations executed`);
    return { success: true, migrations: migrationCount };
  } catch (err) {
    logger.error(`Migration error: ${err.message || err}`);
    // Return error but don't stop the server
    return { success: false, error: err.message };
  }
}

// Run if called directly (for manual migration)
if (require.main === module) {
  runMigrations().then(result => {
    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  }).catch(err => {
    logger.error('Migration failed:', err);
    process.exit(1);
  });
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
