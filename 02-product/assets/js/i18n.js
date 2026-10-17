/* ============================================================================
   KK Intent OS · i18n
   Contract (unchanged from the A/B/C/H round, deliberately):

     * a dictionary value is PLAIN TEXT. It is written with textContent.
       There is no HTML path — so a translation can never inject markup.
     * switching language rewrites text nodes in place. It does NOT re-render
       the DOM, so the draft in the composer, the physics card positions, the
       open sheet and the scroll offset all survive a language switch.
     * a missing key returns the key itself and warns once.
     * registering a key that already exists warns (cross-package drift).
   ========================================================================== */
window.KK = window.KK || {};

(function (KK) {
  'use strict';

  var dict = Object.create(null);
  var owner = Object.create(null);      // key -> package that registered it
  var warnedMissing = Object.create(null);
  var missing = [];
  var duplicates = [];
  var lang = 'en-US';                   // the default, per the master brief

  var LANG_KEY = 'kkintent.lang';
  var SUPPORTED = ['en-US', 'zh-CN'];

  function norm(l) {
    if (!l) return null;
    var s = String(l).toLowerCase();
    if (s.indexOf('zh') === 0) return 'zh-CN';
    if (s.indexOf('en') === 0) return 'en-US';
    return null;
  }

  /**
   * @param {Object} table  { 'key': { 'en-US': '...', 'zh-CN': '...' } }
   *                        or { 'key': '...' } (applies to both languages)
   * @param {string} pkg    package name, used only for the duplicate warning
   */
  function register(table, pkg) {
    pkg = pkg || 'anonymous';
    Object.keys(table || {}).forEach(function (k) {
      if (dict[k] && owner[k] !== pkg) {
        duplicates.push({ key: k, first: owner[k], again: pkg });
        console.warn('[i18n] duplicate key "' + k + '" declared by "' + pkg + '" but already owned by "' + owner[k] + '"');
      }
      var v = table[k];
      dict[k] = (typeof v === 'string') ? { 'en-US': v, 'zh-CN': v } : v;
      owner[k] = pkg;
    });
    return API;
  }

  function t(key, vars) {
    var rec = dict[key];
    if (!rec) {
      if (!warnedMissing[key]) {
        warnedMissing[key] = true;
        missing.push(key);
        console.warn('[i18n] missing key "' + key + '"');
      }
      return key;
    }
    var s = rec[lang];
    if (s === undefined) {
      // Fall back to English but say so — a half-translated string is a bug.
      if (!warnedMissing[key]) {
        warnedMissing[key] = true;
        missing.push(key);
        console.warn('[i18n] key "' + key + '" has no "' + lang + '" value');
      }
      s = rec['en-US'] || key;
    }
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (m, name) {
        return (vars[name] === undefined || vars[name] === null) ? m : String(vars[name]);
      });
    }
    return s;
  }

  /** True when the key exists in the dictionary (used by the gate script). */
  function has(key) { return !!dict[key]; }

  /**
   * Publish the current language onto the document element.
   *
   * The language declaration has exactly ONE owner — this file — and exactly
   * one element: <html>. `lang` carries the real BCP-47 tag, because screen
   * readers, spell-check and hyphenation all key off it; `data-lang` carries
   * the two-letter form the stylesheets and the gate read. Nothing else in the
   * bundle writes either one. A second writer with its own value space is how
   * the same page ends up declaring `en` on <html> and `en-US` on <body>.
   */
  function declare() {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('data-lang', lang === 'zh-CN' ? 'zh' : 'en');
  }

  /**
   * Diagnostics: keys that lack a value in a supported language.
   *
   * This is not the same question as `missing` above. `missing` fills up as the
   * page renders, so it can only ever prove that the keys which HAPPENED to be
   * used are complete — a key that is never reached on this surface, or a
   * branch that is not taken, could be English-only and never say so. Since
   * "Chinese is selectable" is a claim about the whole dictionary, it is
   * checked against the whole dictionary.
   */
  function gaps() {
    var out = [];
    Object.keys(dict).forEach(function (k) {
      SUPPORTED.forEach(function (l) {
        var v = dict[k] && dict[k][l];
        if (typeof v !== 'string' || !v) out.push(k + ' [' + l + ']');
      });
    });
    return out;
  }

  var ATTRS = [
    ['data-i18n', null],              // textContent
    ['data-i18n-title', 'title'],
    ['data-i18n-aria', 'aria-label'],
    ['data-i18n-ph', 'placeholder'],
    ['data-i18n-value', 'value'],
    ['data-i18n-alt', 'alt']
  ];

  /** Rewrite an existing subtree in place. Never creates or removes elements. */
  function apply(root) {
    var scope = root || document;
    ATTRS.forEach(function (pair) {
      var sel = '[' + pair[0] + ']';
      var nodes = scope.querySelectorAll(sel);
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        var val = t(el.getAttribute(pair[0]));
        if (pair[1] === null) {
          // textContent only. Elements that need mixed content use one
          // element per translated string.
          if (el.hasAttribute('data-i18n-keep-children')) {
            var kids = el.querySelectorAll('[data-i18n]');
            for (var j = 0; j < kids.length; j++) { if (kids[j] !== el) kids[j].remove(); }
          }
          el.textContent = val;
        } else {
          el.setAttribute(pair[1], val);
        }
      }
    });
    if (scope !== document && scope.matches && scope.matches('[data-i18n]')) {
      scope.textContent = t(scope.getAttribute('data-i18n'));
    }
    return API;
  }

  function setLang(next) {
    var n = norm(next);
    if (!n || n === lang) return API;
    lang = n;
    try { window.sessionStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
    declare();
    apply(document);
    document.dispatchEvent(new CustomEvent('kk:lang', { detail: { lang: lang } }));
    return API;
  }

  function toggle() { return setLang(lang === 'zh-CN' ? 'en-US' : 'zh-CN'); }

  function init() {
    var stored = null;
    try { stored = window.sessionStorage.getItem(LANG_KEY); } catch (e) { /* ignore */ }
    /* An explicit ?lang= wins over everything, so a review link can hand
       someone the language they read in, and the gate script can be
       deterministic instead of depending on the machine's locale.

       There is deliberately NO navigator.language step in this chain. The
       default is English, full stop: this is a product page for an
       international audience, and a visitor in China was previously served
       Chinese before they had asked for anything — the page silently changed
       language based on a browser setting the visitor never chose here. A
       stored value still counts, because switching the toggle IS a choice;
       the browser's locale is not. The toggle in the top bar (and in the
       console sheet on a phone) is how Chinese is selected. */
    var m = /(?:^|[?&])lang=([A-Za-z-]+)/.exec(location.search || '');
    var fromQuery = m ? norm(m[1]) : null;
    var wanted = fromQuery || norm(stored) || 'en-US';
    lang = wanted;
    declare();
    return API;
  }

  var API = {
    init: init,
    register: register,
    t: t,
    has: has,
    apply: apply,
    setLang: setLang,
    toggle: toggle,
    /** diagnostics consumed by e2e/acceptance.js */
    keys: function () { return Object.keys(dict); },
    stats: function () {
      return {
        lang: lang,
        keys: Object.keys(dict).length,
        missing: missing.slice(),
        duplicates: duplicates.slice(),
        gaps: gaps()
      };
    },
    get lang() { return lang; }
  };

  KK.i18n = API;
})(window.KK);
