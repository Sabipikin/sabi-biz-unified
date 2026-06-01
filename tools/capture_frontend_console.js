const puppeteer = require('puppeteer');

(async () => {
  const url = 'http://localhost:3000/';
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    logs.push({ type: 'console', text: msg.text() });
    console.log(`[console] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    logs.push({ type: 'pageerror', text: err.message });
    console.error('[pageerror]', err.message);
  });
  page.on('requestfailed', req => {
    console.error('[requestfailed]', req.url(), req.failure() && req.failure().errorText);
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

    // set a fake token to simulate logged-in user
    await page.evaluate(() => {
      localStorage.setItem('token', 'test-token');
    });

    await page.reload({ waitUntil: 'networkidle2', timeout: 20000 });

    // Give the app a moment to render
    await new Promise(r => setTimeout(r, 1000));

    const routes = ['dashboard', 'invoices', 'inventory', 'whatsapp', 'settings'];
    for (const route of routes) {
      console.log(`\n--- Navigating to ${route} ---`);
      // click the link if available
      const linkSelector = `.navbar-menu a[data-route="${route}"]`;
      const exists = await page.$(linkSelector);
      if (exists) {
        await page.click(linkSelector);
        await new Promise(r => setTimeout(r, 800));
      } else {
        console.log(`Link ${linkSelector} not found`);
      }

      // capture inner HTML of #content for quick inspection
      const content = await page.evaluate(() => {
        const el = document.getElementById('content');
        return el ? el.innerText.slice(0, 800) : '<no-content>';
      });
      console.log('Content snapshot:', content.replace(/\n/g, ' | '));

      await new Promise(r => setTimeout(r, 500));
    }
  } catch (err) {
    console.error('Test script error:', err.message);
  } finally {
    await browser.close();
  }
})();
