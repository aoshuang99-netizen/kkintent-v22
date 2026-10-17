/* Deep probe: the two mechanisms that carry the honesty claim.
   (a) does every terminal line's data-src resolve, and does the printed text
       contain the value at that path?
   (b) does a scenario switch really preserve receipts, and does the ghost text
       really only appear when an opening matched?
   Prints facts; asserts nothing. */
const { chromium } = require('playwright-core');

const BASE = process.argv[2] || 'http://127.0.0.1:18091';
const CHROME = 'C:/Users/AS/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const ARGS = ['--no-proxy-server', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

function resolvePath(obj, path) {
  return path.split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), obj);
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ARGS });
  const out = {};

  /* ---------------------------------------------------- concept N -------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

    await page.goto(BASE + '/preview/intent/compile/?lang=en-US', { waitUntil: 'load' });
    await page.waitForFunction(() => document.body.getAttribute('data-booted') === 'true');

    const compiled = await page.evaluate(() => {
      const i = document.querySelector('[data-testid="n-input"]');
      i.value = 'Help me set up a CBT practice that catches the spiral early, and check in tonight.';
      i.dispatchEvent(new Event('input'));
      const p = window.KK.compile.run();
      return { p: p, state: window.KK.compile.state() };
    });

    /* pipeline view */
    await page.evaluate(() => { location.hash = '#/pipeline'; });
    await page.waitForTimeout(200);
    out.n_pipeline = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[data-testid="n-rail"] [data-node]'));
      return {
        count: rows.length,
        states: rows.map(r => r.getAttribute('data-state')),
        approval: rows.map(r => r.getAttribute('data-approval')),
        blockedBy: rows.map(r => { const b = r.querySelector('[data-blocked-by]'); return b ? b.getAttribute('data-blocked-by') : null; }),
        runDisabled: rows.map(r => { const b = r.querySelector('[data-node-act="run"]'); return b ? b.getAttribute('aria-disabled') : 'missing'; }),
        degrade: !!document.querySelector('[data-testid="n-degrade"]'),
        threeD: !!document.querySelector('[data-testid="n-3d-note"]')
      };
    });

    /* log view + data-src resolution */
    await page.evaluate(() => { location.hash = '#/log'; });
    await page.waitForTimeout(200);
    const raw = await page.evaluate(() => {
      const lines = Array.from(document.querySelectorAll('[data-testid="n-term"] .term__line'));
      return lines.map(l => ({ src: l.getAttribute('data-src'), status: l.getAttribute('data-status'), text: l.textContent }));
    });
    const payload = compiled.p;
    out.n_term = raw.map(l => {
      const v = resolvePath(payload, l.src);
      return {
        src: l.src, status: l.status,
        resolved: typeof v === 'object' ? JSON.stringify(v).slice(0, 40) : String(v),
        shown: l.text.slice(0, 90),
        contains: v === undefined ? null : l.text.replace(/\s/g, '').includes(String(v).replace(/\s/g, ''))
      };
    });
    out.n_forbiddenClaims = raw.filter(l => /加密|12k|Hz|无缝|seamless|encrypted|12,000/.test(l.text)).map(l => l.text);

    /* approval flow */
    out.n_flow = await page.evaluate(async () => {
      const hold = [];
      const st = () => window.KK.store.snapshot();
      hold.push(['start', st()]);
      const ids = ['nd_intake', 'nd_pattern', 'nd_reframe', 'nd_rehearse', 'nd_check'];
      const first = await window.KK.compile.runNodeById('nd_intake');
      hold.push(['after_intake', st()]);
      /* the approval node is still blocked at this point -> must refuse */
      const blockedAttempt = await window.KK.compile.runNodeById('nd_rehearse');
      hold.push(['blocked_attempt', st(), blockedAttempt]);
      return { hold, firstMode: first && first.mode, nodeCounts: window.KK.compile.state().counts };
    });

    /* walk the chain, denying once then approving */
    out.n_chain = await page.evaluate(async () => {
      const seq = [];
      const ids = ['nd_pattern', 'nd_reframe', 'nd_rehearse'];
      for (const id of ids) {
        window.KK.compile.reopenById && null;
        const before = window.KK.store.snapshot();
        if (id === 'nd_rehearse') {
          /* deny first */
          document.querySelector('[data-testid="n-rail"]') && null;
          const pr = window.KK.compile.runNodeById(id);
          await new Promise(r => setTimeout(r, 60));
          const deny = document.querySelector('[data-testid="confirm-deny"]');
          if (deny) deny.click();
          const res = await pr;
          seq.push({ id, denied: res ? res.denied : 'no-result', receipts: window.KK.store.snapshot().receipts, state: window.KK.compile.node(id).state });
        } else {
          await window.KK.compile.runNodeById(id);
          seq.push({ id, receipts: window.KK.store.snapshot().receipts, state: window.KK.compile.node(id).state });
        }
      }
      /* now approve */
      const pr = window.KK.compile.runNodeById('nd_rehearse');
      await new Promise(r => setTimeout(r, 60));
      const ap = document.querySelector('[data-testid="confirm-approve"]');
      if (ap) ap.click();
      const res = await pr;
      seq.push({ id: 'nd_rehearse', approved: !!res && !!res.executed, externalChanged: res && res.externalWorldChanged, receipts: window.KK.store.snapshot().receipts });
      return seq;
    });

    /* reopen -> downstream must re-block */
    out.n_reopen = await page.evaluate(() => {
      window.KK.compile.reopenById('nd_reframe');
      return { counts: window.KK.compile.state().counts, states: ['nd_intake','nd_pattern','nd_reframe','nd_rehearse','nd_check'].map(i => i + '=' + window.KK.compile.node(i).state) };
    });

    /* the seam: switch scenario, receipts must survive */
    out.n_seam = await page.evaluate(() => {
      const before = window.KK.store.snapshot();
      const sel = document.querySelector('[data-testid="scn-select"]');
      sel.value = 'bond';
      sel.dispatchEvent(new Event('change'));
      const after = window.KK.store.snapshot();
      const receipts = Array.from(document.querySelectorAll('[data-testid="n-receipts"] [data-receipt]'));
      const toast = Array.from(document.querySelectorAll('.toast')).map(t => t.textContent.slice(0, 150));
      return {
        before: before, after: after,
        nodesAfterSwitch: window.KK.compile.state().nodes,
        receiptsOnScreen: receipts.length,
        origins: receipts.map(r => r.getAttribute('data-from-scenario')),
        toast
      };
    });

    out.n_errors = errors;
    await ctx.close();
  }

  /* ---------------------------------------------------- concept S -------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

    await page.goto(BASE + '/preview/intent/anticipate/?lang=en-US', { waitUntil: 'load' });
    await page.waitForFunction(() => document.body.getAttribute('data-booted') === 'true');

    out.s_ghost = await page.evaluate(async () => {
      const i = document.querySelector('[data-testid="s-input"]');
      const res = [];
      for (const v of ['', '一', '帮我', '帮我搭一套 CBT 练习', '今天天气']) {
        i.value = v; i.dispatchEvent(new Event('input'));
        await new Promise(r => setTimeout(r, 20));
        const g = document.querySelector('[data-testid="s-ghost"]');
        res.push({
          typed: v, hidden: g.hidden, fired: g.getAttribute('data-fired'), tailId: g.getAttribute('data-tail'),
          tail: g.querySelector('.tail').textContent.slice(0, 80),
          confidence: document.querySelector('[data-testid="s-predict"]').getAttribute('data-confidence'),
          basis: Array.from(document.querySelectorAll('[data-testid="s-basis"] [data-basis]')).map(b => b.getAttribute('data-basis') + ':' + b.textContent.slice(0, 40))
        });
      }
      return res;
    });

    out.s_tabAccept = await page.evaluate(async () => {
      const i = document.querySelector('[data-testid="s-input"]');
      i.value = '帮我'; i.dispatchEvent(new Event('input'));
      await new Promise(r => setTimeout(r, 30));
      const before = i.value;
      i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 30));
      return { before, after: i.value, grew: i.value.length > before.length };
    });

    out.s_cards = await page.evaluate(async () => {
      const i = document.querySelector('[data-testid="s-input"]');
      i.value = '帮我搭一套 CBT 练习，能早点拦住情绪下滑';
      i.dispatchEvent(new Event('input'));
      document.querySelector('[data-testid="s-tocard"]').click();
      await new Promise(r => setTimeout(r, 120));
      window.KK.anticipate.addFromDraft('Help me prepare the conversation I keep postponing.');
      window.KK.anticipate.addFromDraft('I want to look at the sentence I keep repeating.');
      /* let the initial state settle, then measure */
      const steps = window.KK.anticipate.step(4);
      const s1 = window.KK.anticipate.state();
      window.KK.anticipate.fling(s1.cards[0].id, 900, -700);
      const mid = window.KK.anticipate.state();
      window.KK.anticipate.step(4);
      const s2 = window.KK.anticipate.state();
      const dist = c => Math.round(Math.hypot(c.x - c.hx, c.y - c.hy));
      return {
        stepsReturned: steps,
        cards: s2.cards.length,
        overlapsAfterRest: s2.overlaps,
        distFromHome: s2.cards.map(dist),
        flungDistMid: Math.round(Math.hypot(mid.cards[0].x - mid.cards[0].hx, mid.cards[0].y - mid.cards[0].hy)),
        flungDistEnd: dist(s2.cards[0]),
        boardMode: document.querySelector('[data-testid="s-board"]').getAttribute('data-mode'),
        domCards: document.querySelectorAll('[data-testid="s-board"] [data-card]').length
      };
    });

    out.s_listMode = await page.evaluate(async () => {
      location.hash = '#/orbits';
      await new Promise(r => setTimeout(r, 200));
      document.querySelector('[data-testid="s-mode-list"]').click();
      await new Promise(r => setTimeout(r, 120));
      const board = document.querySelector('[data-testid="s-board"]');
      const c0 = board.querySelector('[data-card]');
      return { mode: board.getAttribute('data-mode'), transform: getComputedStyle(c0).transform, position: getComputedStyle(c0).position };
    });

    out.s_mic = await page.evaluate(async () => {
      location.hash = '#/ledger';
      await new Promise(r => setTimeout(r, 220));
      const btn = document.querySelector('[data-testid="s-mic"]');
      if (!btn) return { error: 'no mic button', view: document.body.getAttribute('data-view') };
      btn.click();
      await new Promise(r => setTimeout(r, 900));
      return { consents: window.KK.store.state.consents.map(c => ({ kind: c.kind, outcome: c.outcome })), dom: document.querySelectorAll('[data-testid="s-consents"] [data-consent]').length };
    });

    out.s_errors = errors;
    await ctx.close();
  }

  /* ---------------------------------------------------------- hub -------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
    await page.goto(BASE + '/?lang=en-US', { waitUntil: 'load' });
    await page.waitForFunction(() => document.body.getAttribute('data-booted') === 'true');
    out.hub = await page.evaluate(() => window.KKHub.state());
    out.hub_errors = errors;
    await ctx.close();
  }

  /* ------------------------------------------- reduced motion + fallback -- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US', reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(BASE + '/preview/intent/compile/?lang=en-US', { waitUntil: 'load' });
    await page.waitForFunction(() => document.body.getAttribute('data-booted') === 'true');
    await page.waitForTimeout(300);
    out.rm_n = await page.evaluate(() => ({ field: window.KK.field.stats(), bodyDrift: document.body.getAttribute('data-field-drift') }));
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US', reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(BASE + '/preview/intent/anticipate/?lang=en-US', { waitUntil: 'load' });
    await page.waitForFunction(() => document.body.getAttribute('data-booted') === 'true');
    await page.evaluate(() => { location.hash = '#/orbits'; });
    await page.waitForTimeout(250);
    out.rm_s = await page.evaluate(() => ({ state: window.KK.anticipate.state(), autoList: !!document.querySelector('[data-testid="s-auto-list"]'), modeAttr: document.querySelector('[data-testid="s-board"]') ? document.querySelector('[data-testid="s-board"]').getAttribute('data-mode') : null }));
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
    await page.goto(BASE + '/preview/intent/compile/?lang=en-US&field=css', { waitUntil: 'load' });
    await page.waitForFunction(() => document.body.getAttribute('data-booted') === 'true');
    const r = await page.evaluate(() => {
      const i = document.querySelector('[data-testid="n-input"]');
      i.value = '帮我搭一套 CBT 练习';
      i.dispatchEvent(new Event('input'));
      const p = window.KK.compile.run();
      location.hash = '#/pipeline';
      return { p: !!p, state: window.KK.compile.state() };
    });
    await page.waitForTimeout(200);
    out.css_fallback = Object.assign(r, await page.evaluate(() => ({
      backend: document.body.getAttribute('data-field-backend'),
      reason: document.body.getAttribute('data-field-reason'),
      degrade: !!document.querySelector('[data-testid="n-degrade"]'),
      rail: document.querySelectorAll('[data-testid="n-rail"] [data-node]').length
    })), { errors });
    await ctx.close();
  }

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
