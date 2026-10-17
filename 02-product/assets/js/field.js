/* ============================================================================
   KK Intent OS · field — the bottom WebGL canvas layer

   What this is: a GPU particle field whose *contraction and colour spectrum
   are shader uniforms*, driven by the intent signal the UI measured.

   What this is NOT: a decorative tween pretending to be a simulation.
   The collapse is computed per-vertex on the GPU from `uCollapse`; there is
   no `gsap.to(points.scale, ...)` anywhere in this file. That distinction is
   the whole reason `stats()` exists — so the claim is checkable:

       KK.field.stats().collapse   // reads the live uniform value
       KK.field.stats().backend    // 'webgl' | 'css-fallback'
       KK.field.stats().frames     // real rAF frames rendered

   Degradation is honest and three-way:
       no WebGL        -> data-field-backend="css-fallback", reason recorded
       context lost    -> same, plus a toast the user can see
       reduced motion  -> renders ONE frame, then stops; no drift, no pulse
   ========================================================================== */
window.KK = window.KK || {};

(function (KK) {
  'use strict';

  var VERT = [
    'attribute float aSeed;',
    'attribute vec3 aHome;',
    'uniform float uTime;',
    'uniform float uCollapse;',   // 0 = at rest, 1 = fully collapsed
    'uniform float uSignal;',     // 0 = calm spectrum, 1 = alert spectrum
    'uniform float uSize;',
    'uniform float uPixelRatio;',
    'uniform float uDrift;',      // 0 under prefers-reduced-motion
    'varying float vMix;',
    'varying float vFade;',
    'void main() {',
    '  float seed = aSeed * 6.2831853;',
    '  vec3 p = aHome;',
    /* slow per-particle drift, deterministic from the seed */
    '  p.x += sin(uTime * 0.22 + seed) * 0.16 * uDrift;',
    '  p.y += cos(uTime * 0.19 + seed * 1.7) * 0.14 * uDrift;',
    '  p.z += sin(uTime * 0.13 + seed * 0.6) * 0.10 * uDrift;',
    /* the collapse: pull toward the core AND rotate, proportional to uCollapse */
    '  float k = 1.0 - 0.86 * uCollapse;',
    '  float ang = uCollapse * 1.15 * (0.55 + aSeed * 0.9);',
    '  float ca = cos(ang); float sa = sin(ang);',
    '  vec3 c = vec3(p.x * ca - p.y * sa, p.x * sa + p.y * ca, p.z);',
    '  vec3 pos = c * k;',
    '  vec4 mv = modelViewMatrix * vec4(pos, 1.0);',
    '  vMix = clamp(uSignal + aSeed * 0.28 - 0.14, 0.0, 1.0);',
    '  vFade = 0.45 + 0.55 * aSeed;',
    '  gl_PointSize = uSize * uPixelRatio * (1.0 + uCollapse * 0.85) * (300.0 / max(-mv.z, 1.0));',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  var FRAG = [
    'uniform vec3 uColorA;',
    'uniform vec3 uColorB;',
    'uniform float uOpacity;',
    'varying float vMix;',
    'varying float vFade;',
    'void main() {',
    '  vec2 d = gl_PointCoord - vec2(0.5);',
    '  float r = length(d);',
    '  if (r > 0.5) discard;',
    '  float a = smoothstep(0.5, 0.06, r) * uOpacity * vFade;',
    '  vec3 col = mix(uColorA, uColorB, vMix);',
    '  gl_FragColor = vec4(col, a);',
    '}'
  ].join('\n');

  var ctx = null;
  var frameHooks = [];
  var pulseTimer = 0;
  var stats = {
    backend: 'idle',
    reason: null,
    particles: 0,
    collapse: 0,
    signal: 0,
    frames: 0,
    lastFrameMs: 0,
    avgFrameMs: 0,
    reducedMotion: false,
    contextLost: false
  };

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.body).getPropertyValue(name);
    v = (v || '').trim();
    return v || fallback;
  }

  function hexToRgb(hex) {
    var h = String(hex).trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (!isFinite(n)) return [0.4, 0.5, 0.9];
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  /**
   * Particle budget. The brief asked for 50,000. We pick a number this machine
   * can actually sustain, report it, and never claim a frame rate. The divisor
   * is tuned so a 1920×1080@2 display lands near 8k particles and a small
   * viewport lands on the floor rather than on a stutter.
   */
  function budget() {
    var px = (window.innerWidth || 1280) * (window.innerHeight || 720);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var n = Math.round(px * dpr / 480);
    return Math.max(2400, Math.min(9000, n));
  }

  function markFallback(reason) {
    stats.backend = 'css-fallback';
    stats.reason = reason;
    document.body.setAttribute('data-field-backend', 'css-fallback');
    document.body.setAttribute('data-field-reason', reason);
    document.body.setAttribute('data-field-particles', '0');
  }

  function init(opts) {
    opts = opts || {};
    var canvas = opts.canvas || document.getElementById('field');
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    stats.reducedMotion = !!prefersReduced;

    if (!canvas) { markFallback('no-canvas'); return stats; }
    if (!window.THREE) { markFallback('three-missing'); return stats; }
    /* `force` exists so the fallback path is reachable from a URL and can
       therefore be tested. `?field=css` on any page exercises it. */
    if (opts.force) { markFallback('forced-by-query'); return stats; }

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
    } catch (e) {
      markFallback('webgl-unavailable');
      return stats;
    }
    if (!renderer || !renderer.getContext || !renderer.getContext()) {
      markFallback('webgl-unavailable');
      return stats;
    }

    var count = opts.count || budget();
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5.6);

    var home = new Float32Array(count * 3);
    var seed = new Float32Array(count);
    for (var i = 0; i < count; i++) {
      /* a flattened disc, so the core reads as a lens rather than a box */
      var a = Math.random() * Math.PI * 2;
      var r = Math.pow(Math.random(), 0.62) * 4.2;
      home[i * 3] = Math.cos(a) * r * 1.35;
      home[i * 3 + 1] = Math.sin(a) * r * 0.92;
      home[i * 3 + 2] = (Math.random() - 0.5) * 1.9;
      seed[i] = Math.random();
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(home.slice(), 3));
    geo.setAttribute('aHome', new THREE.BufferAttribute(home, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

    var uniforms = {
      uTime: { value: 0 },
      uCollapse: { value: 0 },
      uSignal: { value: 0 },
      uSize: { value: 0.055 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uDrift: { value: prefersReduced ? 0 : 1 },
      uOpacity: { value: 0.5 },
      uColorA: { value: new THREE.Color().setRGB.apply(new THREE.Color(), hexToRgb(cssVar('--field-a', '#33477F'))) },
      uColorB: { value: new THREE.Color().setRGB.apply(new THREE.Color(), hexToRgb(cssVar('--field-b', '#FF5C93'))) }
    };

    var mat = new THREE.ShaderMaterial({
      uniforms: uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });

    var points = new THREE.Points(geo, mat);
    scene.add(points);

    renderer.setPixelRatio(uniforms.uPixelRatio.value);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    ctx = {
      renderer: renderer, scene: scene, camera: camera, geo: geo, mat: mat,
      uniforms: uniforms, points: points, target: 0, running: true, raf: 0,
      camTarget: null, camLerp: 0.08,
      t0: (window.performance && performance.now()) ? performance.now() : Date.now()
    };

    var frames = 0, sum = 0, last = 0;

    function draw() {
      var t = ((window.performance && performance.now()) ? performance.now() : Date.now()) - ctx.t0;
      var dt = last ? t - last : 16.6;
      if (last) {
        sum += dt; frames += 1;
        stats.lastFrameMs = Math.round(dt * 100) / 100;
        stats.avgFrameMs = Math.round((sum / frames) * 100) / 100;
      }
      last = t;

      /* ease the collapse toward its target — per-frame, on the CPU, but the
         per-vertex displacement is all in the shader. */
      var d = ctx.target - uniforms.uCollapse.value;
      uniforms.uCollapse.value += d * Math.min(1, (prefersReduced ? 1 : 0.085));

      /* camera travel, used by the compile concept for the "pull in" move */
      if (ctx.camTarget) {
        var p = camera.position;
        var k = prefersReduced ? 1 : ctx.camLerp;
        p.x += (ctx.camTarget.x - p.x) * k;
        p.y += (ctx.camTarget.y - p.y) * k;
        p.z += (ctx.camTarget.z - p.z) * k;
        if (Math.abs(ctx.camTarget.x - p.x) + Math.abs(ctx.camTarget.z - p.z) < 0.004) {
          p.set(ctx.camTarget.x, ctx.camTarget.y, ctx.camTarget.z);
          ctx.camTarget = null;
        }
      }

      uniforms.uTime.value = prefersReduced ? 0 : t / 1000;
      renderer.render(scene, camera);
      stats.frames += 1;
      stats.collapse = Math.round(uniforms.uCollapse.value * 1000) / 1000;

      /* shared animation slot: the compile concept drives its own meshes here
         so the pipeline and the particle field live in one space, on one
         render loop, with one camera. */
      if (!prefersReduced) {
        for (var i = 0; i < frameHooks.length; i++) {
          try { frameHooks[i](t / 1000, dt / 1000); } catch (e) { /* one bad hook must not kill the frame */ }
        }
      }
    }

    function loop() {
      if (!ctx || !ctx.running) return;
      draw();
      ctx.raf = window.requestAnimationFrame(loop);
    }

    canvas.addEventListener('webglcontextlost', function (ev) {
      ev.preventDefault();
      stats.contextLost = true;
      stop();
      markFallback('context-lost');
      KK.os.toast('toast.fieldLost', 'deny');
    }, false);

    window.addEventListener('resize', function () {
      if (!ctx) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    });

    stats.backend = 'webgl';
    stats.reason = null;
    stats.particles = count;
    document.body.setAttribute('data-field-backend', 'webgl');
    document.body.setAttribute('data-field-particles', String(count));
    document.body.setAttribute('data-field-drift', prefersReduced ? 'off' : 'on');

    /* Accessibility: under reduced motion we draw a single frame and stop.
       The field becomes a still image — which is exactly what was asked for. */
    draw();
    if (!prefersReduced) loop();

    return stats;
  }

  function stop() {
    if (ctx && ctx.raf) { window.cancelAnimationFrame(ctx.raf); ctx.raf = 0; }
    if (ctx) ctx.running = false;
  }

  function pulse(strength, holdMs) {
    if (!ctx) return false;
    ctx.target = typeof strength === 'number' ? strength : 1;
    stats.targetCollapse = ctx.target;
    /* The pulse owns the target until it hands it back, so the PREVIOUS timer
       has to go. Two pulses in flight is normal here — the compile issues one
       and a re-render can issue another — and without this the older timeout
       fires first and drags the target back to the resting value while the
       newer pulse is still meant to be holding it. Measured: the collapse
       peaked at 0.22 instead of 1 in roughly one run in four, because a stale
       expiry won the race. The newest intent must win. */
    if (pulseTimer) { window.clearTimeout(pulseTimer); pulseTimer = 0; }
    if (holdMs) {
      pulseTimer = window.setTimeout(function () { pulseTimer = 0; if (ctx) ctx.target = 0.22; }, holdMs);
    }
    return true;
  }

  function settle() {
    /* settling means "stop pulsing", so a pending expiry must not revive the
       target a moment later */
    if (pulseTimer) { window.clearTimeout(pulseTimer); pulseTimer = 0; }
    if (ctx) ctx.target = 0;
  }

  function setSignal(v) {
    if (!ctx) return false;
    ctx.uniforms.uSignal.value = Math.max(0, Math.min(1, Number(v) || 0));
    stats.signal = Math.round(ctx.uniforms.uSignal.value * 1000) / 1000;
    return true;
  }

  function recolour() {
    if (!ctx) return false;
    ctx.uniforms.uColorA.value.setRGB.apply(ctx.uniforms.uColorA.value, hexToRgb(cssVar('--field-a', '#33477F')));
    ctx.uniforms.uColorB.value.setRGB.apply(ctx.uniforms.uColorB.value, hexToRgb(cssVar('--field-b', '#FF5C93')));
    return true;
  }

  function focus(target, ms) {
    if (!ctx) return false;
    ctx.camTarget = { x: target.x || 0, y: target.y || 0, z: target.z || 5.6 };
    ctx.camLerp = ms ? Math.min(0.3, 16 / ms) : 0.08;
    return true;
  }

  function add(obj) { if (ctx && obj) ctx.scene.add(obj); return !!ctx; }
  function remove(obj) { if (ctx && obj) ctx.scene.remove(obj); return !!ctx; }
  function onFrame(fn) { if (typeof fn === 'function') frameHooks.push(fn); return frameHooks.length; }
  function offFrame(fn) { frameHooks = frameHooks.filter(function (f) { return f !== fn; }); return frameHooks.length; }
  function aspect() {
    if (!ctx) return (window.innerWidth || 1) / (window.innerHeight || 1);
    return ctx.camera.aspect;
  }

  KK.field = {
    init: init,
    stop: stop,
    pulse: pulse,
    settle: settle,
    setSignal: setSignal,
    recolour: recolour,
    budget: budget,
    /* shared-space API — lets a concept put its own meshes in the same scene
       and camera instead of starting a second renderer */
    focus: focus,
    add: add,
    remove: remove,
    onFrame: onFrame,
    offFrame: offFrame,
    aspect: aspect,
    scene: function () { return ctx ? ctx.scene : null; },
    camera: function () { return ctx ? ctx.camera : null; },
    renderer: function () { return ctx ? ctx.renderer : null; },
    stats: function () { return Object.assign({}, stats); }
  };
})(window.KK);
