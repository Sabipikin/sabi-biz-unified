#!/usr/bin/env node

// Absolute startup script - logs to stdout first, before anything else
console.log('[INIT] Process started, PID:', process.pid);
console.log('[INIT] Node version:', process.version);
console.log('[INIT] CWD:', process.cwd());
console.log('[INIT] PORT env:', process.env.PORT || 'not set');
console.log('[INIT] NODE_ENV:', process.env.NODE_ENV || 'not set');

try {
  console.log('[INIT] Loading application...');
  require('./src/server.js');
} catch (err) {
  console.error('[FATAL] Application load failed:', err);
  process.exit(1);
}
