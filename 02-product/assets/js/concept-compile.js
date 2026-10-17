/* ============================================================================
   KK Intent OS · concept N — compile / 编译之境

   The idea in one sentence: an instruction becomes a graph you can watch being
   built, and every number you see on the way is a number we measured.

   Borrowed patterns, and where they come from:
     - the frame that asks one question        (v0's opening, Cosmos's quiet)
     - a compile log that prints real progress (Cerebrium's terminal component)
     - nodes that assemble one after another   (Framer's live assembly)
   None of the three is copied; all three are credited in docs/REFERENCE_AUDIT.md.

   Deliberately absent: ScrollTrigger. This shell routes views instead of
   scrolling one long page, so a scroll-linked animation engine would be a
   dependency with no consumer. See docs/SPEC_COMPILE.md §dependencies.
   ========================================================================== */
window.KK = window.KK || {};

(function (KK) {
  'use strict';

  var el = KK.os.el, clear = KK.os.clear, qs = KK.os.qs;
  function t(k, v) { return KK.i18n.t(k, v); }

  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var S = {
    payload: null,      // last compile payload
    nodes: [],          // shallow copy of the pipeline nodes (state lives here)
    edges: [],
    selected: null,
    group: null,        // THREE.Group for the network
    meshes: {},         // nodeId -> mesh
    tubes: [],
    packets: [],
    view: 'frame'
  };

  /* ------------------------------------------------------------- utilities */
  function cssColor(name, fallback) {
    var v = (getComputedStyle(document.body).getPropertyValue(name) || '').trim();
    return v || fallback;
  }

  function stateCounts() {
    var c = { todo: 0, blocked: 0, done: 0 };
    S.nodes.forEach(function (n) { c[n.state] = (c[n.state] || 0) + 1; });
    return c;
  }

  /** A receipt written by an older session may name a scenario we no longer
      define; never let that turn into a crash in the log view. */
  function scnLabel(key) {
    var s = KK.store.scenario(key) || KK.store.scenario('mind');
    return t(s.labelKey);
  }

  function blockedBy(id) {
    return S.edges.filter(function (e) {
      if (e[1] !== id) return false;
      var src = S.nodes.filter(function (n) { return n.id === e[0]; })[0];
      return src && src.state !== 'done';
    }).map(function (e) { return e[0]; });
  }

  /* ------------------------------------------------------------- 3D layer */
  function disposeNet() {
    if (!S.group) return;
    [].concat(Object.keys(S.meshes).map(function (k) { return S.meshes[k]; }), S.tubes)
      .forEach(function (m) {
        if (!m) return;
        if (m.geometry) m.geometry.dispose();
        if (m.material) m.material.dispose();
      });
    S.packets.forEach(function (p) {
      if (p.mesh) { if (p.mesh.geometry) p.mesh.geometry.dispose(); if (p.mesh.material) p.mesh.material.dispose(); }
    });
    KK.field.remove(S.group);
    S.group = null; S.meshes = {}; S.tubes = []; S.packets = [];
  }

  function toneColor(toneName) {
    if (toneName === 'signal') return cssColor('--signal', '#FF5C93');
    if (toneName === 'accent') return cssColor('--accent', '#5FE3C8');
    return cssColor('--accent-2', '#6274E8');
  }

  /**
   * Where can the network live? Measure the console's real box and aim for
   * the centre of whatever is left of the screen. This replaces a hardcoded
   * offset that happened to be wrong at most widths.
   */
  function freeZoneCenterX() {
    var cam = KK.field.camera();
    if (!cam) return 0;
    var panel = qs('[data-testid="n-console"]') || qs('[data-testid="stage"]');
    var rect = panel.getBoundingClientRect();
    var leftFrac = Math.min(0.74, (rect.right + 40) / window.innerWidth);
    var ndcLeft = leftFrac * 2 - 1;
    var halfH = Math.tan((cam.fov * Math.PI / 180) / 2) * cam.position.z;
    var halfW = halfH * cam.aspect;
    return ((ndcLeft + 1) / 2) * halfW;
  }

  /**
   * Build the network in the SHARED scene (one renderer, one camera, one loop).
   * Degrades honestly: no WebGL -> no meshes, and the 2D rail carries the data.
   */
  function assemble3D(payload) {
    disposeNet();
    if (KK.field.stats().backend !== 'webgl' || !window.THREE) return false;

    var group = new THREE.Group();
    var nodes = payload.pipeline.nodes;
    var cx = 0, cy = 0;
    nodes.forEach(function (n) { cx += n.pos[0]; cy += n.pos[1]; });
    cx /= nodes.length; cy /= nodes.length;

    var local = {};
    nodes.forEach(function (n) { local[n.id] = new THREE.Vector3(n.pos[0] - cx, n.pos[1] - cy, n.pos[2]); });

    var aspect = KK.field.aspect();
    var k = Math.max(0.42, Math.min(1, aspect / 1.6));
    group.scale.setScalar(k);
    group.position.set(freeZoneCenterX() * 0.86, -0.1, 0);

    var tl = (window.gsap && !REDUCED) ? window.gsap.timeline() : null;

    nodes.forEach(function (n, i) {
      var geo = new THREE.IcosahedronGeometry(0.17, 1);
      var mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(toneColor(n.color)),
        wireframe: true, transparent: true, opacity: 0.85
      });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(local[n.id]);
      if (tl) {
        mesh.scale.setScalar(0.001);
        tl.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.42, ease: 'back.out(2)' }, i * (KK.preview.PACING.perNodeMs / 1000));
      }
      group.add(mesh);
      S.meshes[n.id] = mesh;
    });

    payload.pipeline.edges.forEach(function (e, i) {
      var a = local[e[0]], b = local[e[1]];
      if (!a || !b) return;
      var mid = a.clone().add(b).multiplyScalar(0.5);
      mid.z += 0.2;
      var curve = new THREE.CatmullRomCurve3([a, mid, b]);
      var tubeGeo = new THREE.TubeGeometry(curve, 26, 0.0085, 6, false);
      var tubeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(toneColor('accent2')), transparent: true, opacity: 0.26
      });
      var tube = new THREE.Mesh(tubeGeo, tubeMat);
      if (tl) { tubeMat.opacity = 0.001; tl.to(tubeMat, { opacity: 0.26, duration: 0.3 }, 0.18 + i * 0.09); }
      group.add(tube);
      S.tubes.push(tube);

      /* a packet that really travels the curve, advanced in the shared loop */
      var pGeo = new THREE.SphereGeometry(0.028, 8, 8);
      var pMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(toneColor(nodes[i % nodes.length].color)) });
      var packet = new THREE.Mesh(pGeo, pMat);
      group.add(packet);
      S.packets.push({ mesh: packet, curve: curve, u: Math.random(), speed: 0.34 + Math.random() * 0.22 });
    });

    KK.field.add(group);
    S.group = group;

    /* camera travel: a small dolly toward the network, not a tunnel ride */
    KK.field.focus({ x: 0, y: 0, z: 4.95 }, REDUCED ? 0 : 900);
    document.body.setAttribute('data-network3d', 'assembled');
    return true;
  }

  function tick(time, dt) {
    if (!S.group) return;
    Object.keys(S.meshes).forEach(function (id) {
      var m = S.meshes[id];
      if (m) { m.rotation.y += dt * 0.5; m.rotation.x += dt * 0.3; }
    });
    S.packets.forEach(function (p) {
      p.u = (p.u + dt * p.speed) % 1;
      p.mesh.position.copy(p.curve.getPointAt(p.u));
    });
  }

  /* ------------------------------------------------------- compile action */
  function compile() {
    var input = qs('[data-testid="n-input"]');
    var text = input ? input.value : '';
    var err = qs('[data-testid="n-error"]');

    if (text.trim().length < 2) {
      if (err) err.setAttribute('data-show', 'true');
      if (input) input.focus();
      return null;
    }
    if (err) err.setAttribute('data-show', 'false');

    var payload = KK.preview.compileIntent(text, KK.store.state.scenario);
    S.payload = payload;
    S.nodes = payload.pipeline.nodes.map(function (n) { return Object.assign({}, n); });
    S.edges = payload.pipeline.edges.map(function (e) { return e.slice(); });
    /* Apply the dependency rule immediately: a node whose upstream is not done
       starts blocked. Without this the graph would look fully ready and the
       "run" button would be a lie. */
    S.nodes = KK.preview.recompute(S.nodes, S.edges);
    payload.pipeline.nodes = S.nodes;
    S.selected = null;
    KK.compile.lastCompile = payload;

    /* 1 — the field answers the signal, from a shader uniform */
    KK.field.setSignal(payload.features.tone === 'alert' ? 1 : (payload.features.tone === 'calm' ? 0.12 : 0.45));
    KK.field.pulse(1, REDUCED ? 0 : 1100);

    /* 2 — the store owns the new graph */
    KK.store.patch({ pipeline: payload.pipeline }, 'compiled');
    KK.store.markAssembled();
    /* signals is an ARRAY of samples everywhere else (concept S keeps a rolling
       window of them). Writing a bare object here made the two concepts
       disagree about the shape of a shared field, which only showed up when one
       page read what the other had written. Fixed to the array shape. */
    KK.store.setSignals([{
      chars: payload.features.chars, tone: payload.features.tone,
      confidence: payload.features.alert, at: Date.now()
    }]);

    /* 3 — the account log gets one artifact */
    KK.store.addArtifact({
      kind: 'compile',
      titleKey: 'n.frame.result',
      bodyKey: null,
      values: {
        nodes: payload.nodes, edges: payload.edges,
        chars: payload.features.chars, tone: payload.features.tone,
        ms: payload.work.totalMs
      },
      origin: { mode: 'DEMO', previewOnly: true, labelKey: 'n.frame.artifact' }
    });

    /* 4 — assemble, in 3D if we can, in 2D always */
    assembly = assemble3D(payload);
    S.assembly3d = assembly;

    document.body.setAttribute('data-compiled', 'true');
    KK.os.toast('n.toast.compiled', 'ok', { nodes: payload.nodes, edges: payload.edges });

    /* 5 — the 2D surface the user is actually looking at */
    renderCurrent();
    return payload;
  }

  var assembly = false;

  function revealLines(host) {
    var lines = KK.os.qsa('.term__line', host);
    if (REDUCED || !lines.length) {
      lines.forEach(function (l) { l.setAttribute('data-revealed', 'true'); });
      return;
    }
    lines.forEach(function (l, i) {
      l.setAttribute('data-revealed', 'false');
      window.setTimeout(function () { l.setAttribute('data-revealed', 'true'); }, i * KK.preview.PACING.termLineMs);
    });
  }

  /* ------------------------------------------------------------- receipts */
  function completeLocally(node) {
    var rec = KK.store.addReceipt({
      stepId: node.id,
      titleKey: node.titleKey,
      mode: 'PREVIEW_ADAPTER',
      status: 'completed',
      verifiable: ['n.verifiable.local'],
      notes: ['n.receipt.localNote']
    });
    nextState(node.id, 'done');
    KK.field.pulse(0.55, 420);
    KK.os.toast('n.toast.nodeDone', 'ok', { node: t(node.titleKey) });
    return rec;
  }

  function runNode(node) {
    if (node.state === 'blocked') { KK.os.toast('n.toast.clearFirst', 'warn'); return Promise.resolve(null); }

    if (!node.requiresApproval) return Promise.resolve(completeLocally(node));

    return KK.os.confirmSheet({
      titleKey: 'confirm.title',
      bodyKey: 'confirm.body'
    }).then(function (approved) {
      return KK.preview.executeNode(node, { approved: approved }).then(function (res) {
        if (!res.executed) {
          /* Denied: nothing changed, and the node stays open. */
          KK.os.toast('n.toast.nodeDenied', 'deny');
          return res;
        }
        KK.store.addReceipt({
          stepId: node.id,
          titleKey: node.titleKey,
          mode: res.mode,
          status: res.receipt.status,
          approvedBy: res.receipt.approvedBy,
          verifiable: res.receipt.verifiable,
          notes: res.receipt.notes
        });
        nextState(node.id, 'done');
        KK.field.pulse(1, 900);
        KK.os.toast('n.toast.nodeDone', 'ok', { node: t(node.titleKey) });
        renderCurrent();
        return res;
      });
    });
  }

  function nextState(id, next) {
    S.nodes = S.nodes.map(function (n) { return n.id === id ? Object.assign({}, n, { state: next }) : n; });
    /* recompute in both directions: a Reopen really does block downstream */
    S.nodes = KK.preview.recompute(S.nodes, S.edges);
    /* MERGE, do not replace. Writing a fresh { nodes, edges, scenario } object
       here used to drop `assembledAt` / `builtAt` / `fingerprint` / `cards` —
       so running one node silently un-assembled the graph, and a workspace
       switch would then restore it as "not assembled". Node state is part of
       the assembled work; advancing it must not erase the record that the work
       exists. */
    var prev = KK.store.state.pipeline || {};
    KK.store.patch({ pipeline: Object.assign({}, prev, {
      nodes: S.nodes,
      edges: S.edges,
      scenario: KK.store.state.scenario,
      lastAssembledAt: Date.now()
    }) }, 'node-state');
    renderCurrent();
  }

  function reopenNode(node) {
    var before = stateCounts().blocked;
    nextState(node.id, 'todo');
    var after = stateCounts().blocked;
    KK.os.toast('n.toast.reopened', 'ok', { node: t(node.titleKey) });
    if (after !== before) KK.os.toast('n.pipe.reopenNote', 'warn', { n: after - before });
  }

  /* ----------------------------------------------------------------- views */
  var currentView = 'frame';
  function renderCurrent() {
    if (currentView === 'pipeline') viewPipeline();
    else if (currentView === 'log') viewLog();
    else viewFrame();
    /* A re-render builds fresh [data-i18n] nodes. Without this pass they stay
       empty until the next language switch — which is exactly the bug the
       first screenshot run caught. */
    KK.i18n.apply(document);
  }

  function onLang() { renderCurrent(); }

  /* ---- frame ---- */
  function viewFrame() {
    var host = qs('[data-testid="stage"]');
    clear(host);
    host.setAttribute('data-view', 'frame');

    var wrap = el('div', { class: 'n-console' });
    wrap.appendChild(el('span', { class: 'eyebrow', 'data-i18n': 'n.frame.eyebrow' }));
    wrap.appendChild(el('h1', {
      class: 'core-title n-core-title', 'data-testid': 'n-core-title'
    }, [
      el('span', { 'data-i18n': 'n.frame.h1' }),
      el('span', { class: 'sub', 'data-i18n': 'n.frame.sub' })
    ]));

    var frame = el('div', { class: 'composer__frame', 'data-testid': 'n-composer', 'data-signal': signalName() });
    var input = el('textarea', {
      class: 'composer__input', 'data-testid': 'n-input', id: 'n-input',
      'data-i18n-ph': 'n.frame.placeholder', rows: '4', spellcheck: 'false'
    });
    input.value = KK.store.getDraft('composer');
    frame.appendChild(input);
    wrap.appendChild(frame);

    var err = el('p', { class: 'n-err', 'data-testid': 'n-error', 'data-show': 'false', role: 'alert' }, [
      el('span', { 'data-i18n': 'n.frame.tooShort' })
    ]);
    wrap.appendChild(err);

    var chips = el('div', { class: 'chips', 'data-testid': 'n-chips' });
    wrap.appendChild(chips);
    if (S.payload) KK.os.chips(chips, S.payload.features);
    else chips.appendChild(el('span', { class: 'chip', 'data-i18n': 'sig.measuredNote' }));

    var row = el('div', { class: 'composer__row' }, [
      el('button', { class: 'btn btn--primary', type: 'button', 'data-testid': 'n-compile' },
        [document.createTextNode(t('n.frame.compile'))]),
      el('button', { class: 'btn btn--ghost', type: 'button', 'data-testid': 'n-clear', 'data-i18n': 'n.frame.reset' }),
      el('span', { class: 'mono', style: 'color:var(--text-faint)', 'data-i18n': 'n.frame.kbdHint' })
    ]);
    wrap.appendChild(row);

    wrap.appendChild(el('p', { class: 'mono', style: 'color:var(--text-faint)', 'data-i18n': 'n.frame.toneNote' }));

    var seeds = el('div', { class: 'n-seeds', 'data-testid': 'n-seeds' });
    seeds.appendChild(el('span', { class: 'chip', style: 'border:0;background:none;padding:0', 'data-i18n': 'n.frame.seedLabel' }));
    ['n.frame.seed1', 'n.frame.seed2', 'n.frame.seed3'].forEach(function (k) {
      seeds.appendChild(el('button', { class: 'btn n-seed', type: 'button', 'data-seed': k, text: t(k) }));
    });
    wrap.appendChild(seeds);

    if (S.payload) wrap.appendChild(resultPanel(S.payload));

    wrap.appendChild(el('p', { class: 'mono', style: 'color:var(--text-faint);max-width:70ch', 'data-i18n': 'n.frame.note' }));
    host.appendChild(wrap);

    /* ---- wiring ---- */
    input.addEventListener('input', function () {
      KK.store.setDraft('composer', input.value);
      var live = KK.preview.analyzeText(input.value, KK.store.state.scenario);
      KK.os.chips(chips, live);
      frame.setAttribute('data-signal', input.value.length < 2 ? 'idle' : signalName(live));
      KK.field.setSignal(live.tone === 'alert' ? 1 : (live.tone === 'calm' ? 0.12 : 0.45));
      if (err.getAttribute('data-show') === 'true' && input.value.trim().length >= 2) err.setAttribute('data-show', 'false');
    });
    input.addEventListener('keydown', function (ev) {
      if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') { ev.preventDefault(); compile(); }
    });
    qs('[data-testid="n-compile"]', wrap).addEventListener('click', function () { compile(); });
    qs('[data-testid="n-clear"]', wrap).addEventListener('click', function () {
      input.value = ''; KK.store.setDraft('composer', '');
      KK.os.chips(chips, { chars: 0, words: 0, punctuation: 0, alertHits: [], calmHits: [], alert: 0, calm: 0, tone: 'neutral' });
      frame.setAttribute('data-signal', 'idle');
      KK.field.setSignal(0); KK.field.settle();
      if (err) err.setAttribute('data-show', 'false');
      input.focus();
    });
    seeds.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-seed]');
      if (!b) return;
      input.value = t(b.getAttribute('data-seed'));
      KK.store.setDraft('composer', input.value);
      input.dispatchEvent(new Event('input'));
      input.focus();
    });
    var open = qs('[data-testid="n-open-pipeline"]', wrap);
    if (open) open.addEventListener('click', function () { location.hash = '#/pipeline'; });
  }

  function signalName(features) {
    var f = features || (S.payload && S.payload.features);
    if (!f || f.chars < 2) return 'idle';
    if (f.tone === 'alert') return 'alert';
    if (f.tone === 'calm') return 'ready';
    return 'calm';
  }

  function resultPanel(payload) {
    var box = el('div', { class: 'n-result', 'data-show': 'true', 'data-testid': 'n-result' });
    box.appendChild(el('h2', { style: 'font-size:var(--fs-16);margin-bottom:var(--s-2)', 'data-i18n': 'n.frame.result' }));
    box.appendChild(el('p', { class: 'mono', 'data-testid': 'n-result-meta', style: 'color:var(--text-soft)',
      text: t('n.frame.resultMeta', {
        nodes: payload.nodes, edges: payload.edges,
        ms: payload.work.totalMs, pacing: payload.pacing.totalMs
      }) }));
    box.appendChild(el('div', { class: 'composer__row', style: 'margin-top:var(--s-3)' }, [
      el('button', { class: 'btn', type: 'button', 'data-testid': 'n-open-pipeline', 'data-i18n': 'n.openPipeline' })
    ]));
    return box;
  }

  /* ---- pipeline ---- */
  function viewPipeline() {
    var host = qs('[data-testid="stage"]');
    clear(host);
    host.setAttribute('data-view', 'pipeline');

    host.appendChild(el('section', { class: 'section' }, [
      el('h2', { 'data-i18n': 'n.pipe.title' }),
      el('p', { 'data-i18n': 'n.pipe.lead' })
    ]));

    var grid = el('div', { class: 'n-pipe' });

    /* left: the rail */
    var railWrap = el('div', { class: 'card' });
    railWrap.appendChild(el('h3', { style: 'font-size:var(--fs-14);margin-bottom:var(--s-3)', 'data-i18n': 'n.pipe.rail' }));
    var rail = el('div', { class: 'n-rail', 'data-testid': 'n-rail' });
    if (!S.nodes.length) {
      rail.appendChild(el('p', { class: 'n-empty', 'data-i18n': 'n.pipe.empty' }));
    } else {
      S.nodes.forEach(function (n, i) {
        var waits = blockedBy(n.id);
        var row = el('div', {
          class: 'n-node', 'data-node': n.id, 'data-state': n.state,
          'data-approval': String(!!n.requiresApproval), 'data-lane': n.lane,
          'data-selected': String(S.selected === n.id)
        }, [
          el('span', { class: 'n-node__idx', text: String(i + 1).padStart(2, '0') }),
          el('div', null, [
            el('div', { class: 'n-node__title', 'data-i18n': n.titleKey }),
            el('div', { class: 'n-node__detail', 'data-i18n': n.titleKey + '.detail' }),
            el('div', { class: 'n-node__meta' }, [
              el('span', { class: 'chip', 'data-i18n-keep-children': true }, [
                el('span', { 'data-i18n': 'n.pipe.lane.' + n.lane })
              ]),
              el('span', { class: 'chip', 'data-state-chip': '', 'data-tone': n.state === 'done' ? 'accent' : null,
                text: t('n.pipe.state.' + n.state) }),
              n.requiresApproval ? el('span', { class: 'chip', 'data-tone': 'warn', 'data-i18n': 'n.pipe.approval' }) : null,
              waits.length ? el('span', { class: 'chip', 'data-tone': 'signal', 'data-blocked-by': waits.join(','),
                text: t('n.pipe.blockedBy', { ids: waits.join(', ') }) }) : null
            ])
          ]),
          el('div', { class: 'n-node__acts' }, [
            el('button', {
              class: 'btn', type: 'button', 'data-node-act': 'run', 'data-target': n.id,
              'aria-disabled': n.state === 'blocked' ? 'true' : 'false',
              text: t('n.pipe.run')
            }),
            n.state === 'done' ? el('button', {
              class: 'btn btn--ghost', type: 'button', 'data-node-act': 'reopen', 'data-target': n.id,
              text: t('n.pipe.reopen')
            }) : null
          ])
        ]);
        rail.appendChild(row);
      });
    }
    railWrap.appendChild(rail);
    grid.appendChild(railWrap);

    /* right: inspector + honest degradation notice */
    var side = el('div', { class: 'n-pipe-side' });

    var fstats = KK.field.stats();
    if (fstats.backend !== 'webgl') {
      side.appendChild(el('div', { class: 'card', 'data-testid': 'n-degrade', 'data-reason': fstats.reason || 'unknown' }, [
        el('p', { class: 'lead', text: t('n.pipe.degraded', { reason: fstats.reason || 'unknown' }) })
      ]));
    } else {
      side.appendChild(el('div', { class: 'card', 'data-testid': 'n-3d-note' }, [
        el('p', { class: 'mono', style: 'color:var(--text-soft)', text: t('n.pipe.pulse', { n: S.packets.length }) }),
        el('p', { class: 'mono', style: 'color:var(--text-faint)', text: 'particles ' + fstats.particles + ' · collapse ' + fstats.collapse })
      ]));
    }

    var insp = el('div', { class: 'card', 'data-testid': 'n-inspector' });
    insp.appendChild(el('h3', { style: 'font-size:var(--fs-14);margin-bottom:var(--s-3)', 'data-i18n': 'n.pipe.inspector' }));
    var node = S.nodes.filter(function (n) { return n.id === S.selected; })[0];
    if (!node) {
      insp.appendChild(el('p', { class: 'n-empty', 'data-i18n': 'n.pipe.noSel' }));
    } else {
      [['id', node.id], ['lane', t('n.pipe.lane.' + node.lane)], ['state', t('n.pipe.state.' + node.state)],
       ['approval', String(!!node.requiresApproval)], ['waiting', blockedBy(node.id).join(', ') || '—']
      ].forEach(function (pair) {
        insp.appendChild(el('div', { class: 'n-inspector-row' }, [
          el('span', { text: pair[0] }), el('span', { text: String(pair[1]) })
        ]));
      });
    }
    side.appendChild(insp);

    grid.appendChild(side);
    host.appendChild(grid);

    /* ---- wiring ---- */
    rail.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-node-act]');
      if (btn) {
        var id = btn.getAttribute('data-target');
        var n = S.nodes.filter(function (x) { return x.id === id; })[0];
        if (!n) return;
        if (btn.getAttribute('data-node-act') === 'run') runNode(n);
        else reopenNode(n);
        return;
      }
      var rowEl = ev.target.closest('[data-node]');
      if (rowEl) { S.selected = rowEl.getAttribute('data-node'); renderCurrent(); }
    });
  }

  /* ---- log & receipts ---- */
  function viewLog() {
    var host = qs('[data-testid="stage"]');
    clear(host);
    host.setAttribute('data-view', 'log');

    host.appendChild(el('section', { class: 'section' }, [
      el('h2', { 'data-i18n': 'n.log.title' }),
      el('p', { 'data-i18n': 'n.log.lead' })
    ]));

    var grid = el('div', { class: 'n-log' });

    var termCard = el('div', { class: 'card' });
    var term = el('div', { class: 'term', 'data-testid': 'n-term', role: 'log', 'aria-live': 'polite' });
    if (S.payload) { KK.os.term(term, S.payload.logs, S.payload); revealLines(term); }
    else KK.os.term(term, null, null);
    termCard.appendChild(term);
    termCard.appendChild(el('p', { class: 'n-legend', 'data-i18n': 'term.legend' }));
    grid.appendChild(termCard);

    var st = KK.store.snapshot();
    var right = el('div', { class: 'n-pipe-side' });

    var rCard = el('div', { class: 'card', 'data-testid': 'n-receipts' });
    rCard.appendChild(el('h3', { style: 'font-size:var(--fs-14);margin-bottom:var(--s-3)', 'data-i18n': 'n.log.receipts' }));
    var rList = el('div', { class: 'n-list', 'data-count': String(st.receipts) });
    var receipts = KK.store.state.receipts;
    if (!receipts.length) rList.appendChild(el('p', { class: 'n-empty', 'data-i18n': 'n.log.receiptsEmpty' }));
    receipts.forEach(function (r) {
      var fromOther = r.scenarioAtWrite !== KK.store.state.scenario;
      var item = el('div', { class: 'n-item', 'data-receipt': r.id, 'data-mode': r.mode,
        'data-from-scenario': r.scenarioAtWrite, 'data-external-changed': String(!!r.externalWorldChanged) }, [
        el('div', { class: 'n-item__head' }, [
          el('span', { class: 'n-item__title', text: t(r.titleKey || 'receipt.note.1') }),
          el('span', { class: 'chip', 'data-tone': r.mode === 'SANDBOX' ? 'warn' : null, text: r.mode }),
          el('span', { class: 'chip', 'data-tone': r.externalWorldChanged ? 'signal' : 'accent', text: 'externalWorldChanged=false' })
        ]),
        el('div', { class: 'n-item__body', text: t('n.log.origin', { name: scnLabel(r.scenarioAtWrite) }) }),
        el('ul', { class: 'n-item__notes' },
          (r.verifiable || []).concat(r.notes || []).map(function (k) { return el('li', { text: t(k) }); }))
      ]);
      if (!fromOther) item.setAttribute('data-origin', 'current');
      rList.appendChild(item);
    });
    rCard.appendChild(rList);
    rCard.appendChild(el('p', { class: 'n-legend', 'data-i18n': 'n.log.sandboxNote' }));
    right.appendChild(rCard);

    var aCard = el('div', { class: 'card', 'data-testid': 'n-audit' });
    aCard.appendChild(el('h3', { style: 'font-size:var(--fs-14);margin-bottom:var(--s-3)', 'data-i18n': 'n.log.audit' }));
    var logs = KK.store.state.auditLog;
    if (!logs.length) aCard.appendChild(el('p', { class: 'n-empty', 'data-i18n': 'n.log.auditEmpty' }));
    else {
      var ul = el('ul', { class: 'n-item__notes', 'data-count': String(logs.length) });
      logs.slice(0, 14).forEach(function (l) {
        ul.appendChild(el('li', {
          class: 'mono', 'data-log-kind': l.kind, 'data-log-scenario': l.scenarioAtWrite,
          text: l.kind + ' · ' + scnLabel(l.scenarioAtWrite).slice(0, 1) + ' · ' + String(l.ref).slice(0, 12)
        }));
      });
      aCard.appendChild(ul);
    }
    aCard.appendChild(el('p', { class: 'n-legend', 'data-i18n': 'n.log.auditNote' }));
    right.appendChild(aCard);

    grid.appendChild(right);
    host.appendChild(grid);
  }

  /* ----------------------------------------------------------------- boot */
  KK.os.boot({
    concept: 'compile',
    defaultView: 'frame',
    views: [
      { id: 'frame', labelKey: 'n.view.frame' },
      { id: 'pipeline', labelKey: 'n.view.pipeline' },
      { id: 'log', labelKey: 'n.view.log' }
    ],
    onView: function (view) { currentView = view; renderCurrent(); },
    onLang: onLang,
    onScenario: function (result) {
      /* A workspace switch SWAPS. Receipts survive (the store guarantees it and
         the toast says so), and the graph assembled in the workspace you are
         returning to comes back with it — decision 2026-10-16. */
      var pl = KK.store.state.pipeline;
      disposeNet();
      document.body.removeAttribute('data-network3d');
      document.body.removeAttribute('data-compiled');
      S.selected = null;
      S.payload = null;
      if (pl) {
        S.nodes = pl.nodes.map(function (n) { return Object.assign({}, n); });
        S.edges = pl.edges.map(function (e) { return e.slice(); });
        assembly = assemble3D({ pipeline: { nodes: S.nodes, edges: S.edges } });
        S.assembly3d = assembly;
        document.body.setAttribute('data-compiled', 'true');
      } else {
        S.nodes = []; S.edges = [];
      }
      KK.field.setSignal(0);
      KK.field.focus({ x: 0, y: 0, z: 5.6 }, REDUCED ? 0 : 700);
      renderCurrent();
    }
  });

  var navAria = qs('[data-testid="view-nav"]');
  if (navAria) { navAria.setAttribute('aria-label', t('n.navAria')); }
  var skip = qs('.skip-link');
  if (skip) skip.setAttribute('data-i18n', 'n.skip');

  /* the frame hook lives for the life of the page, in the shared loop */
  KK.field.onFrame(tick);

  KK.compile = {
    lastCompile: null,
    run: compile,
    node: function (id) { return S.nodes.filter(function (n) { return n.id === id; })[0] || null; },
    runNodeById: function (id) {
      var n = S.nodes.filter(function (x) { return x.id === id; })[0];
      return n ? runNode(n) : Promise.resolve(null);
    },
    reopenById: function (id) {
      var n = S.nodes.filter(function (x) { return x.id === id; })[0];
      if (n) reopenNode(n);
      return !!n;
    },
    state: function () {
      return {
        view: currentView,
        nodes: S.nodes.length,
        edges: S.edges.length,
        counts: stateCounts(),
        selected: S.selected,
        meshes: Object.keys(S.meshes).length,
        tubes: S.tubes.length,
        packets: S.packets.length,
        assembly3d: !!S.assembly3d
      };
    }
  };
})(window.KK);
