const { chromium } = require('playwright-core');
const CHROME = 'C:/Users/AS/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-proxy-server'] });
  const c = await b.newContext({ javaScriptEnabled: false, viewport: { width: 900, height: 700 } });
  const p = await c.newPage();
  const html = await (await c.request.get('http://127.0.0.1:18091/')).text();
  await p.setContent(html, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const a = document.querySelector('a.door__go');
    if (!a) return { found: false, url: location.href, body: document.body ? document.body.innerText.slice(0,80) : null };
    const b = a.getBoundingClientRect();
    return { found: true, url: location.href, h: Math.round(b.height), w: Math.round(b.width),
             text: a.innerText.replace(/\s+/g,' ').trim(), href: a.getAttribute('href') };
  });
  console.log(JSON.stringify(r, null, 2));
  await b.close();
})();
