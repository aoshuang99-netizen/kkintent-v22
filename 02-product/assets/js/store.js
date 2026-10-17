/* ============================================================================
   KK Intent OS · store
   One place that owns the session state. Everything else reads from here.

   Two slices, and the split is the point:

     scenario slice   field / context
                      -> REBUILT when the user switches scenario.
                         (a different mode of work genuinely is a different space)

     assembled work   pipeline / cards / signals
                      -> KEPT, per workspace, in a slot.
                         Switching away does not destroy what the user built;
                         switching back restores it exactly as it was.

     account slice    artifacts / receipts / consents / auditLog
                      -> NEVER wiped by a scenario switch.
                         Every entry keeps `scenarioAtWrite`, so the log stays
                         readable after the switch and we can say out loud
                         where each receipt came from.

   Why the second rule exists: in the previous round (A/B/C/H) the E2E probe
   measured `receipts 1 -> 0` after a scenario switch — the user lost a receipt
   they had just earned, with no explanation. That was reported as an open
   product seam. Here it is fixed by contract, not by assertion.

   Why the third rule exists: the same class of loss applies to ASSEMBLED WORK.
   The first version of this file nulled `pipeline` and `cards` on every switch,
   which is defensible only if you have never spent a minute building a graph.
   The decision (2026-10-16) was to keep it, so it is kept by contract:
   `slots[key]` holds each workspace's own graph / board / signal samples, and
   `setScenario` is now a *swap*, never a wipe. Rationale: a workspace switch is
   a change of context, not a `git reset`.
   ========================================================================== */
window.KK = window.KK || {};

