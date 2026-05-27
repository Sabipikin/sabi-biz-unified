const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir);
  } catch (e) {
    // best-effort
  }
}

const filePath = path.join(logsDir, 'startup.log');

function maskEnv(env) {
  const masked = {};
  const secretPatterns = [/secret/i, /password/i, /key/i, /token/i];
  Object.keys(env).forEach((k) => {
    const v = env[k];
    const isSecret = secretPatterns.some((p) => p.test(k));
    masked[k] = isSecret && v ? `${String(v).slice(0, 4)}…(redacted)` : v;
  });
  return masked;
}

function appendLine(obj) {
  try {
    const line = `${new Date().toISOString()} ${JSON.stringify(obj)}\n`;
    fs.appendFileSync(filePath, line);
  } catch (e) {
    // ignore file write errors
  }
}

module.exports = {
  info: (message, data = {}) => {
    appendLine({ level: 'info', message, data });
  },
  error: (message, err = null, data = {}) => {
    const payload = Object.assign({}, data, { error: err ? (err.stack || err.message || String(err)) : null });
    appendLine({ level: 'error', message, data: payload });
  },
  envSnapshot: () => ({ env: maskEnv(process.env) }),
};
