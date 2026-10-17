/* ============================================================================
   KK Intent OS · acceptance gate

   Run:
     node e2e/acceptance.js http://127.0.0.1:18091            # full
     node e2e/acceptance.js http://127.0.0.1:18091 n          # concept subset

   What this gate is for. Every claim the previews make in their own copy has
   a corresponding check here, and the checks are written so they can fail:

     - "the terminal only prints measured values"  -> every line carries the
       path of its value, and we resolve that path and compare.
     - "the collapse is a shader uniform"          -> we read the live uniform.
     - "denial changes nothing"                    -> we diff the state.
     - "receipts survive a workspace switch"       -> we count them across it.
     - "they never overlap"                        -> we run the integrator.
     - "44px minimum"                              -> we measure every control.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const BASE = process.argv[2] || 'http://127.0.0.1:18091';
const ONLY = (process.argv[3] || '').split(',').map(s => s.trim()).filter(Boolean);
const FULL = ONLY.length === 0;
const CHROME = process.env.KK_CHROME || 'C:/Users/AS/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const ARGS = ['--no-proxy-server', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

const results = [];
const t0 = Date.now();

function ok(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: detail === undefined ? null : detail });
  return !!cond;
}
function unsupported(name, why) { results.push({ name, pass: 'UNSUPPORTED', detail: why }); }
function note(name, detail) { results.push({ name, pass: 'INFO', detail }); }

function resolvePath(obj, p) {
  return String(p || '').split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), obj);
}

function needs(section) { return FULL || ONLY.indexOf(section) >= 0; }

/* --------------------------------------------------------------- helpers */
const pageErrors = new WeakMap();

function instrument(page) {
  const bag = { errors: [] };
  pageErrors.set(page, bag);
  page.on('pageerror', e => bag.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') bag.errors.push('console.error: ' + m.text()); });
  return bag;
}

async function boot(page, url) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.getAttribute('data-booted') === 'true', null, { timeout: 15000 });
  await page.waitForTimeout(120);
}

/**
 * One measurement pass, shared by every surface. Split out of genericGates
 * because the long-scroll page is a document, not a view router: it has no
 * HUD slot and no three-view nav, and it would have been wrong to fake either
 * one just to reuse an assertion list.
 */
async function measure(page) {
  return page.evaluate(() => {
    const inter = Array.from(document.querySelectorAll('a[href], button, select, textarea, input, summary, [role="button"]'));
    const small = [];
    inter.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.height === 0 || r.width === 0) return;
      if (getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') return;
      /* 0.75px tolerance for sub-pixel layout snapping: min-height:44px can
         measure 43.99. Anything smaller than that is a real miss. */
      if (r.height < 44 - 0.75) small.push({ tag: el.tagName, cls: String(el.className).slice(0, 26), h: Math.round(r.height * 100) / 100 });
    });
    const tiny = [];
    document.querySelectorAll('body *').forEach(el => {
      if (!el.textContent || !el.textContent.trim()) return;
      if (el.children.length) return;                       // leaf text only
      const r = el.getBoundingClientRect();
      if (r.height === 0) return;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs && fs < 11.9) tiny.push({ tag: el.tagName, cls: String(el.className).slice(0, 26), fs: fs });
    });
    /* a re-render builds fresh [data-i18n] nodes; if the translation pass is
       missed they render empty. This is the check that caught it. */
    const emptyI18n = Array.from(document.querySelectorAll('[data-i18n]')).filter(el => {
      if (el.getBoundingClientRect().height === 0) return false;
      return !el.textContent.trim();
    }).map(el => el.getAttribute('data-i18n'));
    return {
      concept: document.body.getAttribute('data-concept'),
      lang: document.documentElement.getAttribute('data-lang'),
      docLang: document.documentElement.getAttribute('lang'),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      small: small, tiny: tiny, emptyI18n: emptyI18n,
      field: window.KK.field.stats(),
      i18n: window.KK.i18n.stats(),
      hud: !!document.querySelector('[data-testid="hud"]'),
      hudControls: Array.from(document.querySelectorAll('[data-testid="hud"] button, [data-testid="hud"] select'))
        .filter(e => e.getBoundingClientRect().height > 0)
        .map(e => Math.round(e.getBoundingClientRect().height * 100) / 100),
      navCount: document.querySelectorAll('[data-testid="view-nav"] button').length,
      navAria: document.querySelector('[data-testid="view-nav"]') ? document.querySelector('[data-testid="view-nav"]').getAttribute('aria-label') : null,
      caps: document.querySelectorAll('[data-testid="boundary-body"] tr[data-cap]').length,
      capNames: Array.from(document.querySelectorAll('[data-testid="boundary-body"] tr[data-cap]')).map(r => r.getAttribute('data-cap')),
      skip: !!document.querySelector('.skip-link'),
      h1: document.querySelector('h1[data-testid]') ? document.querySelector('h1[data-testid]').textContent.trim() : null,
      stageView: document.querySelector('[data-testid="stage"]') ? document.querySelector('[data-testid="stage"]').getAttribute('data-view') : null,
      sound: window.KK.sound.state()
    };
  });
}

async function genericGates(page, label, expectConcept, minHud) {
  minHud = minHud === undefined ? 4 : minHud;
  const bag = pageErrors.get(page);
  ok(label + '.noConsoleErrors', bag.errors.length === 0, bag.errors.slice(0, 4));
  const s = await measure(page);
  ok(label + '.conceptIdentity', s.concept === expectConcept, s.concept);
  ok(label + '.i18nNoMissingKeys', s.i18n.missing.length === 0, s.i18n.missing);
  ok(label + '.i18nNoDuplicateKeys', s.i18n.duplicates.length === 0, s.i18n.duplicates);
  ok(label + '.noHorizontalOverflow', s.overflow <= 1, 'overflow=' + s.overflow);
  ok(label + '.everyControlAtLeast44px', s.small.length === 0, s.small.slice(0, 6));
  ok(label + '.noTypeBelow12px', s.tiny.length === 0, s.tiny.slice(0, 6));
  ok(label + '.everyI18nNodeHasVisibleText', s.emptyI18n.length === 0, s.emptyI18n);
  ok(label + '.fieldBackendStated', ['webgl', 'css-fallback'].indexOf(s.field.backend) >= 0, s.field);
  if (s.field.backend === 'css-fallback') ok(label + '.fallbackReasonRecorded', !!s.field.reason, s.field.reason);
  ok(label + '.hudPresent', s.hud);
  ok(label + '.hudControlsAtLeast44px', s.hudControls.length >= minHud && s.hudControls.every(h => h >= 44 - 0.75), s.hudControls);
  ok(label + '.viewNavHasThreeViews', s.navCount === 3, s.navCount);
  ok(label + '.viewNavLabelled', !!s.navAria && s.navAria.length > 3, s.navAria);
  ok(label + '.boundaryPanelRenders', s.caps === 8, s.caps);
  ok(label + '.skipLinkPresent', s.skip);
  ok(label + '.h1Present', !!s.h1 && s.h1.length > 20, s.h1 ? s.h1.slice(0, 60) : null);
  /* The language declaration lives on <html> and has one owner. This used to
     read <body>, which three different writers filled with two different
     vocabularies (`en` vs `en-US`) or with nothing at all — and no assertion
     looked at it, so the drift could not be seen. */
  ok(label + '.languageDeclaredOnTheDocumentElement',
    (s.docLang === 'en-US' || s.docLang === 'zh-CN') && (s.lang === 'en' || s.lang === 'zh'),
    { lang: s.docLang, dataLang: s.lang });
  note(label + '.measured', { tier: 1280, view: s.stageView, field: s.field.backend, particles: s.field.particles, keys: s.i18n.keys });
  return s;
}

/**
 * The long-scroll surface is a document: no HUD slot, one view, and the scroll
 * is the interface. Same floors as everywhere else, but it would be dishonest
 * to assert a three-view nav it does not have.
 */
async function siteGates(page, label) {
  const bag = pageErrors.get(page);
  ok(label + '.noConsoleErrors', bag.errors.length === 0, bag.errors.slice(0, 4));
  const s = await measure(page);
  ok(label + '.conceptIdentity', s.concept === 'site', s.concept);
  ok(label + '.i18nNoMissingKeys', s.i18n.missing.length === 0, s.i18n.missing);
  ok(label + '.i18nNoDuplicateKeys', s.i18n.duplicates.length === 0, s.i18n.duplicates);
  ok(label + '.noHorizontalOverflow', s.overflow <= 1, 'overflow=' + s.overflow);
  ok(label + '.everyControlAtLeast44px', s.small.length === 0, s.small.slice(0, 6));
  ok(label + '.noTypeBelow12px', s.tiny.length === 0, s.tiny.slice(0, 6));
  ok(label + '.everyI18nNodeHasVisibleText', s.emptyI18n.length === 0, s.emptyI18n);
  ok(label + '.fieldBackendStated', ['webgl', 'css-fallback'].indexOf(s.field.backend) >= 0, s.field);
  ok(label + '.boundaryPanelRenders', s.caps === 8, s.caps);
  ok(label + '.skipLinkPresent', s.skip);
  ok(label + '.h1Present', !!s.h1 && s.h1.length > 20, s.h1 ? s.h1.slice(0, 60) : null);
  /* this surface must NOT mount the OS HUD: a workspace selector on a
     marketing page would be a control that does nothing. */
  ok(label + '.doesNotMountTheOsHud', s.hud === false, s.hud);
  return s;
}

