// Minimal entry point for Render deployment
// Direct server startup with EPIPE error suppression

process.stdout.write('[RENDER] Starting SabiBiz Backend...\n');
process.stdout.write('[RENDER] Node version: ' + process.version + '\n');
process.stdout.write('[RENDER] PORT: ' + (process.env.PORT || 3000) + '\n');

// Suppress EPIPE errors (happens when stdout is piped to head/less)
process.stdout.on('error', function(err) {
  if (err.code === 'EPIPE') {
    process.exit(0);
  }
});

process.stderr.on('error', function(err) {
  if (err.code === 'EPIPE') {
    process.exit(0);
  }
});

// Handle uncaught errors gracefully
process.on('uncaughtException', (err) => {
  try {
    process.stderr.write('[RENDER] FATAL ERROR: ' + err.message + '\n');
    if (err.stack) process.stderr.write(err.stack + '\n');
  } catch (e) {
    // Ignore write errors
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  try {
    process.stderr.write('[RENDER] Unhandled Rejection: ' + reason + '\n');
  } catch (e) {
    // Ignore write errors
  }
});

try {
  require('dotenv').config();
  require('./src/server');
} catch (err) {
  try {
    process.stderr.write('[RENDER] Failed to start: ' + err.message + '\n');
    if (err.stack) process.stderr.write(err.stack + '\n');
  } catch (e) {
    // Ignore write errors
  }
  process.exit(1);
}
