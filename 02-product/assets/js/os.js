/* ============================================================================
   KK Intent OS · os — the shell

   Owns: HUD bar, view routing, the boundary panel, toasts, the confirm sheet,
   the terminal renderer and the signal read-out.

   Two shared renderers carry a lot of weight here:

   term()    writes one DOM line per log record and copies that record's
             `src` path onto the element as `data-src`. The gate script can
             then prove, for every line on screen, that the number it shows
             equals the value at that path in the payload. Inventing a number
             at render time is therefore detectable, not merely discouraged.

   chips()   renders the measured tone features as text. The canvas colour is
             never the only carrier of the signal — the numbers are right
             there next to it.
   ========================================================================== */
window.KK = window.KK || {};

(function (KK) {
  'use strict';

  var toastRecords = [];
  var refs = {};
  var booted = false;

  /* ------------------------------------------------------------- helpers */
  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'text') { node.textContent = String(v); return; }
        if (k === 'dataset') { Object.keys(v).forEach(function (d) { node.dataset[d] = String(v[d]); }); return; }
        node.setAttribute(k, v === true ? '' : String(v));
      });
    }
    if (kids) {
      (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function t(key, vars) { return KK.i18n.t(key, vars); }

  /* -------------------------------------------------------------- toasts */
  function renderToasts() {
    var host = qs('[data-testid="toaster"]');
    if (!host) return;
    clear(host);
    toastRecords.slice(-4).forEach(function (r) {
      host.appendChild(el('div', { class: 'toast', 'data-tone': r.tone || 'warn', 'data-toast': r.key },
        [el('strong', null, [t('toast.label')]), document.createTextNode(t(r.key, r.values))]));
    });
  }

  function toast(key, tone, values) {
    toastRecords.push({ key: key, tone: tone || 'warn', values: values || null });
    if (toastRecords.length > 12) toastRecords.shift();
    renderToasts();
    var last = qs('[data-testid="toaster"] .toast:last-child');
    if (last) window.setTimeout(function () { last.setAttribute('data-faded', 'true'); }, 6000);
    return key;
  }

  /* --------------------------------------------------- terminal renderer */
  /**
   * @param {HTMLElement} host
   * @param {Array} logs    [{ key, status, src, values }]
   * @param {Object} payload the compile payload the src paths resolve against
   */
  function term(host, logs, payload) {
    if (!host) return 0;
    clear(host);
    if (!logs || !logs.length) {
      host.appendChild(el('div', { class: 'term__empty', text: t('term.idle') }));
      return 0;
    }
    var MARKS = { ok: 'OK', demo: 'DEMO', none: '--' };
    logs.forEach(function (l) {
      var line = el('div', {
        class: 'term__line',
        'data-status': l.status,
        'data-src': l.src || '',
        'data-log': l.key
      }, [
        el('span', { class: 'term__mark', text: '[' + (MARKS[l.status] || '??') + ']' }),
        el('span', { class: 'term__text', text: t(l.key, l.values) })
      ]);
      host.appendChild(line);
    });
    host.setAttribute('data-lines', String(logs.length));
    if (payload) host.setAttribute('data-fingerprint', String(payload.fingerprint || ''));
    return logs.length;
  }

  /* -------------------------------------------------------- signal chips */
  function chips(host, features, opts) {
    if (!host || !features) return 0;
    clear(host);
    var tone = features.tone;
    var list = [
      { id: 'tone', tone: tone === 'alert' ? 'signal' : (tone === 'calm' ? 'accent' : null),
        label: 'sig.tone', value: t('sig.tone.' + tone) },
      { id: 'chars', label: 'sig.chars', value: String(features.chars) },
      { id: 'words', label: 'sig.words', value: String(features.words) },
      { id: 'hits', tone: features.alertHits.length ? 'signal' : null,
        label: 'sig.hits', value: String(features.alertHits.length + features.calmHits.length) },
      { id: 'punct', label: 'sig.punct', value: String(features.punctuation) }
    ];
    if (opts && opts.extra) list = list.concat(opts.extra);
    list.forEach(function (item) {
      host.appendChild(el('span', {
        class: 'chip', 'data-chip': item.id, 'data-tone': item.tone || null,
        title: t('sig.measuredNote')
      }, [
        document.createTextNode(t(item.label) + ' '),
        el('b', { text: item.value })
      ]));
    });
    return list.length;
  }

  /* ---------------------------------------------------------- boundary UI */
  function renderBoundary(host) {
    if (!host) return 0;
    clear(host);
    var caps = KK.preview.capabilities();
    var table = el('table', null, [
      el('thead', null, [el('tr', null, [
        el('th', { text: t('boundary.col.cap') }),
        el('th', { text: t('boundary.col.mode') }),
        el('th', { text: t('boundary.col.what') })
      ])]),
      el('tbody', null, caps.map(function (c) {
        return el('tr', { 'data-cap': c.name, 'data-mode': c.status }, [
          el('td', null, [el('code', { text: c.name })]),
          el('td', null, [el('span', {
            class: 'chip',
            'data-tone': c.status === 'NOT_CONNECTED' ? 'signal' : (c.status === 'SANDBOX' ? 'warn' : null),
            text: c.status
          })]),
          el('td', null, [
            document.createTextNode(c.detail + ' — '),
            el('span', { text: c.reason })
          ])
        ]);
      }))
    ]);
    host.appendChild(table);
    host.setAttribute('data-caps', String(caps.length));
    return caps.length;
  }

  /* --------------------------------------------------------- confirm sheet */
  /**
   * The approval gate. Nothing about this is a formality: without a true
   * return the sandbox executor refuses, and the refusal is visible.
   */
  function confirmSheet(o) {
    o = o || {};
    return new Promise(function (resolve) {
      var scrim = qs('[data-testid="scrim"]');
      var sheet = qs('[data-testid="confirm-sheet"]');
      if (!sheet) { resolve(false); return; }

      clear(sheet);
      sheet.appendChild(el('div', { class: 'sheet__head' }, [
        el('h2', { text: t(o.titleKey || 'confirm.title') , 'data-i18n': o.titleKey || 'confirm.title' }),
        el('button', { class: 'btn btn--ghost', 'data-testid': 'confirm-cancel-top', text: t('common.cancel'), type: 'button' })
      ]));
      sheet.appendChild(el('p', { class: 'lead', text: t(o.bodyKey || 'confirm.body') }));
      sheet.appendChild(el('div', { class: 'chips', style: 'margin:12px 0 20px' }, [
        el('span', { class: 'chip', 'data-tone': 'warn', text: t('confirm.sandboxTag') }),
        el('span', { class: 'chip', text: t('confirm.noSideEffect') })
      ]));
      var row = el('div', { class: 'composer__row' }, [
        el('button', { class: 'btn', 'data-testid': 'confirm-deny', type: 'button', text: t('confirm.deny') }),
        el('button', { class: 'btn btn--primary', 'data-testid': 'confirm-approve', type: 'button', text: t('confirm.approve') })
      ]);
      sheet.appendChild(row);

      function close(value) {
        var was = sheet.getAttribute('data-open') === 'true';
        sheet.setAttribute('data-open', 'false');
        if (scrim) scrim.setAttribute('data-open', 'false');
        if (was) unlockScroll();
        document.removeEventListener('keydown', onKey);
        resolve(value);
      }
      function onKey(ev) { if (ev.key === 'Escape') close(false); }

      qs('[data-testid="confirm-approve"]', sheet).addEventListener('click', function () { close(true); });
      qs('[data-testid="confirm-deny"]', sheet).addEventListener('click', function () { close(false); });
      qs('[data-testid="confirm-cancel-top"]', sheet).addEventListener('click', function () { close(false); });
      if (scrim) scrim.addEventListener('click', function () { close(false); });
      document.addEventListener('keydown', onKey);
      enableSheetDrag(sheet, function () { close(false); });

      sheet.setAttribute('data-open', 'true');
      if (scrim) scrim.setAttribute('data-open', 'true');
      lockScroll();
      var first = qs('[data-testid="confirm-approve"]', sheet);
      if (first) first.focus();
    });
  }

  /* ------------------------------------------------------------- HUD ---- */
  function buildHUD(cfg) {
    var host = qs('[data-testid="hud"]');
    if (!host) return;
    clear(host);

    host.appendChild(el('div', { class: 'hud__brand', 'data-testid': 'hud-brand' }, [
      document.createTextNode('KKmatch'),
      el('small', { text: t('hud.brandSub') })
    ]));
    host.appendChild(el('div', { class: 'hud__spacer' }));

    /* scenario switch — this is the "model reload" control, and it tells the
       truth about what a switch does to the account log. */
    host.appendChild(el('div', { class: 'hud__group', 'data-testid': 'scn-group' }, [
      el('span', { class: 'pulse', 'data-state': 'idle', 'data-testid': 'pulse' }),
      el('label', { class: 'hud__label hud__quiet', for: 'scn-select', text: t('hud.scnLabel') }),
      el('select', { id: 'scn-select', 'data-testid': 'scn-select', 'aria-label': t('hud.scnAria') },
        KK.store.SCENARIO_KEYS.map(function (k) {
          return el('option', { value: k, 'data-i18n': KK.store.scenario(k).labelKey });
        }))
    ]));

    host.appendChild(el('button', {
      class: 'hud__account hud__quiet', type: 'button', 'data-testid': 'account-chip',
      'data-i18n-aria': 'hud.accountAria', 'data-i18n': 'hud.account'
    }));

    host.appendChild(el('button', {
      class: 'btn btn--ghost', type: 'button', 'data-testid': 'sound-btn',
      'data-i18n-aria': 'sound.aria', 'data-i18n': 'sound.off'
    }));

    host.appendChild(el('button', {
      class: 'btn btn--ghost', type: 'button', 'data-testid': 'lang-btn',
      'data-i18n-aria': 'hud.langAria', 'data-i18n': 'hud.lang'
    }));

    host.appendChild(el('button', {
      class: 'btn hud__compact', type: 'button', 'data-testid': 'hud-compact',
      'data-i18n-aria': 'hud.consoleAria', 'data-i18n': 'hud.console'
    }));
  }

  function buildSheet() {
    var sheet = qs('[data-testid="hud-sheet"]');
    if (!sheet) return;
    clear(sheet);
    sheet.appendChild(el('div', { class: 'sheet__head' }, [
      el('h2', { 'data-i18n': 'hud.sheetTitle' }),
      el('button', { class: 'btn btn--ghost', type: 'button', 'data-testid': 'hud-sheet-close', 'data-i18n': 'common.close' })
    ]));
    sheet.appendChild(el('div', { class: 'sheet__field' }, [
      el('span', { 'data-i18n': 'hud.scnLabel' }),
      el('select', { 'data-testid': 'scn-select-mobile', 'aria-label': t('hud.scnAria') },
        KK.store.SCENARIO_KEYS.map(function (k) { return el('option', { value: k, 'data-i18n': KK.store.scenario(k).labelKey }); }))
    ]));
    sheet.appendChild(el('div', { class: 'sheet__field' }, [
      el('span', { 'data-i18n': 'hud.langAria' }),
      el('button', { class: 'btn', type: 'button', 'data-testid': 'lang-btn-mobile', 'data-i18n': 'hud.lang' })
    ]));
    sheet.appendChild(el('div', { class: 'sheet__field' }, [
      el('span', { 'data-i18n': 'hud.soundLabel' }),
      el('button', { class: 'btn', type: 'button', 'data-testid': 'sound-btn-mobile', 'data-i18n': 'sound.off' })
    ]));
    sheet.appendChild(el('p', { class: 'lead', style: 'font-size:var(--fs-12);color:var(--text-faint)', 'data-i18n': 'hud.accountNote' }));
  }

  /* --------------------------------------------------- the sticky bars' real end -- */
  /**
   * `--hud-end` is declared in CSS from two tokens, and those tokens are only
   * right while the bar is ONE row. The moment it wraps — a narrow screen, a
   * 200% zoom level, a language whose labels are longer — the declaration is
   * shorter than the bar, and everything keyed to it lands underneath the
   * glass. Measured before this existed: at 430px the bar ended at 122px while
   * `.shell` reserved 92px and the sticky view nav was placed at 92px, so the
   * nav sat 30px inside the bar and its buttons were unclickable.
   *
   * So the value is measured from the live box instead of assumed, and kept
   * current by a ResizeObserver, which is exactly the event that fires when a
   * wrap happens. Nothing here is a magic number.
   *
   * The view nav is measured for the same reason and published as `--nav-h`:
   * it is ALSO sticky, it sits below the bar, and an in-page jump has to clear
   * both. Fixing only the bar is what left `#stage` 40px inside the nav.
   */
  function watchStickyBars(host, nav) {
    var root = document.documentElement;
    function publish() {
      if (host) {
        var r = host.getBoundingClientRect();
        if (r.height > 0) root.style.setProperty('--hud-end', r.bottom.toFixed(1) + 'px');
      }
      if (nav) {
        var n = nav.getBoundingClientRect();
        if (n.height > 0) root.style.setProperty('--nav-h', n.height.toFixed(1) + 'px');
      }
    }
    publish();
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(publish);
      if (host) ro.observe(host);
      if (nav) ro.observe(nav);
    }
    window.addEventListener('resize', publish);
    window.addEventListener('orientationchange', publish);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(publish);
  }

  /* ------------------------------------------------------- scroll lock ---- */  /**
   * A sheet is modal in behaviour, so the page behind it must not move.
   * Measured before this existed: with the HUD sheet open, two 400px scrolls
   * moved the document 375px on anticipate and 519px on compile.
   *
   * `overflow: hidden` on <html> alone would clamp the offset to 0 and jump the
   * reader to the top of the page, so the body is pinned and `top` carries the
   * saved offset instead (see base.css). The counter matters because the
   * confirm sheet can open on top of the HUD sheet: whichever closes first must
   * not unlock a sheet that is still open.
   */
  var lockDepth = 0;
  var lockY = 0;

  function lockScroll() {
    lockDepth += 1;
    if (lockDepth > 1) return;
    lockY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.setAttribute('data-locked', 'true');
    document.body.style.top = (-lockY) + 'px';
  }

  function unlockScroll() {
    if (lockDepth < 1) return;
    lockDepth -= 1;
    if (lockDepth > 0) return;
    document.documentElement.removeAttribute('data-locked');
    document.body.style.top = '';
    if (lockY) window.scrollTo(0, lockY);
  }

  /* ------------------------------------------------- swipe-to-dismiss ---- */
  /**
   * Two details separate a real sheet from an imitation of one:
   *
   *   - it only follows the finger when it is ALREADY at the top. Otherwise a
   *     downward drag inside a tall sheet would dismiss it while the reader was
   *     merely scrolling back up.
   *   - travel past the release threshold is damped, so the sheet says "you
   *     have gone far enough" instead of detaching from the finger.
   *
   * Release is decided by distance OR by speed: a short flick is as deliberate
   * as a long slow drag. The order in the dismiss branch is load-bearing —
   * the inline transform is cleared only after `data-open` flips, otherwise the
   * sheet springs back to the top for one frame before sliding away.
   */
  function enableSheetDrag(sheet, onDismiss) {
    if (!sheet || sheet.__dragBound) return;
    sheet.__dragBound = true;

    var THRESHOLD = 88;   /* px of travel that counts as "dismiss" */
    var FLICK = 0.55;     /* px/ms that counts as "dismiss" regardless */
    var DAMP = 0.55;      /* resistance past the threshold */

    var active = false, startY = 0, startT = 0, dy = 0;

    function release() {
      active = false;
      dy = 0;
      sheet.removeAttribute('data-dragging');
      sheet.style.transform = '';
    }

    sheet.addEventListener('touchstart', function (ev) {
      if (ev.touches.length !== 1) { active = false; return; }
      /* not at the top -> this gesture belongs to the sheet's own scroll */
      if ((sheet.scrollTop || 0) > 0) { active = false; return; }
      active = true;
      startY = ev.touches[0].clientY;
      startT = Date.now();
    }, { passive: true });

    sheet.addEventListener('touchmove', function (ev) {
      if (!active) return;
      dy = ev.touches[0].clientY - startY;
      if (dy <= 0) { release(); return; }   /* upward: let the sheet scroll */
      if (ev.cancelable) ev.preventDefault();
      sheet.setAttribute('data-dragging', 'true');
      var t = dy <= THRESHOLD ? dy : THRESHOLD + (dy - THRESHOLD) * DAMP;
      sheet.style.transform = 'translateX(-50%) translateY(' + t.toFixed(1) + 'px)';
    }, { passive: false });

    function finish() {
      if (!active) return;
      var dt = Math.max(1, Date.now() - startT);
      var speed = dy / dt;
      var far = dy > THRESHOLD;
      var flick = speed > FLICK && dy > 24;
      active = false;
      if (far || flick) { onDismiss(); release(); }
      else release();
    }
    sheet.addEventListener('touchend', finish, { passive: true });
    sheet.addEventListener('touchcancel', finish, { passive: true });
  }

  function openSheet(open) {
    var sheet = qs('[data-testid="hud-sheet"]');
    var scrim = qs('[data-testid="scrim"]');
    var was = !!sheet && sheet.getAttribute('data-open') === 'true';
    if (sheet) sheet.setAttribute('data-open', open ? 'true' : 'false');
    if (scrim) scrim.setAttribute('data-open', open ? 'true' : 'false');
    /* idempotent, so the lock can never be counted twice for one sheet */
    if (open && !was) lockScroll();
    if (!open && was) unlockScroll();
  }

  function syncSoundButton() {
    var s = KK.sound.state();
    var key = s.enabled ? 'sound.on' : (s.supported ? 'sound.off' : 'sound.unsupported');
    ['sound-btn', 'sound-btn-mobile'].forEach(function (id) {
      var b = qs('[data-testid="' + id + '"]');
      if (b) { b.setAttribute('data-sound', s.enabled ? 'on' : 'off'); b.setAttribute('data-i18n', key); b.textContent = t(key); }
    });
  }

  function syncScenarioSelect(value) {
    ['scn-select', 'scn-select-mobile'].forEach(function (id) {
      var s = qs('[data-testid="' + id + '"]');
      if (s) s.value = value;
    });
  }

  /* ------------------------------------------------------------ routing */
  function currentView(cfg) {
    var raw = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    var ids = cfg.views.map(function (v) { return v.id; });
    return ids.indexOf(raw) >= 0 ? raw : cfg.defaultView;
  }

  function onViewChange(cfg) {
    var view = currentView(cfg);
    KK.store.patch({ view: view }, 'view');
    qsa('[data-testid="view-nav"] [data-view]').forEach(function (b) {
      b.setAttribute('aria-current', b.getAttribute('data-view') === view ? 'page' : 'false');
    });
    cfg.onView(view, refs);
    KK.i18n.apply(document);
  }

  /* --------------------------------------------------------------- boot */
  function boot(cfg) {
    if (booted) return refs;
    booted = true;

    KK.i18n.init();
    KK.store.load();

    refs.field = qs('#field');
    refs.stage = qs('[data-testid="stage"]');
    refs.canvasHost = document.body;

    /* view nav lives in the stage, not the HUD: the bar stays as quiet as the
       brief asks, and every nav item still gets a 44px target. */
    var nav = qs('[data-testid="view-nav"]');
    if (nav) {
      clear(nav);
      cfg.views.forEach(function (v) {
        nav.appendChild(el('button', {
          class: 'btn btn--ghost', type: 'button', 'data-view': v.id,
          'data-i18n': v.labelKey, 'aria-current': 'false'
        }));
      });
    }

    buildHUD(cfg);
    buildSheet();
    syncScenarioSelect(KK.store.state.scenario);
    syncSoundButton();

    var boundary = qs('[data-testid="boundary-body"]');
    if (boundary) renderBoundary(boundary);

    /* bootstrap the two shared layers */
    var f = KK.field.init({ canvas: refs.field, force: /(^|[?&])field=css/.test(location.search) });
    refs.fieldStats = f;
    KK.sound.init();
    syncSoundButton();

    /* ---- wiring ---- */
    function onScenario(key) {
      var result = KK.store.setScenario(key);
      if (!result.ok) return;
      syncScenarioSelect(key);
      KK.field.recolour();
      KK.field.setSignal(0);
      KK.field.settle();
      cfg.onScenario(result);
      /* Say out loud what survived the switch — receipts, the draft, and the
         assembled work. This is the seam the previous round measured and left
         open; the copy now has to match the contract, not the other way round. */
      var retained = result.retained || { restored: { nodes: 0 }, holders: 0 };
      toast('toast.scenarioSwitched', 'ok', {
        from: t(KK.store.scenario(result.from).labelKey),
        to: t(KK.store.scenario(result.to).labelKey),
        receipts: result.carried.after.receipts,
        held: retained.holders,
        nodes: retained.restored.nodes
      });
      /* The retention state is on the body, so a gate (or a user with the
         inspector open) can read it without parsing the toast copy. */
      document.body.setAttribute('data-retained-nodes', String(retained.restored.nodes));
      document.body.setAttribute('data-retained-slots', String(retained.holders));
      KK.i18n.apply(document);
    }

    qsa('[data-testid="scn-select"], [data-testid="scn-select-mobile"]').forEach(function (s) {
      s.addEventListener('change', function () { onScenario(s.value); });
    });

    /* One listener, fired by i18n.setLang(). The button only asks for the
       switch; everything that reacts to a switch reacts in one place. */
    document.addEventListener('kk:lang', function () {
      syncSoundButton();
      renderToasts();
      if (cfg.onLang) cfg.onLang();
      KK.i18n.apply(document);
      /* <html> already carries the declaration; i18n.js writes it on the
         switch itself. Do not mirror it onto <body> under a different value. */
      /* The composer draft is NOT cleared and the view is NOT re-mounted.
         e2e/acceptance.js asserts both, in both languages. */
    });
    qsa('[data-testid="lang-btn"], [data-testid="lang-btn-mobile"]').forEach(function (b) {
      b.addEventListener('click', function () { KK.i18n.toggle(); });
    });

    function onSound() {
      var r = KK.sound.toggle();
      if (!r.ok) { toast('toast.soundUnsupported', 'deny'); return; }
      syncSoundButton();
      toast(r.enabled ? 'toast.soundOn' : 'toast.soundOff', 'ok');
    }
    qsa('[data-testid="sound-btn"], [data-testid="sound-btn-mobile"]').forEach(function (b) {
      b.addEventListener('click', onSound);
    });

    var compact = qs('[data-testid="hud-compact"]');
    if (compact) compact.addEventListener('click', function () { openSheet(true); });
    var sheetClose = qs('[data-testid="hud-sheet-close"]');
    if (sheetClose) sheetClose.addEventListener('click', function () { openSheet(false); });
    var scrim = qs('[data-testid="scrim"]');
    if (scrim) scrim.addEventListener('click', function () { openSheet(false); });
    var hudSheet = qs('[data-testid="hud-sheet"]');
    if (hudSheet) enableSheetDrag(hudSheet, function () { openSheet(false); });

    /* Escape closes the HUD sheet — but never the confirm sheet's Escape, which
       is already handled by confirmSheet() and resolves `false` there. */
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape') return;
      var conf = qs('[data-testid="confirm-sheet"]');
      if (conf && conf.getAttribute('data-open') === 'true') return;
      openSheet(false);
    });

    var account = qs('[data-testid="account-chip"]');
    if (account) account.addEventListener('click', function () { toast('toast.authNotConnected', 'warn'); });

    if (nav) {
      nav.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-view]');
        if (!b) return;
        location.hash = '#/' + b.getAttribute('data-view');
      });
    }

    window.addEventListener('hashchange', function () { onViewChange(cfg); });

    onViewChange(cfg);
    watchStickyBars(qs('[data-testid="hud"]'), qs('[data-testid="view-nav"]'));
    KK.i18n.apply(document);
    document.body.setAttribute('data-booted', 'true');
    document.body.setAttribute('data-field-backend', KK.field.stats().backend);

    return refs;
  }

  KK.os = {
    el: el, clear: clear, qs: qs, qsa: qsa, t: t,
    toast: toast, term: term, chips: chips,
    renderBoundary: renderBoundary, confirmSheet: confirmSheet,
    openSheet: openSheet, syncSoundButton: syncSoundButton,
    lockScroll: lockScroll, unlockScroll: unlockScroll,
    watchStickyBars: watchStickyBars,
    boot: boot,
    refs: function () { return refs; }
  };
})(window.KK);
