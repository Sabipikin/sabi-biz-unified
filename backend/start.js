#!/usr/bin/env node

// Startup script - immediate console output, no file I/O initially
console.log('[INIT] Process started at ' + new Date().toISOString());
console.log('[INIT] PID: ' + process.pid);
console.log('[INIT] Node: ' + process.version);
console.log('[INIT] CWD: ' + process.cwd());
console.log('[INIT] PORT: ' + (process.env.PORT || '3000'));
console.log('[INIT] NODE_ENV: ' + (process.env.NODE_ENV || 'not set'));

// Catch ANY unhandled errors IMMEDIATELY
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  process.exit(1);
});

// Load the application
try {
  console.log('[INIT] Loading server...');
  require('./src/server.js');
  console.log('[INIT] Server loaded successfully');
} catch (err) {
  console.error('[FATAL] Failed to load server:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
}



