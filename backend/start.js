#!/usr/bin/env node

// Write diagnostics to both stdout AND a persistent log file
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, 'logs');
const logFile = path.join(logsDir, 'start.log');

// Ensure logs directory exists
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (e) {
  console.error('[INIT-ERR] Failed to create logs dir:', e.message);
}

function logBoth(msg) {
  console.log(msg);
  try {
    fs.appendFileSync(logFile, msg + '\n', { encoding: 'utf8' });
  } catch (e) {
    console.error('[LOG-ERR]', e.message);
  }
}

function logError(msg) {
  console.error(msg);
  try {
    fs.appendFileSync(logFile, 'ERROR: ' + msg + '\n', { encoding: 'utf8' });
  } catch (e) {
    console.error('[LOG-ERR]', e.message);
  }
}

// Immediate diagnostics
try {
  logBoth('[INIT] ' + new Date().toISOString() + ' - Process started, PID: ' + process.pid);
  logBoth('[INIT] Node version: ' + process.version);
  logBoth('[INIT] CWD: ' + process.cwd());
  logBoth('[INIT] PORT env: ' + (process.env.PORT || 'not set'));
  logBoth('[INIT] NODE_ENV: ' + (process.env.NODE_ENV || 'not set'));
  logBoth('[INIT] DATABASE_URL present: ' + !!process.env.DATABASE_URL);
  logBoth('[INIT] DATABASE_URL length: ' + (process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0));
} catch (e) {
  console.error('[INIT-ERR] Early logging failed:', e.message);
}

// Add global error handlers BEFORE any require
process.on('uncaughtException', (err) => {
  logError('[FATAL] Uncaught exception: ' + err.message);
  logError(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('[FATAL] Unhandled rejection: ' + reason);
  process.exit(1);
});

try {
  logBoth('[INIT] Loading application...');
  require('./src/server.js');
  logBoth('[INIT] Application loaded successfully');
} catch (err) {
  logError('[FATAL] Application load failed: ' + err.message);
  logError(err.stack);
  process.exit(1);
}


