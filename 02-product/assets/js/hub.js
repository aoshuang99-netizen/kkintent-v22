/* ============================================================================
   KK Intent OS · hub bootstrap
   The hub is a static document; this only wires language, sound and the field.
   ========================================================================== */
(function (KK) {
  'use strict';

  function qs(sel) { return document.querySelector(sel); }
  var t = function (k) { return KK.i18n.t(k); };

  KK.i18n.init();
  KK.i18n.apply(document);

  KK.field.init({
    canvas: document.getElementById('field'),
    force: /(^|[?&])field=css/.test(location.search)
  });
  KK.sound.init();

  var fs = KK.field.stats();
  document.body.setAttribute('data-field-backend', fs.backend);
  document.body.setAttribute('data-field-particles', String(fs.particles));
  /* No `data-lang` on <body>: the language declaration has exactly one owner,
     i18n.js, which writes it to <html> (see the note there). Writing it here
     too gave the same attribute name two value spaces — `en` on <html> and
     `en-US` on <body> — and nothing read either one. */

  function syncSound() {
    var s = KK.sound.state();
    var key = s.enabled ? 'sound.on' : (s.supported ? 'sound.off' : 'sound.unsupported');
    var b = qs('[data-testid="sound-btn"]');
    if (!b) return;
    b.setAttribute('data-sound', s.enabled ? 'on' : 'off');
    /* aria-pressed is the toggle-button contract; keep it in step with the
       glyph so a screen reader hears the same state the icon draws. */
    b.setAttribute('aria-pressed', s.enabled ? 'true' : 'false');
    b.setAttribute('title', t(key));
    /* Write the state into the label element, never onto the button: the
       button now owns an icon, and assigning textContent to a parent erases
       every child it has. The fallback branch keeps this working for any
       sound button built without the label span (the concept HUD builds one
       in os.js). */
    var lab = b.querySelector('[data-sound-label]');
    if (lab) {
      lab.setAttribute('data-i18n', key);
      lab.textContent = t(key);
    } else {
      b.setAttribute('data-i18n', key);
      b.textContent = t(key);
    }
  }
  syncSound();

  var sb = qs('[data-testid="sound-btn"]');
  if (sb) sb.addEventListener('click', function () { KK.sound.toggle(); syncSound(); });

  var lb = qs('[data-testid="lang-btn"]');
  if (lb) lb.addEventListener('click', function () { KK.i18n.toggle(); });

  document.addEventListener('kk:lang', function () {
    syncSound();
    KK.i18n.apply(document);
  });

  var bb = qs('[data-testid="boundary-body"]');
  if (bb) KK.os.renderBoundary(bb);

  document.body.setAttribute('data-booted', 'true');

  window.KKHub = {
    state: function () {
      return {
        lang: KK.i18n.lang,
        field: KK.field.stats(),
        sound: KK.sound.state(),
        i18n: KK.i18n.stats(),
        auditItems: document.querySelectorAll('[data-ref]').length,
        verdicts: Array.prototype.slice.call(document.querySelectorAll('[data-verdict]'))
          .map(function (e) { return e.getAttribute('data-verdict'); }),
        conceptCards: document.querySelectorAll('[data-concept-card]').length,
        /* the round-2 decision surface */
        decisions: document.querySelectorAll('[data-testid="hub-decisions"] tr[data-decision]').length,
        chosen: document.querySelectorAll('[data-concept-card][data-status="chosen"]').length,
        frozen: document.querySelectorAll('[data-concept-card][data-status="frozen"]').length,
        linksToSite: Array.prototype.slice.call(document.querySelectorAll('[data-testid="open-site"], [data-testid="open-site-top"]'))
          .map(function (a) { return a.getAttribute('href'); }),
        soundDefaultOff: KK.sound.state().defaultOn === false && KK.sound.state().enabled === false,
        contractName: KK.preview.PREDICTION_CONTRACT.name,
        caps: document.querySelectorAll('[data-testid="boundary-body"] tr[data-cap]').length,
        boundaryCapNames: Array.prototype.slice.call(document.querySelectorAll('[data-testid="boundary-body"] tr[data-cap]'))
          .map(function (r) { return r.getAttribute('data-cap'); }),
        primaryOnChosen: !!document.querySelector('[data-status="chosen"] .btn--primary'),
        primaryOnFrozen: !!document.querySelector('[data-status="frozen"] .btn--primary')
      };
    }
  };
})(window.KK);
