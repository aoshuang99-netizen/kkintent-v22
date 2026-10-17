/* ============================================================================
   意图操作系统 · concept-site — the long-scroll surface

   Why this file exists, and why ScrollTrigger is finally in the dependency
   stack (decision 2026-10-16):

     ScrollTrigger was deliberately NOT imported for the two concept previews.
     They are view routers, not documents — there is nothing to scroll, so the
     plugin would have been dead weight carried for the look of it. A
     marketing page is the opposite case: the scroll IS the interface, and
     hand-rolling reveal-pinning would be worse code than the 43 KB library.

     So the rule the project follows is not "use ScrollTrigger" or "avoid
     ScrollTrigger". It is: import it where the scroll carries meaning, and
     don't where it doesn't. This is the one surface where it does.

   What is real here:
     - the progress bar reads ScrollTrigger's own progress, not a scroll
       listener that reimplements it
     - the pinned step highlight is driven by the pin's progress
     - the reveal state is written to `data-revealed` so it can be checked
     - the composer in the hero runs the REAL `KK.preview.predict`

   What is deliberately absent:
     - no ScrollTrigger at all under prefers-reduced-motion, and no `data-st`
       on the body, so the CSS hidden states never apply
     - nothing is revealed by `time`. Everything is revealed by scroll
       position, which means a reader who never scrolls still gets a coherent
       first screen.
   ========================================================================== */
window.KK = window.KK || {};

