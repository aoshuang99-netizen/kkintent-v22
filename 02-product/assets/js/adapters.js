/* ============================================================================
   KK Intent OS · PreviewAdapter — the honesty layer

   Every value that would come from a real service is produced here instead,
   and every return value carries its own provenance:

       { mode: 'DEMO' | 'SANDBOX' | 'NOT_CONNECTED', previewOnly: true }

   Nothing in this file performs a network request. There is no model call.
   No audio is recorded. No message is sent. No file leaves the tab.

   Three rules this file exists to enforce:

   1. MEASURED, NOT DECORATIVE.
      The terminal prints numbers, and every number is a real measurement or
      a disclosed constant. `work.*` comes from performance.now() around real
      local computation. If the work takes 0.4 ms we print 0.4 ms — we do not
      print "1 秒内". Presentation pacing is DELAY, and it is labelled as
      pacing wherever it is shown.

   2. NO UNMEASURABLE CLAIM.
      We never emit strings like "12k Hz", "加密开启" or "协议无缝连接".
      Anything that is not measured is `null`, and the UI prints "—".

   3. THE BOUNDARY IS DATA.
      capabilities() is the single source for the panel that tells the user
      what is real. The UI renders it; it does not restate it.
   ========================================================================== */
window.KK = window.KK || {};

