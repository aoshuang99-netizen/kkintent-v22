/* ============================================================================
   KK Intent OS · sound — the optional synesthesia layer

   Rules this file obeys, because a sound layer is the easiest place in a
   product to become hostile:

     * DEFAULT OFF, and it stays off by default in the shipping version.
       Decision 2026-10-16: this is not a preference we remember. Every page
       load starts silent, even if the user turned sound on a second earlier.
       The alternative — persisting "on" — means a returning user can be
       surprised by noise they did not ask for at the moment they arrived,
       which is the one failure mode a decorative audio layer must never have.
       (The earlier build did persist it into sessionStorage. Removed.)

     * THE FIRST AudioContext IS CREATED INSIDE A CLICK. Not at boot. That is
       both the browser's requirement and ours: with no gesture there is no
       context, so `state().ctxState === 'none'` before the first click is a
       checkable statement rather than a promise.

     * the button always states the current state in words ("Sound: off"),
       never only as an icon.

     * it is synthesised locally (two oscillators + a short envelope). No audio
       file is fetched, so there is nothing to license and nothing to load.
   ========================================================================== */
window.KK = window.KK || {};

(function (KK) {
  'use strict';

  var DEFAULT_ON = false;      // the contract, in one place
  var ctx = null;
  var enabled = false;
  var plays = 0;
  var lastPlayAt = 0;
  var stats = {
    supported: false, enabled: false, plays: 0, ctxState: 'none', lastError: null,
    defaultOn: DEFAULT_ON, persisted: false, gestures: 0
  };

  function supported() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  function ensureCtx() {
    if (ctx) return ctx;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); } catch (e) { stats.lastError = String(e && e.message || e); return null; }
    return ctx;
  }

  /**
   * A single short chime. `tone` (0..1) shifts the pitch: low = settled,
   * high = alert. Parameters are fixed constants — nothing here is measured,
   * so nothing here is described as measured.
   */
  function play(tone) {
    if (!enabled) return false;
    var a = ensureCtx();
    if (!a) return false;
    if (a.state === 'suspended') { a.resume().catch(function () { /* ignore */ }); }

    var t = tone === undefined ? 0.2 : Math.max(0, Math.min(1, tone));
    var f0 = 392 * Math.pow(2, t * 0.75);        // G4 .. ~D5

    var osc = a.createOscillator();
    var osc2 = a.createOscillator();
    var gain = a.createGain();
    var lp = a.createBiquadFilter();

    osc.type = 'sine'; osc.frequency.value = f0;
    osc2.type = 'sine'; osc2.frequency.value = f0 * 2.005;   // faint octave shimmer
    lp.type = 'lowpass'; lp.frequency.value = 3200;
    gain.gain.value = 0;

    osc.connect(gain); osc2.connect(gain); gain.connect(lp); lp.connect(a.destination);

    var at = a.currentTime;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.055, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.34);

    osc.start(at); osc2.start(at);
    osc.stop(at + 0.36); osc2.stop(at + 0.36);

    plays += 1;
    lastPlayAt = Date.now();
    stats.plays = plays;
    return true;
  }

  /** Called from a real user gesture (the toggle button). */
  function setEnabled(v) {
    stats.gestures += 1;
    var next = !!v;
    if (next && !supported()) {
      enabled = false;
      stats.supported = false;
      stats.enabled = false;
      return { ok: false, reason: 'unsupported' };
    }
    enabled = next;
    stats.enabled = enabled;
    stats.supported = supported();
    if (enabled) {
      var a = ensureCtx();
      if (a && a.state === 'suspended') { a.resume().catch(function () { /* ignore */ }); }
      play(0.35);                                  // confirming chime IS the feedback
    } else if (ctx) {
      try { ctx.suspend(); } catch (e) { /* ignore */ }
    }
    stats.ctxState = ctx ? ctx.state : 'none';
    return { ok: true, enabled: enabled };
  }

  function toggle() { return setEnabled(!enabled); }

  /**
   * Always starts silent. The user's choice lasts for this page and no longer —
   * see the header note. Nothing is written to storage, so `persisted` is a
   * honest `false` and a reload is guaranteed to be quiet.
   */
  function init() {
    enabled = DEFAULT_ON;
    stats.supported = supported();
    stats.defaultOn = DEFAULT_ON;
    stats.persisted = false;
    stats.enabled = enabled;
    stats.ctxState = ctx ? ctx.state : 'none';
    return stats;
  }

  KK.sound = {
    init: init,
    play: play,
    setEnabled: setEnabled,
    toggle: toggle,
    state: function () { stats.enabled = enabled; stats.ctxState = ctx ? ctx.state : 'none'; stats.plays = plays; return Object.assign({}, stats); },
    get enabled() { return enabled; }
  };
})(window.KK);
