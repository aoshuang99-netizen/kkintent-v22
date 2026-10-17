/* Real-pointer click chain against the share-link origin.
   No screenshots (the sandbox blocks image writes); every step asserts a
   rendered box, readable text, a successful pointer click, and the resulting
   URL. A link that exists in the DOM but is not on screen fails here. */
const { chromium } = require('playwright-core');

const BASE = process.argv[2] || 'https://kkmatch-gcai-preview.app.workbuddy.host';
const CHROME = process.env.KK_CHROME || 'C:/Users/AS/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';

const out = [];
function rec(step, okv, detail) { out.push({ step, ok: okv, detail }); }

async function box(page, sel, expectText) {
  const el = page.locator(sel).first();
  const n = await el.count();
  if (!n) return { ok: false, why: 'not in DOM' };
  const m = await el.evaluate((node) => {
    const cs = getComputedStyle(node);
    const r = node.getBoundingClientRect();
    return {
      visible: node.checkVisibility ? node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : cs.display !== 'none',
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
      w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top),
      text: (node.innerText || '').trim(), href: node.getAttribute('href'),
      pointer: cs.pointerEvents
    };
  });
  const okv = m.visible && m.w > 0 && m.h > 0 && m.h >= 44 &&
              (!expectText || m.text.indexOf(expectText) >= 0) && m.pointer !== 'none';
  return { ok: okv, m };
}

async function settle(page) {
  await page.waitForLoadState('load');
  await page.waitForFunction(() => document.body && document.body.getAttribute('data-booted') === 'true', null, { timeout: 15000 }).catch(() => {});
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-proxy-server', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });

  const hop = async (label, sel, expectPath, expectText) => {
    const b = await box(page, sel, expectText);
    if (!b.ok) { rec(label, false, b.m || b.why); return false; }
    let clicked = true;
    try { await page.locator(sel).first().click({ timeout: 10000 }); }
    catch (e) { clicked = false; rec(label, false, { clickFailed: String(e).slice(0, 160), m: b.m }); return false; }
    await settle(page);
    const p = new URL(page.url()).pathname;
    const okv = clicked && p === expectPath;
    rec(label, okv, { from: b.m.href, landed: p, expected: expectPath, text: b.m.text, box: b.m.w + 'x' + b.m.h });
    return okv;
  };

  await page.goto(BASE + '/', { waitUntil: 'load' });
  await settle(page);
  rec('arrive.hub', new URL(page.url()).pathname === '/', { landed: new URL(page.url()).pathname });

  await hop('hub -> anticipate', 'a[href="preview/intent/anticipate/"]', '/preview/intent/anticipate/', '');
  await hop('anticipate -> hub (footer)', 'nav.footnav a[href$="/"]', '/', '');
  await hop('hub -> compile', 'a[href="preview/intent/compile/"]', '/preview/intent/compile/', '');
  await hop('compile -> hub (footer)', 'nav.footnav a[href$="/"]', '/', '');
  await hop('hub -> site', 'a[href="preview/site/"]', '/preview/site/', '');
  await hop('site -> hub', 'a[href="../../"]', '/', '');

  // The footer link home is absolute on purpose: it is the only exit that works
  // from both origins. Assert the target without leaving the package.
  const home = await box(page, 'nav.footnav a[href="https://kkmatch.com/"]', 'kkmatch.com');
  rec('hub -> kkmatch.com (footer, absolute)', home.ok, home.m || home.why);

  rec('no.page.errors', errs.length === 0, errs.slice(0, 5));
  await ctx.close();
  await browser.close();

  const pass = out.filter(r => r.ok).length;
  console.log(JSON.stringify({ total: out.length, pass, fail: out.length - pass, results: out }, null, 0));
  process.exit(pass === out.length ? 0 : 1);
})();