(function (KK) {
  'use strict';

  var el = KK.os.el, clear = KK.os.clear, qs = KK.os.qs, qsa = KK.os.qsa;
  function t(k, v) { return KK.i18n.t(k, v); }

  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var S = {
    enabled: false,
    triggers: [],
    pinned: null,
    steps: [],
    activeStep: -1,
    refreshCount: 0,
    reason: null
  };

  /* --------------------------------------------------------------- hero demo */
  /**
   * The same call the product makes. If the template has nothing to append,
   * the page says so instead of showing an empty ghost.
   */
  function wireDemo() {
    var input = qs('[data-testid="site-input"]');
    var ghost = qs('[data-testid="site-ghost"]');
    var out = qs('[data-testid="site-out"]');
    if (!input || !ghost) return;

    function render() {
      var text = input.value;
      var pred = KK.preview.predict(text, 'mind');
      var tailText = '';
      if (pred.fired && pred.tailId) {
        var tail = t('site.tail.' + pred.tailId);
        tailText = /[\s]$/.test(text) ? tail.trim() : (' ' + tail.trim());
      }
      qs('.typed', ghost).textContent = text;
      qs('.tail', ghost).textContent = tailText;
      ghost.hidden = !tailText;
      ghost.setAttribute('data-fired', String(pred.fired));
      ghost.setAttribute('data-tail', pred.tailId || '');
      ghost.setAttribute('data-confidence', String(pred.confidence));
      if (out) {
        out.textContent = pred.fired
          ? t('site.demo.fired', { c: Math.round(pred.confidence * 100), k: pred.basis.length })
          : t('site.demo.idle');
        out.setAttribute('data-state', pred.fired ? 'fired' : 'idle');
      }
      return pred;
    }

    input.addEventListener('input', render);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Tab' && !ev.shiftKey && ghost.hidden === false) {
        ev.preventDefault();
        input.value = input.value + qs('.tail', ghost).textContent;
        input.dispatchEvent(new Event('input'));
      } else if (ev.key === 'Escape') {
        ghost.hidden = true;
        if (out) { out.textContent = t('site.demo.idle'); out.setAttribute('data-state', 'idle'); }
      }
    });
    render();
  }

  /* ------------------------------------------------------- ScrollTrigger pass */
  function stepEls() { return qsa('#st-steps .st-step'); }

  function activateStep(i) {
    if (i === S.activeStep) return;
    S.activeStep = i;
    S.steps.forEach(function (node, idx) { node.setAttribute('data-active', String(idx === i)); });
  }

  function buildScrollTriggers() {
    var gsap = window.gsap;
    var ST = window.ScrollTrigger;

    if (REDUCED) {
      S.reason = 'prefers-reduced-motion: no ScrollTrigger created, content is static and complete';
      revealAll();
      return false;
    }
    if (!gsap || !ST) {
      S.reason = 'gsap or ScrollTrigger did not load: the page renders as a plain document';
      revealAll();
      return false;
    }
    S.reason = null;
    gsap.registerPlugin(ST);

    /* Without this, the CSS hidden state would apply to a page that has no
       scroll driver — the reveal styles are scoped to [data-st="on"] for
       exactly this reason, and this line is what turns it on. */
    document.body.setAttribute('data-st', 'on');

    /* 1 — reading progress, straight off ScrollTrigger's own progress value */
    var bar = qs('[data-testid="site-progress"]');
    var rail = ST.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: function (self) {
        if (bar) bar.style.width = (self.progress * 100).toFixed(2) + '%';
      },
      onRefresh: function (self) { if (bar) bar.style.width = (self.progress * 100).toFixed(2) + '%'; }
    });
    S.triggers.push(rail);

    /* 2 — reveals. Explicit per element rather than a batch, because the gate
       needs a per-element observable truth (`data-revealed`). */
    var revealEls = qsa('.reveal');
    revealEls.forEach(function (node) {
      S.triggers.push(ST.create({
        trigger: node,
        start: 'top 88%',
        onEnter: function () { node.setAttribute('data-revealed', 'true'); },
        onEnterBack: function () { node.setAttribute('data-revealed', 'true'); }
      }));
    });

    /* 3 — the pinned sequence: one pin, four states, scrubbed by position */
    var stepsHost = qs('#st-steps');
    S.steps = stepEls();
    if (stepsHost && S.steps.length) {
      S.pinned = ST.create({
        trigger: stepsHost,
        start: 'top 22%',
        end: '+=' + (S.steps.length * 260),
        pin: '#st-steps-pin',
        pinSpacing: true,
        anticipatePin: 1,
        onUpdate: function (self) {
          var i = Math.min(S.steps.length - 1, Math.floor(self.progress * S.steps.length));
          activateStep(i);
        },
        onEnter: function () { activateStep(0); },
        onLeave: function () { activateStep(S.steps.length - 1); },
        onLeaveBack: function () { activateStep(0); }
      });
      S.triggers.push(S.pinned);
    }

    /* Elements already inside the first screen must not wait for a scroll that
       a reader might never make. */
    revealInViewport();
    ST.refresh();
    S.refreshCount += 1;
    S.enabled = true;
    return true;
  }

  function revealAll() {
    qsa('.reveal').forEach(function (n) { n.setAttribute('data-revealed', 'true'); });
    S.steps = stepEls();
    S.steps.forEach(function (n) { n.setAttribute('data-active', 'true'); });
  }

  function revealInViewport() {
    var h = window.innerHeight || 800;
    qsa('.reveal').forEach(function (n) {
      if (n.getBoundingClientRect().top < h * 0.92) n.setAttribute('data-revealed', 'true');
    });
  }

  /* ------------------------------------------------------------- the contract */
  function renderContract() {
    var host = qs('[data-testid="site-contract"]');
    if (!host) return 0;
    var mc = KK.preview.modelAdapterContract();
    var C = KK.preview.PREDICTION_CONTRACT;
    var sample = KK.preview.predict('帮我', 'mind');
    var v = KK.preview.validatePrediction(sample);
    var rows = [
      [t('site.contract.name'), C.name + ' · ' + t('site.contract.ver', { n: C.version }),
        C.fields.length + ' fields'],
      [t('site.contract.status'), mc.status, mc.mustReturn],
      [t('site.contract.endpoint'), t('site.contract.none'), '—'],
      [t('site.contract.fields'), t('site.contract.fields.v', { n: mc.mustNotChange.length }), String(mc.mustNotChange.length)],
      [t('site.contract.confRule'), t('site.contract.confRule.v', { cap: C.cap }),
        JSON.stringify(C.weights)],
      [t('site.contract.changes'), t('site.contract.changes.v'), 'provider · notAModel']
    ];
    host.setAttribute('data-contract', C.name);
    host.setAttribute('data-fields', String(C.fields.length));
    host.setAttribute('data-validate', String(v.ok));
    host.setAttribute('data-problems', String(v.missing.length + v.wrongType.length + v.broken.length));
    host.setAttribute('data-status', mc.status);
    host.setAttribute('data-endpoint', String(mc.endpoint));

    /* Every cell is written with textContent — the i18n layer never injects
       markup anywhere in this project, and a marketing page is not the place
       to start making an exception. */
    var table = el('table', { class: 'st-contract' }, [
      el('thead', null, [el('tr', null, [
        el('th', { text: t('site.contract.col.field') }),
        el('th', { text: t('site.contract.col.rule') }),
        el('th', { text: t('site.contract.col.state') })
      ])]),
      el('tbody', null, rows.map(function (r) {
        return el('tr', { 'data-row': r[0] }, [
          el('td', null, [el('code', { text: r[0] })]),
          el('td', null, [document.createTextNode(r[1])]),
          el('td', null, [el('code', { text: r[2] })])
        ]);
      }))
    ]);
    clear(host);
    host.appendChild(table);
    var live = el('p', { class: 'st-fineprint', 'data-testid': 'site-contract-live',
      text: t('site.contract.validated', {
        state: v.ok ? 'ok' : 'fail',
        n: v.missing.length + v.wrongType.length + v.broken.length
      }) });
    host.appendChild(live);
    return rows.length;
  }

  /* ------------------------------------------------------------------- boot */
  KK.os.boot({
    concept: 'site',
    defaultView: 'home',
    views: [{ id: 'home', labelKey: 'site.view.home' }],
    onView: function () {
      wireDemo();
      renderContract();
      var boundary = qs('[data-testid="boundary-body"]');
      if (boundary) KK.os.renderBoundary(boundary);
      var skip = qs('.skip-link');
      if (skip) skip.setAttribute('data-i18n', 'site.skip');
      var nav = qs('[data-testid="view-nav"]');
      if (nav) nav.setAttribute('aria-label', t('site.navAria'));
    },
    onLang: function () {
      /* Text length changes with the language, so the trigger geometry has to
         be recomputed — otherwise the pin ends in the wrong place and the last
         section never reveals. */
      wireDemo();
      renderContract();
      var boundary = qs('[data-testid="boundary-body"]');
      if (boundary) KK.os.renderBoundary(boundary);
      if (S.enabled && window.ScrollTrigger) { window.ScrollTrigger.refresh(); S.refreshCount += 1; }
    },
    onScenario: function () { /* the marketing page has no workspace switch */ }
  });

  document.body.setAttribute('data-reduced-motion', REDUCED ? 'true' : 'false');
  document.body.setAttribute('data-st', REDUCED ? 'off' : 'off');

  var started = buildScrollTriggers();

  window.addEventListener('resize', function () {
    if (S.enabled && window.ScrollTrigger) { window.ScrollTrigger.refresh(); S.refreshCount += 1; }
  });

  KK.site = {
    /** Everything the gate needs, from the live objects rather than the copy. */
    state: function () {
      var ST = window.ScrollTrigger;
      return {
        enabled: S.enabled,
        reason: S.reason,
        reducedMotion: REDUCED,
        stLoaded: !!ST,
        stVersion: ST && ST.version ? ST.version : null,
        gsapLoaded: !!window.gsap,
        gsapVersion: window.gsap && window.gsap.version ? window.gsap.version : null,
        triggers: ST ? ST.getAll().length : 0,
        pinned: !!S.pinned,
        scrollY: Math.round(window.scrollY),
        docHeight: document.documentElement.scrollHeight,
        viewport: window.innerHeight,
        revealTotal: qsa('.reveal').length,
        revealDone: qsa('.reveal[data-revealed="true"]').length,
        activeStep: S.activeStep,
        steps: S.steps.length,
        activeDoms: qsa('#st-steps .st-step[data-active="true"]').length,
        refreshCount: S.refreshCount,
        progressWidth: (qs('[data-testid="site-progress"]') || {}).style
          ? qs('[data-testid="site-progress"]').style.width : null,
        dataSt: document.body.getAttribute('data-st')
      };
    },
    /** Deterministic gate hook: scroll somewhere and let ST settle. */
    scrollTo: function (y) {
      window.scrollTo(0, y);
      if (window.ScrollTrigger) window.ScrollTrigger.update();
      return Math.round(window.scrollY);
    },
    scrollToBottom: function () { return this.scrollTo(document.documentElement.scrollHeight); },
    refresh: function () { if (window.ScrollTrigger) { window.ScrollTrigger.refresh(); S.refreshCount += 1; } return S.refreshCount; },
    steps: function () { return stepEls().map(function (n) { return n.getAttribute('data-active'); }); },
    prediction: function (text) {
      var p = KK.preview.predict(text, 'mind');
      return { payload: p, validation: KK.preview.validatePrediction(p) };
    },
    contract: function () { return KK.preview.modelAdapterContract(); }
  };
  void started;
})(window.KK);
