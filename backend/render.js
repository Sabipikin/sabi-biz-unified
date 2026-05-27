// Minimal entry point for Render deployment
// Direct server startup without complex spawning

process.stdout.write('[RENDER] Starting SabiBiz Backend...\n');
process.stdout.write('[RENDER] Node version: ' + process.version + '\n');
process.stdout.write('[RENDER] PORT: ' + (process.env.PORT || 3000) + '\n');

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  process.stdout.write('[RENDER] FATAL ERROR: ' + err.message + '\n');
  process.stdout.write(err.stack + '\n');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  process.stdout.write('[RENDER] Unhandled Rejection: ' + reason + '\n');
});

try {
  require('dotenv').config();
  require('./src/server');
} catch (err) {
  process.stdout.write('[RENDER] Failed to start: ' + err.message + '\n');
  process.stdout.write(err.stack + '\n');
  process.exit(1);
}
