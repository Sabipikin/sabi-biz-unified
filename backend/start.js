#!/usr/bin/env node

// Absolute startup script - logs to stdout/stderr FIRST, before anything else
// Use stderr for critical errors to ensure they're visible even if stdout is buffered
console.log('[INIT] Process started, PID:', process.pid);
console.log('[INIT] Node version:', process.version);
console.log('[INIT] CWD:', process.cwd());
console.log('[INIT] PORT env:', process.env.PORT || 'not set');
console.log('[INIT] NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('[INIT] DATABASE_URL set:', !!process.env.DATABASE_URL);

// Add global error handlers BEFORE any require
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  process.exit(1);
});

try {
  console.log('[INIT] Loading application...');
  require('./src/server.js');
} catch (err) {
  console.error('[FATAL] Application load failed:', err);
  console.error('[FATAL] Stack:', err.stack);
  process.exit(1);
}

