# -*- coding: utf-8 -*-
"""Teach the gate the new shape: root is a door, the hub lives at /hub/.

Three kinds of change, and they are different in nature:

  1. ADDRESSES. Eight `BASE + '/index.html'` and three `BASE + '/?lang=...'`
     pointed at the hub when the hub WAS the root. They are not wrong in
     principle -- they still mean "the hub" -- they just name a path that no
     longer resolves to it. Counted replacements, because a missed one is a
     timeout at `boot()` twelve seconds later, not a clear failure.

  2. ASSERTIONS THAT ENCODED DEPTH. `linksToSite` compared hrefs to the
     literal 'preview/site/'. Moving the page one level up rewrote the href to
     '../preview/site/' -- the link is still correct, the assertion was reading
     spelling instead of destination. Resolve, then compare.

  3. ASSERTIONS THAT ENCODED POLICY. `seo` asserted one hardcoded string
     ('index, follow') and a canonical equal to the document's own URL. The
     root is now a door: `noindex, follow` and no canonical at all. The policy
     becomes data on each row, so both policies are still tested by the same
     loop rather than one being special-cased into oblivion.

Plus one new block inside the hub section for the door itself: it hops, it
carries `?lang=`, it stays out of the history, and it opens with JavaScript
switched off.
"""
import os

P = r"C:\Users\AS\WorkBuddy\20260420163622\kkintent_public\e2e\acceptance.js"


def read():
    with open(P, "rb") as fh:
        raw = fh.read()
    assert raw.count(b"\r") == 0, "acceptance.js is no longer pure LF"
    return raw.decode("utf-8")


def write(text):
    data = text.encode("utf-8")
    assert data.count(b"\r") == 0, "a CR crept in"
    with open(P, "wb") as fh:
        fh.write(data)
    print("write acceptance.js  %d B  %d lines" % (len(data), data.count(b"\n")))


def sub1(t, old, new, where):
    n = t.count(old)
    assert n == 1, "%s: %d matches, expected 1: %r" % (where, n, old[:80])
    return t.replace(old, new)


def subn(t, old, new, where, n_expect):
    n = t.count(old)
    assert n == n_expect, "%s: %d matches, expected %d: %r" % (where, n, n_expect, old[:80])
    return t.replace(old, new)


t = read()

# ---------------------------------------------------------------- 1 addresses
t = subn(t, "BASE + '/index.html", "BASE + '/hub/index.html", "hub document address", 7)
t = subn(t, "{ id: 'hub', url: '/index.html'", "{ id: 'hub', url: '/hub/index.html'", "lang surface address", 1)
t = subn(t, "BASE + '/?lang=en-US'", "BASE + '/hub/?lang=en-US'", "hub root address", 3)

# ------------------------------------------------- 2 depth-free link assertions
t = sub1(
    t,
    "    ok('hub.linksToTheLongScrollPage', h.linksToSite.length === 2 && h.linksToSite.every(l => l === 'preview/site/'), h.linksToSite);",
    """    /* The hub moved one level down, so its hrefs are written `../preview/site/`.
       Comparing against the literal string would have encoded the page's depth
       -- the one thing that just changed -- and would read as a product failure
       when it is only a spelling change. Resolve against the document and
       compare destinations: "both of these go to the long-scroll page" is the
       claim, and it survives a rename of the directory. */
    const hubRoot = BASE + '/hub/';
    const siteLinks = h.linksToSite.map(l => new URL(l, hubRoot).href);
    ok('hub.linksToTheLongScrollPage',
      siteLinks.length === 2 && siteLinks[0] === siteLinks[1] && /\\/preview\\/site\\/$/.test(siteLinks[0]),
      { raw: h.linksToSite, resolved: siteLinks });""",
    "hub.linksToTheLongScrollPage",
)

