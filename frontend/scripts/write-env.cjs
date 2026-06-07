const fs = require('fs');
const path = require('path');

const apiBaseUrl =
  process.env.API_BASE_URL ||
  process.env.BACKEND_URL ||
  process.env.VITE_API_BASE_URL ||
  'https://sabibiz.onrender.com';
const appUrl =
  process.env.APP_URL ||
  process.env.SABIBIZ_APP_URL ||
  'https://sabireply.netlify.app';
const adminUrl =
  process.env.ADMIN_URL ||
  process.env.SABIBIZ_ADMIN_URL ||
  'https://sabibizadmin.netlify.app';
const initialRoute =
  process.env.SABIBIZ_INITIAL_ROUTE ||
  '#/dashboard';
const escapedInitialRoute = initialRoute.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const outputPath = path.join(__dirname, '..', 'public', 'env.js');
const content = `// Frontend environment configuration (deployed URLs)
window.SABIBIZ_API_BASE_URL = ${JSON.stringify(apiBaseUrl)};
window.SABIBIZ_APP_URL = ${JSON.stringify(appUrl)};
window.SABIBIZ_ADMIN_URL = ${JSON.stringify(adminUrl)};
// Ensure the app opens on the dashboard by default when deployed
window.SABIBIZ_INITIAL_ROUTE = '${escapedInitialRoute}';
`;

fs.writeFileSync(outputPath, content, 'utf8');
console.log(`Wrote public/env.js with API base URL: ${apiBaseUrl}`);

// Also write a small build/version file to enable cache-busting for env.js
try {
  const child = require('child_process');
  const pkg = require(path.join(__dirname, '..', 'package.json'));
  let gitHash = '';
  try {
    gitHash = child.execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    gitHash = '';
  }
  const buildStamp = new Date().toISOString().replace(/[:.]/g, '-');
  const buildVersion = pkg && pkg.version ? `${pkg.version}${gitHash ? `+${gitHash}` : ''}` : buildStamp;
  const versionPath = path.join(__dirname, '..', 'public', 'env.version.js');
  const versionContent = `// Frontend build/version
window.SABIBIZ_BUILD = ${JSON.stringify(buildVersion)};
window.SABIBIZ_BUILD_TIMESTAMP = ${JSON.stringify(buildStamp)};
`;
  fs.writeFileSync(versionPath, versionContent, 'utf8');
  console.log(`Wrote public/env.version.js with build ${buildVersion}`);
} catch (err) {
  console.warn('Could not write env.version.js for cache-busting:', err && err.message);
}