(function (KK) {
  'use strict';

  var FAST = (window.KK_PREVIEW_FAST === true);

  /* Disclosed presentation pacing. It is never counted as work. */
  var PACING = {
    perNodeMs: FAST ? 0 : 170,
    termLineMs: FAST ? 0 : 130,
    settleMs: FAST ? 0 : 220
  };

  function now() {
    return (window.performance && window.performance.now) ? window.performance.now() : Date.now();
  }

  function sleep(ms) {
    if (!ms) return Promise.resolve();
    return new Promise(function (r) { window.setTimeout(r, ms); });
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }

  /* ------------------------------------------------------------- boundary */
  function capabilities() {
    var C = KK.store.makeCapability;
    return [
      C({ name: 'kkai.intent', status: 'PREVIEW_ADAPTER',
          detail: 'Local lexicon + deterministic templates',
          reason: 'No model provider is reachable from a static preview.' }),
      C({ name: 'kkai.voice', status: 'NOT_CONNECTED',
          detail: 'Typed fallback only',
          reason: 'Speech-to-text needs a provider and a microphone consent.' }),
      C({ name: 'kkai.predict', status: 'PREVIEW_ADAPTER',
          detail: 'Local template, contract ' + PREDICTION_CONTRACT.name,
          reason: 'A real model must return the same payload shape; the contract is published in the ledger.' }),
      C({ name: 'emotion.microexpression', status: 'NOT_CONNECTED',
          detail: 'Not attempted',
          reason: 'Camera capture requires consent and an inference backend; neither exists here.' }),
      C({ name: 'actions.external', status: 'SANDBOX',
          detail: 'Sandbox executor, receipt only',
          reason: 'A real side effect needs approval AND a real integration.' }),
      C({ name: 'field.webgl', status: 'PREVIEW_ADAPTER',
          detail: 'Client-side particles, no data leaves the page',
          reason: 'The field is decorative and labelled as such; it is not an analysis surface.' }),
      C({ name: 'storage', status: 'PREVIEW_ADAPTER',
          detail: 'sessionStorage (this tab only)',
          reason: 'Closing the tab clears the demo.' }),
      C({ name: 'auth', status: 'NOT_CONNECTED',
          detail: 'Anonymous demo loop',
          reason: 'The preview does not create or read accounts.' })
    ];
  }

  /* --------------------------------------------------- intent analysis ---- */
  /**
   * Local, deterministic, inspectable. The whole point is that the user can
   * see WHY the frame changed colour and what the parser actually matched.
   */
  function analyzeText(text, scenarioKey) {
    var scn = KK.store.scenario(scenarioKey);
    var t = String(text || '');
    var lower = t.toLowerCase();

    var alertHits = [];
    var calmHits = [];
    (scn.lexicon.alert || []).forEach(function (w) { if (lower.indexOf(w.toLowerCase()) >= 0) alertHits.push(w); });
    (scn.lexicon.calm || []).forEach(function (w) { if (lower.indexOf(w.toLowerCase()) >= 0) calmHits.push(w); });

    var words = t.split(/\s+/).filter(function (s) { return s.length > 0; }).length;
    var punct = (t.match(/[，。！？!?、,.]/g) || []).length;
    var intentVerb = /帮我|帮助|想要|我想|计划|安排|help|want|plan|set up|remind/i.test(t);

    var alert = Math.min(1, alertHits.length * 0.34 + Math.min(punct, 4) * 0.04);
    var calm = Math.min(1, calmHits.length * 0.3);
    var tone = alert > calm + 0.05 ? 'alert' : (calm > alert + 0.05 ? 'calm' : 'neutral');

    return {
      chars: t.length,
      words: words,
      punctuation: punct,
      alertHits: alertHits,
      calmHits: calmHits,
      alert: Math.round(alert * 100) / 100,
      calm: Math.round(calm * 100) / 100,
      tone: tone,
      intentVerb: intentVerb
    };
  }

  /**
   * Build the pipeline for a scenario. Different scenario -> different node
   * count, different lanes, different edges. Structural, not cosmetic.
   */
  function buildPipeline(scenarioKey) {
    var scn = KK.store.scenario(scenarioKey);
    var t0 = now();
    var nodes = scn.nodes.map(function (n) {
      return {
        id: n.id,
        lane: n.lane,
        titleKey: n.titleKey,
        pos: n.pos.slice(),
        color: n.color,
        requiresApproval: n.id === scn.approvalNode,
        state: 'todo'                      // todo | done | blocked
      };
    });
    /* Real dependency propagation — a node is blocked until every edge
       feeding it has a done source. */
    var edges = scn.edges.map(function (e) { return [e[0], e[1]]; });
    var t1 = now();
    return {
      scenario: scenarioKey,
      nodes: nodes,
      edges: edges,
      approvalNode: scn.approvalNode,
      buildMs: Math.round((t1 - t0) * 1000) / 1000
    };
  }

  function recompute(nodes, edges) {
    var done = {};
    nodes.forEach(function (n) { if (n.state === 'done') done[n.id] = true; });
    return nodes.map(function (n) {
      var next = Object.assign({}, n);
      if (n.state === 'done') { next.state = 'done'; return next; }
      var blocked = edges.some(function (e) { return e[1] === n.id && !done[e[0]]; });
      next.state = blocked ? 'blocked' : 'todo';
      return next;
    });
  }

  /* ------------------------------------------------------- compile ------- */
  /**
   * The "compile an intent" call for concept N.
   * Returns a payload in which every printable value is present, so the UI
   * can attach `data-src` to each terminal line and the gate script can
   * verify that nothing was invented at render time.
   */
  function compileIntent(text, scenarioKey) {
    var scn = KK.store.scenario(scenarioKey);
    var work = {};
    var t0 = now();

    var features = analyzeText(text, scenarioKey);
    work.analyzeMs = Math.round((now() - t0) * 1000) / 1000;

    var tg = now();
    var pipeline = buildPipeline(scenarioKey);
    work.graphMs = Math.round((now() - tg) * 1000) / 1000;

    var tl = now();
    /* Real layout work: project each node into a normalised screen path so
       the 2D rail and the 3D scene agree on order. */
    var order = pipeline.nodes.map(function (n, i) { return { id: n.id, t: (i + 1) / pipeline.nodes.length }; });
    work.layoutMs = Math.round((now() - tl) * 1000) / 1000;

    work.totalMs = Math.round((now() - t0) * 1000) / 1000;

    var fingerprint = hash(text + '|' + scenarioKey).toString(16);

    var payload = {
      mode: 'DEMO',
      previewOnly: true,
      provider: 'preview.lexicon.v1',
      deterministic: true,
      notAModel: true,
      scenario: scenarioKey,
      scenarioLabelKey: scn.labelKey,
      text: String(text || ''),
      fingerprint: fingerprint,
      features: features,
      work: work,
      pacing: {
        perNodeMs: PACING.perNodeMs,
        termLineMs: PACING.termLineMs,
        totalMs: PACING.perNodeMs * pipeline.nodes.length + PACING.termLineMs * 6,
        disclosed: true
      },
      pipeline: pipeline,
      order: order,
      nodes: pipeline.nodes.length,
      edges: pipeline.edges.length
    };

    /* Terminal script. `src` is a path into THIS payload; `values.n` is what
       the line will print. The gate script resolves `src` and compares. */
    payload.logs = [
      { key: 'log.capture',   status: 'ok',   src: 'features.chars',  values: { n: features.chars } },
      { key: 'log.parse',     status: 'ok',   src: 'features.words',  values: { n: features.words } },
      { key: 'log.tone',      status: features.tone === 'neutral' ? 'demo' : 'ok',
        src: 'features.tone', values: { n: features.tone } },
      { key: 'log.nodes',     status: 'ok',   src: 'nodes',           values: { n: payload.nodes } },
      { key: 'log.edges',     status: 'ok',   src: 'edges',           values: { n: payload.edges } },
      { key: 'log.graphMs',   status: 'ok',   src: 'work.graphMs',    values: { n: work.graphMs + ' ms', unit: 'ms' } },
      { key: 'log.totalMs',   status: 'ok',   src: 'work.totalMs',    values: { n: work.totalMs + ' ms', unit: 'ms' } },
      { key: 'log.pacing',    status: 'demo', src: 'pacing.totalMs',  values: { n: payload.pacing.totalMs + ' ms', unit: 'ms' } },
      { key: 'log.approval',  status: 'demo', src: 'approvalNode',    values: { n: pipeline.approvalNode } },
      { key: 'log.model',     status: 'none', src: 'provider',        values: { n: 'preview.lexicon.v1' } }
    ];
    payload.approvalNode = pipeline.approvalNode;

    return payload;
  }

  /* -------------------------------------------------------- prediction --- */
  /**
   * Ghost-text prediction for concept S.
   *
   * Honesty notes, because this is precisely where a product starts lying:
   *   - the ghost is only offered when an OPENING matched. We never draw a
   *     "completion" that does not continue what the user actually typed.
   *   - `confidence` is a sum of measured features, and `basis` returns those
   *     features so the UI can show the reasoning. It is a local template
   *     score, and `notAModel: true` says so in the payload itself.
   */
  var OPENINGS = [
    { id: 'action', re: /帮我|帮我做|帮助|想要|我想|我打算|计划|安排|提醒|help|want|plan|set ?up|remind|schedule/i },
    { id: 'explore', re: /看看|为什么|聊聊|怎么回事|不清楚|想不明白|feel|why|about|wonder/i }
  ];

  /**
   * THE PREDICTION CONTRACT — decision 2026-10-16: when a real model is wired
   * in later, it must return THIS shape. Not a shape like it. This is the same
   * payload the local template already returns, so the UI, the gate and the
   * copy do not have to be rewritten when the tail stops coming from a
   * template. Two fields change meaning and the contract says how:
   *
   *   provider     'preview.template.v1'  ->  the real model's id
   *   notAModel    true                   ->  false, AND ONLY THEN
   *
   * `notAModel` is deliberately NOT pinned to true in the contract. Pinning it
   * would make the field worthless: a flag that can only ever hold one value
   * is decoration, not information. What is pinned is the rule — it must be
   * true exactly when no model produced the answer — and the local adapter
   * must therefore return true. The gate checks the local adapter's value;
   * the contract documents the flip.
   *
   * `confidence` must remain a function of `basis`. A model that returns a
   * number and a separate list of reasons that do not produce that number is
   * returning two unrelated claims, and the second one is the one that gets
   * shown to the user as justification.
   */
  var CONF_CAP = 0.97;
  var WEIGHTS = { verb: 0.34, length: 0.2, lexicon: 0.26, template: 0.2 };

  var PREDICTION_CONTRACT = {
    name: 'kk.prediction.v1',
    version: 1,
    owner: 'KK.preview',
    fields: [
      { key: 'contract', type: 'object', required: true,
        note: 'self-identification: { name, version }. A consumer must refuse a payload whose name it does not know.' },
      { key: 'mode', type: 'string', required: true, note: "'DEMO' | 'SANDBOX' | 'NOT_CONNECTED'" },
      { key: 'previewOnly', type: 'boolean', required: true },
      { key: 'provider', type: 'string', required: true, note: 'changing this is how you know the source changed' },
      { key: 'notAModel', type: 'boolean', required: true, note: 'true iff no model produced the tail' },
      { key: 'scenario', type: 'string', required: true },
      { key: 'fired', type: 'boolean', required: true, note: 'false means: we have nothing honest to append' },
      { key: 'tailId', type: 'string|null', required: true, note: 'null iff fired === false' },
      { key: 'confidence', type: 'number', required: true, note: 'must equal confidenceFromBasis(basis), capped at ' + CONF_CAP },
      { key: 'confidenceBand', type: 'string', required: true, note: "'high' | 'medium' | 'low', derived from confidence" },
      { key: 'basis', type: 'array', required: true, note: '[{ id, value }], each id a key of WEIGHTS' },
      { key: 'features', type: 'object', required: true, note: 'the measured features the basis cites' }
    ],
    weights: WEIGHTS,
    cap: CONF_CAP,
    invariants: [
      'tailId is null whenever fired is false',
      'confidence === confidenceFromBasis(basis)',
      'every basis[].id is a key of weights',
      'notAModel is true exactly when no model produced the tail',
      'no network request is made; there is no endpoint in this build'
    ]
  };

  /** The scoring function, stated once so predict() and the gate cannot drift. */
  function confidenceFromBasis(basis) {
    var sum = 0;
    (basis || []).forEach(function (b) { sum += WEIGHTS[b.id] || 0; });
    return Math.round(Math.min(CONF_CAP, sum) * 100) / 100;
  }

  /**
   * Shape check, used by the gate and available to any future consumer.
   * Returns a description of what is wrong, never a boolean, because
   * "invalid" on its own is not actionable.
   */
  function validatePrediction(p) {
    var missing = [], wrongType = [], unexpected = [];
    var known = {};
    PREDICTION_CONTRACT.fields.forEach(function (f) {
      known[f.key] = true;
      var v = p ? p[f.key] : undefined;
      if (v === undefined) { missing.push(f.key); return; }
      var ok;
      if (f.type === 'string|null') ok = (v === null || typeof v === 'string');
      else if (f.type === 'array') ok = Array.isArray(v);
      else if (f.type === 'number') ok = typeof v === 'number' && isFinite(v);
      else ok = typeof v === f.type;
      if (!ok) wrongType.push({ key: f.key, expected: f.type, got: (v === null ? 'null' : typeof v) });
    });
    if (p) Object.keys(p).forEach(function (k) { if (!known[k]) unexpected.push(k); });

    var broken = [];
    if (p) {
      if (p.fired === false && p.tailId !== null) broken.push('tailId must be null when fired is false');
      if (p.fired === true && !p.tailId) broken.push('tailId must be set when fired is true');
      if (typeof p.confidence === 'number' && Math.abs(p.confidence - confidenceFromBasis(p.basis)) > 1e-9) {
        broken.push('confidence ' + p.confidence + ' !== confidenceFromBasis(basis) ' + confidenceFromBasis(p.basis));
      }
      (p.basis || []).forEach(function (b) { if (!(b.id in WEIGHTS)) broken.push('unknown basis id: ' + b.id); });
    }
    return {
      name: PREDICTION_CONTRACT.name,
      ok: missing.length === 0 && wrongType.length === 0 && broken.length === 0,
      missing: missing, wrongType: wrongType, unexpected: unexpected, broken: broken
    };
  }

  /**
   * What a REAL model adapter has to satisfy. There is no endpoint here —
   * this describes the hole, it does not fill it. Shown in the boundary panel
   * so the answer to "could you connect a model?" is data, not a promise.
   */
  function modelAdapterContract() {
    return {
      status: 'NOT_CONNECTED',
      endpoint: null,
      transport: null,
      reason: 'No provider is reachable from a static preview, and a key belongs on a server, never in this bundle.',
      mustReturn: PREDICTION_CONTRACT.name,
      mustSatisfy: PREDICTION_CONTRACT.invariants.slice(0),
      mustChange: [
        { field: 'provider', to: 'the real model id' },
        { field: 'notAModel', to: 'false' }
      ],
      mustNotChange: PREDICTION_CONTRACT.fields.map(function (f) { return f.key; })
    };
  }

  function predict(text, scenarioKey) {
    var f = analyzeText(text, scenarioKey);
    var basis = [];

    if (f.intentVerb) basis.push({ id: 'verb', value: 1 });
    if (f.words >= 2 && f.words <= 40) basis.push({ id: 'length', value: f.words });
    var lexHits = f.alertHits.length + f.calmHits.length;
    if (lexHits > 0) basis.push({ id: 'lexicon', value: lexHits });

    var opening = null;
    for (var i = 0; i < OPENINGS.length; i++) {
      if (OPENINGS[i].re.test(text)) { opening = OPENINGS[i].id; break; }
    }
    if (opening) basis.push({ id: 'template', value: 1 });

    var conf = confidenceFromBasis(basis);
    var fired = text.trim().length >= 2 && !!opening && conf >= 0.5;

    return {
      contract: { name: PREDICTION_CONTRACT.name, version: PREDICTION_CONTRACT.version },
      mode: 'DEMO',
      previewOnly: true,
      provider: 'preview.template.v1',
      notAModel: true,
      scenario: scenarioKey,
      fired: fired,
      /** null when we have nothing honest to append */
      tailId: fired ? opening : null,
      confidence: conf,
      confidenceBand: conf >= 0.8 ? 'high' : (conf >= 0.6 ? 'medium' : 'low'),
      basis: basis,
      features: f
    };
  }

  /* ------------------------------------------------------- sandbox act --- */
  /**
   * Anything that would leave the browser. Without approval we deny and touch
   * nothing — and the caller must keep the rest of the workspace usable.
   */
  function executeNode(node, opts) {
    opts = opts || {};
    var approved = !!opts.approved;
    var t0 = now();
    return sleep(FAST ? 0 : 340).then(function () {
      var ms = Math.round((now() - t0) * 1000) / 1000;
      if (!approved) {
        return {
          mode: 'SANDBOX', previewOnly: true,
          executed: false, denied: true,
          nodeId: node && node.id,
          ms: ms,
          noteKey: 'approval.denied'
        };
      }
      return {
        mode: 'SANDBOX', previewOnly: true,
        executed: true, denied: false,
        nodeId: node && node.id,
        ms: ms,
        externalWorldChanged: false,     // <- the honest flag, again
        receipt: {
          stepId: node && node.id,
          titleKey: node && node.titleKey,
          mode: 'SANDBOX',
          status: 'completed',
          approvedBy: 'user',
          verifiable: ['verifiable.sandbox.run_id', 'verifiable.sandbox.no_side_effect'],
          notes: ['receipt.note.1', 'receipt.note.2']
        }
      };
    });
  }

  /* ------------------------------------------------------- permissions --- */
  function permissionState(kind) {
    if (kind === 'microphone' || kind === 'camera') {
      var ok = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      return ok ? 'askable' : 'unsupported';
    }
    if (kind === 'notifications') {
      return ('Notification' in window) ? (Notification.permission || 'askable') : 'unsupported';
    }
    return 'unsupported';
  }

  KK.preview = {
    MODE: 'PREVIEW',
    FAST: FAST,
    PACING: PACING,
    hash: hash,
    now: now,
    sleep: sleep,
    capabilities: capabilities,
    analyzeText: analyzeText,
    buildPipeline: buildPipeline,
    recompute: recompute,
    compileIntent: compileIntent,
    predict: predict,
    PREDICTION_CONTRACT: PREDICTION_CONTRACT,
    validatePrediction: validatePrediction,
    confidenceFromBasis: confidenceFromBasis,
    modelAdapterContract: modelAdapterContract,
    executeNode: executeNode,
    permissionState: permissionState
  };
})(window.KK);