t = sub1(
    t,
    """    const codes = [];
    for (const l of links.concat(['preview/site/'])) {
      const r = await page.request.get(BASE + '/' + l.replace(/^\\//, ''));
      codes.push(r.status());
    }""",
    """    /* Both concept links and the long-scroll page, resolved exactly the way
       the assertion above resolves them -- one base per page, no second
       spelling. The old line pasted `BASE + '/'` in front of a hub-relative
       path, which after the move would have asked for /hub/preview/site/. */
    const codes = [];
    for (const abs of links.map(l => new URL(l, hubRoot).href).concat(siteLinks)) {
      const r = await page.request.get(abs);
      codes.push(r.status());
    }""",
    "hub preview-link resolution",
)

# ------------------------------------------------------ 3 policy as data (seo)
t = sub1(
    t,
    """    const SEO_DOCS = [
      { slug: 'hub', p: '/' },
      { slug: 'anticipate', p: '/preview/intent/anticipate/' },
      { slug: 'compile', p: '/preview/intent/compile/' },
      { slug: 'site', p: '/preview/site/' }
    ];
    const CANON_ROOT = 'https://kkmatch.com/v22';
    const INVISIBLE = /noindex|nofollow|noarchive/i;""",
    """    /* The policy is now data on each row instead of a literal inside the
       assertion.

       Until this round every document was indexable and canonicalised to
       itself, so "robots is exactly index, follow" could be written once. The
       root stopped being a document: it is a door that forwards to concept S.
       A door has nothing to rank and must not compete with the page it opens,
       so its policy is the opposite -- `noindex, follow`, and *no* canonical.
       Encoding that as an `if (slug === 'entry')` inside the loop is how one
       of the two policies ends up being the only one that is really tested.
       Each row therefore states what its own bytes must say:

         robots : exact content of its single <meta name="robots">
         canon  : exact href of its single <link rel="canonical">, or null
                  when the document must carry none. */
    const CANON_ROOT = 'https://kkmatch.com/v22';
    const INDEXABLE = 'index, follow';
    const SEO_DOCS = [
      { slug: 'entry', p: '/', robots: 'noindex, follow', canon: null },
      { slug: 'hub', p: '/hub/', robots: INDEXABLE, canon: CANON_ROOT + '/hub/' },
      { slug: 'anticipate', p: '/preview/intent/anticipate/', robots: INDEXABLE, canon: CANON_ROOT + '/preview/intent/anticipate/' },
      { slug: 'compile', p: '/preview/intent/compile/', robots: INDEXABLE, canon: CANON_ROOT + '/preview/intent/compile/' },
      { slug: 'site', p: '/preview/site/', robots: INDEXABLE, canon: CANON_ROOT + '/preview/site/' }
    ];
    const INVISIBLE = /noindex|nofollow|noarchive/i;""",
    "seo doc table",
)

t = sub1(
    t,
    """    for (const d of SEO_DOCS) {
      const want = CANON_ROOT + d.p;
      let res = null;""",
    """    for (const d of SEO_DOCS) {
      let res = null;""",
    "seo loop head",
)

t = sub1(
    t,
    """      ok('seo.' + d.slug + '.robotsIsExactlyIndexFollow',
        robots.length === 1 && robotsVals[0].toLowerCase() === 'index, follow',
        { want: 'index, follow', got: robotsVals });""",
    """      ok('seo.' + d.slug + '.robotsIsExactlyTheDeclaredPolicy',
        robots.length === 1 && robotsVals[0].toLowerCase() === d.robots,
        { want: d.robots, got: robotsVals });""",
    "seo robots assertion",
)

