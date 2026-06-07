#!/usr/bin/env node

// Keep Render/dashboard defaults safe: if this file is used as the entrypoint,
// start the full API instead of the old minimal fallback server.
require('./render');
