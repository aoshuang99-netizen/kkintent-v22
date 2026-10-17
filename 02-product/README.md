# KKmatch — Intent OS preview

Three static surfaces exploring one idea: **an interface that states what it
knows, and what it does not.** Built from a reference audit and a review of an
attached single-file implementation; everything that survived is here.

Nothing in this package calls a model, records audio, sends a message or stores
an account. Since round 4 the three surfaces are **served by kkmatch.com under
`/v22/`**; since round 6 they are a first-class part of that site — linked from
the home page navigation and listed in `sitemap.xml`, so they are meant to be
found rather than kept away.

## Live

| URL | What it is |
|---|---|
| `https://kkmatch.com/v22/` | the door — forwards to the intent field |
| `https://kkmatch.com/v22/hub/` | the hub: two concept cards, the ruling, the reference audit |
| `https://kkmatch.com/v22/preview/intent/anticipate/` | **Intent OS** (main line) |
| `https://kkmatch.com/v22/preview/intent/compile/` | frozen reference |
| `https://kkmatch.com/v22/preview/site/` | the public long-scroll page |
| `https://kkmatch-gcai-preview.app.workbuddy.host/` | the same content, re-synced 2026-10-17 — **all 67 files byte-identical** to this package, `docs/` and `e2e/` included |

**Openly indexable since round 6 — except the door.** The four documents that
carry content declare `<meta name="robots" content="index, follow">` and a
self-referential `<link rel="canonical">` pointing at their own clean URL (no
query); `sitemap.xml` lists those four at their own paths.

The root is not one of them. Since round 8 it is a **forwarding page**, and it
says so: `noindex, follow`, and **no canonical at all**. A page that navigates
away in the same tick has nothing to rank, and a canonical on it would enter it
into the same URL as the page it opens. That is a *policy per document*, not one
policy plus an exception: `seo` carries the expected robots value and the
expected canonical on each row — including the row that expects no canonical —
and compares the served bytes against that row in both directions.

The consequence is that `/v22/` itself leaves the sitemap and `/v22/hub/` enters
it. Keeping the old entry would have produced exactly the contradiction the
section below forbids: a URL submitted for indexing whose document says
`noindex`.

That `noindex` was not "removed in passing". It had two writers for one intent —
nginx's `X-Robots-Tag` header and a `<meta name="robots">` in each document — and
a page whose header says *index me* while its response header says *don't* is
worse than either answer on its own. Round 6 reverses **both in the same step**,
which is why they are one atomic change and not two.

robots.txt still carries no `Disallow` for `/v22/`, and must not: a disallowed
path is never crawled, so its canonical and its robots meta would never be read.

**The interface is English by default.** Chinese is an option the visitor
chooses, from the toggle in the top bar (and in the console sheet on a phone,
below 719px). The browser's own locale is deliberately **not** consulted:
`zh-CN` arrives only from the toggle or from an explicit `?lang=zh-CN`.

## The three surfaces

| Surface | Status | Entry |
|---|---|---|
| **Intent OS** (`S · anticipate`) | **main line** | `preview/intent/anticipate/` |
| `N · compile` | frozen reference | `preview/intent/compile/` |
| long-scroll page | the public surface | `preview/site/` |

`index.html` is a door: open it and you land on the intent field. The hub —
the two concept cards, the ruling on which one is the product, and the audit of
the five reference sites — is `hub/index.html`, and every preview page links back
to it.

**Intent OS** is the field that answers before you finish the sentence and shows
its reasons: ghost completion with a confidence meter and the features behind it,
Tab to accept / Esc to dismiss, an orbit board of intent cards on a real
spring-damper integrator, and a ledger. Confirming a card assembles it into a
dependency graph that accumulates inside a workspace.

**compile** is an instruction becoming a dependency graph you watch being built,
with a terminal where every line carries the path of the value it prints. It is
frozen — kept online because the claim "the terminal only prints measured values"
is only checkable while the terminal exists.

**the long-scroll page** is the honest marketing surface: a pinned four-step
sequence scrubbed by scroll progress, reveals that fire when reached, a hero
composer running the *real* local adapter, and a boundary table generated from the
capability list rather than written by hand.

## Run it

