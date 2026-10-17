/* Read-only probe of the anticipate surface on a given origin.
   No screenshots. Reports what a browser actually renders, in zh-CN and en-US. */
const { chromium } = require('playwright-core');
const BASE = (process.argv[2] || 'https://kkmatch-gcai-preview.app.workbuddy.host').replace(/\/$/, '');
const PATH_ = process.argv[3] || '/preview/intent/anticipate/';
const CHROME = process.env.KK_CHROME || 'C:/Users/AS/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-proxy-server', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const out = {};
  for (const lang of ['zh-CN', 'en-US']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: lang });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
    const resp = await page.goto(BASE + PATH_ + '?lang=' + lang, { waitUntil: 'load' });
    await page.waitForFunction(() => document.body && document.body.getAttribute('data-booted') === 'true', null, { timeout: 15000 }).catch(() => {});
    const info = await page.evaluate(() => {
      const vis = (el) => { if (!el) return false; const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      const txt = (s) => { const el = document.querySelector(s); return el && vis(el) ? (el.innerText || '').trim() : null; };
      const links = Array.from(document.querySelectorAll('a')).filter(vis).map(a => ({ text: (a.innerText || '').trim(), href: a.getAttribute('href'), h: Math.round(a.getBoundingClientRect().height) }));
      const btns = Array.from(document.querySelectorAll('button')).filter(vis);
      return {
        title: document.title,
        htmlLang: document.documentElement.lang,
        h1: txt('h1'),
        eyebrow: txt('[data-i18n="s.field.eyebrow"]') || txt('.field__eyebrow'),
        booted: document.body.getAttribute('data-booted'),
        bodyChars: (document.body.innerText || '').trim().length,
        visibleLinks: links,
        visibleButtons: btns.length,
        minTarget: Math.min(...Array.from(document.querySelectorAll('a,button')).filter(vis).map(e => Math.round(e.getBoundingClientRect().height))),
        canvas: !!document.querySelector('canvas') && vis(document.querySelector('canvas')),
        scrollH: document.documentElement.scrollHeight
      };
    });
    out[lang] = { status: resp.status(), ctype: resp.headers()['content-type'], ...info, errors: errs };
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 1));
})();
