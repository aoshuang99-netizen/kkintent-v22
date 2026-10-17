/* ============================================================================
   Mobile fidelity probe — read-only, no screenshots, no file writes.

   Every "feels like a native app" claim this project makes, turned into a
   number on a 390x844 touch device:

     1  viewport sanity           innerWidth / visualViewport scale
     2  no horizontal overflow    after scrolling to the bottom
     3  touch targets             every interactive control >= 43.25px
     4  type floor                no visible text below 12px
     5  occlusion (hit test)      elementFromPoint(centre) is the control itself
     6  sticky bar vs anchors     a nav target is not buried under a fixed bar
     7  tap -> response latency   ms from tap to DOM change
     8  scroll frame timing       median / p95 / worst frame, dropped frames
     9  long tasks                PerformanceObserver('longtask')
    10  layout shift             cumulative CLS
    11  tap highlight            -webkit-tap-highlight-color suppressed
    12  touch-action             manipulation on controls, none on the drag pad
    13  overscroll behaviour     scroll containers do not bleed
    14  safe area               viewport-fit=cover + non-decorative insets
    15  scroll lock behind sheet  swiping the scrim must not move the page
    16  rotation               844x390 still sane
   ========================================================================== */
const { chromium } = require('playwright-core');
const CHROME = process.env.KK_CHROME || 'C:/Users/AS/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const ARGS = ['--no-proxy-server', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const BASE = process.argv[2] || 'http://127.0.0.1:18091';
const ONLY = process.argv[3] || '';

const SURFACES = [
  { id: 'hub', url: '/?lang=en-US' },
  { id: 'anticipate', url: '/preview/intent/anticipate/?lang=en-US' },
  { id: 'compile', url: '/preview/intent/compile/?lang=en-US' },
  { id: 'site', url: '/preview/site/?lang=en-US' }
];

/* Runs INSIDE the page. Returns raw measurements only — no judgement. */
function measure() {
  const INTERACTIVE = 'a[href], button, input, select, textarea, [role="button"], [role="tab"], summary';
  const sel = (el) => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? '#' + el.id : '';
    const tid = el.getAttribute('data-testid');
    const cls = (el.className && typeof el.className === 'string') ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return tag + id + (tid ? '[' + tid + ']' : '') + cls;
  };
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const vis = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const hasText = (el) => Array.from(el.childNodes)
    .some(n => n.nodeType === 3 && n.textContent.trim().length > 0);

  /* ---- 1 viewport ---- */
  const vp = {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scale: window.visualViewport ? window.visualViewport.scale : null,
    dpr: window.devicePixelRatio,
    meta: (document.querySelector('meta[name="viewport"]') || {}).content || null
  };

  /* ---- 2/3/4/5 controls ---- */
  const controls = Array.from(document.querySelectorAll(INTERACTIVE)).filter(vis);
  const small = [], occluded = [], tiny = [];
  for (const el of controls) {
    const r = rect(el);
    if (r.h < 43.25 && r.w > 0) small.push({ el: sel(el), w: +r.w.toFixed(1), h: +r.h.toFixed(1), text: el.textContent.trim().slice(0, 24) });
    const cx = Math.round(r.x + r.w / 2), cy = Math.round(r.y + r.h / 2);
    if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue;
    const hit = document.elementFromPoint(cx, cy);
    if (hit && hit !== el && !el.contains(hit) && !hit.contains(el)) {
      occluded.push({ el: sel(el), by: sel(hit), at: [cx, cy] });
    }
  }
  for (const el of document.querySelectorAll('p, span, li, td, th, small, code, strong, h1, h2, h3, a, button, label')) {
    if (!vis(el) || !hasText(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) tiny.push({ el: sel(el), px: +fs.toFixed(2), text: el.textContent.trim().slice(0, 24) });
  }

  /* ---- 13 scroll containers / 11 tap highlight / 12 touch-action ---- */
  const scrollables = Array.from(document.querySelectorAll('*')).filter(el => {
    const s = getComputedStyle(el);
    return /(auto|scroll)/.test(s.overflowY + s.overflowX) && vis(el);
  }).slice(0, 40).map(el => ({ el: sel(el), overscroll: getComputedStyle(el).overscrollBehavior, momentum: getComputedStyle(el).webkitOverflowScrolling || null }));

  const tapHighlight = Array.from(new Set(controls.slice(0, 60).map(el => getComputedStyle(el).webkitTapHighlightColor)));
  /* touch-action is NOT inherited, so reading it per element reports `auto` for
     every descendant even when the whole tree is effectively `manipulation`.
     What governs behaviour is the INTERSECTION of an element with all its
     ancestors — so that is what gets reported. */
  const effectiveTA = (el) => {
    let v = 'auto';
    for (let n = el; n; n = n.parentElement) {
      const t = getComputedStyle(n).touchAction;
      if (t === 'none') return 'none';
      if (t && t !== 'auto') v = t;
    }
    return v;
  };
  const touchActions = {};
  for (const el of controls.slice(0, 60)) {
    const ta = effectiveTA(el);
    touchActions[ta] = (touchActions[ta] || 0) + 1;
  }

  /* ---- 14 safe area ---- */
  const cs = getComputedStyle(document.documentElement);
  const safe = {
    t: cs.getPropertyValue('--safe-t').trim(),
    b: cs.getPropertyValue('--safe-b').trim(),
    viewportFitCover: /viewport-fit=cover/.test(vp.meta || '')
  };

  /* ---- 15 fixed bars vs anchors ---- */
  const fixedBars = Array.from(document.querySelectorAll('*')).filter(el => {
    const s = getComputedStyle(el);
    return (s.position === 'fixed' || s.position === 'sticky') && vis(el) && el.getBoundingClientRect().height > 8;
  }).map(el => ({ el: sel(el), pos: getComputedStyle(el).position, h: +el.getBoundingClientRect().height.toFixed(1) }));

  /* ---- CLS + long tasks are collected by the driver, not here ---- */
  return {
    vp, controls: controls.length, small, occluded, tiny,
    scrollables, tapHighlight, touchActions, safe, fixedBars,
    docHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth
  };
}