(function (KK) {
  'use strict';

  var KEY = 'kkintent.session.v1';
  var seq = 0;
  function uid(prefix) {
    seq += 1;
    return prefix + '_' + Date.now().toString(36) + '_' + seq.toString(36);
  }

  /* ------------------------------------------------------------ scenarios */
  /* Each scenario is a different blue-print for the pipeline. The node sets
     are deliberately different in COUNT and in LANE assignment, so a switch
     is visible in the structure, not only in the label. */
  var SCENARIOS = {
    mind: {
      key: 'mind',
      labelKey: 'scn.mind.label',
      noteKey: 'scn.mind.note',
      nodes: [
        { id: 'nd_intake',  lane: 'sense',   titleKey: 'nd.intake',  pos: [1.55, 0.95, 0.0],  color: 'signal' },
        { id: 'nd_pattern', lane: 'sense',   titleKey: 'nd.pattern', pos: [2.05, 0.28, 0.28], color: 'accent2' },
        { id: 'nd_reframe', lane: 'shape',   titleKey: 'nd.reframe', pos: [2.55, -0.42, 0.0], color: 'accent2' },
        { id: 'nd_rehearse',lane: 'act',     titleKey: 'nd.rehearse',pos: [3.05, -1.02, 0.34], color: 'accent' },
        { id: 'nd_check',   lane: 'verify',  titleKey: 'nd.check',   pos: [3.55, -1.66, 0.0], color: 'accent' }
      ],
      edges: [['nd_intake', 'nd_pattern'], ['nd_pattern', 'nd_reframe'],
              ['nd_reframe', 'nd_rehearse'], ['nd_rehearse', 'nd_check']],
      approvalNode: 'nd_rehearse',
      lexicon: { alert: ['焦虑', '崩', '慌', '睡不', '失眠', 'exhaust', 'anxious', 'panic', 'cry', 'hate'],
                 calm:  ['平静', '还好', '试试', '慢慢', 'calm', 'okay', 'try', 'steady'] }
    },
    bond: {
      key: 'bond',
      labelKey: 'scn.bond.label',
      noteKey: 'scn.bond.note',
      nodes: [
        { id: 'nd_signal',  lane: 'sense',   titleKey: 'nd.signal',  pos: [1.5, -0.7, 0.3],  color: 'signal' },
        { id: 'nd_bound',   lane: 'sense',   titleKey: 'nd.bound',   pos: [2.0, -0.1, 0.0],  color: 'accent2' },
        { id: 'nd_need',    lane: 'shape',   titleKey: 'nd.need',    pos: [2.5, 0.5, 0.3],   color: 'accent2' },
        { id: 'nd_script',  lane: 'act',     titleKey: 'nd.script',  pos: [3.0, 1.1, 0.0],   color: 'accent' },
        { id: 'nd_repair',  lane: 'act',     titleKey: 'nd.repair',  pos: [3.5, 1.7, 0.28],  color: 'accent' },
        { id: 'nd_hold',    lane: 'verify',  titleKey: 'nd.hold',    pos: [4.0, 2.3, 0.0],   color: 'accent' }
      ],
      edges: [['nd_signal', 'nd_bound'], ['nd_bound', 'nd_need'], ['nd_need', 'nd_script'],
              ['nd_script', 'nd_repair'], ['nd_repair', 'nd_hold']],
      approvalNode: 'nd_repair',
      lexicon: { alert: ['已读不回', '冷战', '分手', '边界', '越界', 'hurt', 'ignored', 'boundary', 'silent'],
                 calm:  ['说清', '问一下', '坦白', '直接说', 'ask', 'express', 'clear', 'share'] }
    },
    life: {
      key: 'life',
      labelKey: 'scn.life.label',
      noteKey: 'scn.life.note',
      nodes: [
        { id: 'nd_story',   lane: 'sense',   titleKey: 'nd.story',   pos: [1.6, 0.9, 0.28],  color: 'signal' },
        { id: 'nd_value',   lane: 'sense',   titleKey: 'nd.value',   pos: [2.1, 0.4, 0.0],   color: 'accent2' },
        { id: 'nd_option',  lane: 'shape',   titleKey: 'nd.option',  pos: [2.6, -0.2, 0.3],  color: 'accent2' },
        { id: 'nd_bet',     lane: 'act',     titleKey: 'nd.bet',     pos: [3.1, -0.8, 0.0],  color: 'accent' },
        { id: 'nd_review',  lane: 'verify',  titleKey: 'nd.review',  pos: [3.6, -1.4, 0.3],  color: 'accent' }
      ],
      edges: [['nd_story', 'nd_value'], ['nd_value', 'nd_option'],
              ['nd_option', 'nd_bet'], ['nd_bet', 'nd_review']],
      approvalNode: 'nd_bet',
      lexicon: { alert: ['没意义', '卡住', '辞职', '迷茫', 'lost', 'stuck', 'pointless', 'quit'],
                 calm:  ['想清楚', '下一步', '计划', 'plan', 'next step', 'clear'] }
    }
  };

  var SCENARIO_KEYS = Object.keys(SCENARIOS);

  /* --------------------------------------------------------------- state */
  function emptySlots(make) {
    var m = {};
    SCENARIO_KEYS.forEach(function (k) { m[k] = make(); });
    return m;
  }

  function blank(scenarioKey) {
    return {
      version: 1,
      lang: 'en-US',
      view: 'home',
      scenario: scenarioKey || 'mind',
      scenarioSwitches: 0,
      /* scenario slice — genuinely rebuilt on a switch */
      context: null,         // { text, features, scenario, at }
      /* assembled work — live view of the CURRENT workspace.
         `slots` is the durable home; these three are its mirror so callers
         never have to know which workspace they are in. */
      pipeline: null,        // { nodes, edges, builtAt, assembledAt, fingerprint }
      cards: [],             // concept S: floating intents, with their physics
      signals: [],           // measured tone samples behind the ledger
      slots: {
        pipeline: emptySlots(function () { return null; }),
        cards: emptySlots(function () { return []; }),
        signals: emptySlots(function () { return []; })
      },
      drafts: { composer: '' },
      /* account slice — survives a scenario switch */
      artifacts: [],
      receipts: [],
      consents: [],
      auditLog: []
    };
  }

  var state = blank('mind');
  var listeners = [];

  function emit(reason) {
    listeners.forEach(function (fn) {
      try { fn(state, reason); } catch (e) { console.error('[store] listener failed', e); }
    });
  }

  function persist() {
    /* PREVIEW_ADAPTER: sessionStorage, this tab only. Closing the tab clears
       the demo. There is no server and there is no cookie. */
    try { window.sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* quota / private mode */ }
  }

  function load() {
    try {
      var raw = window.sessionStorage.getItem(KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1) {
        state = Object.assign(blank(parsed.scenario), parsed);
        /* A payload written before slots existed has a live pipeline and no
           slot to hold it. Mirror it in, otherwise the first switch would
           silently drop it — the exact bug this file is fixing. */
        if (!state.slots) state.slots = blank(state.scenario).slots;
        SCENARIO_KEYS.forEach(function (k) {
          if (!state.slots.pipeline) state.slots.pipeline = {};
          if (!state.slots.cards) state.slots.cards = {};
          if (!state.slots.signals) state.slots.signals = {};
          if (state.slots.pipeline[k] === undefined) state.slots.pipeline[k] = null;
          if (state.slots.cards[k] === undefined) state.slots.cards[k] = [];
          if (state.slots.signals[k] === undefined) state.slots.signals[k] = [];
        });
        /* The live view wins for the workspace you are actually in. This also
           re-points the slot at the live objects after a reload, where JSON
           parsing has made them separate copies — without it, the next
           `setNodeState` would mutate a graph the slot no longer references,
           and the next switch would restore a stale one. */
        state.slots.pipeline[state.scenario] = state.pipeline || null;
        state.slots.cards[state.scenario] = Array.isArray(state.cards) ? state.cards : [];
        state.slots.signals[state.scenario] = Array.isArray(state.signals) ? state.signals : [];
      }
    } catch (e) { /* corrupt payload -> start clean, say nothing pretended */ }
  }

  /* --------------------------------------------------------- constructors */
  function makeCapability(o) {
    return {
      name: o.name,
      status: o.status,                 // PREVIEW_ADAPTER | SANDBOX | NOT_CONNECTED
      detail: o.detail,
      reason: o.reason
    };
  }

  function makeArtifact(o) {
    return {
      id: o.id || uid('art'),
      kind: o.kind,
      titleKey: o.titleKey,
      bodyKey: o.bodyKey || null,
      values: o.values || {},
      origin: o.origin || { mode: 'DEMO', previewOnly: true },
      scenarioAtWrite: state.scenario,
      createdAt: Date.now()
    };
  }

  /** A receipt is proof that something ran. It NEVER claims the world changed. */
  function makeReceipt(o) {
    return {
      id: o.id || uid('rcp'),
      stepId: o.stepId,
      titleKey: o.titleKey,
      mode: o.mode || 'SANDBOX',
      status: o.status || 'completed',
      externalWorldChanged: false,          // invariant, set here once
      approvedBy: o.approvedBy || 'user',
      verifiable: o.verifiable || [],
      notes: o.notes || [],
      scenarioAtWrite: state.scenario,
      createdAt: Date.now()
    };
  }

  function makeConsent(o) {
    return {
      id: o.id || uid('cns'),
      kind: o.kind,                 // microphone | camera | notifications
      granted: !!o.granted,
      /* The honest three-way: we never collapse "denied" and "unavailable". */
      outcome: o.outcome || (o.granted ? 'granted' : 'denied'),   // granted | denied | unavailable
      scenarioAtWrite: state.scenario,
      createdAt: Date.now()
    };
  }

  /* ------------------------------------------------------------- mutators */
  function patch(part, reason) {
    Object.assign(state, part);
    /* Any direct write to pipeline / cards / signals must land in the slot too,
       otherwise the next workspace switch restores a stale copy. */
    if (part && (('pipeline' in part) || ('cards' in part) || ('signals' in part))) stash();
    persist();
    emit(reason || 'patch');
    return state;
  }

  /**
   * Draft text lives in the store, not in the DOM.
   * That is what makes it survivable: a language switch re-renders the view,
   * and the composer is rebuilt from here, so the user's text is still there.
   */
  function setDraft(key, value) {
    state.drafts = state.drafts || {};
    state.drafts[key] = value;
    persist();
    return value;
  }
  function getDraft(key) {
    return (state.drafts && state.drafts[key]) || '';
  }

  function log(kind, ref) {
    state.auditLog.unshift({
      id: uid('log'),
      kind: kind,                 // artifact | receipt | consent | scenario
      ref: ref,
      scenarioAtWrite: state.scenario,
      at: Date.now()
    });
    if (state.auditLog.length > 200) state.auditLog.length = 200;
  }

  function addArtifact(a) {
    state.artifacts.unshift(makeArtifact(a));
    log('artifact', state.artifacts[0].id);
    persist(); emit('artifact');
    return state.artifacts[0];
  }

  function addReceipt(r) {
    var rec = makeReceipt(r);
    state.receipts.unshift(rec);
    log('receipt', rec.id);
    persist(); emit('receipt');
    return rec;
  }

  function addConsent(c) {
    var rec = makeConsent(c);
    state.consents.unshift(rec);
    log('consent', rec.id);
    persist(); emit('consent');
    return rec;
  }

  /**
   * Persist the live assembled work into the CURRENT workspace's slot.
   * Every writer goes through here, so `state.pipeline` and
   * `state.slots.pipeline[scenario]` cannot drift apart.
   */
  function stash() {
    if (!state.slots) state.slots = blank(state.scenario).slots;
    state.slots.pipeline[state.scenario] = state.pipeline;
    state.slots.cards[state.scenario] = state.cards;
    state.slots.signals[state.scenario] = state.signals;
  }

  /** Replace the current workspace's pipeline. Also mirrors it into the slot. */
  function setPipeline(pipeline) {
    state.pipeline = pipeline;
    stash();
    persist(); emit('pipeline');
    return state.pipeline;
  }

  /** Replace the current workspace's board cards. Also mirrors them into the slot. */
  function setCards(cards) {
    state.cards = Array.isArray(cards) ? cards : [];
    stash();
    persist(); emit('cards');
    return state.cards;
  }

  function setSignals(signals) {
    state.signals = Array.isArray(signals) ? signals : [];
    stash();
    persist(); emit('signals');
    return state.signals;
  }

  /**
   * Mark the current workspace's graph as assembled (it exists AND was built).
   * `assembledAt` is the FIRST assembly and is never overwritten — it is the
   * identity of the graph, and the retention check compares it across a
   * workspace switch. Later additions update `lastAssembledAt` instead.
   */
  function markAssembled() {
    if (!state.pipeline) return null;
    if (!state.pipeline.assembledAt) state.pipeline.assembledAt = Date.now();
    state.pipeline.lastAssembledAt = Date.now();
    stash();
    persist();
    return state.pipeline.assembledAt;
  }

  /** Read-only: what every workspace is holding right now. */
  function preservedSlots() {
    return SCENARIO_KEYS.map(function (k) {
      var p = (state.slots && state.slots.pipeline[k]) || null;
      var c = (state.slots && state.slots.cards[k]) || [];
      var s = (state.slots && state.slots.signals[k]) || [];
      return {
        key: k,
        current: k === state.scenario,
        nodes: p ? p.nodes.length : 0,
        edges: p ? p.edges.length : 0,
        assembled: !!(p && p.assembledAt),
        cards: c.length,
        signals: s.length
      };
    });
  }

  /**
   * Switch scenario. This is a SWAP, not a wipe (decision 2026-10-16).
   *
   * SPEC: the current workspace's pipeline / cards / signals are stashed into
   * its slot; the incoming workspace's slot is restored into the live view.
   * Nothing is destroyed in either direction. `context` is the one thing that
   * is genuinely rebuilt — it is the parse of what you are working on now.
   * The account slice is untouched, as before.
   */
  function setScenario(key) {
    if (!SCENARIOS[key]) return { ok: false, reason: 'unknown-scenario', key: key };
    var before = { artifacts: state.artifacts.length, receipts: state.receipts.length, consents: state.consents.length };
    var previous = state.scenario;
    if (previous === key) {
      return { ok: true, from: previous, to: key, noop: true,
               carried: { receipts: state.receipts.length > 0, consents: true, before: before, after: before },
               preservedReceipts: state.receipts.length };
    }

    /* 1 — stash what this workspace was holding */
    stash();
    var outgoing = {
      nodes: state.pipeline ? state.pipeline.nodes.length : 0,
      edges: state.pipeline ? state.pipeline.edges.length : 0,
      assembled: !!(state.pipeline && state.pipeline.assembledAt),
      cards: state.cards.length
    };

    /* 2 — move */
    state.scenario = key;
    state.scenarioSwitches += 1;
    state.context = null;

    /* 3 — restore what that workspace was holding. Never `null` out first:
       that is how the previous version lost work. */
    state.pipeline = (state.slots.pipeline[key] || null);
    state.cards = state.slots.cards[key] || [];
    state.signals = state.slots.signals[key] || [];
    /* The composer draft is deliberately KEPT across the swap too. Clearing it
       is not explainable; silently deleting text the user just typed is not. */

    var incoming = {
      nodes: state.pipeline ? state.pipeline.nodes.length : 0,
      edges: state.pipeline ? state.pipeline.edges.length : 0,
      assembled: !!(state.pipeline && state.pipeline.assembledAt),
      cards: state.cards.length
    };

    log('scenario', previous + '->' + key);
    persist();
    emit('scenario');

    var after = { artifacts: state.artifacts.length, receipts: state.receipts.length, consents: state.consents.length };
    return {
      ok: true,
      from: previous,
      to: key,
      /* The two counts the previous round's probe measured. They must be equal. */
      carried: {
        receipts: after.receipts === before.receipts && after.receipts > 0,
        consents: after.consents === before.consents,
        before: before, after: after
      },
      preservedReceipts: state.receipts.filter(function (r) { return r.scenarioAtWrite !== key; }).length,
      /* What survived the swap, and where it went. */
      retained: {
        stashed: outgoing,
        restored: incoming,
        slots: preservedSlots(),
        /* how many workspaces are holding assembled work right now */
        holders: preservedSlots().filter(function (s) { return s.assembled; }).length
      }
    };
  }

  function setNodeState(nodeId, next) {
    if (!state.pipeline) return null;
    var node = null;
    state.pipeline.nodes.forEach(function (n) {
      if (n.id === nodeId) { n.state = next; node = n; }
    });
    /* re-point the slot at the live graph: node state is part of the assembled
       work, so it has to survive a switch like the rest of it */
    stash();
    persist(); emit('node');
    return node;
  }

  /* ------------------------------------------------------------ read-only */
  function snapshot() {
    return {
      scenario: state.scenario,
      scenarioSwitches: state.scenarioSwitches,
      view: state.view,
      artifacts: state.artifacts.length,
      receipts: state.receipts.length,
      consents: state.consents.length,
      signals: (state.signals || []).length,
      cards: state.cards.length,
      nodes: state.pipeline ? state.pipeline.nodes.length : 0,
      edges: state.pipeline ? state.pipeline.edges.length : 0,
      /* The new contract: is the current workspace's graph assembled, and how
         many workspaces are holding assembled work. Both are readable from
         the DOM, so a gate can check them without trusting the copy. */
      pipelineAssembled: !!(state.pipeline && state.pipeline.assembledAt),
      slotsHoldingWork: preservedSlots().filter(function (s) { return s.assembled || s.cards > 0; }).length,
      auditLog: state.auditLog.length,
      hasDraft: !!(state.drafts && state.drafts.composer),
      externalWorldChanged: state.receipts.some(function (r) { return r.externalWorldChanged === true; })
    };
  }

  /** Stable structural fingerprint — used to prove two concepts are not clones. */
  function fingerprint() {
    var canon = JSON.stringify({
      scenario: state.scenario,
      nodes: state.pipeline ? state.pipeline.nodes.map(function (n) { return n.id + ':' + (n.state || 'todo'); }) : [],
      edges: state.pipeline ? state.pipeline.edges : [],
      artifacts: state.artifacts.map(function (a) { return a.kind; }),
      receipts: state.receipts.map(function (r) { return r.mode + ':' + r.status; }),
      consents: state.consents.map(function (c) { return c.kind + ':' + c.outcome; }),
      cards: state.cards.map(function (c) { return c.id; })
    });
    var h = 2166136261;
    for (var i = 0; i < canon.length; i++) {
      h ^= canon.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h.toString(16);
  }

  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }

  function reset() {
    state = blank(state.scenario);
    try { window.sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    emit('reset');
  }

  KK.store = {
    SCENARIOS: SCENARIOS,
    SCENARIO_KEYS: SCENARIO_KEYS,
    scenario: function (k) { return SCENARIOS[k || state.scenario]; },
    load: load,
    reset: reset,
    subscribe: subscribe,
    makeCapability: makeCapability,
    makeArtifact: makeArtifact,
    makeReceipt: makeReceipt,
    makeConsent: makeConsent,
    addArtifact: addArtifact,
    addReceipt: addReceipt,
    addConsent: addConsent,
    setScenario: setScenario,
    setNodeState: setNodeState,
    setPipeline: setPipeline,
    setCards: setCards,
    setSignals: setSignals,
    markAssembled: markAssembled,
    preservedSlots: preservedSlots,
    setDraft: setDraft,
    getDraft: getDraft,
    patch: patch,
    snapshot: snapshot,
    fingerprint: fingerprint,
    uid: uid,
    get state() { return state; }
  };
})(window.KK);
