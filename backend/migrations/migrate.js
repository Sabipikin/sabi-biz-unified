// backend/migrations/migrate.js
// Entry point for database migrations from package scripts

require('dotenv').config();
const { runMigrations } = require('../src/config/migrate');

runMigrations();
