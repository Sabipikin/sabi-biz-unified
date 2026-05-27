#!/usr/bin/env node

// Force unbuffered output
process.stderr.write('[INIT] ===== BACKEND STARTING =====\n');
process.stderr.write('[INIT] Process started at ' + new Date().toISOString() + '\n');
process.stderr.write('[INIT] PID: ' + process.pid + '\n');
process.stderr.write('[INIT] Node: ' + process.version + '\n');
process.stderr.write('[INIT] CWD: ' + process.cwd() + '\n');
process.stderr.write('[INIT] PORT: ' + (process.env.PORT || '3000') + '\n');
process.stderr.write('[INIT] NODE_ENV: ' + (process.env.NODE_ENV || 'not set') + '\n');

// Catch ANY unhandled errors IMMEDIATELY
process.on('uncaughtException', (err) => {
  process.stderr.write('[FATAL] Uncaught exception: ' + err.message + '\n');
  if (err.stack) process.stderr.write(err.stack + '\n');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  process.stderr.write('[FATAL] Unhandled rejection: ' + String(reason) + '\n');
  process.exit(1);
});

// Load the application
try {
  process.stderr.write('[INIT] Loading server...\n');
  require('./src/server.js');
  process.stderr.write('[INIT] Server loaded successfully\n');
} catch (err) {
  process.stderr.write('[FATAL] Failed to load server: ' + err.message + '\n');
  if (err.stack) process.stderr.write(err.stack + '\n');
  process.exit(1);
}




