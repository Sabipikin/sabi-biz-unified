#!/usr/bin/env node
/**
 * MINIMAL DIAGNOSTIC ENTRY POINT
 * This file exists ONLY to verify Node can execute anything on Render
 * If this doesn't output, nothing on this machine can
 */

// Write immediately to ensure buffer flush
process.stdout.write('[RENDER-TEST] Node.js process started\n');
process.stdout.write('[RENDER-TEST] PID: ' + process.pid + '\n');
process.stdout.write('[RENDER-TEST] CWD: ' + process.cwd() + '\n');
process.stdout.write('[RENDER-TEST] NODE_ENV: ' + (process.env.NODE_ENV || 'undefined') + '\n');
process.stdout.write('[RENDER-TEST] PORT: ' + (process.env.PORT || '3000') + '\n');
process.stdout.write('[RENDER-TEST] About to load start-wrapper\n');

try {
  require('./start-wrapper.js');
} catch (err) {
  process.stderr.write('[RENDER-TEST-ERROR] Failed to load start-wrapper: ' + err.message + '\n');
  if (err.stack) process.stderr.write(err.stack + '\n');
  process.exit(1);
}
