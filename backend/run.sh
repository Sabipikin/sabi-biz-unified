#!/bin/bash
echo "==================== STARTING BACKEND ====================" >&2
echo "[STARTUP] $(date -u +'%Y-%m-%dT%H:%M:%SZ')" >&2
echo "[STARTUP] CWD: $(pwd)" >&2
echo "[STARTUP] NODE_ENV: ${NODE_ENV}" >&2
echo "[STARTUP] PORT: ${PORT}" >&2
echo "[STARTUP] NODE: $(node --version)" >&2
echo "[STARTUP] Running: node start.js" >&2
echo "========================================================" >&2
exec node start.js