/* Frame timing while the driver scrolls the page one step per frame. This is
   where jank lives: ScrollTrigger callbacks, reveals, pin maths.

   Takes ONE object on purpose: the driver calls this through
   `page.evaluate(fn, arg)`, which passes exactly one argument. The first
   version declared `(stepPx, ms)` and was handed `[10, 1400]`, so `ms` was
   undefined, `now - t0 < undefined` was false on the first tick, and every
   run reported `frames: 1` with a null median. The measurement had never
   measured anything. */
function frameTiming(opts) {
  const stepPx = (opts && opts.stepPx) || 10;
  const ms = (opts && opts.ms) || 1400;
  return new Promise(resolve => {
    const deltas = [];
    let last = performance.now();
    const t0 = last;
    function tick(now) {
      deltas.push(now - last);
      last = now;
      window.scrollBy(0, stepPx);
      if (now - t0 < ms) requestAnimationFrame(tick);
      else {
        const sorted = deltas.slice(2).sort((a, b) => a - b);
        const at = q => sorted.length ? +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))].toFixed(1) : null;
        resolve({
          frames: deltas.length,
          median: at(0.5), p95: at(0.95), worst: sorted.length ? +sorted[sorted.length - 1].toFixed(1) : null,
          dropped: deltas.slice(2).filter(d => d > 32).length,
          over16: deltas.slice(2).filter(d => d > 16.7).length
        });
      }
    }
    requestAnimationFrame(tick);
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ARGS });
  const report = {};

  for (const s of SURFACES) {
    if (ONLY && !ONLY.split(',').includes(s.id)) continue;
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      deviceScaleFactor: 3, locale: 'en-US'
    });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });

    /* collect CLS + long tasks from the very start */
    await p.addInitScript(() => {
      window.__cls = 0; window.__long = [];
      try {
        new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; })
          .observe({ type: 'layout-shift', buffered: true });
      } catch (e) {}
      try {
        new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(+e.duration.toFixed(1)); })
          .observe({ type: 'longtask', buffered: true });
      } catch (e) {}
    });

    await p.goto(BASE + s.url, { waitUntil: 'load' });
    await p.waitForTimeout(700);

    const base = await p.evaluate(measure);
    base.errors = errs;

    /* 8 frame timing: top -> bottom */
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(200);
    const framesCold = await p.evaluate(frameTiming, { stepPx: 10, ms: 1400 });

    /* 2 overflow at the bottom */
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForTimeout(400);
    const bottom = await p.evaluate(() => {
      const doc = document.documentElement;
      const off = Array.from(document.querySelectorAll('*')).filter(el => {
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1);
      }).slice(0, 6).map(el => ({
        el: el.tagName.toLowerCase() + (el.getAttribute('data-testid') ? '[' + el.getAttribute('data-testid') + ']' : ''),
        left: +el.getBoundingClientRect().left.toFixed(1), right: +el.getBoundingClientRect().right.toFixed(1)
      }));
      return { scrollWidth: doc.scrollWidth, innerWidth: window.innerWidth, offenders: off, scrollY: window.scrollY };
    });

    /* 9/10 perf numbers */
    const perf = await p.evaluate(() => ({ cls: +window.__cls.toFixed(4), longTasks: window.__long }));

    /* 16 rotation */
    await p.setViewportSize({ width: 844, height: 390 });
    await p.waitForTimeout(350);
    const rotated = await p.evaluate(() => {
      const off = Array.from(document.querySelectorAll('*')).filter(el => {
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1);
      }).length;
      const controls = Array.from(document.querySelectorAll('a[href], button, input, select, textarea, [role="button"], summary'))
        .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      const small = controls.filter(el => el.getBoundingClientRect().height < 43.25).length;
      return { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, overflowOffenders: off, smallControls: small, controls: controls.length };
    });

    report[s.id] = { base, framesCold, bottom, perf, rotated };
    await ctx.close();
  }

  /* ---- 6 + 7 + 15 need a touch-capable page kept open ---- */
  report.__interaction = {};
  for (const s of SURFACES) {
    if (ONLY && !ONLY.split(',').includes(s.id)) continue;
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      deviceScaleFactor: 3, locale: 'en-US'
    });
    const p = await ctx.newPage();
    await p.goto(BASE + s.url, { waitUntil: 'load' });
    await p.waitForTimeout(700);
    const r = {};

    /* 6 anchor target buried under a fixed bar? */
    r.anchorOcclusion = await p.evaluate(() => {
      const targets = Array.from(document.querySelectorAll('a[href^="#"], a[href*="#"]'))
        .map(a => (a.getAttribute('href') || '').split('#')[1])
        .filter(Boolean)
        .map(id => document.getElementById(id))
        .filter(Boolean);
      const out = [];
      for (const t of targets.slice(0, 12)) {
        t.scrollIntoView();
        const rect = t.getBoundingClientRect();
        const cx = Math.round(rect.x + Math.min(rect.width / 2, 60));
        const cy = Math.round(rect.y + 4);
        const hit = (cx > 0 && cy > 0 && cy < window.innerHeight) ? document.elementFromPoint(cx, cy) : null;
        out.push({
          id: t.id,
          covered: hit ? !(t === hit || t.contains(hit)) : null,
          by: hit ? (hit.tagName.toLowerCase() + (hit.getAttribute('data-testid') ? '[' + hit.getAttribute('data-testid') + ']' : '')) : null,
          top: +rect.top.toFixed(1)
        });
      }
      window.scrollTo(0, 0);
      return out;
    });

    /* 15 scroll lock behind an open sheet (only where a sheet exists) */
    r.sheetLock = await p.evaluate(async () => {
      const btn = document.querySelector('[data-testid="hud-compact"], [data-testid="hud-open-sheet"]');
      if (!btn) return { skipped: 'no sheet trigger on this surface' };
      btn.click();
      await new Promise(r => setTimeout(r, 500));
      const sheet = document.querySelector('[data-testid="hud-sheet"]');
      const opened = sheet ? sheet.getAttribute('data-open') : null;
      const before = window.scrollY;
      const htmlOverflow = getComputedStyle(document.documentElement).overflow;
      const bodyPos = getComputedStyle(document.body).position;
      /* programmatic scroll attempts — stands in for a swipe on the scrim */
      window.scrollBy(0, 400); await new Promise(r => setTimeout(r, 120));
      window.scrollBy(0, 400); await new Promise(r => setTimeout(r, 120));
      const after = window.scrollY;
      const closeBtn = document.querySelector('[data-testid="hud-sheet-close"]');
      if (closeBtn) closeBtn.click();
      await new Promise(r => setTimeout(r, 400));
      return { opened, moved: +(after - before).toFixed(1), htmlOverflow, bodyPosition: bodyPos,
               closed: sheet ? sheet.getAttribute('data-open') : null };
    });

    /* 7 tap -> response latency on the first real toggle-ish control */
    const tapSel = await p.evaluate(() => {
      const cands = ['[data-testid="sound"]', '[data-testid="snd"]', '[data-testid="view-tab-board"]',
        '[data-testid="tab-board"]', '[data-testid="hud-compact"]', 'button'];
      for (const c of cands) { const el = document.querySelector(c); if (el) return c; }
      return null;
    });
    if (tapSel) {
      const before = await p.evaluate(sel => document.querySelector(sel).outerHTML.length, tapSel);
      const t0 = Date.now();
      try {
        await p.locator(tapSel).first().tap({ timeout: 4000 });
      } catch (e) { r.tapError = String(e.message).slice(0, 80); }
      const after = await p.evaluate(sel => document.querySelector(sel).outerHTML.length, tapSel);
      r.tap = { selector: tapSel, ms: Date.now() - t0, changed: before !== after, before, after };
    }

    report.__interaction[s.id] = r;
    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify(report, null, 1));
})().catch(e => { console.error('PROBE CRASHED', e); process.exit(1); });