t = sub1(
    t,
    """      ok('seo.' + d.slug + '.exactlyOneCanonical', canon.length === 1, canonVals);
      ok('seo.' + d.slug + '.canonicalIsItsOwnQuerylessUrl',
        canon.length === 1 && canonVals[0] === want, { want, got: canonVals });

      ok('seo.' + d.slug + '.noInvisibleDirectiveAnywhereInTheDocument', !INVISIBLE.test(html),
        (html.match(/\\S*noindex\\S*/i) || [])[0] || null);""",
    """      /* `canon: null` means "this document must carry none", which is a claim
         that can fail: adding a canonical to the door would be a second page
         competing for the same URL as the page it forwards to. */
      ok('seo.' + d.slug + '.canonicalIsAsDeclared',
        d.canon === null ? canon.length === 0 : (canon.length === 1 && canonVals[0] === d.canon),
        { want: d.canon, got: canonVals });

      /* Stated as an equality with the declared policy in both directions, so
         an indexable page that gains noindex and a door that loses it fail the
         same assertion -- for opposite reasons, which the detail spells out. */
      const invisible = INVISIBLE.test(html);
      ok('seo.' + d.slug + '.invisibleDirectiveMatchesThePolicy',
        d.robots === INDEXABLE ? !invisible : invisible,
        { want: d.robots, foundInvisibleDirective: invisible,
          sample: (html.match(/\\S*noindex\\S*/i) || [])[0] || null });""",
    "seo canonical + invisible assertions",
)

# --------------------------------------------------- 4 navclosure two claims
t = sub1(
    t,
    """    const hubAbs = BASE.endsWith('/') ? BASE : BASE + '/';
    const docs = [
      { slug: 'hub', path: '', home: true },
      { slug: 'anticipate', path: 'preview/intent/anticipate/' },
      { slug: 'compile', path: 'preview/intent/compile/' },
      { slug: 'site', path: 'preview/site/' },
    ];""",
    """    const baseAbs = BASE.endsWith('/') ? BASE : BASE + '/';
    const hubAbs = baseAbs + 'hub/';
    const docs = [
      { slug: 'hub', path: 'hub/', isHub: true },
      { slug: 'anticipate', path: 'preview/intent/anticipate/' },
      { slug: 'compile', path: 'preview/intent/compile/' },
      { slug: 'site', path: 'preview/site/' },
    ];""",
    "navclosure doc table",
)

t = sub1(
    t,
    "        await pg.goto(hubAbs + d.path, { waitUntil: 'load', timeout: 45000 });",
    "        await pg.goto(baseAbs + d.path, { waitUntil: 'load', timeout: 45000 });",
    "navclosure goto",
)

t = sub1(
    t,
    """      if (d.home) {
        ok(tag + '.reachesSiteHomepage',
          exits.some(l => /^https?:\\/\\/(www\\.)?kkmatch\\.com\\/?$/i.test(l.abs)),
          exits.map(l => l.abs).slice(0, 8));
      } else {
        ok(tag + '.reachesHub', exits.some(l => l.abs === hubAbs),
          exits.map(l => l.abs).slice(0, 8));
      }""",
    """      /* Two different claims, and they are no longer either/or.

         They used to be: the hub had the product link, the preview pages had
         the hub link, and one branch per document covered both. Now that the
         root lands on concept S, "can reach kkmatch.com" has to hold for every
         surface -- a stranger who opens the share link and wants the product
         is one hop from home, not two, and not dependent on finding the hub
         first. "Can reach the hub" still has to hold for every surface that is
         not the hub. Splitting them means a surface cannot pass by having one
         of the two and failing the other silently. */
      ok(tag + '.reachesSiteHomepage',
        exits.some(l => /^https?:\\/\\/(www\\.)?kkmatch\\.com\\/?$/i.test(l.abs)),
        exits.map(l => l.abs).slice(0, 8));
      if (!d.isHub) {
        ok(tag + '.reachesHub', exits.some(l => l.abs === hubAbs),
          exits.map(l => l.abs).slice(0, 8));
      }""",
    "navclosure home/hub assertions",
)

