# -*- coding: utf-8 -*-
"""Root goes to concept S; the hub moves to /hub/.

Every edit below is gated by a count assertion on the target file, because a
patch that "probably matched" is the failure mode this script exists to
prevent.

EOL: measured, not remembered. Every text file in this package is pure LF
(41 text files, 0 CRLF) -- so the anchors are LF and every write asserts that
no CR survived.

  in : kkintent_public/  (66 files)
  out: kkintent_public/  (67 files; hub/index.html is new)

Run with the 3.13 interpreter and PYTHONPATH cleared (this machine's default
3.14 is polluted by a shim that breaks `import encodings`).
"""
import os

ROOT = r"C:\Users\AS\WorkBuddy\20260420163622\kkintent_public"
REPORT = []


def read(rel):
    p = os.path.join(ROOT, rel)
    with open(p, "rb") as fh:
        raw = fh.read()
    assert raw.count(b"\r") == 0, "%s: not pure LF" % rel
    return raw.decode("utf-8")


def write(rel, text):
    p = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    data = text.encode("utf-8")
    assert data.count(b"\r") == 0, "%s: a CR survived -- EOL was not normalised" % rel
    with open(p, "wb") as fh:
        fh.write(data)
    REPORT.append("write %-42s %7d B  %4d lines" % (rel, len(data), data.count(b"\n")))


def sub1(text, old, new, where):
    n = text.count(old)
    assert n == 1, "%s: anchor appears %d times, expected 1: %r" % (where, n, old[:70])
    return text.replace(old, new)


def subn(text, old, new, where, n_expect):
    n = text.count(old)
    assert n == n_expect, "%s: anchor appears %d times, expected %d: %r" % (where, n, n_expect, old[:70])
    return text.replace(old, new)


# ---------------------------------------------------------------------------
# 1. hub/index.html -- the shipped hub, one directory deeper.
# ---------------------------------------------------------------------------
hub_src = read("index.html")
assert hub_src.count("\n") > 300, "index.html shrank?"

# Every relative reference gains one level. Counted, not assumed.
for old, new, n in [
    ('href="assets/', 'href="../assets/', 4),
    ('src="assets/', 'src="../assets/', 10),
    ('href="preview/', 'href="../preview/', 4),
]:
    hub_src = subn(hub_src, old, new, "index.html -> hub", n)

# Nothing may still point at a sibling that no longer exists at this depth.
assert hub_src.count('="assets/') == 0, "a bare assets/ reference survived"
assert hub_src.count('="preview/') == 0, "a bare preview/ reference survived"

# The hub is now its own document at its own URL, so it canonicalises to that
# URL -- not to the root, which from today forwards to concept S.
hub_src = sub1(
    hub_src,
    '<link rel="canonical" href="https://kkmatch.com/v22/">',
    '<link rel="canonical" href="https://kkmatch.com/v22/hub/">',
    "hub canonical",
)

# The hub stops owning a private copy of the product link's label; the shared
# key is the single writer (see step 4, which deletes `hub.nav.home`).
hub_src = sub1(
    hub_src,
    '<a class="btn btn--ghost" href="https://kkmatch.com/" data-i18n="hub.nav.home">Back to kkmatch.com</a>',
    '<a class="btn btn--ghost" href="https://kkmatch.com/" data-i18n="common.home">Back to kkmatch.com</a>',
    "hub footer key",
)
write("hub/index.html", hub_src)

# ---------------------------------------------------------------------------
# 2. root index.html -- a door, not a document.
# ---------------------------------------------------------------------------
STUB = """<!DOCTYPE html>
<html lang="en-US" data-lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<!-- This root is a DOOR, not a document.

     It forwards to concept S -- the intent field -- because that is the
     direction that was chosen. The three-surface hub still exists, unchanged,
     at ./hub/: every preview page links back to it, and the hub links on to
     kkmatch.com.

     Two consequences are deliberate, and both are asserted in
     e2e/acceptance.js rather than described here:

       * `noindex, follow`, and no canonical of its own. A page that navigates
         away in the same tick has no content to rank; the canonical belongs
         to the document a crawler should keep, which after the hop is
         /preview/intent/anticipate/.

       * the query string is forwarded verbatim. i18n.js reads `?lang=` once,
         at boot, on the page that finally renders -- so a door that drops the
         query would silently force the default language on a reviewer who was
         handed a Chinese link.

     No external <script src>, no stylesheet, no canvas: this page must render
     in one round trip and must not depend on any file in the bundle. If the
     bundle were broken, the door would still open the door. -->
<meta name="robots" content="noindex, follow">
<link rel="icon" href="data:,">
<title>KKmatch Intent OS &mdash; opening the intent field</title>
<meta name="description" content="Entry point for the KKmatch Intent OS preview. It opens on the intent field (concept S, the chosen direction); the three-surface hub and the archived reference are one click from there.">
<noscript><meta http-equiv="refresh" content="0; url=preview/intent/anticipate/"></noscript>
<script>
/* location.replace, not assign: a door must not become a step in the history,
   or pressing Back would bounce the reader forward into the same hop again. */
(function () {
  'use strict';
  location.replace('preview/intent/anticipate/' + (location.search || '') + (location.hash || ''));
})();
</script>
<style>
  html { color-scheme: dark; }
  body {
    margin: 0; min-height: 100vh;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 18px; background: #0B0F14; color: #E6EDF3;
    font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  p { margin: 0; max-width: 44ch; padding: 0 24px; text-align: center; }
  .door__zh { display: block; color: #A6B2C2; }
  .door__go {
    display: inline-flex; align-items: center; justify-content: center;
    min-height: 44px; padding: 0 22px; border-radius: 999px;
    border: 1px solid #2A3442; color: #E6EDF3; text-decoration: none;
  }
  .door__go:hover, .door__go:focus-visible { border-color: #A78BFA; color: #C4B5FD; }
</style>
</head>
<body>
  <p>
    <span lang="en">Opening the intent field&hellip;</span>
    <span class="door__zh" lang="zh-CN">&#27491;&#22312;&#25171;&#24320;&#24847;&#22270;&#22330;&hellip;</span>
  </p>
  <p><a class="door__go" href="preview/intent/anticipate/"><span lang="en">Continue</span> &middot; <span lang="zh-CN">&#32487;&#32493;</span></a></p>
</body>
</html>
"""
write("index.html", STUB)

