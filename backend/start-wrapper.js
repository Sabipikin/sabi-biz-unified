#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

// Logging setup
const timestamp = new Date().toISOString();
const tempLog = `/tmp/render-startup-${Date.now()}.log`;
const logsDir = path.join(__dirname, 'logs');
const persistLog = path.join(logsDir, `render-startup-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create write stream for logging
const logStream = fs.createWriteStream(persistLog, { flags: 'a' });

function log(msg) {
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  console.error(line);
  logStream.write(line + '\n');
  fs.appendFileSync(tempLog, line + '\n', 'utf8');
}

log('==================== STARTING BACKEND (NODE ENTRY) ====================');
log(`CWD: ${process.cwd()}`);
log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
log(`PORT: ${process.env.PORT || '3000'}`);
log(`Node: ${process.version}`);
log(`Temp Log: ${tempLog}`);
log(`Persist Log: ${persistLog}`);
log('========================================================');

// Spawn node start.js
const child = spawn('node', ['start.js'], {
  stdio: 'inherit',
  env: process.env,
  cwd: __dirname
});

child.on('exit', (code, signal) => {
  log(`node start.js exited with code ${code}, signal ${signal}`);
  logStream.end();
  process.exit(code || 1);
});

child.on('error', (err) => {
  log(`FATAL: Failed to spawn: ${err.message}`);
  logStream.end();
  process.exit(1);
});
