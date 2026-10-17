/* Smoke probe: does the shell boot, is WebGL really there, and does a compile
   actually produce a payload? Prints raw facts, asserts nothing. */
const { chromium } = require('playwright-core');

const BASE = process.argv[2] || 'http://127.0.0.1:18091';
const CHROME = 'C:/Users/AS/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-proxy-server', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const warns = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error') errors.push('CONSOLE ' + m.text());
    if (m.type() === 'warning') warns.push(m.text());
  });

  await page.goto(BASE + '/preview/intent/compile/', { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => document.body.getAttribute('data-booted') === 'true', { timeout: 8000 });
  } catch (e) { /* keep going, we want the raw state */ }

  const snap = await page.evaluate(() => {
    const q = s => document.querySelector(s);
    const inter = Array.from(document.querySelectorAll('a[href], button, select, textarea, input, [role="button"], summary'));
    const small = inter.map(el => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, cls: el.className.toString().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) };
    }).filter(x => x.h > 0 && x.h < 44);
    return {
      booted: document.body.getAttribute('data-booted'),
      fieldBackendAttr: document.body.getAttribute('data-field-backend'),
      fieldParticles: document.body.getAttribute('data-field-particles'),
      field: window.KK && KK.field ? KK.field.stats() : null,
      i18n: window.KK && KK.i18n ? KK.i18n.stats() : null,
      hud: !!q('[data-testid="hud"]'),
      hudKids: q('[data-testid="hud"]') ? q('[data-testid="hud"]').children.length : 0,
      viewNav: document.querySelectorAll('[data-testid="view-nav"] button').length,
      stageChildren: q('[data-testid="stage"]') ? q('[data-testid="stage"]').children.length : 0,
      smallTargets: small,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      caps: document.querySelectorAll('[data-caps]').length ? q('[data-testid="boundary-body"]').getAttribute('data-caps') : null,
      three: !!window.THREE,
      gsap: !!window.gsap,
      compileNs: !!window.KK.compile
    };
  });

  let compiled = null;
  try {
    compiled = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="n-input"]');
      input.value = '帮我搭一套 CBT 练习，能早点拦住情绪下滑，今晚回访我。';
      input.dispatchEvent(new Event('input'));
      const p = window.KK.compile.run();
      if (!p) return { failed: true };
      return {
        nodes: p.nodes, edges: p.edges, tone: p.features.tone, chars: p.features.chars,
        work: p.work, pacingTotal: p.pacing.totalMs, logs: p.logs.length,
        meshState: window.KK.compile.state(),
        collapse: KK.field.stats().collapse,
        nodesHtml: document.querySelectorAll('[data-testid="n-rail"] [data-node]').length,
        termLines: document.querySelectorAll('[data-testid="n-term"] .term__line').length
      };
    });
  } catch (e) { compiled = { evaluateError: String(e.message).slice(0, 300) }; }

  console.log(JSON.stringify({ snap, compiled, errors, warnCount: warns.length, warnSample: warns.slice(0, 4) }, null, 2));
  await browser.close();
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