# ---------------------------------------------------------------------------
# 3. The three preview pages: "back to the hub" now means /hub/, and each one
#    gains a direct route back to the product. Until today the only way off a
#    preview page was Back, or the hub and then the hub's own footer -- a
#    two-hop exit from the page that is about to become the landing page.
# ---------------------------------------------------------------------------
HOME = ('<a class="btn btn--ghost" href="https://kkmatch.com/" data-i18n="common.home">'
        'Back to kkmatch.com</a>')

# --- anticipate
t = read("preview/intent/anticipate/index.html")
t = sub1(t, 'href="../../../" data-i18n="s.nav.back"', 'href="../../../hub/" data-i18n="s.nav.back"',
         "anticipate back-link")
t = sub1(
    t,
    '    <a class="btn btn--ghost" href="../compile/" data-i18n="s.nav.other">Open the archived reference</a>\n',
    '    <a class="btn btn--ghost" href="../compile/" data-i18n="s.nav.other">Open the archived reference</a>\n'
    '    ' + HOME + '\n',
    "anticipate home-link",
)
write("preview/intent/anticipate/index.html", t)

# --- compile
t = read("preview/intent/compile/index.html")
t = sub1(t, 'href="../../../" data-i18n="n.nav.back"', 'href="../../../hub/" data-i18n="n.nav.back"',
         "compile back-link")
t = sub1(
    t,
    '    <a class="btn btn--ghost" href="../anticipate/" data-i18n="n.nav.other">Open the main line</a>\n',
    '    <a class="btn btn--ghost" href="../anticipate/" data-i18n="n.nav.other">Open the main line</a>\n'
    '    ' + HOME + '\n',
    "compile home-link",
)
write("preview/intent/compile/index.html", t)

# --- site
t = read("preview/site/index.html")
t = subn(t, 'href="../../"', 'href="../../hub/"', "site back-links", 3)
t = sub1(
    t,
    '        <a class="btn btn--ghost" href="../../hub/" data-i18n="site.foot.back"></a>\n      </nav>',
    '        <a class="btn btn--ghost" href="../../hub/" data-i18n="site.foot.back"></a>\n'
    '        <a class="btn btn--ghost" href="https://kkmatch.com/" data-i18n="common.home"></a>\n      </nav>',
    "site home-link",
)
write("preview/site/index.html", t)

# ---------------------------------------------------------------------------
# 4. One key, one owner. `common.home` is registered once in the shared
#    package -- which every surface loads -- instead of a copy per concept,
#    and the hub stops carrying its own private wording for the same link.
# ---------------------------------------------------------------------------
t = read("assets/js/i18n-shared.js")
t = sub1(
    t,
    "    'common.previewTag':   { 'en-US': 'PREVIEW \u00b7 DEMO DATA',          'zh-CN': '\u9884\u89c8 \u00b7 \u6f14\u793a\u6570\u636e' },\n",
    "    'common.previewTag':   { 'en-US': 'PREVIEW \u00b7 DEMO DATA',          'zh-CN': '\u9884\u89c8 \u00b7 \u6f14\u793a\u6570\u636e' },\n"
    "    /* The one route back to the product. Registered here, in the package\n"
    "       every surface loads, rather than once per concept: four copies of\n"
    "       one label are four places to be wrong. */\n"
    "    'common.home':         { 'en-US': 'Back to kkmatch.com',          'zh-CN': '\u8fd4\u56de kkmatch.com \u9996\u9875' },\n",
    "i18n-shared common.home",
)
write("assets/js/i18n-shared.js", t)

t = read("assets/js/i18n-hub.js")
t = sub1(
    t,
    "    'hub.nav.home':     { 'en-US': 'Back to kkmatch.com', 'zh-CN': '\u8fd4\u56de kkmatch.com \u9996\u9875' },\n",
    "",
    "i18n-hub drop hub.nav.home",
)
write("assets/js/i18n-hub.js", t)

# ---------------------------------------------------------------------------
# 5. Self-check: the root really is the door now, and no file still names the
#    key that was deleted.
# ---------------------------------------------------------------------------
t = read("index.html")
assert "location.replace" in t and "noindex, follow" in t, "root is not the door"
for rel in ("hub/index.html", "preview/intent/anticipate/index.html",
            "preview/intent/compile/index.html", "preview/site/index.html"):
    assert "hub.nav.home" not in read(rel), "%s still names the deleted key" % rel

print("\n".join(REPORT))
print("\nOK  %d writes" % len(REPORT))
