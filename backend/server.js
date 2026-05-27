#!/usr/bin/env node
/**
 * ABSOLUTE MINIMUM SERVER - Render Fallback
 * This exists only to verify Render can run ANYTHING
 * If this doesn't work, there's a Render infrastructure issue
 */

const http = require('http');
const PORT = process.env.PORT || 3000;

// Test 1: Can we create an HTTP server?
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Sabi Biz Backend - Minimal Server');
  }
});

// Test 2: Can we listen on a port?
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[MINIMAL-SERVER] Listening on port ${PORT}`);
  console.log(`[MINIMAL-SERVER] PID: ${process.pid}`);
  console.log(`[MINIMAL-SERVER] Uptime: ${process.uptime()}s`);
  
  // Test 3: Try to load full app after proving we can listen
  try {
    console.log('[MINIMAL-SERVER] Attempting to load render-test.js...');
    require('./render-test.js');
  } catch (err) {
    console.error('[MINIMAL-SERVER-ERROR]', err.message);
    // Don't exit - keep the minimal server running
  }
});

// Keep server running
process.on('SIGTERM', () => {
  console.log('[MINIMAL-SERVER] SIGTERM received');
  server.close(() => process.exit(0));
});