# ---------------------------------------------- 5 the door, measured directly
ENTRY_BLOCK = """
    /* --- the door -------------------------------------------------------
       Nine rounds of this gate never looked at the root path itself, because
       the root path WAS the hub and every boot pinned `?lang=`. Now that `/`
       is a redirect, three separate claims need measuring, because they fail
       for three unrelated reasons:

         (a) the hop happens at all;
         (b) the query survives it -- a door that drops `?lang=zh-CN` looks
             perfect in English and silently breaks the one link a reviewer
             was handed;
         (c) Back does not bounce the reader forward again, which is what
             `location.replace` buys and `location.assign` would quietly ruin.

       All three navigations use `waitUntil: 'commit'`: the inline script in
       <head> navigates before the document finishes loading, and waiting for
       `load` on a page that is already leaving is how a passing product looks
       like a flaky test. */
    const hint = await ctx.newPage();
    const hintBag = instrument(hint);
    const landedOnS = (u) => /\\/preview\\/intent\\/anticipate\\/$/.test(u.pathname);

    await hint.goto(BASE + '/', { waitUntil: 'commit' });
    await hint.waitForURL(landedOnS, { timeout: 15000 });
    ok('entry.rootLandsOnConceptS', landedOnS(new URL(hint.url())), hint.url());

    for (const want of ['zh-CN', 'en-US']) {
      await hint.goto(BASE + '/?lang=' + want, { waitUntil: 'commit' });
      await hint.waitForURL(landedOnS, { timeout: 15000 });
      await hint.waitForFunction(() => document.body.getAttribute('data-booted') === 'true', null, { timeout: 15000 });
      const got = await hint.evaluate(() => ({
        search: location.search,
        dataLang: document.documentElement.getAttribute('data-lang'),
        i18n: window.KK && window.KK.i18n ? window.KK.i18n.lang : null
      }));
      ok('entry.carriesTheLanguageQuery.' + want,
        got.search === '?lang=' + want && got.i18n === want && got.dataLang === (want === 'zh-CN' ? 'zh' : 'en'),
        got);
    }

    await hint.goto(BASE + '/hub/', { waitUntil: 'load' });
    await hint.goto(BASE + '/', { waitUntil: 'commit' });
    await hint.waitForURL(landedOnS, { timeout: 15000 });
    await hint.goBack({ waitUntil: 'load' }).catch(() => null);
    const backPath = new URL(hint.url()).pathname;
    ok('entry.theDoorIsNotAStepInHistory', /\\/hub\\/$/.test(backPath), backPath);

    /* With scripting off, the only thing that can move the reader is the
       <noscript> meta refresh. This proves the hop, not the destination's
       rendering: concept S is a JavaScript surface and will be blank without
       it, which is what its own <noscript> says. */
    const nojsCtx = await context({ viewport: { width: 900, height: 700 }, javaScriptEnabled: false });
    const nojs = await nojsCtx.newPage();
    await nojs.goto(BASE + '/', { waitUntil: 'commit' });
    await nojs.waitForURL(landedOnS, { timeout: 15000 }).catch(() => null);
    ok('entry.theDoorOpensWithoutJavaScript', landedOnS(new URL(nojs.url())), nojs.url());
    await nojsCtx.close();

    ok('entry.noConsoleErrors', hintBag.errors.length === 0, hintBag.errors.slice(0, 3));
    await hint.close();

"""
t = sub1(
    t,
    """    const bag = pageErrors.get(page);
    ok('hub.noConsoleErrors', bag.errors.length === 0, bag.errors.slice(0, 3));
    await ctx.close();
  }""",
    """    const bag = pageErrors.get(page);
    ok('hub.noConsoleErrors', bag.errors.length === 0, bag.errors.slice(0, 3));
""" + ENTRY_BLOCK + """    await ctx.close();
  }""",
    "entry block",
)

# --------------------------------------------------------------- sanity checks
# `BASE + '/?lang=' + want` is deliberately NOT on this list: the door test
# boots the raw root with an explicit query, which is the whole point of it.
for bad in ("BASE + '/index.html", "BASE + '/?lang=en-US'", "hub.nav.home",
            "seo.robotsIsExactlyIndexFollow", "canonicalIsItsOwnQuerylessUrl"):
    assert bad not in t, "leftover reference: %r" % bad
assert t.count("const hubAbs") == 1 and t.count("const baseAbs") == 1

write(t)
print("OK")