/* --------------------------------------------------------------- runner */
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ARGS });
  const collected = {};
  const ctxs = [];

  async function context(opts) {
    const c = await browser.newContext(opts);
    ctxs.push(c);
    return c;
  }

  /* ============================================================ HUB ==== */
  if (needs('hub')) {
    const ctx = await context({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await ctx.newPage();
    instrument(page);
    await boot(page, BASE + '/?lang=en-US');
    const h = await page.evaluate(() => window.KKHub.state());
    collected.hub = h;
    ok('hub.fiveReferencesAudited', h.auditItems === 5, h.auditItems);
    ok('hub.verdictsAreSpecific', JSON.stringify(h.verdicts) === JSON.stringify(['falsified', 'partial', 'unverified', 'unverified', 'unverified']), h.verdicts);
    ok('hub.oneDescriptionFalsified', h.verdicts.filter(v => v === 'falsified').length === 1);
    ok('hub.twoConceptsPresented', h.conceptCards === 2, h.conceptCards);
    ok('hub.noMissingKeys', h.i18n.missing.length === 0, h.i18n.missing);
    ok('hub.noDuplicateKeys', h.i18n.duplicates.length === 0, h.i18n.duplicates);
    ok('hub.fieldIsWebgl', h.field.backend === 'webgl', h.field);

    /* --- the round-2 decision surface ------------------------------------ */
    ok('hub.fiveDecisionRows', h.decisions === 5, h.decisions);
    ok('hub.oneDirectionChosenOneFrozen', h.chosen === 1 && h.frozen === 1, { chosen: h.chosen, frozen: h.frozen });
    ok('hub.chosenCardIsThePrimaryAction', h.primaryOnChosen === true && h.primaryOnFrozen === false, { chosen: h.primaryOnChosen, frozen: h.primaryOnFrozen });
    ok('hub.soundStartsOffOnTheHubToo', h.soundDefaultOff === true, h.sound);
    ok('hub.contractIsNamedOnTheHub', h.contractName === 'kk.prediction.v1', h.contractName);
    ok('hub.boundaryHasTheNewCapabilityRow', h.caps === 8 && h.boundaryCapNames.indexOf('kkai.predict') >= 0, h.boundaryCapNames);
    ok('hub.linksToTheLongScrollPage', h.linksToSite.length === 2 && h.linksToSite.every(l => l === 'preview/site/'), h.linksToSite);

    const links = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="open-n"], [data-testid="open-s"]')).map(a => a.getAttribute('href')));
    ok('hub.linksToBothConcepts', links.length === 2 && links.every(l => !!l), links);
    const codes = [];
    for (const l of links.concat(['preview/site/'])) {
      const r = await page.request.get(BASE + '/' + l.replace(/^\//, ''));
      codes.push(r.status());
    }
    ok('hub.everyPreviewLinkResolves200', codes.every(c => c === 200), codes);

    /* language switch changes the page text */
    const en = await page.evaluate(() => document.querySelector('[data-testid="hub-h1"]').textContent);
    await page.evaluate(() => { KK.i18n.setLang('zh-CN'); });
    const zh = await page.evaluate(() => document.querySelector('[data-testid="hub-h1"]').textContent);
    ok('hub.languageSwitchRewritesText', en !== zh && zh.length > 5, { en: en.slice(0, 30), zh: zh.slice(0, 30) });
    const bag = pageErrors.get(page);
    ok('hub.noConsoleErrors', bag.errors.length === 0, bag.errors.slice(0, 3));
    await ctx.close();
  }

  /* ============================================================ LANGUAGE */
  /* The brief: "default English, Chinese selectable". Both halves are claims,
     so both are measured — and the first half was FALSE until this round.
     The boot chain ended with `norm(navigator.language)`, so a browser set to
     zh-CN was served Chinese before the visitor had asked for anything. No
     assertion caught it because every other boot in this file pins `?lang=`:
     a check that pins its input cannot see what the default is.

     The measurements are deliberately RELATIVE. The default boot is compared
     against an explicit `?lang=en-US` boot and an explicit `?lang=zh-CN` boot
     of the same page, in the same browser locale. "The default equals English
     and differs from Chinese" is exactly what the claim says, and unlike a
     hard-coded string it survives a copy edit.

     `EveryKeyHasBothLanguages` is the other half: a toggle is only a real
     option if choosing it does not drop the reader into untranslated strings.
     That is checked against the whole dictionary, not just the keys this
     surface happens to render (see `gaps()` in i18n.js). */
  if (needs('lang')) {
    const LANG_SURFACES = [
      { id: 'hub', url: '/index.html', h1: '[data-testid="hub-h1"]' },
      { id: 's', url: '/preview/intent/anticipate/', h1: 'h1' },
      { id: 'n', url: '/preview/intent/compile/', h1: 'h1' },
      { id: 'site', url: '/preview/site/', h1: 'h1' }
    ];

    const READ_LANG = (sel) => ({
      lang: KK.i18n.lang,
      docLang: document.documentElement.getAttribute('lang'),
      dataLang: document.documentElement.getAttribute('data-lang'),
      bodyDataLang: document.body.getAttribute('data-lang'),
      h1: String((document.querySelector(sel) || {}).textContent || '').replace(/\s+/g, ' ').trim(),
      title: document.title,
      stored: (function () { try { return window.sessionStorage.getItem('kkintent.lang'); } catch (e) { return 'ERR'; } })(),
      stats: KK.i18n.stats()
    });

    const bootLang = async (url, locale) => {
      const c = await context({ viewport: { width: 1280, height: 900 }, locale: locale });
      const p = await c.newPage();
      instrument(p);
      await boot(p, BASE + url);
      return { ctx: c, page: p };
    };

    const rows = {};
    for (const s of LANG_SURFACES) {
      /* A — a visitor whose browser is set to Chinese, no ?lang=, nothing stored */
      const a = await bootLang(s.url, 'zh-CN');
      const def = await a.page.evaluate(READ_LANG, s.h1); await a.ctx.close();
      /* B — English pinned, same browser locale */
      const b = await bootLang(s.url + '?lang=en-US', 'zh-CN');
      const en = await b.page.evaluate(READ_LANG, s.h1); await b.ctx.close();
      /* C — Chinese pinned */
      const c = await bootLang(s.url + '?lang=zh-CN', 'en-US');
      const zh = await c.page.evaluate(READ_LANG, s.h1); await c.ctx.close();
      rows[s.id] = { def: def, en: en, zh: zh };

      ok('lang.' + s.id + 'DefaultsToEnglishOnAChineseBrowser',
        def.lang === 'en-US' && def.h1 === en.h1 && def.h1 !== zh.h1 && def.h1.length > 10,
        { defaultLang: def.lang, matchesEnglish: def.h1 === en.h1, matchesChinese: def.h1 === zh.h1, h1: def.h1.slice(0, 44) });

      ok('lang.' + s.id + 'TheLanguageDeclarationFollowsTheText',
        def.docLang === 'en-US' && def.dataLang === 'en' && zh.docLang === 'zh-CN' && zh.dataLang === 'zh',
        { def: [def.docLang, def.dataLang], zh: [zh.docLang, zh.dataLang] });

      ok('lang.' + s.id + 'NothingElseClaimsToDeclareTheLanguage',
        def.bodyDataLang === null && zh.bodyDataLang === null,
        { def: def.bodyDataLang, zh: zh.bodyDataLang });

      ok('lang.' + s.id + 'ChineseIsStillSelectable',
        zh.lang === 'zh-CN' && zh.h1 !== en.h1 && zh.h1.length > 5,
        { lang: zh.lang, h1: zh.h1.slice(0, 44) });

      ok('lang.' + s.id + 'EveryKeyHasBothLanguages',
        zh.stats.gaps.length === 0,
        { gaps: zh.stats.gaps.slice(0, 8), keys: zh.stats.keys });

      ok('lang.' + s.id + 'NothingFallsBackToTheKeyName',
        zh.stats.missing.length === 0 && en.stats.missing.length === 0,
        { zh: zh.stats.missing.slice(0, 8), en: en.stats.missing.slice(0, 8) });

      ok('lang.' + s.id + 'TheTabTitleFollowsTheLanguage',
        def.title === en.title && zh.title !== en.title && zh.title.length > 3,
        { def: def.title, zh: zh.title });
    }
    collected.lang = rows;

    /* The bytes the server sends must already be English: with the default now
       being English there is no first-paint flip, which is the visible half of
       the defect that was fixed. This is checked on the served document, not
       on the DOM, because the DOM after boot cannot tell you what was sent. */
    const fctx = await context({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const fpage = await fctx.newPage();
    const markup = {};
    for (const s of LANG_SURFACES) {
      const r = await fpage.request.get(BASE + s.url);
      const html = await r.text();
      markup[s.id] = {
        status: r.status(),
        htmlLang: (/\<html[^>]*\slang="([^"]+)"/.exec(html) || [])[1] || null,
        titleTranslated: /\<title[^>]*data-i18n="/.test(html)
      };
    }
    await fctx.close();
    collected.langMarkup = markup;
    const wrongLang = Object.keys(markup).filter(k => markup[k].htmlLang !== 'en-US');
    ok('lang.TheServedMarkupAlreadyDeclaresEnglish', wrongLang.length === 0,
      wrongLang.map(k => [k, markup[k].htmlLang]));
    const untranslatedTitles = Object.keys(markup).filter(k => !markup[k].titleTranslated);
    ok('lang.EveryDocumentTitleIsWiredToTheDictionary', untranslatedTitles.length === 0, untranslatedTitles);

    /* Selecting Chinese has to work from the interface, not from the console —
       and once selected it has to stay selected, or "selectable" means nothing.
       Then the opposite: an explicit ?lang= must still outrank the stored
       choice, or a review link cannot hand someone a language. */
    const tctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, locale: 'zh-CN' });
    const tpage = await tctx.newPage();
    instrument(tpage);
    await boot(tpage, BASE + '/index.html');
    const H1 = '[data-testid="hub-h1"]';
    const before = await tpage.evaluate(READ_LANG, H1);
    let tapErr = null;
    try { await (await tpage.$('[data-testid="lang-btn"]')).tap(); } catch (e) { tapErr = String(e).split('\n')[0]; }
    const afterTap = await tpage.evaluate(READ_LANG, H1);
    await tpage.reload({ waitUntil: 'load' });
    await tpage.waitForFunction(() => document.body.getAttribute('data-booted') === 'true', null, { timeout: 15000 });
    const afterReload = await tpage.evaluate(READ_LANG, H1);
    await boot(tpage, BASE + '/index.html?lang=en-US');
    const afterQuery = await tpage.evaluate(READ_LANG, H1);

    ok('lang.TheToggleSelectsChineseFromTheInterface',
      tapErr === null && before.lang === 'en-US' && afterTap.lang === 'zh-CN' && afterTap.h1 !== before.h1,
      { tapErr: tapErr, before: before.lang, after: afterTap.lang });

    ok('lang.TheChoiceSurvivesAReload',
      afterTap.stored === 'zh-CN' && afterReload.lang === 'zh-CN' && afterReload.h1 === afterTap.h1,
      { stored: afterTap.stored, lang: afterReload.lang });

    ok('lang.AnExplicitQueryOutranksTheStoredChoice',
      afterQuery.lang === 'en-US' && afterQuery.h1 === before.h1,
      { lang: afterQuery.lang, matchesEnglish: afterQuery.h1 === before.h1 });

    const lbag = pageErrors.get(tpage);
    ok('lang.noConsoleErrors', lbag.errors.length === 0, lbag.errors.slice(0, 3));
    await tctx.close();
  }

  /* ======================================================== CONCEPT N == */
  if (needs('n')) {
    const ctx = await context({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await ctx.newPage();
    instrument(page);
    await boot(page, BASE + '/preview/intent/compile/?lang=en-US');
    collected.n_desktop = await genericGates(page, 'N.desktop', 'compile');

    /* --- validation --- */
    const emptyTry = await page.evaluate(() => {
      const i = document.querySelector('[data-testid="n-input"]');
      i.value = 'a'; i.dispatchEvent(new Event('input'));
      const p = window.KK.compile.run();
      return { payload: p === null, errorShown: document.querySelector('[data-testid="n-error"]').getAttribute('data-show') };
    });
    ok('N.refusesTooShortInput', emptyTry.payload === true && emptyTry.errorShown === 'true', emptyTry);

    /* --- compile, and watch the field it drives, in ONE round trip --------
       The compile pulses the collapse uniform for 1100ms and then lets it
       settle to 0.22 (field.js:291), so the movement is a WINDOW, not a state.
       Splitting the trigger from the measurement across two Playwright round
       trips means a slow round trip can miss the window entirely — which is
       how this check failed once in a few runs with the code perfectly correct
       (observed: `max 0.22, framesDrawn 140`, i.e. the loop was healthy and the
       window had already closed). Both halves now happen inside one evaluate,
       and the threshold comes from the payload's own tone, not a constant. */
    const compiled = await page.evaluate(async (input) => {
      const i = document.querySelector('[data-testid="n-input"]');
      i.value = input;
      i.dispatchEvent(new Event('input'));
      const p = window.KK.compile.run();
      /* read the shader state SYNCHRONOUSLY, in the same tick as the call whose
         effect is being claimed. Nothing about this depends on how fast the
         renderer is, which is the point: the previous version sampled the eased
         value over a time window and therefore measured the machine (observed
         `framesDrawn: 1` over 2.5s on a contended desktop, and `0.22` whenever
         the pulse's 1100ms window closed before the first sample). */
      const s0 = KK.field.stats();
      return {
        p, state: window.KK.compile.state(),
        field: { targetCollapse: s0.targetCollapse, signal: s0.signal, backend: s0.backend, collapseAtRest: s0.collapse }
      };
    }, 'Help me set up a CBT practice that catches the spiral early, and check in tonight.');
    collected.n_compile = compiled.p;
    collected.n_field = compiled.field;
    ok('N.compileReturnsPayload', !!compiled.p);
    ok('N.payloadIsLabelledDemo', compiled.p.mode === 'DEMO' && compiled.p.previewOnly === true && compiled.p.notAModel === true, { mode: compiled.p.mode, provider: compiled.p.provider });
    ok('N.nodeCountMatchesBlueprint', compiled.p.nodes === 5 && compiled.p.edges === 4, { n: compiled.p.nodes, e: compiled.p.edges });
    ok('N.workIsMeasuredInMilliseconds', typeof compiled.p.work.totalMs === 'number' && compiled.p.work.totalMs >= 0 && compiled.p.work.totalMs < 1000, compiled.p.work);
    ok('N.pacingIsDisclosedSeparately', compiled.p.pacing.disclosed === true && compiled.p.pacing.totalMs > 0, compiled.p.pacing);
    ok('N.storesOneArtifact', compiled.state.nodes === 5);
    const snapAfterCompile = await page.evaluate(() => KK.store.snapshot());
    ok('N.artifactRecorded', snapAfterCompile.artifacts === 1, snapAfterCompile);

    /* --- dependency rule applied at compile time --- */
    ok('N.firstNodeReadyRestBlocked', JSON.stringify(compiled.p.pipeline.nodes.map(n => n.state)) === JSON.stringify(['todo', 'blocked', 'blocked', 'blocked', 'blocked']), compiled.p.pipeline.nodes.map(n => n.state));

    /* --- the compile drives the field, read at the moment it does so ------
       The payload's own tone sets the target: 'alert' asks for 1, 'calm' for
       0.12. The threshold comes from the data, not from a constant, and this is
       a synchronous read so it cannot be missed by a slow frame. */
    const nTone = (compiled.p.features && compiled.p.features.tone) || 'neutral';
    const nSignal = nTone === 'alert' ? 1 : (nTone === 'calm' ? 0.12 : 0.45);
    ok('N.compileDrivesTheShaderUniform',
      compiled.field.targetCollapse === nSignal && compiled.field.signal === nSignal,
      { tone: nTone, expected: nSignal, got: compiled.field });

    /* --- and the uniform really converges to a target ---------------------
       Separate claim, separately tested: hold a target with NO expiry and wait
       for the GPU-read value to have travelled more than half way. A 12s bound
       is roughly ten times what a healthy renderer needs, so a stalled or
       busy machine cannot make this fail; a broken easing can still never
       pass it. `framesDrawn` proves the loop was running while it converged. */
    const conv = await page.evaluate(async () => {
      const f0 = KK.field.stats().frames;
      const base = KK.field.stats().collapse;
      KK.field.pulse(1, 0);
      const t0 = performance.now();
      let max = base;
      while (performance.now() - t0 < 12000) {
        await new Promise(r => setTimeout(r, 60));
        const v = KK.field.stats().collapse;
        if (v > max) max = v;
        if (max > 0.5) break;
      }
      KK.field.settle();
      return { base, max: Math.round(max * 1000) / 1000, ms: Math.round(performance.now() - t0),
        framesDrawn: KK.field.stats().frames - f0, backend: KK.field.stats().backend };
    });
    collected.n_collapse = conv;
    ok('N.collapseUniformConvergesToItsTarget', conv.framesDrawn > 0 && conv.max > 0.5, conv);

    /* --- 3D network --- */
    const net = await page.evaluate(() => KK.compile.state());
    ok('N.networkMeshesMatchNodes', net.meshes === 5, net);
    ok('N.tubesMatchEdges', net.tubes === 4, net);
    ok('N.travellingPacketsPerEdge', net.packets === 4, net);

    /* --- terminal honesty --- */
    await page.evaluate(() => { location.hash = '#/pipeline'; });
    await page.waitForSelector('[data-testid="n-rail"] [data-node]');
    const pipe = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[data-testid="n-rail"] [data-node]'));
      return {
        count: rows.length,
        states: rows.map(r => r.getAttribute('data-state')),
        disabled: rows.map(r => { const b = r.querySelector('[data-node-act="run"]'); return b ? b.getAttribute('aria-disabled') : 'x'; }),
        approval: rows.filter(r => r.getAttribute('data-approval') === 'true').length
      };
    });
    ok('N.railRendersEveryNode', pipe.count === 5, pipe.count);
    ok('N.blockedNodesSaySoInTheDom', pipe.states.filter(s => s === 'blocked').length === 4, pipe.states);
    ok('N.blockedNodesMarkTheirRunButton', pipe.disabled.join(',') === 'false,true,true,true,true', pipe.disabled);
    ok('N.exactlyOneApprovalGate', pipe.approval === 1, pipe.approval);

    await page.evaluate(() => { location.hash = '#/log'; });
    await page.waitForSelector('[data-testid="n-term"] .term__line');
    const term = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="n-term"] .term__line'))
      .map(l => ({ src: l.getAttribute('data-src'), status: l.getAttribute('data-status'), text: l.textContent })));
    ok('N.terminalPrintsOneLinePerRecord', term.length === compiled.p.logs.length, term.length);
    const unresolved = term.filter(l => resolvePath(compiled.p, l.src) === undefined).map(l => l.src);
    ok('N.everyTerminalLineResolvesItsSource', unresolved.length === 0, unresolved);
    const mismatched = term.filter(l => !l.text.replace(/\s/g, '').includes(String(resolvePath(compiled.p, l.src)).replace(/\s/g, ''))).map(l => l.src);
    ok('N.terminalTextContainsTheMeasuredValue', mismatched.length === 0, mismatched);
    const fabricated = term.filter(l => /加密|12k ?Hz|12,?000 ?Hz|无缝|seamless|encrypted|guaranteed/i.test(l.text)).map(l => l.text);
    ok('N.terminalMakesNoUnmeasurableClaim', fabricated.length === 0, fabricated);

    /* --- approval flow: deny first --- */
    const flow = await page.evaluate(async () => {
      const before = KK.store.snapshot();
      const first = await KK.compile.runNodeById('nd_intake');
      const afterFirst = KK.store.snapshot();
      const refused = await KK.compile.runNodeById('nd_rehearse');   // still blocked
      const afterRefused = KK.store.snapshot();
      return { before, afterFirst, refusedIsNull: refused === null, afterRefused, firstMode: first && first.mode };
    });
    ok('N.localNodeProducesPreviewReceipt', flow.afterFirst.receipts === 1 && flow.firstMode === 'PREVIEW_ADAPTER', flow.firstMode);
    ok('N.blockedNodeRefusesToRun', flow.refusedIsNull === true && flow.afterRefused.receipts === 1, flow.afterRefused.receipts);

    /* --- walk to the gate, deny, then approve --- */
    const chain = await page.evaluate(async () => {
      await KK.compile.runNodeById('nd_pattern');
      /* reopen pattern while reframe is still undone -> reframe must re-block */
      KK.compile.reopenById('nd_pattern');
      const reopened = { states: ['nd_intake', 'nd_pattern', 'nd_reframe'].map(i => KK.compile.node(i).state) };
      await KK.compile.runNodeById('nd_pattern');
      await KK.compile.runNodeById('nd_reframe');
      /* deny at the gate */
      const beforeDeny = KK.store.snapshot().receipts;
      const pr = KK.compile.runNodeById('nd_rehearse');
      await new Promise(r => setTimeout(r, 80));
      const deny = document.querySelector('[data-testid="confirm-deny"]');
      if (deny) deny.click();
      const denyRes = await pr;
      const afterDeny = { before: beforeDeny, receipts: KK.store.snapshot().receipts, state: KK.compile.node('nd_rehearse').state, denied: denyRes && denyRes.denied };
      /* approve at the gate */
      const beforeApprove = KK.store.snapshot().receipts;
      const pr2 = KK.compile.runNodeById('nd_rehearse');
      await new Promise(r => setTimeout(r, 80));
      const ap = document.querySelector('[data-testid="confirm-approve"]');
      if (ap) ap.click();
      const apRes = await pr2;
      const afterApprove = { before: beforeApprove, receipts: KK.store.snapshot().receipts, state: KK.compile.node('nd_rehearse').state, executed: apRes && apRes.executed, external: apRes && apRes.externalWorldChanged };
      return { reopened, afterDeny, afterApprove };
    });
    ok('N.reopenBlocksTheDownstreamNode', chain.reopened.states.join(',') === 'done,todo,blocked', chain.reopened.states);
    ok('N.denialChangesNothingAtAll', chain.afterDeny.denied === true && chain.afterDeny.receipts === chain.afterDeny.before && chain.afterDeny.state === 'todo', chain.afterDeny);
    ok('N.approvalProducesASandboxReceipt', chain.afterApprove.receipts === chain.afterApprove.before + 1 && chain.afterApprove.executed === true, chain.afterApprove);
    ok('N.externalWorldChangedStaysFalse', chain.afterApprove.external === false, chain.afterApprove.external);
    const receiptModes = await page.evaluate(() => KK.store.state.receipts.map(r => r.mode + ':' + r.externalWorldChanged));
    ok('N.noReceiptEverClaimsAWorldChange', receiptModes.every(m => m.endsWith(':false')), receiptModes);

    /* --- completed downstream work is not destroyed by a reopen --- */
    const preserved = await page.evaluate(() => {
      KK.compile.reopenById('nd_pattern');
      return { rehearse: KK.compile.node('nd_rehearse').state, reframe: KK.compile.node('nd_reframe').state };
    });
    ok('N.reopenDoesNotUndoCompletedWork', preserved.rehearse === 'done' && preserved.reframe === 'done', preserved);

    /* --- the seam: workspace switch --- */
    const seam = await page.evaluate(async () => {
      const before = KK.store.snapshot();
      const sel = document.querySelector('[data-testid="scn-select"]');
      sel.value = 'bond';
      sel.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 120));
      const after = KK.store.snapshot();
      const receipts = Array.from(document.querySelectorAll('[data-testid="n-receipts"] [data-receipt]'));
      return {
        before, after,
        onScreen: receipts.length,
        origins: receipts.map(r => r.getAttribute('data-from-scenario')),
        counts: KK.compile.state().counts,
        toast: Array.from(document.querySelectorAll('.toast')).map(t => t.textContent).join(' | ')
      };
    });
    ok('N.workspaceSwitchKeepsReceipts', seam.after.receipts === seam.before.receipts && seam.after.receipts > 0, { before: seam.before.receipts, after: seam.after.receipts });
    ok('N.workspaceSwitchKeepsTheDraft', seam.after.hasDraft === true, seam.after);
    ok('N.receiptsKeepTheirOriginWorkspace', seam.origins.length === seam.before.receipts && seam.origins.every(o => o === 'mind'), seam.origins);
    ok('N.pipelineIsClearedOnSwitch', seam.counts.todo + seam.counts.blocked + seam.counts.done === 0, seam.counts);
    ok('N.toastExplainsWhatSurvived', /\d+ receipt\(s\)/.test(seam.toast) && /kept/.test(seam.toast) && /draft was kept/.test(seam.toast), seam.toast.slice(-190));

    /* --- language switch keeps the draft --- */
    const lang = await page.evaluate(async () => {
      location.hash = '#/frame';
      await new Promise(r => setTimeout(r, 120));
      const draftBefore = KK.store.getDraft('composer');
      const h1Before = document.querySelector('h1[data-testid]').textContent;
      document.querySelector('[data-testid="lang-btn"]').click();
      await new Promise(r => setTimeout(r, 150));
      return {
        langAttr: document.body.getAttribute('data-lang'),
        draftBefore, draftAfter: KK.store.getDraft('composer'),
        h1Before, h1After: document.querySelector('h1[data-testid]').textContent,
        inputValue: document.querySelector('[data-testid="n-input"]') ? document.querySelector('[data-testid="n-input"]').value : null,
        navLabel: document.querySelector('[data-testid="view-nav"] button').textContent
      };
    });
    ok('N.languageSwitchKeepsTheDraft', lang.draftBefore === lang.draftAfter && lang.draftBefore.length > 10, { before: (lang.draftBefore || '').slice(0, 24) });
    ok('N.languageSwitchRestoresTheInput', lang.inputValue === lang.draftAfter, { input: (lang.inputValue || '').slice(0, 24) });
    ok('N.languageSwitchRewritesTheHeadline', lang.h1Before !== lang.h1After, { before: lang.h1Before.slice(0, 30), after: lang.h1After.slice(0, 30) });
    ok('N.languageSwitchRewritesNav', /框|意图/.test(lang.navLabel), lang.navLabel);
    const zhGates = await genericGates(page, 'N.zh', 'compile');
    ok('N.zhTextIsChinese', /[\u4e00-\u9fa5]/.test(zhGates.h1), zhGates.h1 && zhGates.h1.slice(0, 40));
    collected.n_zh = zhGates;
    await ctx.close();
  }

  /* ======================================================== CONCEPT S == */
  if (needs('s')) {
    const ctx = await context({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await ctx.newPage();
    instrument(page);
    await boot(page, BASE + '/preview/intent/anticipate/?lang=en-US');
    collected.s_desktop = await genericGates(page, 'S.desktop', 'anticipate');

    /* --- ghost text: only when an opening matched --- */
    const ghost = await page.evaluate(async () => {
      const i = document.querySelector('[data-testid="s-input"]');
      const out = {};
      const set = async v => {
        i.value = v; i.dispatchEvent(new Event('input'));
        await new Promise(r => setTimeout(r, 25));
        const g = document.querySelector('[data-testid="s-ghost"]');
        const p = document.querySelector('[data-testid="s-predict"]');
        return {
          hidden: g.hidden, fired: g.getAttribute('data-fired'), tailId: g.getAttribute('data-tail'),
          tail: g.querySelector('.tail').textContent,
          confidence: p.getAttribute('data-confidence'), band: p.getAttribute('data-band'),
          basis: Array.from(document.querySelectorAll('[data-testid="s-basis"] [data-basis]')).map(b => b.getAttribute('data-basis')),
          features: KK.preview.analyzeText(i.value, KK.store.state.scenario)
        };
      };
      out.empty = await set('');
      out.oneChar = await set('一');
      out.opening = await set('帮我');
      out.longer = await set('帮我搭一套 CBT 练习，早点拦住情绪下滑');
      out.noOpening = await set('今天天气不错');
      return out;
    });
    ok('S.ghostHiddenWhenNothingTyped', ghost.empty.hidden === true && ghost.empty.fired === 'false', ghost.empty);
    ok('S.ghostNeedsTwoCharacters', ghost.oneChar.hidden === true, ghost.oneChar);
    ok('S.ghostAppearsOnAMatchedOpening', ghost.opening.hidden === false && ghost.opening.fired === 'true' && ghost.opening.tail.length > 10, ghost.opening.tail.slice(0, 50));
    ok('S.ghostTailIsAContinuation', ghost.opening.tail.trim().startsWith('—') || ghost.opening.tail.trim().startsWith('-') || ghost.opening.tail.trim().startsWith('——'), ghost.opening.tail.slice(0, 24));
    ok('S.ghostStaysAwayWithoutAnOpening', ghost.noOpening.hidden === true && ghost.noOpening.fired === 'false', ghost.noOpening);
    ok('S.staleConfidenceIsNotLeftInTheDom', ghost.noOpening.confidence === null, ghost.noOpening.confidence);
    ok('S.confidenceIsBetweenZeroAndOne', ghost.opening.confidence !== null && Number(ghost.opening.confidence) > 0 && Number(ghost.opening.confidence) <= 1, ghost.opening.confidence);
    ok('S.confidenceGrowsWithMoreSignal', Number(ghost.longer.confidence) >= Number(ghost.opening.confidence), { a: ghost.opening.confidence, b: ghost.longer.confidence });
    ok('S.bandMatchesTheNumber', (ghost.longer.band === 'high') === (Number(ghost.longer.confidence) >= 0.8), { band: ghost.longer.band, c: ghost.longer.confidence });
    ok('S.showsAtLeastTwoReasons', ghost.longer.basis.length >= 2, ghost.longer.basis);
    ok('S.reasonLexiconValueIsTheMeasuredCount', ghost.longer.basis.indexOf('lexicon') < 0 ||
      (ghost.longer.features.alertHits.length + ghost.longer.features.calmHits.length) > 0, ghost.longer.features);

    /* --- Tab accepts, Esc dismisses --- */
    const keys = await page.evaluate(async () => {
      const i = document.querySelector('[data-testid="s-input"]');
      const g = document.querySelector('[data-testid="s-ghost"]');
      i.value = '帮我'; i.dispatchEvent(new Event('input'));
      await new Promise(r => setTimeout(r, 25));
      const tail = g.querySelector('.tail').textContent;
      i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 25));
      const accepted = i.value;
      i.value = '帮我'; i.dispatchEvent(new Event('input'));
      await new Promise(r => setTimeout(r, 25));
      i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 25));
      return { tail, accepted, escaped: g.hidden };
    });
    ok('S.tabAcceptsThePrediction', keys.accepted === '帮我' + keys.tail && keys.tail.length > 10, { accepted: keys.accepted.slice(0, 50) });
    ok('S.escapeDismissesThePrediction', keys.escaped === true);

    /* --- orbit board physics --- */
    const phys = await page.evaluate(async () => {
      KK.anticipate.pause();
      KK.anticipate.addFromDraft('帮我搭一套 CBT 练习，早点拦住情绪下滑。');
      KK.anticipate.addFromDraft('Help me prepare the conversation I keep postponing.');
      KK.anticipate.addFromDraft('I want to look at the sentence I keep repeating about work.');
      location.hash = '#/orbits';
      await new Promise(r => setTimeout(r, 200));
      const s0 = KK.anticipate.state();
      KK.anticipate.step(4);
      const rest = KK.anticipate.state();
      const dist = c => Math.round(Math.hypot(c.x - c.hx, c.y - c.hy));
      const id = rest.cards[0].id;
      KK.anticipate.fling(id, 1100, -800);
      KK.anticipate.step(0.2);
      const mid = KK.anticipate.state();
      KK.anticipate.step(4);
      const end = KK.anticipate.state();
      return {
        cards: rest.cards.length,
        running: rest.running,
        overlapsAtRest: rest.overlaps,
        distAtRest: rest.cards.map(dist),
        flungId: id,
        flungMid: Math.round(Math.hypot(mid.cards[0].x - mid.cards[0].hx, mid.cards[0].y - mid.cards[0].hy)),
        flungEnd: Math.round(Math.hypot(end.cards[0].x - end.cards[0].hx, end.cards[0].y - end.cards[0].hy)),
        endOverlaps: end.overlaps,
        domCards: document.querySelectorAll('[data-testid="s-board"] [data-card]').length,
        boardMode: document.querySelector('[data-testid="s-board"]').getAttribute('data-mode')
      };
    });
    collected.s_physics = phys;
    ok('S.orbitBoardHoldsEveryCard', phys.cards === 3 && phys.domCards === 3, { cards: phys.cards, dom: phys.domCards });
    ok('S.cardsSettleWithoutOverlapping', phys.overlapsAtRest === 0 && phys.endOverlaps === 0, { rest: phys.overlapsAtRest, end: phys.endOverlaps });
    ok('S.cardsRestOnTheirOwnSlot', phys.distAtRest.every(d => d <= 2), phys.distAtRest);
    ok('S.aThrowActuallyDisplacesTheCard', phys.flungMid > 60, { mid: phys.flungMid });
    ok('S.theSpringBringsItBack', phys.flungEnd <= 4, { end: phys.flungEnd });

    /* --- list mode --- */
    const listMode = await page.evaluate(async () => {
      document.querySelector('[data-testid="s-mode-list"]').click();
      await new Promise(r => setTimeout(r, 150));
      const board = document.querySelector('[data-testid="s-board"]');
      const card = board.querySelector('[data-card]');
      const r = { mode: board.getAttribute('data-mode'), position: getComputedStyle(card).position, transform: getComputedStyle(card).transform, running: KK.anticipate.state().running, count: board.querySelectorAll('[data-card]').length };
      document.querySelector('[data-testid="s-mode-free"]').click();
      await new Promise(r => setTimeout(r, 150));
      r.back = document.querySelector('[data-testid="s-board"]').getAttribute('data-mode');
      r.runningAfter = KK.anticipate.state().running;
      return r;
    });
    ok('S.listModeTurnsPhysicsOff', listMode.mode === 'list' && listMode.position === 'static' && listMode.running === false, listMode);
    ok('S.listModeHidesNothing', listMode.count === 3, listMode.count);
    ok('S.freeModeCanBeTurnedBackOn', listMode.back === 'free', listMode);

    /* leaving the board must stop the loop — a board nobody is looking at
       should not be spending frames */
    const pauseOnLeave = await page.evaluate(async () => {
      location.hash = '#/orbits';
      await new Promise(r => setTimeout(r, 200));
      const onBoard = KK.anticipate.state().running;
      location.hash = '#/field';
      await new Promise(r => setTimeout(r, 200));
      const offBoard = KK.anticipate.state().running;
      return { onBoard, offBoard };
    });
    ok('S.orbitBoardPausesWhenYouLeaveIt', pauseOnLeave.onBoard === true && pauseOnLeave.offBoard === false, pauseOnLeave);

    /* --- permission, measured --- */
    const mic = await page.evaluate(async () => {
      location.hash = '#/ledger';
      await new Promise(r => setTimeout(r, 200));
      const btn = document.querySelector('[data-testid="s-mic"]');
      btn.click();
      /* Poll for the outcome instead of sleeping a fixed 1200ms. The consent is
         written when the browser answers the permission request, and on a
         loaded machine that answer can outlast any fixed sleep — which is
         exactly how this turned into two false failures on a slow run. Bounded
         at 4s, so a consent that never arrives still fails. */
      const t0 = performance.now();
      const rows = () => document.querySelectorAll('[data-testid="s-consents"] [data-consent]').length;
      while (performance.now() - t0 < 4000 && (KK.store.state.consents.length === 0 || rows() === 0)) {
        await new Promise(r => setTimeout(r, 50));
      }
      await new Promise(r => setTimeout(r, 60));
      return {
        waitedMs: Math.round(performance.now() - t0),
        consents: KK.store.state.consents.map(c => c.outcome),
        domRows: rows(),
        snapshot: KK.store.snapshot()
      };
    });
    const outcomes = ['granted', 'denied', 'unavailable'];
    ok('S.permissionOutcomeIsOneOfThreeRecorded', mic.consents.length === 1 && outcomes.indexOf(mic.consents[0]) >= 0, mic.consents);
    ok('S.permissionRowIsRendered', mic.domRows === 1, mic.domRows);

    /* --- ledger agrees with the store --- */
    const ledger = await page.evaluate(() => ({
      snap: KK.store.snapshot(),
      signals: document.querySelector('[data-testid="s-signals"] [data-count]').getAttribute('data-count'),
      artifacts: document.querySelector('[data-testid="s-artifacts"] [data-count]').getAttribute('data-count'),
      receipts: document.querySelector('[data-testid="s-receipts"] [data-count]').getAttribute('data-count'),
      consents: document.querySelector('[data-testid="s-consents"] [data-count]').getAttribute('data-count')
    }));
    ok('S.ledgerSignalCountMatches', Number(ledger.signals) === ledger.snap.signals, { dom: ledger.signals, store: ledger.snap.signals });
    ok('S.ledgerArtifactCountMatches', Number(ledger.artifacts) === ledger.snap.artifacts, { dom: ledger.artifacts, store: ledger.snap.artifacts });
    ok('S.ledgerConsentCountMatches', Number(ledger.consents) === ledger.snap.consents, { dom: ledger.consents, store: ledger.snap.consents });

    /* --- language switch keeps the draft --- */
    const langS = await page.evaluate(async () => {
      location.hash = '#/field';
      await new Promise(r => setTimeout(r, 150));
      const before = KK.store.getDraft('composer');
      document.querySelector('[data-testid="lang-btn"]').click();
      await new Promise(r => setTimeout(r, 150));
      const i = document.querySelector('[data-testid="s-input"]');
      return { before, after: KK.store.getDraft('composer'), inputValue: i ? i.value : null, langAttr: document.body.getAttribute('data-lang') };
    });
    ok('S.languageSwitchKeepsTheDraft', langS.before === langS.after && !!langS.after, { before: (langS.before || '').slice(0, 20), after: (langS.after || '').slice(0, 20) });
    ok('S.languageSwitchDoesNotClearTheInput', langS.inputValue === langS.after, { input: (langS.inputValue || '').slice(0, 20) });
    const sZh = await genericGates(page, 'S.zh', 'anticipate');
    ok('S.zhTextIsChinese', /[\u4e00-\u9fa5]/.test(sZh.h1), sZh.h1 && sZh.h1.slice(0, 40));
    collected.s_zh = sZh;
    await ctx.close();
  }

  /* ================================================== sound stays off === */
  /* Decision 2. The claim is "default off, and it stays off in the shipping
     version". That is only worth saying if it is checked against the live
     object, including after a reload — which is exactly where the previous
     build leaked: it remembered "on" in sessionStorage. */
  if (needs('sound')) {
    const ctx = await context({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await ctx.newPage();
    instrument(page);
    await boot(page, BASE + '/preview/intent/anticipate/?lang=en-US');

    const read = () => page.evaluate(() => {
      const b = document.querySelector('[data-testid="sound-btn"]');
      return {
        s: KK.sound.state(),
        label: b ? b.textContent.trim() : null,
        attr: b ? b.getAttribute('data-sound') : null
      };
    });

    const atBoot = await read();
    collected.sound_boot = atBoot;
    ok('sound.startsOff', atBoot.s.enabled === false && atBoot.s.defaultOn === false, atBoot.s);
    ok('sound.createsNoAudioContextBeforeAClick', atBoot.s.ctxState === 'none' && atBoot.s.gestures === 0, atBoot.s);
    ok('sound.hasPlayedNothing', atBoot.s.plays === 0, atBoot.s.plays);
    ok('sound.buttonStatesTheTruthInWords', /off/i.test(atBoot.label || '') && atBoot.attr === 'off', atBoot.label);

    await page.click('[data-testid="sound-btn"]');
    await page.waitForTimeout(220);
    const turnedOn = await read();
    collected.sound_on = turnedOn;
    ok('sound.turnsOnOnlyOnAClick', turnedOn.s.enabled === true && turnedOn.s.gestures === 1 && turnedOn.s.ctxState !== 'none', turnedOn.s);
    ok('sound.playCountIsReal', turnedOn.s.plays === 1, turnedOn.s.plays);

    await boot(page, BASE + '/preview/intent/anticipate/?lang=en-US');
    const afterReload = await read();
    collected.sound_reload = afterReload;
    ok('sound.isOffAgainAfterAReload', afterReload.s.enabled === false && afterReload.s.ctxState === 'none' && afterReload.s.plays === 0, afterReload.s);
    ok('sound.isNeverPersisted', afterReload.s.persisted === false, afterReload.s.persisted);
    const bag = pageErrors.get(page);
    ok('sound.noConsoleErrors', bag.errors.length === 0, bag.errors.slice(0, 3));
    await ctx.close();
  }

  /* ============================================ the prediction contract === */
  /* Decision 3. Same payload when a real model replaces the template. Checked
     as a contract, not as a sample: every case, plus the invariants that make
     the payload worth pinning at all. */
  if (needs('contract')) {
    const ctx = await context({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await ctx.newPage();
    instrument(page);
    await boot(page, BASE + '/preview/intent/anticipate/?lang=en-US');
    /* the contract block is rendered in the ledger, next to the receipts */
    await page.evaluate(() => { location.hash = '#/ledger'; });
    await page.waitForTimeout(250);

    const c = await page.evaluate(() => {
      const C = KK.preview.PREDICTION_CONTRACT;
      const cases = ['', '一', '帮我', '今天天气不错', '帮我搭一套 CBT 练习，早点拦住情绪下滑。',
                     'help me prepare the conversation I keep postponing', 'what is actually happening here'];
      const rows = cases.map(txt => {
        const p = KK.preview.predict(txt, 'mind');
        const v = KK.preview.validatePrediction(p);
        return {
          txt: txt, ok: v.ok, problems: v.missing.length + v.wrongType.length + v.broken.length,
          unexpected: v.unexpected, fired: p.fired, tailId: p.tailId, conf: p.confidence,
          band: p.confidenceBand, notAModel: p.notAModel, provider: p.provider, mode: p.mode,
          basis: p.basis.map(b => b.id),
          recomputed: KK.preview.confidenceFromBasis(p.basis)
        };
      });
      const dom = document.querySelector('[data-testid="s-contract"]');
      const mc = KK.preview.modelAdapterContract();
      return {
        name: C.name, version: C.version, cap: C.cap, weights: C.weights,
        fieldKeys: C.fields.map(f => f.key), invariants: C.invariants.length,
        rows: rows,
        dom: {
          name: dom.getAttribute('data-contract'), fields: dom.getAttribute('data-fields'),
          validate: dom.getAttribute('data-validate'), problems: dom.getAttribute('data-problems'),
          status: dom.getAttribute('data-status'), endpoint: dom.getAttribute('data-endpoint')
        },
        adapter: mc
      };
    });
    collected.contract = c;

    ok('contract.payloadSelfIdentifies', c.name === 'kk.prediction.v1' && c.version === 1, { name: c.name, v: c.version });
    ok('contract.everyCaseValidates', c.rows.every(r => r.ok && r.problems === 0), c.rows.filter(r => !r.ok));
    ok('contract.payloadHasNoUndeclaredFields', c.rows.every(r => r.unexpected.length === 0), c.rows.map(r => r.unexpected));
    ok('contract.confidenceEqualsTheSumOfItsDisclosedBasis',
      c.rows.every(r => Math.abs(r.conf - r.recomputed) < 1e-9), c.rows.map(r => [r.conf, r.recomputed]));
    ok('contract.tailIdIsNullExactlyWhenItDoesNotFire',
      c.rows.every(r => (r.fired ? !!r.tailId : r.tailId === null)), c.rows.map(r => [r.fired, r.tailId]));
    ok('contract.bandIsDerivedFromTheNumber',
      c.rows.every(r => (r.band === 'high') === (r.conf >= 0.8)), c.rows.map(r => [r.conf, r.band]));
    ok('contract.everyBasisIdIsAWeight', c.rows.every(r => r.basis.every(id => id in c.weights)),
      c.rows.map(r => r.basis.filter(id => !(id in c.weights))));
    ok('contract.localAdapterSaysItIsNotAModel',
      c.rows.every(r => r.notAModel === true && r.provider === 'preview.template.v1' && r.mode === 'DEMO'),
      c.rows.map(r => r.provider));
    ok('contract.theLedgerShowsTheSameContractName', c.dom.name === c.name, c.dom);
    ok('contract.theLedgerFieldCountMatches', Number(c.dom.fields) === c.fieldKeys.length, { dom: c.dom.fields, real: c.fieldKeys.length });
    ok('contract.theLedgerValidationAgreesWithTheLiveCheck',
      c.dom.validate === 'true' && c.dom.problems === '0', c.dom);
    ok('contract.theAdapterHoleIsDescribedNotFilled',
      c.adapter.status === 'NOT_CONNECTED' && c.adapter.endpoint === null && c.adapter.transport === null,
      { status: c.adapter.status, endpoint: c.adapter.endpoint, transport: c.adapter.transport });
    ok('contract.aRealModelMustReturnTheSameShape',
      c.adapter.mustReturn === c.name &&
      JSON.stringify(c.adapter.mustNotChange.slice().sort()) === JSON.stringify(c.fieldKeys.slice().sort()),
      { mustReturn: c.adapter.mustReturn, pinned: c.adapter.mustNotChange.length });
    ok('contract.exactlyTwoFieldsAreAllowedToChangeMeaning',
      c.adapter.mustChange.length === 2 &&
      c.adapter.mustChange.map(x => x.field).sort().join(',') === 'notAModel,provider',
      c.adapter.mustChange);
    ok('contract.theFlipIsDocumentedNotHardcoded',
      c.adapter.mustChange.some(x => x.field === 'notAModel' && x.to === 'false'),
      c.adapter.mustChange);

    const bag = pageErrors.get(page);
    ok('contract.noConsoleErrors', bag.errors.length === 0, bag.errors.slice(0, 3));
    await ctx.close();
  }

  /* ================================= assembled work survives a switch ==== */
  /* Decision 5. The previous build nulled the pipeline on every workspace
     switch. This checks the replacement as a contract: swap out, swap back,
     and the graph must be identical — node for node, state for state. */
  if (needs('retain')) {
    for (const cap of [{ id: 's', path: 'anticipate' }, { id: 'n', path: 'compile' }]) {
      const ctx = await context({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
      const page = await ctx.newPage();
      instrument(page);
      await boot(page, BASE + '/preview/intent/' + cap.path + '/?lang=en-US');

      const r = await page.evaluate(async (which) => {
        const sleep = ms => new Promise(res => setTimeout(res, ms));
        const sel = document.querySelector('[data-testid="scn-select"]');
        const switchTo = async k => {
          sel.value = k;
          sel.dispatchEvent(new Event('change'));
          await sleep(300);
        };
        if (which === 's') {
          KK.anticipate.pause();
          KK.anticipate.addFromDraft('帮我搭一套 CBT 练习，早点拦住情绪下滑。');
          const cardId = KK.anticipate.state().cards[0].id;
          await KK.anticipate.confirm(cardId);
          await sleep(200);
        } else {
          const i = document.querySelector('[data-testid="n-input"]');
          i.value = '帮我搭一套 CBT 练习，早点拦住情绪下滑。';
          i.dispatchEvent(new Event('input'));
          KK.compile.run();
          await sleep(200);
          /* Run one node too. Without a receipt on this page the "receipts
             survive the switch" half of the check would be vacuous — it would
             pass for the degenerate reason that there were none. It also makes
             the restored graph's node STATE part of what is compared. */
          await KK.compile.runNodeById('nd_intake');
          await sleep(250);
        }
        const snapshotOf = () => {
          const st = KK.store.state;
          return {
            scenario: st.scenario,
            nodes: st.pipeline ? st.pipeline.nodes.length : 0,
            edges: st.pipeline ? st.pipeline.edges.length : 0,
            assembled: !!(st.pipeline && st.pipeline.assembledAt),
            assembledAt: st.pipeline ? st.pipeline.assembledAt : null,
            states: st.pipeline ? st.pipeline.nodes.map(n => n.id + ':' + n.state) : [],
            cards: st.cards.length,
            receipts: st.receipts.length,
            slots: KK.store.preservedSlots()
          };
        };
        const viewOf = () => (which === 's'
          ? { cards: KK.anticipate.state().cards.length, pipeline: KK.anticipate.state().pipeline }
          : { nodes: KK.compile.state().nodes, meshes: KK.compile.state().meshes });

        await switchTo('mind');
        const before = { snap: snapshotOf(), view: viewOf() };
        await switchTo('bond');
        const away = { snap: snapshotOf(), view: viewOf() };
        const toast = (document.querySelector('[data-testid="toaster"] .toast:last-child') || {}).textContent || '';
        await switchTo('mind');
        const back = { snap: snapshotOf(), view: viewOf() };
        /* the ledger's own rendering of the graph, read from the DOM */
        let ledgerCount = null, ledgerAssembled = null;
        if (which === 's') {
          location.hash = '#/ledger';
          await sleep(300);
          const el = document.querySelector('[data-testid="s-pipeline"] [data-count]');
          ledgerCount = el ? el.getAttribute('data-count') : null;
          const ae = document.querySelector('[data-testid="s-pipeline"] [data-assembled]');
          ledgerAssembled = ae ? ae.getAttribute('data-assembled') : null;
        } else {
          location.hash = '#/pipeline';
          await sleep(300);
          const rail = document.querySelectorAll('[data-testid="n-rail"] [data-node]');
          ledgerCount = String(rail.length);
        }
        return {
          before, away, back, toast,
          ledgerCount, ledgerAssembled,
          retainedNodes: document.body.getAttribute('data-retained-nodes'),
          retainedSlots: document.body.getAttribute('data-retained-slots')
        };
      }, cap.id);
      collected['retain_' + cap.id] = r;
      const p = 'retain.' + cap.id;

      ok(p + '.assemblyProducesAnAssembledGraph',
        r.before.snap.nodes === 5 && r.before.snap.assembled === true, r.before.snap);
      ok(p + '.switchingAwayDoesNotDestroyIt',
        r.away.snap.nodes === 0 && r.away.snap.slots.filter(x => x.key === 'mind')[0].assembled === true,
        { away: r.away.snap.nodes, slot: r.away.snap.slots.filter(x => x.key === 'mind')[0] });
      ok(p + '.theOutgoingSlotStillHoldsIt',
        r.away.snap.slots.filter(x => x.key === 'mind')[0].nodes === 5,
        r.away.snap.slots);
      ok(p + '.comingBackRestoresItExactly',
        JSON.stringify(r.back.snap.states) === JSON.stringify(r.before.snap.states) &&
        r.back.snap.assembledAt === r.before.snap.assembledAt,
        { before: r.before.snap.states, back: r.back.snap.states });
      ok(p + '.theRestoredGraphIsNotEmpty', r.back.snap.nodes === 5 && r.back.snap.edges === 4, r.back.snap);
      ok(p + '.theVisibleSurfaceShowsTheRestoredWork',
        Number(r.ledgerCount) === 5, { dom: r.ledgerCount, assembled: r.ledgerAssembled });
      ok(p + '.theToastSaysWhatWasKept',
        /kept/i.test(r.toast) && /node\(s\)/i.test(r.toast) && !/was cleared/i.test(r.toast),
        r.toast.slice(-200));
      ok(p + '.theToastDoesNotClaimThePipelineWasCleared', !/cleared/i.test(r.toast), r.toast.slice(-200));
      ok(p + '.retentionIsReadableFromTheDom',
        r.retainedNodes === '5' && Number(r.retainedSlots) >= 1, { nodes: r.retainedNodes, slots: r.retainedSlots });
      ok(p + '.receiptsStillSurviveTheSameSwitch',
        r.back.snap.receipts === r.before.snap.receipts && r.back.snap.receipts > 0,
        { before: r.before.snap.receipts, back: r.back.snap.receipts });

      const bag = pageErrors.get(page);
      ok(p + '.noConsoleErrors', bag.errors.length === 0, bag.errors.slice(0, 3));
      await ctx.close();
    }
  }

  /* ==================================== the long-scroll surface (site) === */
  /* Decision 4. This is the one surface where the scroll is the interface, so
     it is the one surface that loads ScrollTrigger. The checks below are
     written so that a ScrollTrigger that loaded but never fired anything would
     fail: the reveal count and the pinned step both have to move. */
  if (needs('site')) {
    const ctx = await context({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await ctx.newPage();
    instrument(page);
    await boot(page, BASE + '/preview/site/?lang=en-US');
    const g = await siteGates(page, 'site.desktop');
    collected.site_desktop = g;

    const st0 = await page.evaluate(() => KK.site.state());
    collected.site_top = st0;
    ok('site.scrollTriggerIsLoaded', st0.stLoaded === true && st0.stVersion === '3.12.5', { v: st0.stVersion });
    ok('site.gsapIsLoadedForScrollTrigger', st0.gsapLoaded === true && st0.gsapVersion === '3.12.5', st0.gsapVersion);
    ok('site.scrollTriggerIsActuallyWired', st0.triggers >= 20 && st0.pinned === true, { triggers: st0.triggers, pinned: st0.pinned });
    ok('site.theDocumentIsLongEnoughToScroll', st0.docHeight > st0.viewport * 2, { doc: st0.docHeight, vp: st0.viewport });
    ok('site.nothingIsRevealedBeforeItIsReached', st0.revealDone < st0.revealTotal, { done: st0.revealDone, total: st0.revealTotal });
    ok('site.theFirstScreenIsAlreadyReadable', st0.revealDone >= 1, st0.revealDone);
    ok('site.theHiddenStateIsScopedToTheScrollDriver', st0.dataSt === 'on', st0.dataSt);

    const st1 = await page.evaluate(async () => {
      KK.site.scrollToBottom();
      await new Promise(r => setTimeout(r, 600));
      return KK.site.state();
    });
    collected.site_bottom = st1;
    ok('site.scrollingRevealsEverything', st1.revealDone === st1.revealTotal && st1.revealTotal >= 15, { d: st1.revealDone, t: st1.revealTotal });
    ok('site.progressBarFollowsTheScroll', parseFloat(st1.progressWidth) >= 99 && st0.progressWidth !== st1.progressWidth,
      { from: st0.progressWidth, to: st1.progressWidth });
    ok('site.thePinnedSequenceScrubsToTheLastStep', st1.activeStep === st1.steps - 1, { step: st1.activeStep, steps: st1.steps });
    ok('site.exactlyOneStepIsMarkedActive', st1.activeDoms === 1, st1.activeDoms);

    /* the one interactive thing on the page runs the real adapter */
    const hero = await page.evaluate(async () => {
      KK.site.scrollTo(0);
      await new Promise(r => setTimeout(r, 250));
      const i = document.querySelector('[data-testid="site-input"]');
      const ghost = document.querySelector('[data-testid="site-ghost"]');
      const out = document.querySelector('[data-testid="site-out"]');
      i.value = ''; i.dispatchEvent(new Event('input'));
      await new Promise(r => setTimeout(r, 40));
      const idle = { hidden: ghost.hidden, state: out.getAttribute('data-state') };
      i.value = '帮我'; i.dispatchEvent(new Event('input'));
      await new Promise(r => setTimeout(r, 40));
      const fired = {
        hidden: ghost.hidden, tail: ghost.querySelector('.tail').textContent,
        conf: ghost.getAttribute('data-confidence'), state: out.getAttribute('data-state'),
        out: out.textContent.trim()
      };
      i.value = '今天天气不错'; i.dispatchEvent(new Event('input'));
      await new Promise(r => setTimeout(r, 40));
      const shut = { hidden: ghost.hidden, state: out.getAttribute('data-state') };
      const pred = KK.site.prediction('帮我');
      return { idle, fired, shut, valid: pred.validation.ok, notAModel: pred.payload.notAModel };
    });
    collected.site_hero = hero;
    ok('site.heroSaysNothingWhenThereIsNothingToSay', hero.idle.hidden === true && hero.idle.state === 'idle', hero.idle);
    ok('site.heroRunsTheRealAdapter', hero.fired.hidden === false && hero.fired.tail.length > 10 && hero.valid === true, hero.fired);
    ok('site.heroStatesItsConfidenceAndItsReasonCount', /confidence/i.test(hero.fired.out) && /reason/i.test(hero.fired.out), hero.fired.out);
    ok('site.heroRefusesToInventACompletion', hero.shut.hidden === true && hero.shut.state === 'idle', hero.shut);
    ok('site.heroIsLabelledNotAModel', hero.notAModel === true, hero.notAModel);

    /* the contract table on the marketing page must not drift from the code */
    const tbl = await page.evaluate(() => {
      const h = document.querySelector('[data-testid="site-contract"]');
      const C = KK.preview.PREDICTION_CONTRACT;
      return {
        rows: document.querySelectorAll('[data-testid="site-contract"] tbody tr').length,
        contract: h.getAttribute('data-contract'), fields: h.getAttribute('data-fields'),
        validate: h.getAttribute('data-validate'), problems: h.getAttribute('data-problems'),
        status: h.getAttribute('data-status'), endpoint: h.getAttribute('data-endpoint'),
        realFields: C.fields.length, name: C.name,
        live: (document.querySelector('[data-testid="site-contract-live"]') || {}).textContent || ''
      };
    });
    collected.site_contract = tbl;
    ok('site.contractTableRendersFromTheLiveContract', tbl.contract === tbl.name && Number(tbl.fields) === tbl.realFields, tbl);
    ok('site.contractTableStatesNotConnected', tbl.status === 'NOT_CONNECTED' && tbl.endpoint === 'null', tbl);
    ok('site.contractTableReportsAZeroProblemValidation', tbl.validate === 'true' && tbl.problems === '0' && /ok/i.test(tbl.live), tbl);

    /* switching language reflows the document: ScrollTrigger has to cope */
    const lang = await page.evaluate(async () => {
      KK.site.scrollTo(0);
      await new Promise(r => setTimeout(r, 200));
      const before = { refresh: KK.site.state().refreshCount, h1: document.querySelector('[data-testid="site-h1"]').textContent.trim().slice(0, 40) };
      document.querySelector('[data-testid="lang-btn"]').click();
      await new Promise(r => setTimeout(r, 300));
      KK.site.scrollToBottom();
      await new Promise(r => setTimeout(r, 500));
      const after = KK.site.state();
      return {
        before,
        h1: document.querySelector('[data-testid="site-h1"]').textContent.trim().slice(0, 40),
        refresh: after.refreshCount, revealed: after.revealDone, total: after.revealTotal,
        scrollY: after.scrollY, docHeight: after.docHeight
      };
    });
    collected.site_lang = lang;
    ok('site.languageSwitchRewritesTheHeadline', lang.before.h1 !== lang.h1 && lang.h1.length > 5, lang);
    ok('site.languageSwitchRecomputesTheScrollGeometry', lang.refresh > lang.before.refresh, lang);
    ok('site.everySectionStillRevealsInTheOtherLanguage', lang.revealed === lang.total, lang);
    await ctx.close();

    /* reduced motion: no ScrollTrigger at all, and the document is complete */
    const rmCtx = await context({ viewport: { width: 1280, height: 900 }, locale: 'en-US', reducedMotion: 'reduce' });
    const rmPage = await rmCtx.newPage();
    instrument(rmPage);
    await boot(rmPage, BASE + '/preview/site/?lang=en-US');
    const rm = await rmPage.evaluate(() => ({
      st: KK.site.state(),
      revealed: document.querySelectorAll('.reveal[data-revealed="true"]').length,
      total: document.querySelectorAll('.reveal').length,
      dataSt: document.body.getAttribute('data-st'),
      stepsActive: document.querySelectorAll('#st-steps .st-step[data-active="true"]').length,
      steps: document.querySelectorAll('#st-steps .st-step').length,
      heroReadable: getComputedStyle(document.querySelector('.st-hero h1')).opacity
    }));
    collected.site_rm = rm;
    ok('site.RM.createsNoScrollTriggerAtAll', rm.st.triggers === 0 && rm.st.enabled === false, { triggers: rm.st.triggers, enabled: rm.st.enabled });
    ok('site.RM.saysWhyItDidNot', !!rm.st.reason && /reduced-motion/i.test(rm.st.reason), rm.st.reason);
    ok('site.RM.theHiddenStateNeverApplies', rm.dataSt === 'off', rm.dataSt);
    ok('site.RM.everySectionIsVisibleWithoutScrolling', rm.revealed === rm.total && rm.total >= 15, { r: rm.revealed, t: rm.total });
    ok('site.RM.noContentIsFadedOut', rm.heroReadable === '1', rm.heroReadable);
    ok('site.RM.allStepsAreStatedRatherThanScrubbed', rm.stepsActive === rm.steps, { a: rm.stepsActive, t: rm.steps });
    const rmBag = pageErrors.get(rmPage);
    ok('site.RM.noConsoleErrors', rmBag.errors.length === 0, rmBag.errors.slice(0, 3));
    await rmCtx.close();

    /* and the page must be a document, not a blank screen, with JS off */
    const ctxNoJs = await context({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
    const noJs = await ctxNoJs.newPage();
    await noJs.goto(BASE + '/preview/site/', { waitUntil: 'load' });
    const nj = await noJs.evaluate(() => ({
      h1: (document.querySelector('h1') || {}).textContent ? document.querySelector('h1').textContent.trim().slice(0, 30) : null,
      text: document.body.innerText.trim().length,
      links: document.querySelectorAll('a[href]').length
    }));
    collected.site_nojs = nj;
    ok('site.noJs.showsRealTextNotABlankScreen', nj.text > 300 && !!nj.h1, nj);
    ok('site.noJs.stillLinksToEverySurface', nj.links >= 3, nj.links);
    await ctxNoJs.close();
  }

  /* ============================================== reduced motion ======= */
  if (needs('rm')) {
    const ctx = await context({ viewport: { width: 1280, height: 900 }, locale: 'en-US', reducedMotion: 'reduce' });
    const nPage = await ctx.newPage();
    instrument(nPage);
    await boot(nPage, BASE + '/preview/intent/compile/?lang=en-US');
    await nPage.waitForTimeout(400);
    const rmN = await nPage.evaluate(() => ({ field: KK.field.stats(), drift: document.body.getAttribute('data-field-drift') }));
    ok('RM.fieldDrawsOneFrameThenStops', rmN.field.backend !== 'webgl' || rmN.field.frames <= 3, rmN.field.frames);
    ok('RM.fieldDriftIsOff', rmN.field.backend !== 'webgl' || rmN.drift === 'off', rmN.drift);

    const sPage = await ctx.newPage();
    instrument(sPage);
    await boot(sPage, BASE + '/preview/intent/anticipate/?lang=en-US');
    await sPage.evaluate(() => { location.hash = '#/orbits'; });
    await sPage.waitForTimeout(250);
    const rmS = await sPage.evaluate(() => ({
      mode: KK.anticipate.state().mode,
      running: KK.anticipate.state().running,
      notice: !!document.querySelector('[data-testid="s-auto-list"]')
    }));
    ok('RM.orbitBoardOpensInListMode', rmS.mode === 'list' && rmS.running === false, rmS);
    ok('RM.listModeIsExplainedOnScreen', rmS.notice === true, rmS.notice);
    await ctx.close();
  }

  /* ================================================== css fallback ===== */
  if (needs('fb')) {
    const ctx = await context({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await ctx.newPage();
    instrument(page);
    await boot(page, BASE + '/preview/intent/compile/?lang=en-US&field=css');
    const fb = await page.evaluate(async () => {
      const i = document.querySelector('[data-testid="n-input"]');
      i.value = '帮我搭一套 CBT 练习，早点拦住情绪下滑。';
      i.dispatchEvent(new Event('input'));
      const p = KK.compile.run();
      location.hash = '#/pipeline';
      await new Promise(r => setTimeout(r, 150));
      return {
        backend: document.body.getAttribute('data-field-backend'),
        reason: document.body.getAttribute('data-field-reason'),
        degrade: !!document.querySelector('[data-testid="n-degrade"]'),
        rail: document.querySelectorAll('[data-testid="n-rail"] [data-node]').length,
        threeD: !!document.querySelector('[data-testid="n-3d-note"]'),
        compiled: !!p,
        meshes: KK.compile.state().meshes
      };
    });
    ok('FB.fallsBackWithAStatedReason', fb.backend === 'css-fallback' && fb.reason === 'forced-by-query', fb);
    ok('FB.saysSoOnScreen', fb.degrade === true, fb);
    ok('FB.buildsNoMeshesWithoutWebgl', fb.meshes === 0, fb.meshes);
    ok('FB.everyFunctionStillWorks', fb.compiled === true && fb.rail === 5, fb);
    const bag = pageErrors.get(page);
    ok('FB.noConsoleErrorsInFallback', bag.errors.length === 0, bag.errors.slice(0, 3));
    await ctx.close();
  }

  /* ============================================== twelve widths, no overflow */
  if (needs('widths')) {
    /* Three tiers, named, because "test the three ends" is a requirement and a
       flat list of numbers cannot express it. Phone keeps 320 (the narrowest
       phone still in the wild), tablet spans the portrait/landscape flip at
       768/834/1024, desktop takes the two builds this was actually designed
       against plus the 1600 edge. */
    const TIERS = [
      { id: 'phone', widths: [320, 360, 390, 430] },
      { id: 'tablet', widths: [600, 768, 834, 1024] },
      { id: 'desktop', widths: [1280, 1440, 1600] }
    ];
    const WIDTHS = TIERS.reduce((a, t) => a.concat(t.widths), []);
    const tierOf = (w) => (TIERS.find(t => t.widths.indexOf(w) >= 0) || {}).id;
    const ctx = await context({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await ctx.newPage();
    instrument(page);
    const sweep = {};
    const CAPS = [
      { id: 'n', url: '/preview/intent/compile/?lang=en-US' },
      { id: 's', url: '/preview/intent/anticipate/?lang=en-US' },
      { id: 'site', url: '/preview/site/?lang=en-US' },
      /* The hub was missing from this sweep, and that is precisely why its top
         bar was allowed to overflow: body overflow-clip removed the only
         document-level evidence, and no other check looked. Measured on a
         390px phone before the fix: the row was 488px wide, the layout
         viewport expanded to 489px, and Sound / Language sat past the right
         edge where nothing could reach them. */
      { id: 'hub', url: '/index.html?lang=en-US' }
    ];
    for (const cap of CAPS) {
      await boot(page, BASE + cap.url);
      /* Open the boundary panel first: a closed <details> hides its content
         from scrollable overflow, so sweeping it closed would prove nothing. */
      await page.evaluate(() => { const b = document.querySelector('[data-testid="boundary"]'); if (b) b.open = true; });
      sweep[cap.id] = {};
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.waitForTimeout(90);
        /* On a scrolling document the pin and the reveals change the layout,
           so sweep with everything already revealed. On the fixed shells this
           is a no-op by construction. */
        await page.evaluate(async () => {
          if (window.KK && KK.site && KK.site.scrollToBottom) {
            KK.site.scrollToBottom();
            await new Promise(r => setTimeout(r, 160));
          }
        });
        const r = await page.evaluate(() => {
          const de = document.documentElement;
          const bad = [];
          document.querySelectorAll('body *').forEach(el => {
            const b = el.getBoundingClientRect();
            if (b.width === 0) return;
            if (b.right > window.innerWidth + 1 || b.left < -1) bad.push(el.tagName + '.' + String(el.className).slice(0, 22));
          });
          /* The type floor has to be measured with the panel OPEN. A closed
             <details> hides its content at height 0, and the generic gate runs
             before anything opens it — which is how the capability table sat
             at 11.04px without a single check noticing. */
          const tiny = [];
          document.querySelectorAll('body *').forEach(el => {
            if (el.children.length || !el.textContent.trim()) return;
            const b = el.getBoundingClientRect();
            if (b.height === 0) return;
            const fs = parseFloat(getComputedStyle(el).fontSize);
            if (fs && fs < 11.9) tiny.push(el.tagName + '.' + String(el.className).slice(0, 20) + '@' + fs);
          });
          /* Who actually receives a tap at the centre of each control? */
          const covered = [];
          document.querySelectorAll('button, a[href], select, summary, input, textarea').forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return;
            const b = el.getBoundingClientRect();
            if (b.width <= 0 || b.height <= 0) return;
            if (b.top < 0 || b.bottom > window.innerHeight) return;
            const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
            if (!hit || el === hit || el.contains(hit) || hit.contains(el)) return;
            covered.push((el.getAttribute('data-testid') || el.tagName + '.' + String(el.className).slice(0, 18)) +
              ' under ' + (hit.getAttribute('data-testid') || hit.tagName + '.' + String(hit.className).slice(0, 18)));
          });
          return { overflow: de.scrollWidth - window.innerWidth, offenders: bad.slice(0, 4), tiny: tiny.slice(0, 6), covered: covered.slice(0, 6) };
        });
        sweep[cap.id][w] = r;
      }
    }
    collected.widths = sweep;
    for (const id of ['n', 's', 'site', 'hub']) {
      const bad = WIDTHS.filter(w => sweep[id][w].overflow > 1);
      ok('widths.' + id + 'NoOverflowAcrossTwelveWidths', bad.length === 0,
        { bad: bad.map(w => [tierOf(w), w, sweep[id][w].overflow, sweep[id][w].offenders]) });
      const stray = WIDTHS.filter(w => sweep[id][w].offenders.length > 0);
      ok('widths.' + id + 'NoElementLeavesTheViewport', stray.length === 0, stray.map(w => [tierOf(w), w]));
      const tiny = WIDTHS.filter(w => sweep[id][w].tiny.length > 0);
      ok('widths.' + id + 'NoTypeBelow12pxWithThePanelOpen', tiny.length === 0,
        tiny.map(w => [w, sweep[id][w].tiny]));
      /* "inside the viewport" is not the same as "reachable": a control can be
         correctly sized and still have something painted over it. Hit-test the
         centre of every visible control and ask who is actually there. */
      const covered = WIDTHS.filter(w => sweep[id][w].covered.length > 0);
      ok('widths.' + id + 'NoControlIsCoveredByAnotherElement', covered.length === 0,
        covered.map(w => [tierOf(w), w, sweep[id][w].covered]));
      /* Per-tier roll-up as evidence, not as extra assertions: the four checks
         above already fail loudly with the offending width, and their detail
         now carries the tier. This line exists so a reader can see at a glance
         that all three ends were exercised rather than just the aggregate. */
      note('widths.' + id + 'CoveredByTier', TIERS.map(t => ({
        tier: t.id,
        widths: t.widths,
        clean: t.widths.every(w => sweep[id][w].overflow <= 1 && sweep[id][w].offenders.length === 0 &&
          sweep[id][w].covered.length === 0 && sweep[id][w].tiny.length === 0)
      })));
    }
    await ctx.close();
  }

  /* ================================== the app bar, by the actual standards == */
  /*
     "Follow the industry standard" only means something if the standard is
     named, so the bar is pinned to the documents that define it and to the
     property each one actually requires:

       - Material 3 top app bar: one row; trailing utility actions are icon
         buttons; the title takes whatever space is left and truncates.
       - Apple HIG: bar buttons are at least 44x44 pt.
       - WCAG 2.5.5 (AAA, 44x44) and 2.5.8 (AA, 24x24): minimum target size.

     Why this section exists. On a 390 px phone the bar used to be 121 px tall:
     the wordmark plus three text buttons needed ~370 px inside a 362 px row,
     so the language button fell to a second line. Nothing caught it, because
     the row was allowed to wrap and the layout viewport therefore stayed
     correct — the failure was cosmetic, and cosmetic failures need their own
     assertion. At 320 px the three text actions alone needed 292 px of the
     292 px available. The standard fix is icon actions plus a truncating
     title; it now fits with ~48 px to spare at 320.

     Two measurement traps are avoided deliberately:
       * rows are counted by interval overlap, never by distinct `top` values.
         The title is vertically centred, so distinct tops report several rows
         on a bar that has one — the first version of the probe in this round
         made exactly that mistake.
       * the long-title case is exercised for real, by pushing a ~380 character
         wordmark into the bar. That is the bug class this replaced: a title
         that wins the tug-of-war pushes controls off the edge, and with
         overflow-x: clip the document never reports the overflow, it just
         renders the whole page zoomed out. This case caught a second, subtler
         version of the same bug — with `flex-wrap: wrap` a content-sized title
         claims a whole line during line-breaking, before shrinking, so it must
         be given a zero flex basis to stay on the actions' line.
  */
  if (needs('appbar')) {
    /* Reads must run in the page, so the reader is a plain function handed to
       evaluate — not a closure over anything outside it. */
    const READ = () => {
      const bar = document.querySelector('.hub-top');
      if (!bar) return { missing: true };
      const kids = Array.from(bar.children)
        .map(el => el.getBoundingClientRect())
        .filter(r => r.width > 0 && r.height > 0)
        .sort((a, b) => a.top - b.top);
      let rows = 0, bottom = -Infinity;
      for (const r of kids) {
        if (r.top >= bottom - 0.5) { rows++; bottom = r.bottom; }
        else bottom = Math.max(bottom, r.bottom);
      }
      const brand = bar.querySelector('.hub-top__brand');
      const bcs = getComputedStyle(brand);
      const br = brand.getBoundingClientRect();
      const barBox = bar.getBoundingClientRect();
      const actions = Array.from(bar.querySelectorAll('a[href], button'))
        .filter(el => getComputedStyle(el).display !== 'none');
      return {
        innerW: innerWidth,
        rows,
        barH: Math.round(barBox.height),
        barRight: Math.round(barBox.right),
        brand: {
          w: Math.round(br.width),
          right: Math.round(br.right),
          nowrap: bcs.whiteSpace,
          ellipsis: bcs.textOverflow,
          clipped: bcs.overflowX,
          truncated: brand.scrollWidth > Math.ceil(br.width) + 1
        },
        actions: actions.map(el => {
          const r = el.getBoundingClientRect();
          return {
            id: el.getAttribute('data-testid') || el.tagName,
            w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right),
            /* A fixed 44px box hides its own overflow: the glyph and label can
               spill past the edge while the box still measures 44. Compare
               scrollWidth to the box so "it fits" is actually checked. */
            overflow: Math.max(0, el.scrollWidth - Math.ceil(r.width)),
            paintedIcons: Array.from(el.querySelectorAll('svg'))
              .filter(s => getComputedStyle(s).display !== 'none').length,
            name: ((el.getAttribute('aria-label') || '').trim()) || (el.textContent || '').trim()
          };
        })
      };
    };

    const TIERS = [
      { id: 'phone', w: 390, h: 844, mobile: true, dsf: 3 },
      { id: 'tablet', w: 834, h: 1112, mobile: true, dsf: 2 },
      { id: 'desktop', w: 1440, h: 900, mobile: false, dsf: 1 }
    ];
    const seen = {};
    for (const t of TIERS) {
      const ctx = await context({
        viewport: { width: t.w, height: t.h },
        isMobile: t.mobile, hasTouch: t.mobile, deviceScaleFactor: t.dsf, locale: 'en-US'
      });
      const page = await ctx.newPage();
      instrument(page);
      await boot(page, BASE + '/index.html?lang=en-US');
      seen[t.id] = await page.evaluate(READ);
      await ctx.close();
    }

    /* the narrowest phones, where the one row had the least to spare */
    const tight = {};
    {
      const ctx = await context({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, locale: 'zh-CN' });
      const page = await ctx.newPage();
      instrument(page);
      await boot(page, BASE + '/index.html?lang=zh-CN');
      for (const w of [320, 360, 390]) {
        await page.setViewportSize({ width: w, height: 640 });
        await page.waitForTimeout(90);
        tight[w] = await page.evaluate(READ);
      }
      await ctx.close();
    }

    /* The title must yield, not the controls. A ~380 character wordmark is the
       adversarial case; if it wins, controls leave the viewport and, because
       body overflow-x is clip, `scrollWidth - innerWidth` stays 0 while the
       layout viewport silently expands — the 489 px regression. */
    let longTitle = null;
    {
      const ctx = await context({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, locale: 'en-US' });
      const page = await ctx.newPage();
      instrument(page);
      await boot(page, BASE + '/index.html?lang=en-US');
      await page.evaluate(() => {
        const b = document.querySelector('.hub-top__brand');
        b.textContent = 'KKmatch Intent OS preview '.repeat(14);
      });
      await page.waitForTimeout(90);
      longTitle = await page.evaluate(READ);
      await ctx.close();
    }

    /* The sound action is a stateful toggle whose label is now rewritten in
       place. It used to be rewritten with `button.textContent = …`, which
       erases every child — so the icon would vanish on the first state change
       and never come back. That is the regression this pair guards. */
    let toggle = null;
    {
      const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, locale: 'en-US' });
      const page = await ctx.newPage();
      instrument(page);
      await boot(page, BASE + '/index.html?lang=en-US');
      toggle = await page.evaluate(async () => {
        const b = document.querySelector('[data-testid="sound-btn"]');
        const snap = () => ({
          icons: b.querySelectorAll('svg').length,
          painted: Array.from(b.querySelectorAll('svg')).filter(s => getComputedStyle(s).display !== 'none').length,
          pressed: b.getAttribute('aria-pressed'),
          state: b.getAttribute('data-sound'),
          enabled: KK.sound.state().enabled
        });
        const before = snap();
        b.click();
        await new Promise(r => setTimeout(r, 200));
        const after = snap();
        b.click();
        await new Promise(r => setTimeout(r, 200));
        return { before, after, back: snap() };
      });
      await ctx.close();
    }

    collected.appbar = { tiers: seen, narrow: tight, longTitle, toggle };

    for (const t of TIERS) {
      const r = seen[t.id];
      ok('appbar.' + t.id + 'StaysOnOneRow', r && r.rows === 1, r && { rows: r.rows, barH: r.barH, innerW: r.innerW });
      ok('appbar.' + t.id + 'EveryActionClears44px',
        r && r.actions.length === 3 && r.actions.every(a => a.w >= 43.25 && a.h >= 43.25),
        r && r.actions.map(a => [a.id, a.w + 'x' + a.h]));
      ok('appbar.' + t.id + 'EveryActionHasAnAccessibleName',
        r && r.actions.every(a => a.name && a.name.length > 0),
        r && r.actions.map(a => [a.id, a.name]));
      ok('appbar.' + t.id + 'ActionsStayInsideTheViewport',
        r && r.actions.every(a => a.right <= r.innerW + 1),
        r && r.actions.map(a => [a.id, a.right, r.innerW]));
      ok('appbar.' + t.id + 'ActionContentFitsInsideItsTarget',
        r && r.actions.every(a => a.overflow === 0),
        r && r.actions.map(a => [a.id, a.w, 'overflow=' + a.overflow]));
    }

    ok('appbar.phoneShowsAnIconNotJustALabel',
      seen.phone && seen.phone.actions.every(a => a.paintedIcons >= 1),
      seen.phone && seen.phone.actions.map(a => [a.id, a.paintedIcons]));

    ok('appbar.titleIsBuiltToTruncateRatherThanPush',
      seen.phone && seen.phone.brand.nowrap === 'nowrap' &&
      seen.phone.brand.ellipsis === 'ellipsis' && seen.phone.brand.clipped === 'hidden',
      seen.phone && seen.phone.brand);

    const narrowBad = [320, 360, 390].filter(w => tight[w].rows !== 1);
    ok('appbar.narrowestPhonesStillHoldOneRow', narrowBad.length === 0,
      narrowBad.map(w => [w, tight[w].rows, tight[w].barH]));

    ok('appbar.survivesAnAbsurdlyLongTitle',
      longTitle && longTitle.rows === 1 && longTitle.innerW === 320 &&
      longTitle.brand.truncated === true &&
      longTitle.actions.every(a => a.right <= longTitle.innerW + 1),
      longTitle && { rows: longTitle.rows, innerW: longTitle.innerW, brandW: longTitle.brand.w,
        truncated: longTitle.brand.truncated, actionRights: longTitle.actions.map(a => a.right) });

    ok('appbar.soundIconSurvivesItsOwnStateUpdate',
      toggle && toggle.before.icons === toggle.after.icons && toggle.before.icons === toggle.back.icons &&
      toggle.after.painted === 1 && toggle.back.painted === 1,
      toggle);

    ok('appbar.soundToggleTellsAssistiveTechTheTruth',
      toggle && toggle.before.pressed === 'false' && toggle.after.pressed === 'true' &&
      toggle.before.enabled === false && toggle.after.enabled === true &&
      toggle.after.state === 'on' && toggle.back.state === 'off',
      toggle);
  }

  /* ============================================ touch / the app contract == */
  /*
     "On a phone this has to behave like a real app, not like a web page."
     That is a measurable claim, so it is measured rather than asserted in prose.
     Across the three ends — phone, tablet, desktop — on all four surfaces:

       - the layout viewport equals the device width. A row wider than the
         screen makes Chrome widen the viewport and render the whole document
         zoomed out — measured 489px on a 390px device before this check, which
         is a whole-page defect that no element-level check can see.
       - nothing is painted over a control.
       - tap feedback is not the browser's blue flash, and a tap is not held
         for the 300ms double-tap-to-zoom wait. (Touch tiers only: a desktop
         has no touch pointer, so these are recorded as INFO there instead of
         passing vacuously.)
       - the bar and the sticky nav do not overlap, and the first in-flow
         content block does not hide behind the bar: both read from live boxes,
         never assumed from a token.
       - an open sheet owns the viewport, and hands the scroll offset back.
       - it is dismissable by dragging, and only when dragged far enough.
       - the concept HUD bar carries one row by hiding Sound and Language, so
         the sheet must still carry both, at >=44px, and they must actually
         work from there. (The hub bar is a separate case: it keeps all three
         actions and is covered by the `appbar` section.)
       - the only real in-page anchor does not park its target behind the bar.
  */
  if (needs('touch')) {
    /* Three tiers, named. "The three ends" is a requirement, and a single flat
       list of phone sizes cannot express it — a tablet is not a small desktop
       and a desktop is not a large tablet, so each tier gets its own context
       flags and, where the claim only holds for a touch device, its own
       assertion set. A desktop has no touch, so the two pointer claims
       (blue-flash feedback, the 300 ms zoom wait) are recorded as INFO there
       rather than silently passing. */
    const TIERS = [
      { id: 'phone', touch: true, dsf: 3, devices: [{ w: 320, h: 568 }, { w: 390, h: 844 }, { w: 430, h: 932 }] },
      { id: 'tablet', touch: true, dsf: 2, devices: [{ w: 768, h: 1024 }, { w: 834, h: 1112 }, { w: 1024, h: 768 }] },
      { id: 'desktop', touch: false, dsf: 1, devices: [{ w: 1280, h: 800 }, { w: 1440, h: 900 }] }
    ];
    const SURFACES = [
      { id: 'hub', url: '/index.html?lang=en-US' },
      { id: 's', url: '/preview/intent/anticipate/?lang=en-US' },
      { id: 'n', url: '/preview/intent/compile/?lang=en-US' },
      { id: 'site', url: '/preview/site/?lang=en-US' }
    ];

    const MEASURE = (expectedW) => {
      const de = document.documentElement;
      const covered = [];
      document.querySelectorAll('button, a[href], select, summary, input, textarea').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        const b = el.getBoundingClientRect();
        if (b.width <= 0 || b.height <= 0) return;
        if (b.top < 0 || b.bottom > window.innerHeight) return;
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        if (!hit || el === hit || el.contains(hit) || hit.contains(el)) return;
        covered.push((el.getAttribute('data-testid') || el.tagName + '.' + String(el.className).slice(0, 18)) +
          ' under ' + (hit.getAttribute('data-testid') || hit.tagName + '.' + String(hit.className).slice(0, 18)));
      });
      const cs = getComputedStyle(de);
      const hud = document.querySelector('[data-testid="hud"]');
      const nav = document.querySelector('.viewnav');
      const bar = document.querySelector('.hub-top, [data-testid="hud"], .st-rail');
      /* the first block of real content: the hub's #main, or the site's first
         section. The OS shells have neither — their first in-flow block is the
         sticky nav, which navTop already covers. */
      const main = document.querySelector('#main:not(.st-main), .st-main > *');
      return {
        expectedW,
        meta: (document.querySelector('meta[name="viewport"]') || {}).content || '',
        innerW: window.innerWidth,
        clientW: de.clientWidth,
        touchAction: cs.touchAction,
        tapHighlight: getComputedStyle(document.body).webkitTapHighlightColor,
        docSW: de.scrollWidth,
        covered,
        hudEnd: de.style.getPropertyValue('--hud-end') || cs.getPropertyValue('--hud-end').trim(),
        barBottom: bar ? Math.round(bar.getBoundingClientRect().bottom) : null,
        navTop: nav ? Math.round(nav.getBoundingClientRect().top) : null,
        contentTop: main ? Math.round(main.getBoundingClientRect().top) : null
      };
    };

    /* synthetic touch drag on the sheet: distance and speed are what decide */
    const DRAG = (dy, ms) => {
      const steps = 6, stepMs = Math.round(ms / steps);
      return `(async () => {
        const sheet = document.querySelector('[data-testid="hud-sheet"]');
        const mk = (type, y, el) => {
          const t = new Touch({ identifier: 1, target: el, clientX: 195, clientY: y, pageX: 195, pageY: y });
          return new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], targetTouches: type === 'touchend' ? [] : [t],
            changedTouches: [t], bubbles: true, cancelable: true });
        };
        const head = sheet.querySelector('.sheet__head') || sheet;
        const y0 = sheet.getBoundingClientRect().top + 20;
        sheet.dispatchEvent(mk('touchstart', y0, head));
        for (let i = 1; i <= ${steps}; i++) {
          sheet.dispatchEvent(mk('touchmove', y0 + (${dy} * i) / ${steps}, head));
          await new Promise(r => setTimeout(r, ${stepMs}));
        }
        const during = getComputedStyle(sheet).transform;
        sheet.dispatchEvent(mk('touchend', y0 + ${dy}, head));
        await new Promise(r => setTimeout(r, 520));
        return { during, open: sheet.getAttribute('data-open') };
      })()`;
    };

    const rows = {};
    for (const t of TIERS) {
      for (const d of t.devices) {
        for (const s of SURFACES) {
          const ctx = await context({
            viewport: { width: d.w, height: d.h },
            isMobile: t.touch, hasTouch: t.touch, deviceScaleFactor: t.dsf, locale: 'en-US'
          });
          const page = await ctx.newPage();
          instrument(page);
          await boot(page, BASE + s.url);
          rows[s.id + '@' + d.w] = await page.evaluate(MEASURE, d.w);
          await ctx.close();
        }
      }
    }
    collected.touch = rows;

    for (const s of SURFACES) {
      for (const t of TIERS) {
        const at = t.devices.map(d => rows[s.id + '@' + d.w]);
        const where = (pick) => t.devices.filter((d, i) => pick(at[i])).map(d => d.w);
        /* Every assertion below is named with its tier, so a failure reports
           which of the three ends broke rather than only which width did. */
        const tag = 'touch.' + t.id + '.' + s.id;
        const rec = (w) => rows[s.id + '@' + w];

        /* What the device calls its width is what the layout viewport must
           use. On a touch tier that is innerWidth === clientWidth: no
           scrollbar to subtract and no zoom-out. Desktop has no such claim —
           the honest form there is that innerWidth is still the window's. */
        if (t.touch) {
          const vpBad = where(r => r.innerW !== r.clientW);
          ok(tag + '.LayoutViewportEqualsTheDeviceWidth', vpBad.length === 0,
            { bad: vpBad.map(w => [w, rec(w).innerW, rec(w).clientW]) });
        } else {
          const vpBad = where(r => Math.abs(r.innerW - r.expectedW) > 1);
          ok(tag + '.LayoutViewportIsStillTheWindowWidth', vpBad.length === 0,
            { bad: vpBad.map(w => [w, rec(w).innerW, rec(w).expectedW]) });
        }

        const covBad = where(r => r.covered.length > 0);
        ok(tag + '.NoControlIsCovered', covBad.length === 0, covBad.map(w => [w, rec(w).covered]));

        const swBad = where(r => r.docSW > r.innerW + 1);
        ok(tag + '.ThePageDoesNotScrollSideways', swBad.length === 0,
          swBad.map(w => [w, rec(w).docSW, rec(w).innerW]));

        const coverBad = where(r => r.meta.indexOf('viewport-fit=cover') < 0);
        ok(tag + '.DeclaresViewportFitCover', coverBad.length === 0, coverBad.map(w => [w, rec(w).meta]));

        /* the wrapped-bar defect, restated for every tier: the bar's real
           bottom must be the value the rest of the page positions against, the
           nav must sit below it, and the first in-flow content block must not
           hide behind it. Read from live boxes, never from a token. */
        const ovl = where(r => r.navTop !== null && r.barBottom !== null && r.navTop < r.barBottom - 1);
        const buried = where(r => r.contentTop !== null && r.barBottom !== null && r.contentTop < r.barBottom - 1);
        ok(tag + '.StickyChromeDoesNotOverlapAndDoesNotBuryContent', ovl.length === 0 && buried.length === 0,
          { overlapping: ovl.map(w => [w, rec(w).barBottom, rec(w).navTop]),
            buried: buried.map(w => [w, rec(w).barBottom, rec(w).contentTop]) });

        if (t.touch) {
          const flashBad = where(r => r.tapHighlight !== 'rgba(0, 0, 0, 0)');
          const holdBad = where(r => r.touchAction.indexOf('manipulation') < 0);
          ok(tag + '.TapsDoNotFlashAndAreNotHeldForTheZoomWait',
            flashBad.length === 0 && holdBad.length === 0,
            { flash: flashBad.map(w => [w, rec(w).tapHighlight]), hold: holdBad.map(w => [w, rec(w).touchAction]) });
        } else {
          note(tag + '.PointerClaimsNotApplicable',
            'a desktop has no touch pointer, so tap-highlight and the double-tap zoom wait are not claims that can hold here');
        }

        note(tag + '.Measured', {
          tier: t.id,
          barBottom: at.map(r => r.barBottom), navTop: at.map(r => r.navTop),
          contentTop: at.map(r => r.contentTop), hudEnd: at.map(r => r.hudEnd),
          innerW: at.map(r => r.innerW)
        });
      }
    }

    /* --- the modal behaviour of a sheet, on a real touch context --------- */
    for (const cap of [{ id: 's', url: '/preview/intent/anticipate/?lang=en-US' }, { id: 'n', url: '/preview/intent/compile/?lang=en-US' }]) {
      const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US' });
      const page = await ctx.newPage();
      instrument(page);
      await boot(page, BASE + cap.url);

      const lock = await page.evaluate(async () => {
        window.scrollTo(0, 600);
        await new Promise(r => setTimeout(r, 120));
        const scrolled = window.scrollY;
        document.querySelector('[data-testid="hud-compact"]').click();
        await new Promise(r => setTimeout(r, 420));
        const before = window.scrollY;
        window.scrollBy(0, 400); await new Promise(r => setTimeout(r, 110));
        window.scrollBy(0, 400); await new Promise(r => setTimeout(r, 110));
        const moved = window.scrollY - before;
        const locked = document.documentElement.getAttribute('data-locked');
        const carried = getComputedStyle(document.body).top;
        document.querySelector('[data-testid="hud-sheet-close"]').click();
        await new Promise(r => setTimeout(r, 420));
        return {
          scrolledAwayFirst: scrolled > 0, locked, moved, carried,
          released: document.documentElement.getAttribute('data-locked'),
          restored: Math.abs(window.scrollY - scrolled) < 2,
          closed: document.querySelector('[data-testid="hud-sheet"]').getAttribute('data-open')
        };
      });
      collected['sheet_lock_' + cap.id] = lock;
      ok(cap.id + '.mobileSheetFreezesThePageBehindIt', lock.scrolledAwayFirst && lock.locked === 'true' && lock.moved === 0, lock);
      ok(cap.id + '.mobileSheetGivesTheScrollOffsetBack', lock.released === null && lock.restored === true, lock);

      const reopen = async () => {
        await page.evaluate(() => { document.querySelector('[data-testid="hud-compact"]').click(); });
        await page.waitForTimeout(400);
      };
      await reopen();
      const far = await page.evaluate(DRAG(150, 180));
      collected['sheet_swipe_far_' + cap.id] = far;
      ok(cap.id + '.mobileSheetIsDismissedByDraggingItDown', far.open === 'false' && /matrix/.test(far.during), far);

      await reopen();
      const near = await page.evaluate(DRAG(26, 400));
      collected['sheet_swipe_near_' + cap.id] = near;
      ok(cap.id + '.mobileShortDragDoesNotDismissTheSheet', near.open === 'true' && /matrix/.test(near.during), near);

      /* the two controls that left the phone bar must still be reachable from
         the sheet — hiding them there would be deleting a feature, not
         compacting a layout */
      const moved = await page.evaluate(async () => {
        document.querySelector('[data-testid="hud-compact"]').click();
        await new Promise(r => setTimeout(r, 420));
        const snd = document.querySelector('[data-testid="sound-btn-mobile"]');
        const lng = document.querySelector('[data-testid="lang-btn-mobile"]');
        const bar = document.querySelector('[data-testid="sound-btn"]');
        const box = (e) => { const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; };
        const s0 = KK.sound.state().enabled;
        snd.click(); await new Promise(r => setTimeout(r, 140));
        const s1 = KK.sound.state().enabled;
        const l0 = KK.i18n.lang;
        lng.click(); await new Promise(r => setTimeout(r, 180));
        const l1 = KK.i18n.lang;
        document.querySelector('[data-testid="hud-sheet-close"]').click();
        await new Promise(r => setTimeout(r, 380));
        return { barHidden: getComputedStyle(bar).display === 'none', sound: box(snd), lang: box(lng), s0, s1, l0, l1 };
      });
      collected['sheet_controls_' + cap.id] = moved;
      ok(cap.id + '.mobileBarHoldsOneRowAndTheMovedControlsLiveInTheSheet',
        moved.barHidden === true, moved);
      ok(cap.id + '.mobileSheetSoundAndLanguageStillClear44px',
        moved.sound.h >= 43.25 && moved.lang.h >= 43.25, moved);
      ok(cap.id + '.mobileSheetSoundAndLanguageStillWork',
        moved.s0 !== moved.s1 && moved.l0 !== moved.l1, moved);

      /* the only real in-page anchor: activating it must not park the target
         behind the fixed bar (WCAG 2.4.11) */
      const skip = await page.evaluate(async () => {
        const link = document.querySelector('.skip-link');
        const target = document.querySelector(link.getAttribute('href'));
        window.scrollTo(0, 0);
        await new Promise(r => setTimeout(r, 120));
        link.focus();
        link.click();
        await new Promise(r => setTimeout(r, 260));
        const de = document.documentElement;
        /* what the target actually has to clear is the whole stack of sticky
           chrome — the bar AND the view nav, both of which are stuck by the
           time this fires. Measured from the live boxes, not from the token:
           checking only --hud-end is precisely the mistake that left #stage
           40px inside the nav. */
        const navEl = document.querySelector('.viewnav');
        const hudEnd = parseFloat(de.style.getPropertyValue('--hud-end')) || parseFloat(getComputedStyle(de).getPropertyValue('--hud-end')) || 0;
        const chromeBottom = navEl ? navEl.getBoundingClientRect().bottom : hudEnd;
        const top = target.getBoundingClientRect().top;
        return { href: link.getAttribute('href'), chromeBottom: Math.round(chromeBottom), hudEnd: Math.round(hudEnd), navH: de.style.getPropertyValue('--nav-h'),
          top: Math.round(top), clear: top >= chromeBottom - 2, focused: target === document.activeElement || target.contains(document.activeElement) };
      });
      collected['skip_' + cap.id] = skip;
      ok(cap.id + '.mobileSkipLinkDoesNotLandBehindTheStickyChrome', skip.clear === true && skip.focused === true, skip);
      await ctx.close();
    }

    /* --- the long-scroll page's rail controls, by REAL tap ---------------- */
    {
      const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US' });
      const page = await ctx.newPage();
      instrument(page);
      await boot(page, BASE + '/preview/site/?lang=en-US');
      const before = await page.evaluate(() => ({ lang: KK.i18n.lang, sound: KK.sound.state().enabled }));
      let tapErr = null;
      try { await page.locator('[data-testid="lang-btn"]').tap({ timeout: 4000 }); }
      catch (e) { tapErr = String(e.message).split('\n')[0]; }
      await page.waitForTimeout(200);
      const afterLang = await page.evaluate(() => KK.i18n.lang);
      let soundErr = null;
      try { await page.locator('[data-testid="sound-btn"]').tap({ timeout: 4000 }); }
      catch (e) { soundErr = String(e.message).split('\n')[0]; }
      const afterSound = await page.evaluate(() => KK.sound.state().enabled);
      collected.site_rail_tap = { before, afterLang, afterSound, tapErr, soundErr };
      /* The rail is an overlay with pointer-events:none, so every control in it
         must be re-armed explicitly. Before the fix a real tap on Sound timed
         out after 4s: the button was there, painted, and dead. */
      ok('site.mobileRailLanguageButtonAnswersARealTap', tapErr === null && afterLang !== before.lang, { tapErr, before: before.lang, after: afterLang });
      ok('site.mobileRailSoundButtonAnswersARealTap', soundErr === null && afterSound !== before.sound, { soundErr, before: before.sound, after: afterSound });
      const skip = await page.evaluate(async () => {
        const link = document.querySelector('.skip-link');
        const target = document.querySelector(link.getAttribute('href'));
        window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 120));
        link.focus(); link.click(); await new Promise(r => setTimeout(r, 260));
        const rail = document.querySelector('.st-rail');
        const chromeBottom = rail ? rail.getBoundingClientRect().bottom : 0;
        const top = target.getBoundingClientRect().top;
        return { chromeBottom: Math.round(chromeBottom), top: Math.round(top), clear: top >= chromeBottom - 2 };
      });
      collected.site_skip = skip;
      ok('site.mobileSkipLinkClearsTheRail', skip.clear === true, skip);
      await ctx.close();
    }

    /* --- scroll smoothness: a frame budget is a number, not a feeling ----- */
    /*
       "Smooth like an app" is only worth claiming if it is counted. One rAF is
       one frame; scrolling 10px per frame and timing the gaps is the direct
       measurement of how the page feels under a finger.

       The environment matters and is stated rather than hidden: this runs in
       headless Chromium on the software GL backend (SwiftShader), on a busy
       desktop, so the absolute numbers are a ceiling, not what a phone will
       show. The assertion is therefore about HARD STALLS — a single frame over
       120ms is a visible freeze under any hardware. The distribution is
       reported as INFO so a regression is visible even while it passes.
    */
    const FRAME = (o) => {
      const stepPx = o.stepPx, ms = o.ms;
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
              frames: deltas.length, median: at(0.5), p95: at(0.95),
              worst: sorted.length ? +sorted[sorted.length - 1].toFixed(1) : null,
              dropped: deltas.slice(2).filter(d => d > 32).length
            });
          }
        }
        requestAnimationFrame(tick);
      });
    };
    const frames = {};
    for (const s of [
      { id: 's', url: '/preview/intent/anticipate/?lang=en-US' },
      { id: 'n', url: '/preview/intent/compile/?lang=en-US' },
      { id: 'site', url: '/preview/site/?lang=en-US' }
    ]) {
      const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, locale: 'en-US' });
      const page = await ctx.newPage();
      instrument(page);
      await boot(page, BASE + s.url);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(220);
      frames[s.id] = await page.evaluate(FRAME, { stepPx: 10, ms: 1400 });
      await ctx.close();
    }
    collected.frames = frames;
    for (const id of ['s', 'n', 'site']) {
      const f = frames[id];
      /* Only a FREEZE is asserted. The threshold has to survive a contended
         desktop (measured on this machine: the user's own browser and their
         anti-detect browser were holding 15.4 GB of 16 GB, CPU at 78%), so an
         absolute frame-rate bar would be a measurement of the machine rather
         than of the page. A frame over 250ms is a visible freeze on any
         hardware, and that is the claim. The distribution is reported as INFO
         so a slow regression is visible even while it passes. */
      ok('touch.' + id + 'ScrollingDoesNotFreeze',
        f.frames > 15 && f.worst !== null && f.worst <= 250,
        f);
      note('touch.' + id + 'FrameBudget', f);
    }

    /* --- the hub has no sheet: say so instead of silently skipping -------- */
    const hubSheet = await (async () => {
      const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US' });
      const page = await ctx.newPage();
      instrument(page);
      await boot(page, BASE + '/index.html?lang=en-US');
      const r = await page.evaluate(() => {
        const top = document.querySelector('.hub-top');
        const kids = [...top.querySelectorAll('button, a[href]')].map(el => {
          const b = el.getBoundingClientRect();
          return { testid: el.getAttribute('data-testid'), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right), inView: b.right <= window.innerWidth + 1 && b.left >= -1 };
        });
        return { barH: Math.round(top.getBoundingClientRect().height), kids, hasSheet: !!document.querySelector('[data-testid="hud-sheet"]') };
      });
      await ctx.close();
      return r;
    })();
    collected.hub_touchbar = hubSheet;
    /* The hub bar is sticky and in flow, so a wrap costs height instead of
       overlap — but every control must still be inside the screen. */
    ok('hub.mobileTopBarKeepsEveryControlOnScreen',
      hubSheet.kids.length >= 2 && hubSheet.kids.every(k => k.inView && k.h >= 43.25), hubSheet.kids);
    note('hub.mobileTopBarMeasured', { height: hubSheet.barH, controls: hubSheet.kids.length, sheet: hubSheet.hasSheet });
  }

  /* ================================================ mobile / touch target */
  if (needs('mob')) {
    for (const cap of [{ id: 'n', path: 'compile', input: 'n-input' }, { id: 's', path: 'anticipate', input: 's-input' }]) {
      const ctx = await context({
        viewport: { width: 390, height: 844 }, locale: 'en-US', isMobile: true, hasTouch: true, deviceScaleFactor: 2
      });
      const page = await ctx.newPage();
      instrument(page);
      await boot(page, BASE + '/preview/intent/' + cap.path + '/?lang=en-US');
      const g = await genericGates(page, cap.id + '.mobile', cap.id === 'n' ? 'compile' : 'anticipate', 1);
      const sheet = await page.evaluate(async () => {
        const b = document.querySelector('[data-testid="hud-compact"]');
        const r = b.getBoundingClientRect();
        const visible = r.width > 0 && r.height > 0;
        b.click();
        await new Promise(r2 => setTimeout(r2, 180));
        const s = document.querySelector('[data-testid="hud-sheet"]');
        const scn = document.querySelector('[data-testid="scn-select-mobile"]');
        const opts = scn ? scn.options.length : 0;
        const open = s.getAttribute('data-open');
        document.querySelector('[data-testid="hud-sheet-close"]').click();
        await new Promise(r3 => setTimeout(r3, 180));
        return { visible, h: Math.round(r.height * 100) / 100, open, opts, closed: s.getAttribute('data-open'), scnH: scn ? Math.round(scn.getBoundingClientRect().height * 100) / 100 : 0 };
      });
      ok(cap.id + '.mobileCompactConsoleButtonIsUsable', sheet.visible === true && sheet.h >= 43.25, sheet);
      ok(cap.id + '.mobileConsoleSheetOpens', sheet.open === 'true' && sheet.opts === 3, sheet);
      ok(cap.id + '.mobileConsoleSheetCloses', sheet.closed === 'false', sheet);
      ok(cap.id + '.mobileScenarioSelectClears44px', sheet.scnH >= 43.25, sheet.scnH);
      /* one real interaction on the small screen */
      const act = await page.evaluate(async (inputId) => {
        const i = document.querySelector('[data-testid="' + inputId + '"]');
        i.value = inputId === 'n-input' ? '帮我搭一套 CBT 练习，早点拦住情绪下滑。' : '帮我';
        i.dispatchEvent(new Event('input'));
        await new Promise(r => setTimeout(r, 60));
        if (inputId === 'n-input') {
          const p = window.KK.compile.run();
          location.hash = '#/pipeline';
          await new Promise(r => setTimeout(r, 180));
          return { compiled: !!p, rail: document.querySelectorAll('[data-testid="n-rail"] [data-node]').length };
        }
        const g2 = document.querySelector('[data-testid="s-ghost"]');
        return { tail: g2.querySelector('.tail').textContent.length, fired: g2.getAttribute('data-fired') };
      }, cap.input);
      ok(cap.id + '.mobileJourneyWorks', cap.id === 'n' ? (act.compiled === true && act.rail === 5) : (act.fired === 'true' && act.tail > 10), act);
      note(cap.id + '.mobileMeasured', { h1: g.h1 && g.h1.slice(0, 30), overflow: g.overflow });
      await ctx.close();
    }

    /* the long-scroll surface on a phone: the scroll still has to be the
       interface, and the rail controls still have to be reachable. */
    const sctx = await context({
      viewport: { width: 390, height: 844 }, locale: 'en-US', isMobile: true, hasTouch: true, deviceScaleFactor: 2
    });
    const spage = await sctx.newPage();
    instrument(spage);
    await boot(spage, BASE + '/preview/site/?lang=en-US');
    const sg = await siteGates(spage, 'site.mobile');
    collected.site_mobile = sg;
    const sm = await spage.evaluate(async () => {
      const btn = document.querySelector('[data-testid="sound-btn"]');
      const r = btn.getBoundingClientRect();
      const st0 = KK.site.state();
      KK.site.scrollToBottom();
      await new Promise(res => setTimeout(res, 600));
      const st1 = KK.site.state();
      return {
        railH: Math.round(r.height * 100) / 100,
        railVisible: r.width > 0 && r.height > 0,
        from: st0.revealDone, to: st1.revealDone, total: st1.revealTotal,
        step: st1.activeStep, steps: st1.steps,
        doc: st1.docHeight
      };
    });
    collected.site_mobile_scroll = sm;
    ok('site.mobileRailControlsClear44px', sm.railVisible === true && sm.railH >= 43.25, sm.railH);
    ok('site.mobileScrollDrivesTheSameReveals', sm.to === sm.total && sm.to > sm.from, sm);
    ok('site.mobilePinnedSequenceStillScrubs', sm.step === sm.steps - 1, sm);
    await sctx.close();
  }

  /* ================================================== 200% text zoom ===== */
  if (needs('zoom')) {
    for (const cap of [{ id: 'n', path: 'compile' }, { id: 's', path: 'anticipate' }]) {
      /* 200% zoom is a 1280px screen showing 640 CSS px. */
      const ctx = await context({ viewport: { width: 640, height: 460 }, locale: 'en-US', deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      instrument(page);
      await boot(page, BASE + '/preview/intent/' + cap.path + '/?lang=en-US');
      await page.evaluate(() => { document.querySelector('[data-testid="boundary"]').open = true; });
      await page.waitForTimeout(150);
      const z = await page.evaluate(() => {
        const clipped = [];
        document.querySelectorAll('body *').forEach(el => {
          if (el.children.length || !el.textContent.trim()) return;
          const cs = getComputedStyle(el);
          if (cs.overflow === 'hidden' && el.scrollWidth > el.clientWidth + 1) {
            clipped.push(el.tagName + '.' + String(el.className).slice(0, 22));
          }
        });
        const hud = document.querySelector('[data-testid="hud"]').getBoundingClientRect();
        const stage = document.querySelector('[data-testid="stage"]').getBoundingClientRect();
        const ctrls = Array.from(document.querySelectorAll('[data-testid="hud"] button, [data-testid="hud"] select'))
          .filter(e => e.getBoundingClientRect().height > 0);
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          clipped: clipped,
          hudHeight: Math.round(hud.height),
          hudBottom: Math.round(hud.bottom),
          stageTop: Math.round(stage.top),
          controls: ctrls.map(e => Math.round(e.getBoundingClientRect().height * 100) / 100),
          tiny: Array.from(document.querySelectorAll('body *')).filter(el => {
            if (el.children.length || !el.textContent.trim()) return false;
            const r = el.getBoundingClientRect();
            return r.height > 0 && parseFloat(getComputedStyle(el).fontSize) < 11.9;
          }).length
        };
      });
      collected['zoom_' + cap.id] = z;
      ok('zoom.' + cap.id + 'NoHorizontalOverflow', z.overflow <= 1, z.overflow);
      ok('zoom.' + cap.id + 'NoTextIsClipped', z.clipped.length === 0, z.clipped);
      ok('zoom.' + cap.id + 'HudDoesNotCoverTheStage', z.stageTop >= z.hudBottom - 1, { stage: z.stageTop, hudBottom: z.hudBottom });
      ok('zoom.' + cap.id + 'ControlsStillClear44px', z.controls.every(h => h >= 44 - 0.75), z.controls);
      ok('zoom.' + cap.id + 'NoTypeShrinksBelow12px', z.tiny === 0, z.tiny);
      await ctx.close();
    }

    /* the long-scroll surface at 200% zoom. Same floors; the rail replaces the
       HUD, so "does it cover the content" is asked of the hero instead. */
    const zctx = await context({ viewport: { width: 640, height: 460 }, locale: 'en-US', deviceScaleFactor: 2 });
    const zpage = await zctx.newPage();
    instrument(zpage);
    await boot(zpage, BASE + '/preview/site/?lang=en-US');
    await zpage.evaluate(() => { const b = document.querySelector('[data-testid="boundary"]'); if (b) b.open = true; });
    await zpage.evaluate(async () => {
      KK.site.scrollToBottom();
      await new Promise(r => setTimeout(r, 500));
    });
    await zpage.waitForTimeout(150);
    const zBottom = await zpage.evaluate(() => {
      const clipped = [];
      document.querySelectorAll('body *').forEach(el => {
        if (el.children.length || !el.textContent.trim()) return;
        const cs = getComputedStyle(el);
        if (cs.overflow === 'hidden' && el.scrollWidth > el.clientWidth + 1) {
          clipped.push(el.tagName + '.' + String(el.className).slice(0, 22));
        }
      });
      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        clipped: clipped,
        tiny: Array.from(document.querySelectorAll('body *')).filter(el => {
          if (el.children.length || !el.textContent.trim()) return false;
          const r = el.getBoundingClientRect();
          return r.height > 0 && parseFloat(getComputedStyle(el).fontSize) < 11.9;
        }).length,
        controls: Array.from(document.querySelectorAll('[data-testid="site-rail"] button, [data-testid="site-rail"] a'))
          .filter(e => e.getBoundingClientRect().height > 0)
          .map(e => Math.round(e.getBoundingClientRect().height * 100) / 100)
      };
    });
    await zpage.evaluate(async () => {
      KK.site.scrollTo(0);
      await new Promise(r => setTimeout(r, 300));
    });
    const zTop = await zpage.evaluate(() => {
      const rail = document.querySelector('[data-testid="site-rail"]').getBoundingClientRect();
      const hero = document.querySelector('h1[data-testid]').getBoundingClientRect();
      return { railBottom: Math.round(rail.bottom), heroTop: Math.round(hero.top) };
    });
    collected.zoom_site = { bottom: zBottom, top: zTop };
    ok('zoom.siteNoHorizontalOverflow', zBottom.overflow <= 1, zBottom.overflow);
    ok('zoom.siteNoTextIsClipped', zBottom.clipped.length === 0, zBottom.clipped);
    ok('zoom.siteNoTypeShrinksBelow12px', zBottom.tiny === 0, zBottom.tiny);
    ok('zoom.siteRailControlsStillClear44px', zBottom.controls.length >= 2 && zBottom.controls.every(h => h >= 44 - 0.75), zBottom.controls);
    ok('zoom.siteRailDoesNotCoverTheHeadline', zTop.heroTop >= zTop.railBottom - 1, zTop);
    await zctx.close();
  }

  /* =========================================================== shots ==== */
  if (needs('shots')) {
    const SHOT_DIR = path.join(__dirname, '..', '_audit', 'shots');
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    const shots = [];

    const ctx = await context({ viewport: { width: 1440, height: 960 }, locale: 'en-US' });
    const page = await ctx.newPage();
    instrument(page);

    async function snap(name, full) {
      await page.waitForTimeout(160);
      const file = path.join(SHOT_DIR, name + '.png');
      await page.screenshot({ path: file, fullPage: !!full });
      shots.push({ name, file: path.relative(path.join(__dirname, '..'), file) });
    }

    /* hub */
    await boot(page, BASE + '/?lang=en-US');
    await snap('hub-en', true);
    await page.evaluate(() => KK.i18n.setLang('zh-CN'));
    await snap('hub-zh', true);

    /* concept N */
    await boot(page, BASE + '/preview/intent/compile/?lang=en-US');
    await page.evaluate(() => {
      const i = document.querySelector('[data-testid="n-input"]');
      i.value = 'Help me set up a CBT practice that catches the spiral early, and check in tonight.';
      i.dispatchEvent(new Event('input'));
      KK.compile.run();
    });
    await page.waitForTimeout(1600);   // let the assembly finish and the field settle
    await snap('n-frame-en', false);
    await page.evaluate(() => { location.hash = '#/pipeline'; });
    await snap('n-pipeline-en', false);
    await page.evaluate(() => { location.hash = '#/log'; });
    await snap('n-log-en', true);
    await page.evaluate(async () => {
      await KK.compile.runNodeById('nd_intake');
      await KK.compile.runNodeById('nd_pattern');
      location.hash = '#/log';
    });
    await page.waitForTimeout(300);
    await snap('n-log-with-receipts-en', false);

    /* concept S */
    await boot(page, BASE + '/preview/intent/anticipate/?lang=en-US');
    await page.evaluate(() => {
      const i = document.querySelector('[data-testid="s-input"]');
      i.value = '帮我';   // deliberately the short Chinese opening, to show the ghost
      i.dispatchEvent(new Event('input'));
    });
    await snap('s-field-ghost-en', false);
    await page.evaluate(() => {
      const i = document.querySelector('[data-testid="s-input"]');
      i.value = 'Help me set up a CBT practice that catches the spiral early.';
      i.dispatchEvent(new Event('input'));
      KK.anticipate.addFromDraft('Help me prepare the conversation I keep postponing.');
      KK.anticipate.addFromDraft('I want to look at the sentence I keep repeating about work.');
      KK.anticipate.addFromDraft('帮我搭一套练习，早点拦住情绪下滑。');
      location.hash = '#/orbits';
    });
    await page.waitForTimeout(900);
    await snap('s-orbits-en', false);
    await page.evaluate(() => { location.hash = '#/ledger'; });
    await snap('s-ledger-en', false);
    await page.evaluate(() => KK.i18n.setLang('zh-CN'));
    await page.evaluate(() => { location.hash = '#/field'; });
    await snap('s-field-zh', false);

    /* mobile */
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { location.hash = '#/orbits'; });
    await snap('s-orbits-mobile', false);
    await boot(page, BASE + '/preview/intent/compile/?lang=en-US');
    await page.evaluate(() => {
      const i = document.querySelector('[data-testid="n-input"]');
      i.value = '帮我搭一套 CBT 练习，早点拦住情绪下滑。';
      i.dispatchEvent(new Event('input'));
      KK.compile.run();
      location.hash = '#/pipeline';
    });
    await page.waitForTimeout(700);
    await snap('n-pipeline-mobile', false);

    /* the long-scroll surface — the only place ScrollTrigger runs */
    await page.setViewportSize({ width: 1440, height: 960 });
    await boot(page, BASE + '/preview/site/?lang=en-US');
    await page.evaluate(() => {
      const i = document.querySelector('[data-testid="site-input"]');
      i.value = '帮我';                 // the short opening, to show the ghost
      i.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(400);
    await snap('site-hero-en', false);
    await page.evaluate(async () => {
      const sec = document.querySelector('#st-how');
      KK.site.scrollTo(sec.getBoundingClientRect().top + window.scrollY + 260);
      await new Promise(r => setTimeout(r, 400));
    });
    await page.waitForTimeout(400);
    await snap('site-steps-pinned-en', false);
    await page.evaluate(() => KK.site.scrollToBottom());
    await page.waitForTimeout(500);
    await snap('site-contract-en', false);
    await page.evaluate(() => KK.site.scrollTo(0));
    await page.waitForTimeout(250);
    await page.evaluate(() => KK.i18n.setLang('zh-CN'));
    await page.waitForTimeout(450);
    await snap('site-hero-zh', false);

    /* reduced motion */
    await ctx.close();
    const rmCtx = await context({ viewport: { width: 1440, height: 960 }, locale: 'en-US', reducedMotion: 'reduce' });
    const rmPage = await rmCtx.newPage();
    instrument(rmPage);
    await boot(rmPage, BASE + '/preview/intent/anticipate/?lang=en-US');
    await rmPage.evaluate(() => { location.hash = '#/orbits'; });
    await rmPage.waitForTimeout(300);
    await rmPage.screenshot({ path: path.join(SHOT_DIR, 's-orbits-reduced-motion.png') });
    shots.push({ name: 's-orbits-reduced-motion', file: '_audit/shots/s-orbits-reduced-motion.png' });
    await rmCtx.close();

    /* css fallback */
    const fbCtx = await context({ viewport: { width: 1440, height: 960 }, locale: 'en-US' });
    const fbPage = await fbCtx.newPage();
    instrument(fbPage);
    await boot(fbPage, BASE + '/preview/intent/compile/?lang=en-US&field=css');
    await fbPage.evaluate(() => {
      const i = document.querySelector('[data-testid="n-input"]');
      i.value = '帮我搭一套 CBT 练习，早点拦住情绪下滑。';
      i.dispatchEvent(new Event('input'));
      KK.compile.run();
      location.hash = '#/pipeline';
    });
    await fbPage.waitForTimeout(400);
    await fbPage.screenshot({ path: path.join(SHOT_DIR, 'n-pipeline-css-fallback.png') });
    shots.push({ name: 'n-pipeline-css-fallback', file: '_audit/shots/n-pipeline-css-fallback.png' });
    await fbCtx.close();

    collected.shots = shots;
    ok('shots.captured', shots.length >= 13, shots.length);
    const sizes = shots.map(s => { try { return fs.statSync(path.join(__dirname, '..', s.file)).size; } catch (e) { return 0; } });
    ok('shots.everyFileIsNonTrivial', sizes.every(s => s > 8000), sizes);
  }

  /* =========================================================== cross === */
  if (needs('cross')) {
    const a = collected.n_desktop, b = collected.s_desktop;
    ok('cross.bothSurfacesPassEveryGenericGate', !!(a && b));
    ok('cross.headlinesDiffer', a && b && a.h1 !== b.h1, { n: a && a.h1 && a.h1.slice(0, 40), s: b && b.h1 && b.h1.slice(0, 40) });
    ok('cross.headlinesDifferInChineseToo', !!(collected.n_zh && collected.s_zh && collected.n_zh.h1 !== collected.s_zh.h1));

    /* Each concept page loads ONLY its own i18n package plus the shared one.
       So the n.* namespace must not appear on S, and vice versa. This is what
       makes them two concepts instead of one page wearing two skins. */
    const ctx = await context({ viewport: { width: 900, height: 700 }, locale: 'en-US' });
    const p = await ctx.newPage();
    instrument(p);
    await boot(p, BASE + '/preview/intent/compile/?lang=en-US');
    const nKeys = await p.evaluate(() => KK.i18n.keys());
    await boot(p, BASE + '/preview/intent/anticipate/?lang=en-US');
    const sKeys = await p.evaluate(() => KK.i18n.keys());
    await boot(p, BASE + '/?lang=en-US');
    const hubKeys = await p.evaluate(() => KK.i18n.keys());
    await boot(p, BASE + '/preview/site/?lang=en-US');
    const siteKeys = await p.evaluate(() => KK.i18n.keys());
    /* The site package carries its OWN copy of the two ghost tails, on purpose:
       that page must be shippable without loading a concept package. Loading
       the S package into the site page is what keeps the two copies from
       drifting — this is the check, not a comment saying "keep in sync". */
    await p.addScriptTag({ url: BASE + '/assets/js/i18n-anticipate.js' });
    const tails = await p.evaluate(() => ({
      sAction: KK.i18n.t('s.tail.action'), siteAction: KK.i18n.t('site.tail.action'),
      sExplore: KK.i18n.t('s.tail.explore'), siteExplore: KK.i18n.t('site.tail.explore')
    }));
    await ctx.close();
    collected.cross_keys = { nPage: nKeys.length, sPage: sKeys.length, hubPage: hubKeys.length, sitePage: siteKeys.length };

    const nOwn = nKeys.filter(k => k.startsWith('n.'));
    const sOwn = sKeys.filter(k => k.startsWith('s.'));
    const leakOnS = sKeys.filter(k => k.startsWith('n.'));
    const leakOnN = nKeys.filter(k => k.startsWith('s.'));
    ok('cross.conceptPackagesDoNotLeak', leakOnS.length === 0 && leakOnN.length === 0, { leakOnS, leakOnN });
    ok('cross.eachConceptBringsItsOwnKeys', nOwn.length >= 40 && sOwn.length >= 50, { nOwn: nOwn.length, sOwn: sOwn.length });
    const sharedOnly = nKeys.filter(k => !k.startsWith('n.'));
    ok('cross.sharedKeysAreIdenticalOnBothPages',
      JSON.stringify(sharedOnly.slice().sort()) === JSON.stringify(sKeys.filter(k => !k.startsWith('s.')).slice().sort()),
      { shared: sharedOnly.length });
    ok('cross.theSitePageCarriesOnlyItsOwnPackage',
      siteKeys.every(k => k.startsWith('site.') || !/^[ns]\./.test(k)),
      siteKeys.filter(k => /^[ns]\./.test(k)));
    ok('cross.sharedKeysAreIdenticalOnTheLongScrollPageToo',
      JSON.stringify(sharedOnly.slice().sort()) === JSON.stringify(siteKeys.filter(k => !k.startsWith('site.')).slice().sort()),
      { shared: sharedOnly.length, site: siteKeys.filter(k => !k.startsWith('site.')).length });
    ok('cross.theSiteCopyOfTheTailsMatchesTheSPackage',
      tails.sAction === tails.siteAction && tails.sExplore === tails.siteExplore, tails);
    note('cross.keyTotalsPerPage', { nPage: nKeys.length, sPage: sKeys.length, hubPage: hubKeys.length, sitePage: siteKeys.length, shared: sharedOnly.length });

    /* The store contract is shared, so a receipt written under one concept
       must be readable in the other. Check the shape, not just the count. */
    const shape = await (async () => {
      const c2 = await context({ viewport: { width: 900, height: 700 }, locale: 'en-US' });
      const pp = await c2.newPage();
      instrument(pp);
      await boot(pp, BASE + '/preview/intent/anticipate/?lang=en-US');
      const r = await pp.evaluate(() => {
        const rec = KK.store.addReceipt({ stepId: 'probe', titleKey: 's.receipt.cardTitle', mode: 'SANDBOX', status: 'completed' });
        const cons = KK.store.addConsent({ kind: 'microphone', granted: false, outcome: 'denied' });
        return {
          receiptKeys: Object.keys(rec).sort(),
          externalWorldChanged: rec.externalWorldChanged,
          scenarioAtWrite: rec.scenarioAtWrite,
          consentKeys: Object.keys(cons).sort(),
          consentOutcome: cons.outcome,
          snap: KK.store.snapshot()
        };
      });
      await c2.close();
      return r;
    })();
    collected.store_shape = shape;
    ok('cross.receiptContractIsIdentical', shape.receiptKeys.indexOf('externalWorldChanged') >= 0 && shape.externalWorldChanged === false, shape.receiptKeys);
    ok('cross.receiptsCarryTheirWorkspace', !!shape.scenarioAtWrite, shape.scenarioAtWrite);
    ok('cross.consentKeepsASeparateOutcomeField', shape.consentKeys.indexOf('outcome') >= 0 && shape.consentKeys.indexOf('granted') >= 0, shape.consentKeys);
  }

  /* ============================================================== seo === */
  /* Index policy. Three writers used to encode one intent: nginx sent
     X-Robots-Tag on /v22/, and each document carried its own
     <meta name="robots">. A source-file check would be a fourth opinion that
     can disagree with what is actually served, so this section reads the
     bytes and headers the origin sends — the copy a crawler sees.

     Every assertion is stated positively: "exactly one robots meta, and its
     value is exactly index, follow". A page that silently loses its robots
     tag must fail, and a page that keeps noindex must fail, and both of those
     are the same assertion here on purpose. The canonical must be the clean
     self URL with no query, because ?lang= is not a separate document. */
  if (needs('seo')) {
    const SEO_DOCS = [
      { slug: 'hub', p: '/' },
      { slug: 'anticipate', p: '/preview/intent/anticipate/' },
      { slug: 'compile', p: '/preview/intent/compile/' },
      { slug: 'site', p: '/preview/site/' }
    ];
    const CANON_ROOT = 'https://kkmatch.com/v22';
    const INVISIBLE = /noindex|nofollow|noarchive/i;
    const origin = BASE.replace(/\/+$/, '');

    for (const d of SEO_DOCS) {
      const want = CANON_ROOT + d.p;
      let res = null;
      let html = '';
      let netErr = null;
      try {
        res = await fetch(origin + d.p, { redirect: 'follow' });
        html = await res.text();
      } catch (e) { netErr = String((e && e.message) || e); }

      ok('seo.' + d.slug + '.served', !netErr && !!res && res.ok, netErr || (res && res.status));

      const robots = html.match(/<meta\b[^>]*\bname\s*=\s*["']robots["'][^>]*>/gi) || [];
      const robotsVals = robots.map(t => ((t.match(/\bcontent\s*=\s*["']([^"']*)["']/i) || [, ''])[1] || '').trim());
      ok('seo.' + d.slug + '.exactlyOneRobotsMeta', robots.length === 1, robotsVals);
      ok('seo.' + d.slug + '.robotsIsExactlyIndexFollow',
        robots.length === 1 && robotsVals[0].toLowerCase() === 'index, follow',
        { want: 'index, follow', got: robotsVals });

      const canon = html.match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/gi) || [];
      const canonVals = canon.map(t => ((t.match(/\bhref\s*=\s*["']([^"']*)["']/i) || [, ''])[1] || '').trim());
      ok('seo.' + d.slug + '.exactlyOneCanonical', canon.length === 1, canonVals);
      ok('seo.' + d.slug + '.canonicalIsItsOwnQuerylessUrl',
        canon.length === 1 && canonVals[0] === want, { want, got: canonVals });

      ok('seo.' + d.slug + '.noInvisibleDirectiveAnywhereInTheDocument', !INVISIBLE.test(html),
        (html.match(/\S*noindex\S*/i) || [])[0] || null);

      const title = ((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1] || '').trim();
      const descTag = (html.match(/<meta\b[^>]*\bname\s*=\s*["']description["'][^>]*>/i) || [''])[0];
      const desc = ((descTag.match(/\bcontent\s*=\s*["']([^"']*)["']/i) || [, ''])[1] || '').trim();
      ok('seo.' + d.slug + '.hasTitleAndDescription', title.length > 0 && desc.length > 0,
        { titleLen: title.length, descLen: desc.length });

      const xrt = res && res.headers.get('x-robots-tag');
      ok('seo.' + d.slug + '.noXRobotsTagHeader', !xrt, xrt || null);
    }
  }

  /* ------------------------------------------------ the entry is reachable

     A hub nobody can see is not shipped. The site homepage nav hid "the 4th
     link" below 700px (`.navlinks a:nth-child(4){display:none}`), written back
     when the 4th link was Privacy. Adding the new /v22/ entry BEFORE Privacy
     promoted it to 4th child — so on a phone the shipped entry was
     display:none and the release was reported as "nothing changed". A
     positional selector does not survive an insertion; that is the whole bug.

     Ground truth is innerText, which excludes display:none nodes, so it says
     exactly what a reader can see. The assertions are positive — the entry is
     present, rendered with a non-empty box, and readable in the nav text at
     every tier — so hiding it and deleting it fail the same way.

     Production-only: this homepage is not part of /v22/, so against the local
     preview tree the section reports UNSUPPORTED instead of inventing a pass. */
  if (needs('nav')) {
    const siteOrigin = new URL('/', BASE).href.replace(/\/+$/, '');
    if (!/^https:\/\/(www\.)?kkmatch\.com$/i.test(siteOrigin)) {
      unsupported('nav.homepageEntryRendered', 'the homepage exists only in production; BASE=' + BASE);
    } else {
      for (const w of [320, 390, 430, 1440]) {
        const ctx = await browser.newContext({ viewport: { width: w, height: 820 } });
        const pg = await ctx.newPage();
        let probe = null;
        let err = null;
        try {
          await pg.goto(siteOrigin + '/', { waitUntil: 'load', timeout: 45000 });
          probe = await pg.evaluate(() => {
            const nav = document.querySelector('nav.navlinks');
            if (!nav) return { nav: false };
            const a = nav.querySelector('a[href="/v22/"]');
            let visible = false;
            if (a) {
              const cs = getComputedStyle(a);
              const r = a.getBoundingClientRect();
              visible = cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
            }
            return { nav: true, present: !!a, visible, text: (nav.innerText || '').replace(/\s+/g, ' ').trim() };
          });
        } catch (e) { err = String((e && e.message) || e); }
        await ctx.close();
        const tag = 'nav.' + w;
        ok(tag + '.homepageNavPresent', !err && !!probe && probe.nav === true, err || null);
        ok(tag + '.intentOsAnchorInNav', !err && !!probe && probe.present === true, probe && probe.text);
        ok(tag + '.intentOsEntryIsRendered', !err && !!probe && probe.visible === true,
          probe && { visible: probe.visible, text: probe.text });
        ok(tag + '.intentOsIsReadableInNavText', !err && !!probe && /Intent OS/.test(probe.text || ''),
          probe && probe.text);
      }
    }
  }

  /* ----------------------------------------------------------- navclosure
     Every surface must be leavable without the browser's Back button.

     Written after round 6 shipped /v22/ with two dead ends: `anticipate` and
     `compile` rendered exactly one anchor — the in-page skip link — so a reader
     who arrived from the homepage could only escape with Back. The `hub`
     section already asserted "every preview link resolves 200", which is a
     claim about the *outbound* journey and says nothing about the return one.
     553 green assertions coexisted with a trap, which is why this section
     asserts the property rather than the count of links.

     Positive and geometric, same as `nav`: a link counts only if it is
     rendered (non-empty box, not display:none) and its href is not an in-page
     fragment — so a skip link cannot satisfy it on its own. */
  if (needs('navclosure')) {
    /* BASE carries the namespace path (/v22) without a trailing slash, and
       `new URL('./', 'https://host/v22')` resolves to the *host root* — the
       last segment is treated as a file name. That silently pointed "hub" at
       the homepage, whose 25px text nav then failed every 44px check for a
       reason that had nothing to do with this section. Build the hub URL by
       appending the slash explicitly instead of resolving against BASE. */
    const hubAbs = BASE.endsWith('/') ? BASE : BASE + '/';
    const docs = [
      { slug: 'hub', path: '', home: true },
      { slug: 'anticipate', path: 'preview/intent/anticipate/' },
      { slug: 'compile', path: 'preview/intent/compile/' },
      { slug: 'site', path: 'preview/site/' },
    ];
    for (const d of docs) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const pg = await ctx.newPage();
      let probe = null, err = null;
      try {
        await pg.goto(hubAbs + d.path, { waitUntil: 'load', timeout: 45000 });
        await pg.waitForTimeout(600);
        probe = await pg.evaluate(() => {
          const seen = [...document.querySelectorAll('a[href]')].map(a => {
            const cs = getComputedStyle(a);
            const r = a.getBoundingClientRect();
            return {
              raw: a.getAttribute('href'),
              abs: new URL(a.getAttribute('href'), location.href).href,
              text: (a.innerText || '').replace(/\s+/g, ' ').trim(),
              visible: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0,
              h: Math.round(r.height),
            };
          });
          return {
            url: location.href,
            total: seen.length,
            exits: seen.filter(l => l.visible && l.raw && !l.raw.startsWith('#')),
          };
        });
      } catch (e) { err = String((e && e.message) || e); }

      const tag = 'navclosure.' + d.slug;
      const exits = (probe && probe.exits) || [];
      ok(tag + '.pageLoads', !err && !!probe, err || null);
      ok(tag + '.hasVisibleExit', exits.length >= 1,
        { exits: exits.length, anchors: probe && probe.total });

      const small = exits.filter(l => l.h < 44).map(l => ({ href: l.raw, h: l.h }));
      ok(tag + '.everyExitClears44px', small.length === 0, small.length ? small : null);

      const broken = [];
      for (const l of exits.slice(0, 8)) {
        try {
          const res = await ctx.request.get(l.abs, { timeout: 20000 });
          if (!res.ok()) broken.push({ href: l.raw, status: res.status() });
        } catch (e) { broken.push({ href: l.raw, error: String((e && e.message) || e) }); }
      }
      ok(tag + '.everyExitResolves', broken.length === 0, broken.length ? broken : null);

      if (d.home) {
        ok(tag + '.reachesSiteHomepage',
          exits.some(l => /^https?:\/\/(www\.)?kkmatch\.com\/?$/i.test(l.abs)),
          exits.map(l => l.abs).slice(0, 8));
      } else {
        ok(tag + '.reachesHub', exits.some(l => l.abs === hubAbs),
          exits.map(l => l.abs).slice(0, 8));
      }
      await ctx.close();
    }
  }

  await browser.close();

  /* -------------------------------------------------------------- report */
  const pass = results.filter(r => r.pass === true).length;
  const fail = results.filter(r => r.pass === false);
  const uns = results.filter(r => r.pass === 'UNSUPPORTED').length;
  const info = results.filter(r => r.pass === 'INFO').length;
  const total = pass + fail.length;
  const summary = {
    at: new Date().toISOString(),
    base: BASE,
    total, pass, fail: fail.length, unsupported: uns, info,
    ms: Date.now() - t0,
    failures: fail,
    results
  };
  const dir = path.join(__dirname, '..', '_audit');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'acceptance-results.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(dir, 'acceptance-measured.json'), JSON.stringify(collected, null, 2));

  fail.forEach(f => console.log('FAIL  ' + f.name + '  ' + JSON.stringify(f.detail).slice(0, 220)));
  console.log(JSON.stringify({ total, pass, fail: fail.length, unsupported: uns, info, ms: summary.ms }));
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error('GATE CRASHED', e); process.exit(2); });
