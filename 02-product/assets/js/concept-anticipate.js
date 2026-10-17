/* ============================================================================
   KK Intent OS · concept S — anticipate / 先觉之境

   Two ideas, and both of them are checkable:

   1. GHOST COMPLETION you can argue with.
      A template appends a tail to what you actually typed — never a
      "completion" that ignores your sentence. It prints its confidence and the
      features that produced it. Tab accepts, Esc dismisses.

   2. AN ORBIT BOARD with real physics.
      Cards ride a spring-damper integrator with pairwise separation. Throw one
      and it comes back to its own slot. `KK.anticipate.step(seconds)` advances
      the simulation deterministically, so "it settles" and "they never overlap"
      are testable statements rather than claims.

   Reduced motion is honoured by opening in list mode — the same DOM, the same
   buttons, no movement. The toggle stays available either way.

   Deliberately NOT used: Matter.js. The integrator here is ~60 lines of
   spring/damping/separation, which is all this board needs; adding a physics
   engine for it would be a dependency without a reason.
   ========================================================================== */
window.KK = window.KK || {};

(function (KK) {
  'use strict';

  var el = KK.os.el, clear = KK.os.clear, qs = KK.os.qs;
  function t(k, v) { return KK.i18n.t(k, v); }

  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var S = {
    view: 'field',
    mode: REDUCED ? 'list' : 'free',
    cards: [],
    raf: 0,
    running: false,
    last: 0,
    steps: 0,
    lastPred: null,
    lastAssembled: null,
    board: null,
    seq: 0
  };

  /* ======================================================== physics core == */
  var K_SPRING = 26;     // pull toward the home slot
  var DAMPING = 3.6;     // velocity bleed
  var SEPARATION = 0.55; // how hard two overlapping cards push apart
  var FIXED = 1 / 60;

  function boardSize() {
    if (!S.board) return { w: 900, h: 480 };
    var r = S.board.getBoundingClientRect();
    return { w: Math.max(280, r.width), h: Math.max(320, r.height) };
  }

  /** Home slots: a deterministic grid that cannot start out overlapping. */
  function layout() {
    var n = S.cards.length;
    if (!n) return;
    var size = boardSize();
    var pad = 14;
    var slotW = 276, slotH = 168;
    var cols = Math.max(1, Math.min(n, Math.floor((size.w - pad * 2) / slotW) || 1));
    var rows = Math.ceil(n / cols);
    var usableW = size.w - pad * 2;
    var usableH = Math.max(slotH * rows, size.h - pad * 2);

    S.cards.forEach(function (c, i) {
      var col = i % cols;
      var row = Math.floor(i / cols);
      c.w = c.w || 252;
      c.h = c.h || 140;
      c.hx = pad + (col + 0.5) * (usableW / cols) - c.w / 2;
      c.hy = pad + (row + 0.5) * (usableH / rows) - c.h / 2;
      if (c.x === undefined) { c.x = c.hx; c.y = c.hy; c.vx = 0; c.vy = 0; }
    });
  }

  function measureCards() {
    S.cards.forEach(function (c) {
      if (!c.el) return;
      var r = c.el.getBoundingClientRect();
      if (r.width) c.w = r.width;
      if (r.height) c.h = r.height;
    });
  }

  function stepPhysics(dt) {
    var size = boardSize();
    S.cards.forEach(function (c) {
      if (c.dragging) { c.vx = 0; c.vy = 0; return; }
      var ax = (c.hx - c.x) * K_SPRING - c.vx * DAMPING;
      var ay = (c.hy - c.y) * K_SPRING - c.vy * DAMPING;
      c.vx += ax * dt;
      c.vy += ay * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
    });

    /* pairwise separation — the reason two cards never sit on top of each other */
    for (var i = 0; i < S.cards.length; i++) {
      for (var j = i + 1; j < S.cards.length; j++) {
        var a = S.cards[i], b = S.cards[j];
        var ox = (a.x + a.w / 2) - (b.x + b.w / 2);
        var oy = (a.y + a.h / 2) - (b.y + b.h / 2);
        var minX = (a.w + b.w) / 2;
        var minY = (a.h + b.h) / 2;
        var dx = Math.abs(ox), dy = Math.abs(oy);
        if (dx >= minX || dy >= minY) continue;      // no overlap
        /* resolve on the cheaper axis */
        var pushX = minX - dx;
        var pushY = minY - dy;
        var signX = ox === 0 ? (i % 2 ? 1 : -1) : (ox > 0 ? 1 : -1);
        var signY = oy === 0 ? (i % 2 ? 1 : -1) : (oy > 0 ? 1 : -1);
        if (pushX < pushY) {
          var fx = pushX * SEPARATION * (signX > 0 ? 1 : -1) / 2;
          if (!a.dragging) a.x += fx;
          if (!b.dragging) b.x -= fx;
        } else {
          var fy = pushY * SEPARATION * (signY > 0 ? 1 : -1) / 2;
          if (!a.dragging) a.y += fy;
          if (!b.dragging) b.y -= fy;
        }
      }
    }

    /* keep every card inside the board */
    S.cards.forEach(function (c) {
      var maxX = Math.max(0, size.w - c.w);
      var maxY = Math.max(0, size.h - c.h);
      if (c.x < 0) { c.x = 0; if (c.vx < 0) c.vx = -c.vx * 0.4; }
      if (c.y < 0) { c.y = 0; if (c.vy < 0) c.vy = -c.vy * 0.4; }
      if (c.x > maxX) { c.x = maxX; if (c.vx > 0) c.vx = -c.vx * 0.4; }
      if (c.y > maxY) { c.y = maxY; if (c.vy > 0) c.vy = -c.vy * 0.4; }
    });
  }

  function apply() {
    if (S.mode === 'list') return;
    S.cards.forEach(function (c) {
      if (!c.el) return;
      c.el.style.transform = 'translate3d(' + Math.round(c.x) + 'px,' + Math.round(c.y) + 'px,0)';
    });
  }

  /** Deterministic advance — the hook the gate script uses. */
  function step(seconds, fixed) {
    var dt = fixed || FIXED;
    var n = Math.max(1, Math.round((seconds || 0) / dt));
    for (var i = 0; i < n; i++) stepPhysics(dt);
    apply();
    return n;
  }

  function overlaps() {
    var pairs = [];
    for (var i = 0; i < S.cards.length; i++) {
      for (var j = i + 1; j < S.cards.length; j++) {
        var a = S.cards[i], b = S.cards[j];
        if (Math.abs((a.x + a.w / 2) - (b.x + b.w / 2)) < (a.w + b.w) / 2 &&
            Math.abs((a.y + a.h / 2) - (b.y + b.h / 2)) < (a.h + b.h) / 2) {
          pairs.push([a.id, b.id]);
        }
      }
    }
    return pairs;
  }

  function frame(ts) {
    if (!S.running) return;
    var dt = S.last ? Math.min(0.05, (ts - S.last) / 1000) : 0;
    S.last = ts;
    if (S.mode === 'free') { step(dt || FIXED); S.steps += 1; }
    S.raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (S.running || S.mode === 'list' || REDUCED) return;
    S.running = true; S.last = 0;
    S.raf = window.requestAnimationFrame(frame);
  }
  function pause() {
    S.running = false;
    if (S.raf) window.cancelAnimationFrame(S.raf);
    S.raf = 0;
  }

  /* ============================================================ card model */
  /**
   * The store owns the cards; `S.cards` is the live view of them.
   *
   * What is persisted is the CARD (id, text, tone, confidence, parked,
   * confirmed, and which pipeline it helped assemble). What is deliberately
   * NOT persisted is x/y/vx/vy: a restored board re-lays out on its own grid
   * and settles again. Those pixels are not work, they are a snapshot of a
   * running simulation — restoring them would freeze a physics state that is
   * about to be recomputed anyway.
   */
  function persistCards() {
    KK.store.setCards(S.cards.map(function (c) {
      return {
        id: c.id, text: c.text, tone: c.tone, conf: c.conf,
        parked: c.parked, confirmed: c.confirmed
      };
    }));
  }

  /** Rebuild the live board from the store's slot for the current workspace. */
  function restoreCards() {
    var stored = (KK.store.state.cards || []);
    S.cards = stored.map(function (c) {
      return {
        id: c.id, text: c.text, tone: c.tone || 'neutral', conf: c.conf || 0,
        parked: !!c.parked, confirmed: !!c.confirmed, dragging: false,
        vx: 0, vy: 0, el: null
      };
    });
    /* Resume the id sequence so a restored card can never collide with a new one. */
    S.seq = S.cards.reduce(function (m, c) {
      var n = parseInt(String(c.id).replace(/[^0-9]/g, ''), 10);
      return isFinite(n) ? Math.max(m, n) : m;
    }, 0);
    return S.cards.length;
  }

  function addCard(text, pred) {
    S.seq += 1;
    var card = {
      id: 'card_' + S.seq, text: text, tone: pred ? pred.features.tone : 'neutral',
      conf: pred ? pred.confidence : 0,
      parked: false, confirmed: false, dragging: false,
      vx: 0, vy: 0
    };
    S.cards.push(card);
    persistCards();
    return card;
  }

  /* ==================================================== assembled pipeline = */
  /**
   * A confirmed card is not just a receipt — it is an assembled intent.
   * This is the one part of concept N that survives into the main line: the
   * dependency graph. It is built from the SAME adapter (`KK.preview.
   * buildPipeline`), so both surfaces produce structurally identical graphs.
   *
   * Assembly ACCUMULATES inside a workspace: confirming a second card adds it
   * to the existing graph rather than replacing the graph the user already
   * has. That is the whole point of "keep the assembled pipeline".
   */
  function assemblePipeline(card) {
    var scenario = KK.store.state.scenario;
    var existing = KK.store.state.pipeline;
    if (existing && existing.scenario === scenario) {
      existing.cards = existing.cards || [];
      if (existing.cards.indexOf(card.id) < 0) existing.cards.push(card.id);
      existing.lastAssembledAt = Date.now();
      KK.store.setPipeline(existing);
      KK.store.markAssembled();
      return existing;
    }
    var pipeline = KK.preview.buildPipeline(scenario);
    pipeline.builtAt = pipeline.builtAt || Date.now();
    pipeline.fingerprint = KK.preview.hash(String(card.text) + '|' + scenario).toString(16);
    pipeline.cards = [card.id];
    pipeline.lastAssembledAt = Date.now();
    /* Same dependency rule the rail uses: a node whose upstream is not done
       starts blocked, so the graph never looks more ready than it is. */
    pipeline.nodes = KK.preview.recompute(pipeline.nodes, pipeline.edges);
    KK.store.setPipeline(pipeline);
    KK.store.markAssembled();
    return pipeline;
  }

  function cardEl(card) {
    var node = el('article', {
      class: 's-card', 'data-card': card.id, 'data-parked': 'false', 'data-confirmed': 'false',
      tabindex: '0', role: 'group', 'aria-label': card.id
    }, [
      el('p', { class: 's-card__text', text: card.text }),
      el('div', { class: 's-card__meta' }, [
        el('span', { class: 'chip', 'data-tone': card.tone === 'alert' ? 'signal' : null,
          text: t('s.orbits.cardTone', { n: t('sig.tone.' + card.tone) }) }),
        el('span', { class: 'chip', text: t('s.field.confidence', { n: Math.round(card.conf * 100) + '%' }) })
      ]),
      el('div', { class: 's-card__acts' }, [
        el('button', { class: 'btn', type: 'button', 'data-card-act': 'confirm', 'data-target': card.id, text: t('s.orbits.confirm') }),
        el('button', { class: 'btn btn--ghost', type: 'button', 'data-card-act': 'park', 'data-target': card.id, text: t('s.orbits.park') })
      ])
    ]);
    return node;
  }

  function wireCard(card, node) {
    var startPt = null;

    node.addEventListener('pointerdown', function (ev) {
      if (S.mode === 'list') return;
      if (ev.target.closest('button')) return;
      card.dragging = true;
      startPt = { x: ev.clientX - card.x, y: ev.clientY - card.y, lx: ev.clientX, ly: ev.clientY, lts: performance.now() };
      card.vx = 0; card.vy = 0;
      node.setAttribute('data-dragging', 'true');
      node.setPointerCapture(ev.pointerId);
    });
    node.addEventListener('pointermove', function (ev) {
      if (!card.dragging) return;
      card.x = ev.clientX - startPt.x;
      card.y = ev.clientY - startPt.y;
      var now = performance.now();
      var dt = Math.max(1, now - startPt.lts);
      card.vx = ((ev.clientX - startPt.lx) / dt) * 1000;
      card.vy = ((ev.clientY - startPt.ly) / dt) * 1000;
      startPt.lx = ev.clientX; startPt.ly = ev.clientY; startPt.lts = now;
      apply();
    });
    function release(ev) {
      if (!card.dragging) return;
      card.dragging = false;
      node.removeAttribute('data-dragging');
      try { node.releasePointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
      /* fling: the velocity we measured is what it leaves with */
      card.vx = Math.max(-2400, Math.min(2400, card.vx));
      card.vy = Math.max(-2400, Math.min(2400, card.vy));
    }
    node.addEventListener('pointerup', release);
    node.addEventListener('pointercancel', release);

    node.addEventListener('keydown', function (ev) {
      if (S.mode !== 'free') return;
      var d = ev.shiftKey ? 48 : 12;
      var moved = true;
      if (ev.key === 'ArrowLeft') card.x -= d;
      else if (ev.key === 'ArrowRight') card.x += d;
      else if (ev.key === 'ArrowUp') card.y -= d;
      else if (ev.key === 'ArrowDown') card.y += d;
      else moved = false;
      if (!moved) return;
      ev.preventDefault();
      card.vx = 0; card.vy = 0;
      apply();
    });
    node.addEventListener('focus', function () { KK.sound.play(card.tone === 'alert' ? 0.85 : 0.3); });
  }

  function confirmCard(card) {
    return KK.preview.executeNode({ id: card.id, titleKey: 's.receipt.cardTitle' }, { approved: true }).then(function (res) {
      card.confirmed = true;
      KK.store.addReceipt({
        stepId: card.id, titleKey: 's.receipt.cardTitle',
        mode: res.mode, status: res.receipt.status, approvedBy: 'user',
        verifiable: ['s.verifiable.local'], notes: ['s.receipt.note']
      });
      KK.store.addArtifact({
        kind: 'orbit-card', titleKey: 's.receipt.cardTitle', bodyKey: null,
        values: { text: card.text, tone: card.tone, confidence: card.conf },
        origin: { mode: 'DEMO', previewOnly: true }
      });
      /* ...and it assembles. Whatever this workspace has already built stays
         built; this card is added to it. */
      var pipeline = assemblePipeline(card);
      persistCards();
      S.lastAssembled = pipeline;
      KK.field.pulse(0.9, 700);
      KK.field.setSignal(card.tone === 'alert' ? 1 : 0.35);
      KK.os.toast('s.toast.cardConfirmed', 'ok', { nodes: pipeline.nodes.length });
      renderCurrent();
      return res;
    });
  }

  function parkCard(card) {
    card.parked = !card.parked;
    persistCards();
    KK.os.toast('s.toast.cardParked', 'warn');
    renderCurrent();
  }

  /* ================================================================ views */
  var currentView = 'field';
  function renderCurrent() {
    if (currentView === 'orbits') viewOrbits();
    else if (currentView === 'ledger') viewLedger();
    else viewField();
    /* fresh [data-i18n] nodes need the translation pass, same as concept N */
    KK.i18n.apply(document);
  }

  function suggestions() {
    return [t('s.suggest.mind'), t('s.suggest.bond'), t('s.suggest.life')];
  }

  /* ---- field ---- */
  function viewField() {
    var host = qs('[data-testid="stage"]');
    clear(host);
    host.setAttribute('data-view', 'field');

    var wrap = el('div', { class: 's-field' });
    wrap.appendChild(el('span', { class: 'eyebrow', 'data-i18n': 's.field.eyebrow' }));
    wrap.appendChild(el('h1', { class: 'core-title s-title', 'data-testid': 's-core-title' }, [
      el('span', { 'data-i18n': 's.field.h1' }),
      el('span', { class: 'sub', 'data-i18n': 's.field.sub' })
    ]));

    var frame = el('div', { class: 'composer__frame', 'data-testid': 's-composer', 'data-signal': 'idle' });
    var input = el('textarea', {
      class: 'composer__input', 'data-testid': 's-input', id: 's-input', rows: '3',
      'data-i18n-ph': 's.field.placeholder', spellcheck: 'false', autocomplete: 'off'
    });
    input.value = KK.store.getDraft('composer');
    var ghost = el('div', { class: 'composer__ghost', 'data-testid': 's-ghost', 'aria-hidden': 'true', hidden: true }, [
      el('span', { class: 'typed' }), el('span', { class: 'tail' })
    ]);
    frame.appendChild(ghost);
    frame.appendChild(input);
    wrap.appendChild(frame);

    var chips = el('div', { class: 'chips', 'data-testid': 's-chips' });
    wrap.appendChild(chips);

    var panel = el('div', { class: 's-predict', 'data-testid': 's-predict', 'data-show': 'false' });
    wrap.appendChild(panel);

    var row = el('div', { class: 'composer__row' }, [
      el('button', { class: 'btn btn--primary', type: 'button', 'data-testid': 's-accept', 'data-i18n': 's.field.accept' }),
      el('button', { class: 'btn', type: 'button', 'data-testid': 's-tocard', 'data-i18n': 's.field.toCard' }),
      el('button', { class: 'btn btn--ghost', type: 'button', 'data-testid': 's-clear', 'data-i18n': 's.field.clear' })
    ]);
    wrap.appendChild(row);
    wrap.appendChild(el('p', { class: 'mono', style: 'color:var(--text-faint)', 'data-i18n': 's.field.kbdHint' }));

    var sugg = el('div', { class: 'n-seeds', 'data-testid': 's-suggest' });
    sugg.appendChild(el('span', { class: 'chip', style: 'border:0;background:none;padding:0', 'data-i18n': 's.suggestLabel' }));
    var scnKey = KK.store.state.scenario;
    var sBtn = el('button', { class: 'btn n-seed', type: 'button', 'data-testid': 's-suggest-btn',
      'data-suggest': scnKey, text: t('s.suggest.' + scnKey) });
    sugg.appendChild(sBtn);
    wrap.appendChild(sugg);
    wrap.appendChild(el('p', { class: 'mono', style: 'color:var(--text-faint);max-width:70ch', 'data-i18n': 's.field.note' }));

    host.appendChild(wrap);

    /* ---- ghost + prediction ---- */
    function renderPrediction() {
      var text = input.value;
      var pred = KK.preview.predict(text, KK.store.state.scenario);
      S.lastPred = pred;

      var tailText = '';
      var typedLen = text.length;
      if (pred.fired && pred.tailId) {
        var tail = t('s.tail.' + pred.tailId);
        /* Simulate the box model: the ghost layer mirrors the textarea, so
           the tail starts exactly where the caret is. A trailing newline is
           added when the typed text already ends with one. */
        tailText = /[\s]$/.test(text) ? tail.trim() : (' ' + tail.trim());
      }
      var typedSpan = qs('.typed', ghost), tailSpan = qs('.tail', ghost);
      typedSpan.textContent = text;
      tailSpan.textContent = tailText;
      ghost.hidden = !tailText;
      ghost.setAttribute('data-tail', pred.tailId || '');
      ghost.setAttribute('data-fired', String(pred.fired));
      void typedLen;

      frame.setAttribute('data-signal', pred.features.chars < 2 ? 'idle' :
        (pred.features.tone === 'alert' ? 'alert' : (pred.features.tone === 'calm' ? 'ready' : 'calm')));
      KK.field.setSignal(pred.features.tone === 'alert' ? 1 : (pred.features.tone === 'calm' ? 0.12 : 0.5));
      KK.os.chips(chips, pred.features);

      clear(panel);
      panel.removeAttribute('data-confidence');
      panel.removeAttribute('data-band');
      if (!pred.fired) {
        panel.setAttribute('data-show', 'false');
        panel.appendChild(el('p', { class: 'n-empty', 'data-i18n': 's.field.idle' }));
        return false;
      }
      panel.setAttribute('data-show', 'true');
      panel.setAttribute('data-confidence', String(pred.confidence));
      panel.setAttribute('data-band', pred.confidenceBand);
      panel.appendChild(el('div', { class: 's-predict__head' }, [
        el('span', { class: 'chip', text: t('s.field.ghostLabel') }),
        el('span', { class: 'chip', 'data-tone': 'accent', text: t('s.field.confidence', { n: Math.round(pred.confidence * 100) + '%' }) }),
        el('span', { class: 'chip', text: t('s.field.band.' + pred.confidenceBand) }),
        el('span', { class: 'chip', 'data-tone': 'warn', text: 'notAModel' })
      ]));
      var meter = el('div', { class: 's-meter' }, [el('i')]);
      panel.appendChild(meter);
      qs('i', meter).style.width = Math.round(pred.confidence * 100) + '%';
      panel.appendChild(el('p', { class: 's-basis-title', 'data-i18n': 's.field.basisTitle' }));
      var ul = el('ul', { class: 's-basis', 'data-testid': 's-basis' });
      pred.basis.forEach(function (b) {
        ul.appendChild(el('li', { 'data-basis': b.id, text: t('s.field.basis.' + b.id, { value: b.value }) }));
      });
      panel.appendChild(ul);
      return true;
    }

    input.addEventListener('input', function () {
      KK.store.setDraft('composer', input.value);
      var fired = renderPrediction();
      if (fired) {
        var st = KK.store.state;
        var samples = (st.signals || []).concat([{
          chars: S.lastPred.features.chars, tone: S.lastPred.features.tone,
          confidence: S.lastPred.confidence, at: Date.now()
        }]).slice(-40);
        KK.store.patch({ signals: samples }, 'signal');
      }
    });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Tab' && !ev.shiftKey && ghost.hidden === false) {
        ev.preventDefault();
        acceptPrediction();
      } else if (ev.key === 'Escape') {
        ghost.hidden = true;
        panel.setAttribute('data-show', 'false');
        ghost.setAttribute('data-tail', '');
      }
    });

    function acceptPrediction() {
      var tail = qs('.tail', ghost).textContent;
      if (!tail) { KK.os.toast('s.toast.tooShort', 'warn'); return; }
      input.value = input.value + tail;
      KK.store.setDraft('composer', input.value);
      ghost.hidden = true;
      KK.os.toast('s.toast.accepted', 'ok');
      input.dispatchEvent(new Event('input'));
      input.focus();
    }

    qs('[data-testid="s-accept"]', wrap).addEventListener('click', acceptPrediction);
    qs('[data-testid="s-tocard"]', wrap).addEventListener('click', function () {
      var text = input.value.trim();
      if (text.length < 2) { KK.os.toast('s.toast.tooShort', 'warn'); return; }
      var card = addCard(text, S.lastPred);
      persistCards();
      KK.os.toast('s.toast.cardAdded', 'ok');
      location.hash = '#/orbits';
    });
    qs('[data-testid="s-clear"]', wrap).addEventListener('click', function () {
      input.value = ''; KK.store.setDraft('composer', '');
      ghost.hidden = true; panel.setAttribute('data-show', 'false');
      frame.setAttribute('data-signal', 'idle');
      KK.field.setSignal(0);
      clear(chips);
      chips.appendChild(el('span', { class: 'chip', 'data-i18n': 's.field.idle' }));
      KK.i18n.apply(chips);
      input.focus();
    });
    sBtn.addEventListener('click', function () {
      input.value = t('s.suggest.' + KK.store.state.scenario);
      KK.store.setDraft('composer', input.value);
      input.dispatchEvent(new Event('input'));
      input.focus();
    });

    /* restore the live read-out on every render (language switch, navigation) */
    if (input.value.length) input.dispatchEvent(new Event('input'));
    else {
      KK.os.chips(chips, { chars: 0, words: 0, punctuation: 0, alertHits: [], calmHits: [], alert: 0, calm: 0, tone: 'neutral' });
    }
  }

  /* ---- orbit board ---- */
  function viewOrbits() {
    var host = qs('[data-testid="stage"]');
    clear(host);
    host.setAttribute('data-view', 'orbits');

    host.appendChild(el('section', { class: 'section' }, [
      el('h2', { 'data-i18n': 's.orbits.title' }),
      el('p', { 'data-i18n': 's.orbits.lead' })
    ]));

    if (REDUCED) host.appendChild(el('p', { class: 's-hint', 'data-testid': 's-auto-list', 'data-i18n': 's.orbits.autoList' }));

    var dock = el('div', { class: 's-dock', 'data-testid': 's-dock' }, [
      el('span', { class: 'mono', style: 'color:var(--text-faint)', 'data-i18n': 's.orbits.modeLabel' }),
      el('button', { class: 'btn', type: 'button', 'data-testid': 's-mode-free', 'data-i18n': 's.orbits.modeFree' }),
      el('button', { class: 'btn', type: 'button', 'data-testid': 's-mode-list', 'data-i18n': 's.orbits.modeList' }),
      el('button', { class: 'btn btn--ghost', type: 'button', 'data-testid': 's-settle', 'data-i18n': 's.orbits.settle' }),
      el('span', { class: 's-hint', 'data-testid': 's-overlap', text: t('s.orbits.overlap', { n: overlaps().length }) })
    ]);
    host.appendChild(dock);

    var board = el('div', { class: 's-board', 'data-testid': 's-board', 'data-mode': S.mode });
    host.appendChild(board);
    S.board = board;

    if (!S.cards.length) {
      board.appendChild(el('p', { class: 's-empty', style: 'padding:var(--s-5)', 'data-i18n': 's.orbits.empty' }));
    } else {
      S.cards.forEach(function (card) {
        var node = cardEl(card);
        node.setAttribute('data-parked', String(card.parked));
        node.setAttribute('data-confirmed', String(card.confirmed));
        board.appendChild(node);
        card.el = node;
        wireCard(card, node);
      });
    }
    host.appendChild(el('p', { class: 's-hint', 'data-i18n': 's.orbits.dragHint' }));
    host.appendChild(el('p', { class: 's-hint', 'data-i18n': 's.orbits.kbdHint' }));

    /* ---- wiring ---- */
    dock.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-testid]');
      if (!b) return;
      var id = b.getAttribute('data-testid');
      if (id === 's-mode-free') setMode('free');
      else if (id === 's-mode-list') setMode('list');
      else if (id === 's-settle') settleAll();
    });

    board.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-card-act]');
      if (!b) return;
      var card = S.cards.filter(function (c) { return c.id === b.getAttribute('data-target'); })[0];
      if (!card) return;
      if (b.getAttribute('data-card-act') === 'confirm') confirmCard(card);
      else parkCard(card);
    });

    measureCards();
    layout();
    apply();
    start();
  }

  function setMode(mode) {
    S.mode = mode;
    if (mode === 'list') { pause(); settleAll(true); }
    else { start(); }
    if (S.board) S.board.setAttribute('data-mode', mode);
    document.body.setAttribute('data-board-mode', mode);
    KK.os.toast(mode === 'list' ? 's.toast.modeList' : 's.toast.modeFree', 'ok');
    renderCurrent();
  }

  function settleAll(silent) {
    pause();
    var guard = 0;
    while (overlaps().length && guard < 400) { step(0.1); guard += 1; }
    step(0.6);
    if (!silent) KK.os.toast('s.toast.settled', 'ok');
    var note = qs('[data-testid="s-overlap"]');
    if (note) note.textContent = t('s.orbits.overlap', { n: overlaps().length });
    if (S.mode === 'free') start();
  }

  /* ---- ledger ---- */
  function viewLedger() {
    var host = qs('[data-testid="stage"]');
    clear(host);
    host.setAttribute('data-view', 'ledger');

    host.appendChild(el('section', { class: 'section' }, [
      el('h2', { 'data-i18n': 's.ledger.title' }),
      el('p', { 'data-i18n': 's.ledger.lead' })
    ]));

    var grid = el('div', { class: 's-ledger' });
    var st = KK.store.state;

    /* 1 · signal samples */
    var c1 = el('div', { class: 'card', 'data-testid': 's-signals' });
    c1.appendChild(el('h3', { style: 'font-size:var(--fs-14);margin-bottom:var(--s-3)', 'data-i18n': 's.ledger.signals' }));
    var list1 = el('div', { class: 's-col', 'data-count': String((st.signals || []).length) });
    if (!(st.signals || []).length) list1.appendChild(el('p', { class: 's-empty', 'data-i18n': 's.ledger.signalsEmpty' }));
    (st.signals || []).slice(-8).reverse().forEach(function (s) {
      list1.appendChild(el('div', { class: 's-row', 'data-tone': s.tone }, [
        el('div', { class: 's-bar' }, [
          el('i', { style: 'width:' + Math.max(2, Math.round(s.confidence * 90)) + 'px' }),
          document.createTextNode(t('sig.tone.' + s.tone) + ' · ' + Math.round(s.confidence * 100) + '% · ' + s.chars + ' chars')
        ])
      ]));
    });
    c1.appendChild(list1);
    grid.appendChild(c1);

    /* 2 · artifacts */
    var c2 = el('div', { class: 'card', 'data-testid': 's-artifacts' });
    c2.appendChild(el('h3', { style: 'font-size:var(--fs-14);margin-bottom:var(--s-3)', 'data-i18n': 's.ledger.artifacts' }));
    var list2 = el('div', { class: 's-col', 'data-count': String(st.artifacts.length) });
    if (!st.artifacts.length) list2.appendChild(el('p', { class: 's-empty', 'data-i18n': 's.ledger.artifactsEmpty' }));
    st.artifacts.slice(0, 6).forEach(function (a) {
      list2.appendChild(el('div', { class: 's-row', 'data-artifact': a.id, 'data-kind': a.kind }, [
        el('div', { class: 's-row__head' }, [
          el('span', { class: 'chip', text: a.kind }),
          el('span', { class: 'chip', text: scnLabel(a.scenarioAtWrite) })
        ]),
        el('div', { class: 's-row__body', text: String((a.values && a.values.text) || t(a.titleKey)).slice(0, 120) })
      ]));
    });
    c2.appendChild(list2);
    grid.appendChild(c2);

    /* 3 · receipts */
    var c3 = el('div', { class: 'card', 'data-testid': 's-receipts' });
    c3.appendChild(el('h3', { style: 'font-size:var(--fs-14);margin-bottom:var(--s-3)', 'data-i18n': 's.ledger.receipts' }));
    var list3 = el('div', { class: 's-col', 'data-count': String(st.receipts.length) });
    if (!st.receipts.length) list3.appendChild(el('p', { class: 's-empty', 'data-i18n': 's.ledger.receiptsEmpty' }));
    st.receipts.slice(0, 6).forEach(function (r) {
      list3.appendChild(el('div', { class: 's-row', 'data-receipt': r.id, 'data-mode': r.mode,
        'data-external-changed': String(!!r.externalWorldChanged) }, [
        el('div', { class: 's-row__head' }, [
          el('span', { class: 'chip', 'data-tone': r.mode === 'SANDBOX' ? 'warn' : null, text: r.mode }),
          el('span', { class: 'chip', text: scnLabel(r.scenarioAtWrite) })
        ]),
        el('div', { class: 's-row__body', text: t(r.titleKey || 's.receipt.cardTitle') }),
        el('div', { class: 's-row__body', text: 'externalWorldChanged = ' + String(!!r.externalWorldChanged) })
      ]));
    });
    c3.appendChild(list3);
    grid.appendChild(c3);

    /* 4 · permission outcomes — the three-way, measured */
    var c4 = el('div', { class: 'card', 'data-testid': 's-consents' });
    c4.appendChild(el('h3', { style: 'font-size:var(--fs-14);margin-bottom:var(--s-3)', 'data-i18n': 's.ledger.consents' }));
    var list4 = el('div', { class: 's-col', 'data-count': String(st.consents.length) });
    if (!st.consents.length) list4.appendChild(el('p', { class: 's-empty', 'data-i18n': 's.ledger.consentsEmpty' }));
    st.consents.slice(0, 6).forEach(function (c) {
      list4.appendChild(el('div', { class: 's-row', 'data-consent': c.id, 'data-outcome': c.outcome }, [
        el('div', { class: 's-row__head' }, [
          el('span', { class: 'chip', text: t('s.consent.' + c.kind) }),
          el('span', { class: 'chip', 'data-tone': c.outcome === 'granted' ? 'accent' : (c.outcome === 'denied' ? 'signal' : 'warn'),
            text: t('s.consent.' + c.outcome) })
        ])
      ]));
    });
    c4.appendChild(list4);
    c4.appendChild(el('p', { class: 's-hint', 'data-i18n': 's.ledger.micNote' }));
    c4.appendChild(el('div', { class: 'composer__row' }, [
      el('button', { class: 'btn', type: 'button', 'data-testid': 's-mic', 'data-i18n': 's.ledger.micTest' })
    ]));
    grid.appendChild(c4);

    /* 5 · the assembled pipeline — the part of concept N that earns its place
       on the main line. It is per-workspace, and switching workspace keeps it. */
    var pl = st.pipeline;
    var c5 = el('div', { class: 'card', 'data-testid': 's-pipeline' });
    c5.appendChild(el('h3', { style: 'font-size:var(--fs-14);margin-bottom:var(--s-3)', 'data-i18n': 's.ledger.pipeline' }));
    var list5 = el('div', {
      class: 's-col',
      'data-count': String(pl ? pl.nodes.length : 0),
      'data-edges': String(pl ? pl.edges.length : 0),
      'data-assembled': String(!!(pl && pl.assembledAt)),
      'data-scenario': pl ? pl.scenario : ''
    });
    if (!pl) {
      list5.appendChild(el('p', { class: 's-empty', 'data-i18n': 's.ledger.pipelineEmpty' }));
    } else {
      list5.appendChild(el('div', { class: 's-row' }, [
        el('div', { class: 's-row__head' }, [
          el('span', { class: 'chip', 'data-tone': pl.assembledAt ? 'accent' : 'warn',
            text: t(pl.assembledAt ? 's.ledger.pipelineAssembled' : 's.ledger.pipelineDraft') }),
          el('span', { class: 'chip', text: scnLabel(pl.scenario) }),
          el('span', { class: 'chip', text: pl.fingerprint || '—' })
        ]),
        el('div', { class: 's-row__body', text: t('s.ledger.pipelineShape', { n: pl.nodes.length, e: pl.edges.length }) }),
        el('div', { class: 's-row__body', text: t('s.ledger.pipelineContrib', { n: (pl.cards || []).length }) })
      ]));
      var laneBox = el('div', { class: 's-row__head', style: 'margin-top:var(--s-2)' });
      var seen = {};
      pl.nodes.forEach(function (n) {
        if (seen[n.lane]) return;
        seen[n.lane] = true;
        laneBox.appendChild(el('span', { class: 'chip', 'data-lane': n.lane,
          text: t('s.ledger.lane', { lane: n.lane, n: pl.nodes.filter(function (x) { return x.lane === n.lane; }).length }) }));
      });
      list5.appendChild(laneBox);
      pl.nodes.forEach(function (n) {
        list5.appendChild(el('div', { class: 's-row', 'data-node': n.id, 'data-node-state': n.state }, [
          el('div', { class: 's-row__head' }, [
            el('span', { class: 'chip', 'data-tone': n.state === 'blocked' ? 'warn' : (n.state === 'done' ? 'accent' : null), text: n.state }),
            el('span', { class: 'chip', text: n.lane }),
            el('span', { class: 'chip', text: t(n.titleKey) })
          ])
        ]));
      });
    }
    c5.appendChild(list5);
    c5.appendChild(el('p', { class: 's-hint', 'data-i18n': 's.ledger.pipelineNote' }));
    grid.appendChild(c5);

    /* 6 · the contract a real model would have to satisfy. This is the answer
       to "could you plug a model in?" written as data instead of a promise. */
    var mc = KK.preview.modelAdapterContract();
    var sample = KK.preview.predict(KK.store.getDraft('composer') || '', st.scenario);
    var v = KK.preview.validatePrediction(sample);
    var c6 = el('div', {
      class: 'card', 'data-testid': 's-contract',
      /* The state lives on the testid element itself, not on an inner node: a
         gate (or a reader with the inspector open) should be able to read the
         contract's live state from the element that names it. */
      'data-contract': v.name,
      'data-validate': String(v.ok),
      'data-problems': String(v.missing.length + v.wrongType.length + v.broken.length),
      'data-fields': String(mc.mustNotChange.length),
      'data-status': mc.status,
      'data-endpoint': String(mc.endpoint)
    });
    c6.appendChild(el('h3', { style: 'font-size:var(--fs-14);margin-bottom:var(--s-3)', 'data-i18n': 's.ledger.contract' }));
    var list6 = el('div', { class: 's-col' });
    list6.appendChild(el('div', { class: 's-row' }, [
      el('div', { class: 's-row__head' }, [
        el('span', { class: 'chip', 'data-tone': 'warn', text: mc.status }),
        el('span', { class: 'chip', text: mc.mustReturn })
      ]),
      el('div', { class: 's-row__body', text: t('s.contract.endpoint', { v: mc.endpoint === null ? '—' : mc.endpoint }) }),
      el('div', { class: 's-row__body', text: mc.reason })
    ]));
    mc.mustChange.forEach(function (ch) {
      list6.appendChild(el('div', { class: 's-row', 'data-change': ch.field }, [
        el('div', { class: 's-row__body', text: t('s.contract.change', { field: ch.field, to: ch.to }) })
      ]));
    });
    list6.appendChild(el('div', { class: 's-row', 'data-validate-row': String(v.ok) }, [
      el('div', { class: 's-row__head' }, [
        el('span', { class: 'chip', 'data-tone': v.ok ? 'accent' : 'signal', text: t(v.ok ? 's.contract.valid' : 's.contract.invalid') })
      ]),
      el('div', { class: 's-row__body', text: t('s.contract.validated', { n: mc.mustNotChange.length }) })
    ]));
    list6.appendChild(el('div', { class: 's-row__body', text: t('s.contract.confidenceRule', { w: JSON.stringify(KK.preview.PREDICTION_CONTRACT.weights) }) }));
    c6.appendChild(list6);
    c6.appendChild(el('p', { class: 's-hint', 'data-i18n': 's.ledger.contractNote' }));
    grid.appendChild(c6);

    host.appendChild(grid);

    qs('[data-testid="s-mic"]', c4).addEventListener('click', testMic);
  }

  function scnLabel(key) {
    var s = KK.store.scenario(key) || KK.store.scenario('mind');
    return t(s.labelKey);
  }

  /** Ask the browser for real. Record whatever it answers. */
  function testMic() {
    var kind = KK.preview.permissionState('microphone');
    if (kind === 'unsupported') {
      KK.store.addConsent({ kind: 'microphone', granted: false, outcome: 'unavailable' });
      KK.os.toast('s.toast.micUnavailable', 'warn');
      renderCurrent();
      return Promise.resolve('unavailable');
    }
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      stream.getTracks().forEach(function (tr) { tr.stop(); });
      KK.store.addConsent({ kind: 'microphone', granted: true, outcome: 'granted' });
      KK.os.toast('s.toast.micGranted', 'ok');
      renderCurrent();
      return 'granted';
    }).catch(function (err) {
      var name = (err && err.name) || '';
      var outcome = (name === 'NotFoundError' || name === 'NotSupportedError' || name === 'OverconstrainedError')
        ? 'unavailable' : 'denied';
      KK.store.addConsent({ kind: 'microphone', granted: false, outcome: outcome });
      KK.os.toast(outcome === 'denied' ? 's.toast.micDenied' : 's.toast.micUnavailable', outcome === 'denied' ? 'deny' : 'warn');
      renderCurrent();
      return outcome;
    });
  }

  /* ================================================================= boot */
  KK.os.boot({
    concept: 'anticipate',
    defaultView: 'field',
    views: [
      { id: 'field', labelKey: 's.view.field' },
      { id: 'orbits', labelKey: 's.view.orbits' },
      { id: 'ledger', labelKey: 's.view.ledger' }
    ],
    onView: function (view) {
      currentView = view;
      pause();
      renderCurrent();
    },
    onLang: function () { renderCurrent(); },
    onScenario: function (result) {
      /* The board is RESTORED from this workspace's slot, not cleared.
         `result.retained` carries what was stashed and what came back; the
         toast in the shell says it out loud. */
      pause();
      restoreCards();
      S.lastAssembled = KK.store.state.pipeline || null;
      KK.field.setSignal(0);
      renderCurrent();
      return result;
    }
  });

  var navAria = qs('[data-testid="view-nav"]');
  if (navAria) navAria.setAttribute('aria-label', t('s.navAria'));

  window.addEventListener('resize', function () {
    if (currentView !== 'orbits') return;
    layout();
    apply();
  });

  document.body.setAttribute('data-board-mode', S.mode);
  document.body.setAttribute('data-reduced-motion', REDUCED ? 'true' : 'false');

  /* A reload inside the same tab restores the board from the store, for the
     same reason a workspace switch does: it is work the user did. */
  restoreCards();
  S.lastAssembled = KK.store.state.pipeline || null;
  if (S.cards.length) renderCurrent();

  KK.anticipate = {
    predict: function (text) { return KK.preview.predict(text, KK.store.state.scenario); },
    addFromDraft: function (text) {
      /* the card's confidence must come from the card's own text, never from
         whatever happened to be in the composer last */
      var c = addCard(text, KK.preview.predict(text, KK.store.state.scenario));
      renderCurrent();
      return c;
    },
    /** deterministic simulation advance, for the gate script */
    step: step,
    /** pause the rAF loop so `step` is the only thing moving the board */
    pause: pause,
    resume: start,
    settle: settleAll,
    setMode: setMode,
    fling: function (id, vx, vy) {
      var c = S.cards.filter(function (x) { return x.id === id; })[0];
      if (!c) return false;
      c.vx = vx; c.vy = vy;
      return true;
    },
    confirm: function (id) {
      var c = S.cards.filter(function (x) { return x.id === id; })[0];
      return c ? confirmCard(c) : Promise.resolve(null);
    },
    testMic: testMic,
    overlaps: overlaps,
    /** restore the live board from the store slot (used by the gate too) */
    restore: restoreCards,
    /** assemble a card's intent into this workspace's pipeline */
    assemble: function (id) {
      var c = S.cards.filter(function (x) { return x.id === id; })[0];
      return c ? assemblePipeline(c) : null;
    },
    sound: function () { return KK.sound.state(); },
    contract: function () { return KK.preview.modelAdapterContract(); },
    prediction: function (text) {
      var p = KK.preview.predict(text, KK.store.state.scenario);
      return { payload: p, validation: KK.preview.validatePrediction(p) };
    },
    slots: function () { return KK.store.preservedSlots(); },
    state: function () {
      var pl = KK.store.state.pipeline;
      return {
        view: currentView,
        mode: S.mode,
        reducedMotion: REDUCED,
        running: S.running,
        steps: S.steps,
        overlaps: overlaps().length,
        cards: S.cards.map(function (c) {
          return { id: c.id, x: Math.round(c.x), y: Math.round(c.y), vx: Math.round(c.vx), vy: Math.round(c.vy),
                   hx: Math.round(c.hx), hy: Math.round(c.hy), w: c.w, h: c.h,
                   parked: c.parked, confirmed: c.confirmed };
        }),
        /** retained across a workspace switch — this is what decision 5 means */
        pipeline: pl ? {
          scenario: pl.scenario, nodes: pl.nodes.length, edges: pl.edges.length,
          assembled: !!pl.assembledAt, assembledAt: pl.assembledAt || null,
          states: pl.nodes.map(function (n) { return n.id + ':' + n.state; }),
          cards: (pl.cards || []).slice()
        } : null,
        slots: KK.store.preservedSlots()
      };
    }
  };
})(window.KK);
