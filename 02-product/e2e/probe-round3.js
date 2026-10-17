/* ============================================================================
   Quick runtime probe for the new surfaces (site + retention + sound +
   contract). Read-only: reports, never asserts. Used to catch runtime errors
   before the full gate runs.
   ========================================================================== */
const { chromium } = require('playwright-core');
const CHROME = process.env.KK_CHROME || 'C:/Users/AS/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const ARGS = ['--no-proxy-server', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const BASE = process.argv[2] || 'http://127.0.0.1:18091';
const WHICH = process.argv[3] || 'site';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ARGS });
  const out = {};

  if (WHICH === 'site') {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
    await p.goto(BASE + '/preview/site/?lang=en-US', { waitUntil: 'load' });
    await p.waitForTimeout(600);
    out.booted = await p.evaluate(() => document.body.getAttribute('data-booted'));
    out.errors = errs;
    out.state0 = await p.evaluate(() => (window.KK.site ? KK.site.state() : null));
    out.h1 = await p.evaluate(() => {
      const h = document.querySelector('h1[data-testid]');
      return h ? h.textContent.trim().slice(0, 70) : null;
    });
    out.overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    out.emptyI18n = await p.evaluate(() => Array.from(document.querySelectorAll('[data-i18n]'))
      .filter(e => e.getBoundingClientRect().height > 0 && !e.textContent.trim()).map(e => e.getAttribute('data-i18n')));
    out.keys = await p.evaluate(() => KK.i18n.stats());
    out.caps = await p.evaluate(() => document.querySelectorAll('[data-testid="boundary-body"] tr[data-cap]').length);
    out.contract = await p.evaluate(() => {
      const h = document.querySelector('[data-testid="site-contract"]');
      return h ? { fields: h.getAttribute('data-fields'), validate: h.getAttribute('data-validate'), status: h.getAttribute('data-status'), endpoint: h.getAttribute('data-endpoint') } : null;
    });
    /* scroll to the bottom and see whether everything revealed */
    await p.evaluate(async () => { KK.site.scrollToBottom(); await new Promise(r => setTimeout(r, 500)); });
    await p.waitForTimeout(400);
    out.afterBottom = await p.evaluate(() => KK.site.state());
    out.revealLeft = await p.evaluate(() => Array.from(document.querySelectorAll('.reveal'))
      .filter(n => n.getAttribute('data-revealed') !== 'true').map(n => String(n.className).slice(0, 30)));
    await ctx.close();
  }

  if (WHICH === 'retain') {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
    await p.goto(BASE + '/preview/intent/anticipate/?lang=en-US', { waitUntil: 'load' });
    await p.waitForFunction(() => document.body.getAttribute('data-booted') === 'true', null, { timeout: 15000 });
    out.errors = errs;
    out.flow = await p.evaluate(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      KK.anticipate.pause();
      KK.anticipate.addFromDraft('帮我搭一套 CBT 练习，早点拦住情绪下滑。');
      const id = KK.anticipate.state().cards[0].id;
      await KK.anticipate.confirm(id);
      await sleep(150);
      const before = KK.anticipate.state();
      const snapBefore = KK.store.snapshot();
      /* switch workspace, then come back */
      const sel = document.querySelector('[data-testid="scn-select"]');
      sel.value = 'bond'; sel.dispatchEvent(new Event('change'));
      await sleep(250);
      const onBond = { state: KK.anticipate.state(), snap: KK.store.snapshot() };
      sel.value = 'mind'; sel.dispatchEvent(new Event('change'));
      await sleep(250);
      const back = { state: KK.anticipate.state(), snap: KK.store.snapshot() };
      return {
        before: { cards: before.cards.length, pipeline: before.pipeline, snap: snapBefore },
        onBond: { cards: onBond.state.cards.length, pipeline: onBond.state.pipeline, snap: onBond.snap },
        back: { cards: back.state.cards.length, pipeline: back.state.pipeline, snap: back.snap },
        slots: back.state.slots,
        toast: (document.querySelector('[data-testid="toaster"] .toast:last-child') || {}).textContent || '',
        retainedNodes: document.body.getAttribute('data-retained-nodes'),
        retainedSlots: document.body.getAttribute('data-retained-slots')
      };
    });
    out.sound = await p.evaluate(() => KK.sound.state());
    out.contract = await p.evaluate(() => KK.anticipate.prediction('帮我'));
    await ctx.close();
  }

  if (WHICH === 'sound') {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const p = await ctx.newPage();
    await p.goto(BASE + '/preview/intent/anticipate/?lang=en-US', { waitUntil: 'load' });
    await p.waitForFunction(() => document.body.getAttribute('data-booted') === 'true', null, { timeout: 15000 });
    out.atBoot = await p.evaluate(() => KK.sound.state());
    await p.click('[data-testid="sound-btn"]');
    await p.waitForTimeout(200);
    out.afterClick = await p.evaluate(() => KK.sound.state());
    await p.reload({ waitUntil: 'load' });
    await p.waitForFunction(() => document.body.getAttribute('data-booted') === 'true', null, { timeout: 15000 });
    out.afterReload = await p.evaluate(() => KK.sound.state());
    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})().catch(e => { console.error('PROBE CRASHED', e); process.exit(2); });