```bash
# any static server; the gate assumes this port
python -m http.server 18091 --bind 127.0.0.1

# then open http://127.0.0.1:18091/
```

URL switches: `?lang=zh-CN|en-US` pins the language (it also outranks a language
already chosen with the toggle, so a review link can hand someone a language) ·
`?field=css` forces the honest no-WebGL fallback.

## Run the gate

```bash
NODE_PATH=<node_modules> node e2e/acceptance.js http://127.0.0.1:18091
```

Last run: **587 / 587 PASS · 0 FAIL · 0 UNSUPPORTED · 33 INFO**, 20 sections,
**against `https://kkmatch.com/v22`**, across three device tiers (phone
320/390/430 · tablet 768/834/1024 · desktop 1280/1440). 589 are declared; the 2
`shots` assertions are the only ones this machine cannot run (`DELIVERY.md`
§11.12), so 587 execute.

Round 8 changed the totals in three places and nowhere else: `hub` grew by the
eight assertions that measure the door itself (`hub` 18 → 26), `seo` went from
four documents to five (`seo` 32 → 35, because the door's row drops the
"exactly one canonical" assertion and gains "no canonical, and the policy is the
opposite one"), and `navclosure` split one either/or into two independent claims
(`navclosure` 20 → 23). 575 + 8 + 3 + 3 = 589. The INFO total did not move — 33
again — which is the check that none of the three edits quietly turned a measured
value into a verdict.

The earlier figure of 553 was produced on a **local `python -m http.server`**,
and that origin cannot evaluate part of what `seo` claims: it sends no
`X-Robots-Tag`, and it answers a directory request with a 200 listing where
nginx answers `=404`. Round 7 re-ran every section on the real origin.

It runs as several sections rather than one process, because a single pass
outlives this shell's window. The split is only trustworthy because it was
reconciled: `pass + INFO` matches the round-5 per-section counts section by
section, and the INFO total is the same 33 — so no assertion was dropped or
double-counted by cutting the run up. Subsets: `hub,lang,seo,navclosure` ·
`n,s,cross` · `sound,contract,retain,rm,fb` · `site,appbar,zoom,mob` ·
`widths` · `touch` · `nav`.

The gate needs Playwright's chromium (the `ms-playwright/chromium-1228` build)
and a running server on the URL you pass.

## Dependencies

All vendored under `assets/vendor/`, none from a CDN:

| Library | Version | Loaded by |
|---|---|---|
| three.js | r147 | the two concept shells |
| GSAP | 3.12.5 | the two concept shells (and by ScrollTrigger) |
| ScrollTrigger | 3.12.5 | **only** `preview/site/` |

`three@0.160.0`'s `build/three.min.js` is a deprecation shim, not the library —
r147 is vendored deliberately.

**Matter.js is deliberately not used.** The orbit board is ~60 lines of
spring/damping/separation stepped deterministically, which is what makes
`overlapsAtRest 0` a verifiable statement instead of a plausible one.

## Layout

```
index.html                  the door (forwards to concept S)
hub/index.html              the hub
preview/intent/anticipate/  Intent OS
preview/intent/compile/     frozen reference
preview/site/               long-scroll page
assets/{css,js,vendor}/     shared layer + one package per surface
docs/                       reference audit · source review · specs · decisions · delivery
e2e/                        the acceptance gate and the probes
```

Each surface ships exactly four files of its own — `index.html`, one CSS package,
one i18n package, one JS package — on top of the shared layer. The shared layer is
maintained centrally; a surface changing it in passing is how two surfaces start
disagreeing.

## Where the numbers come from

* `docs/REFERENCE_AUDIT.md` — the five reference sites, one falsified, one partly
  true with its central claim unverified, three unverifiable.
* `docs/SOURCE_REVIEW.md` — the attached single-file implementation does not run:
  one placeholder CDN, one wrong method name, three syntax errors, two silent
  no-ops, and a terminal that prints numbers nothing measured.
* `docs/DECISIONS.md` — the five round-2 rulings, each with the file it lives in,
  the check that guards it, and what was rejected.
* `docs/DELIVERY.md` — what each gate section proves, and every bug the gate
  found.
* `docs/SPEC_ANTICIPATE.md` / `docs/SPEC_COMPILE.md` — the two concepts.

## Standing rules

* **Nothing is presented as measured that was not measured.** Every terminal line
  carries the path of the value it prints; every card shows the confidence and the
  features behind it; the boundary table is generated, not typed.
* **A hidden element is an untested element.** The type check runs with the
  boundary panel open on all three surfaces.
* **Sound starts off and is never persisted**, so a returning visitor is never
  greeted by noise. The first `AudioContext` is created inside a click.
* **Motion is never required.** `prefers-reduced-motion` is honoured, and the
  content is visible without JavaScript — the hidden state is scoped to the
  element that only the scroll driver sets.
* **A workspace switch is a change of context, not a `git reset`.** Assembled
  work is swapped, the account slice is untouched.
* **An offset that is assumed is an offset that is wrong.** The fixed bar can
  wrap to two rows, so its height is measured from the live box and published as
  `--hud-end`; the sticky nav is measured into `--nav-h`. Nothing positions
  itself against a token that assumes one row.
* **A tap is proven with a pointer, not with a `.click()`.** `.click()` fires on
  an element nobody could reach; `locator.tap()` cannot. Both rail controls are
  tested with real taps.
* **"Smooth" is a number.** Scrolling is measured frame by frame, and only a
  hard freeze is asserted — everything else is recorded, because a frame rate
  measured on a contended desktop is a measurement of the desktop.
* **A judgement that samples a window measures the machine; a judgement that
  reads a state measures the code.** Anything that can be read synchronously is,
  and anything that has to be waited for is waited for with a bound rather than
  a fixed sleep.
* **A web root carries the product, not the test bench.** 29 runtime files went
  to the server; the gate, the probes and the delivery documents — which contain
  this machine's absolute paths — stayed in the repository.
* **A deployed change is proven by behaviour, not by reading the file back.**
  `/v22` answering 301 is what proves the new config loaded; a sha256 of the
  file on disk proves nothing about the running process.
* **A check whose output cannot be right is itself the defect.** A leak scan
  that reports "1 of 29 files scanned" has a path-separator bug, not a clean
  tree.
* **A check that pins its input cannot observe the default.** Every boot in the
  gate passed `?lang=en-US`, so nothing ever exercised the no-parameter path —
  and the default spent four rounds being the browser's locale instead of the
  product's. The `lang` section now boots the page three ways in the same locale
  (default · `?lang=en-US` · `?lang=zh-CN`) and compares them.
* **One writer per fact.** The language declaration is written to `<html>` by
  `i18n.js` and by nobody else. It used to be written to `<body>` as well, by two
  other files, with a different value — and nothing read it, which is exactly why
  nobody noticed. A measured field that no assertion looks at is where drift hides.
* **"Selectable" includes complete.** A language toggle is only an option if
  choosing it does not drop the reader into untranslated strings, so the whole
  dictionary is checked (`gaps()`), not just the keys a page happens to render.
* **A page cannot be both listed for indexing and marked `noindex`.** The two are
  flat contradictions, and the failure mode is silent: Search Console reports
  `Submitted URL marked 'noindex'` and the page is never indexed, while every
  file on disk looks correct. `sitemap.xml` and the robots directive are checked
  against each other for that reason, not separately.
* **An index policy is judged by the bytes the origin sends.** Three writers used
  to encode it (nginx's response header, each document's meta tag, and this
  README's prose), so the gate reads the served document and the served headers —
  not the source file, which can agree with itself while the running config
  disagrees. The assertion is positive ("exactly one robots meta, and its value is
  exactly `index, follow`"), so a page that quietly *loses* its robots tag fails
  the same way a page that keeps `noindex` does.
* **A canonical that carries a query is a canonical that splits the document.**
  `?lang=` selects a rendering, not a URL, so each document canonicalises to its
  own clean path with the query stripped.
* **The second copy points home.** The share-link deployment is a duplicate of
  this one, so its documents carry the *same* absolute canonical to
  `kkmatch.com/v22/…` — which tells a crawler that the authoritative copy is the
  site, not the share link, instead of letting two copies compete.
* **`grep -c` on a minified single-line file is always 1.** The home page is one
  1.9 kB line. Counting `<a href="/privacy">Privacy</a>` returned 1 while the
  string genuinely occurs **twice** — once in the nav, once in the footer — so an
  anchor picked on that "uniqueness check" would have edited the wrong link (or
  been silently rejected for ambiguity). Uniqueness on a minified file comes from
  reading the file, not from a line count.
* **A deletion audit is a set comparison, not a substring whitelist.** The lines
  a patch removed are collected and compared against the exact set it was
  supposed to remove, and anything extra stops the patch. A whitelist of
  "lines that may be removed" passes the same patch while something else vanishes
  alongside it.
* **A deploy that reports failure may still have shipped.** Round 6's re-publish
  returned failure three times, and the third one had already written every file
  — the tool's own message said `result unknown`. What a deployment actually did
  is read from the served bytes: the digest of a document compared against the
  archive, its directives, and the `Last-Modified` of all four being the same
  instant. The tool's answer is not trusted in either direction, which is why a
  "failed" deploy here is verified exactly like a successful one.
* **A positional selector does not survive an insertion.** The home page hid
  "the 4th link" on a phone. Adding the new `/v22/` link in front of it made the
  *new* link the 4th — so the entry that round was shipping was `display:none`
  at every width ≤700px. Style an element by what it *is*
  (`.navlinks a[href="/privacy"]`), not by where it happens to sit, whenever
  anything may be inserted before it.
* **"It is in the DOM" and "the reader can see it" are two different claims.**
  At the failing widths the anchor was present and `getComputedStyle` reported
  `display:none` — an existence check passes while the release is invisible.
  Ask the renderer instead: a non-empty box, and the string present in
  `innerText`, which excludes hidden nodes. The `nav` section measures
  320 / 390 / 430 / 1440 for exactly this reason.
* **A link that resolves is not a way out.** Round 6 shipped `anticipate` and
  `compile` with exactly one anchor each — the in-page skip link — so a reader
  arriving from the homepage could only leave with Back. The gate was green
  because `hub` asserted that every preview link *resolves*, which is the
  outbound journey. Assert the return journey as a property: at least one
  **rendered** link whose href is not an in-page fragment, it clears 44px, it
  resolves, and it points at the hub (or, for the hub itself, at the site).
  `navclosure` does that, and freeing the section from a link *count* is what
  makes it survive any future redesign.
* **A relative path is a claim about depth.** `href="../../"` from
  `preview/site/` lands on the hub; the same string from
  `preview/intent/anticipate/` lands on `preview/`. The pattern copied cleanly
  and the destination did not — caught in one run by comparing resolved
  absolute URLs against the hub, not by eyeballing the markup.
* **A URL is part of the contract, so moving one is a change to the product.**
  Round 8 made `/` forward to concept S and moved the hub to `/hub/`. Four HTML
  files, one dictionary and the gate had to move together, because "back to the
  hub" was written as `../../../` (a claim about depth) in two of them and as
  `../../` in the third — the same intent, three different strings, all of which
  suddenly pointed at the wrong place. Moving the hub without moving them would
  have produced a page that links to itself.
* **A page that navigates away is not a page.** The root carries
  `noindex, follow`, no canonical, no stylesheet, no external script, and it
  forwards `?lang=` verbatim — because `i18n.js` reads that query once, on the
  page that finally renders, so a door that drops it silently forces the default
  language on a reviewer who was handed a Chinese link. Three separate
  assertions, because they fail for three unrelated reasons.
* **A relative path is not a destination until it is resolved.** Round 8 moved
  one directory and `hub.linksToSite` — which compared hrefs to the literal
  `'preview/site/'` — would have failed while the link stayed correct. The
  assertion now resolves against the document and compares absolute URLs.
* **A local static server is not a weaker production, it is a different one.**
  `python -m http.server` sends no `X-Robots-Tag`, so a header assertion passes
  without ever reading one; and it answers a directory request with a 200
  listing where nginx answers `=404`, so a broken link looks healthy. A
  byte-identical tree proves the *content* travelled; only the real origin can
  judge anything about headers, status codes or 404 behaviour. Round 7 re-ran
  every section on `https://kkmatch.com/v22` for this reason.
