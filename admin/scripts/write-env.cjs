const fs = require('fs');
const path = require('path');

const apiBaseUrl =
  process.env.API_BASE_URL ||
  process.env.BACKEND_URL ||
  process.env.VITE_API_BASE_URL ||
  'https://sabibiz.onrender.com';

const outputPath = path.join(__dirname, '..', 'public', 'env.js');
const content = `window.SABIBIZ_API_BASE_URL = ${JSON.stringify(apiBaseUrl)};\n`;

fs.writeFileSync(outputPath, content, 'utf8');
console.log(`Wrote public/env.js with API base URL: ${apiBaseUrl}`);
