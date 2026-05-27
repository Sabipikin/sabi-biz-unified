#!/bin/bash

# Write diagnostics to both stdout/stderr AND files (persistent + temp)
TEMP_LOG="/tmp/render-startup-$(date +%s).log"
mkdir -p "$(pwd)/logs"
PERSIST_LOG="$(pwd)/logs/render-startup-$(date +%Y%m%d-%H%M%S).log"

# Tee to both files and stdout
exec 1> >(tee -a "$TEMP_LOG" "$PERSIST_LOG")
exec 2> >(tee -a "$TEMP_LOG" "$PERSIST_LOG" >&2)

echo "==================== STARTING BACKEND ====================" 
echo "[STARTUP] $(date -u +'%Y-%m-%dT%H:%M:%SZ')" 
echo "[STARTUP] CWD: $(pwd)" 
echo "[STARTUP] TEMP_LOG: $TEMP_LOG"
echo "[STARTUP] PERSIST_LOG: $PERSIST_LOG"
echo "[STARTUP] NODE_ENV: ${NODE_ENV}" 
echo "[STARTUP] PORT: ${PORT}" 
echo "[STARTUP] NODE: $(node --version)" 
echo "[STARTUP] Running: node start.js" 
echo "========================================================" 

# Execute with explicit error checking
node start.js
EXIT_CODE=$?
echo "[STARTUP] node start.js exited with code: $EXIT_CODE" 
echo "[STARTUP] Logs saved to: $TEMP_LOG and $PERSIST_LOG"
exit $EXIT_CODE
