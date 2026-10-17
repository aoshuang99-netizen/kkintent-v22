# 05 · Failure library

Twenty-eight defects, each of which shipped or nearly shipped. The value of this list is
not the fixes — it is that every one of them is now guarded by an assertion that
would **fail** if it came back. A bug fixed without an assertion is a bug on a
timer.

Format: **symptom** (what a human saw) → **cause** (the real one) → **guard**.

---

## A · Measurement — the assertion was green and the thing was broken

### A1 · The homepage entry to `/v22/` was invisible on every phone
**Symptom** the release was reported twice as "nothing changed".
**Cause** `.navlinks a:nth-child(4){display:none}` hid "the 4th link", written
when the 4th link was Privacy. The new entry was inserted **in front of** it,
became 4th, and was `display:none` below 700px. Existence checks were green the
whole time.
**Guard** `nav.intentOsEntryIsRendered` reads the computed box and
`nav.intentOsIsReadableInNavText` reads `innerText` (which excludes hidden nodes)
at 320/390/430/1440. Both are positive assertions: hiding it and deleting it fail
the same way.

### A2 · Two preview pages were dead ends
**Symptom** a reader arriving from the homepage could only leave with Back.
**Cause** `anticipate` and `compile` rendered exactly one anchor — the in-page
skip link. The gate was green because `hub` asserted that every preview link
*resolves*, which is the outbound journey.
**Guard** `navclosure`: at least one **rendered** link whose href is not a
fragment, ≥44px, resolves, and points at a specific destination.

### A3 · The default language was the browser's
**Symptom** a visitor in China was served Chinese before asking for anything.
**Cause** the boot chain ended with `norm(navigator.language)`. No assertion
caught it because **every boot in the gate pinned `?lang=`**. A check that pins
its input cannot observe the default.
**Guard** `lang` boots each surface three ways in the same locale — default,
`?lang=en-US`, `?lang=zh-CN` — and compares relatively.

### A4 · Half the dictionary could have been English-only
**Symptom** none. That is the point.
**Cause** `stats().missing` fills as the page renders, so it can only prove that
the keys which *happened to be reached* are complete. A key never rendered could
have been missing forever.
**Guard** `gaps()` walks the whole dictionary; `lang.*.EveryKeyHasBothLanguages`
asserts zero gaps on every surface.

### A5 · A frame-timing assertion that had never measured anything
**Symptom** a median of `null`, reported as a pass-shaped record.
**Cause** `page.evaluate(fn, [10, 1400])` passes **one** argument; the function
expected two, so `ms === undefined`, one frame ran, and the median was `null`.
**Guard** frame measurements read synchronously in one evaluate, and the suite
asserts only "no hard freeze" — a frame budget measured on a contended desktop is
a measurement of the desktop, not of the product.

### A6 · `cross` reported three failures that were not failures
**Symptom** three FAILs when the section was run alone.
**Cause** `cross` reads `collected.n_desktop` / `collected.s_desktop`, which only
the `n` and `s` sections populate. Run as `n,s,cross`: 150/150.
**Guard** none needed — but the *habit* is the guard: before reporting a failure,
check whether that section's input is produced by another section.

### A7 · A judgement that sampled a window measured the machine
**Symptom** `collapse > 0.25` failed intermittently.
**Cause** sampled 450ms after the trigger while the easing advanced 0.085 **per
frame**; on a loaded machine only one step had happened.
**Guard** the uniform is read synchronously in the same evaluate that triggers it,
then a bounded wait for convergence.

### A8 · `scrollWidth - innerWidth` was always 0
**Symptom** a 98px overflow that no test saw.
**Cause** `overflow-x: hidden/clip` on an ancestor makes the document's scroll
width equal the viewport's, so the difference is zero by construction — the
measurement was structurally blind.
**Guard** overflow is judged by per-element `getBoundingClientRect` plus a hit
test, not by the document's scroll metrics.

---

## B · Routing — the link was correct and the destination was not

### B1 · `href="../../"` from the wrong depth
**Symptom** a "Back to the hub" that landed on `preview/`.
**Cause** the pattern was copied from `site` (one level shallower) into
`anticipate`. Copying the syntax copies the string, not the destination.
**Guard** `navclosure.reachesHub` compares **resolved absolute URLs**.

### B2 · `new URL('./', 'https://host/v22')` is `https://host/`
**Symptom** the "hub" assertion pointed at the homepage, whose 25px text nav then
failed every 44px check — a failure that had nothing to do with the section.
**Cause** the last path segment is treated as a file name.
**Guard** base URLs are built by appending the slash explicitly.

### B3 · An assertion encoded the page's depth
**Symptom** none yet — caught in review before shipping.
**Cause** `hub.linksToTheLongScrollPage` compared hrefs to the literal
`'preview/site/'`. Moving the hub one directory down rewrote the href to
`'../preview/site/'`; the link was still correct.
**Guard** resolve against the document, compare absolute URLs, assert both resolve
to the same path.

### B4 · An either/or assertion hid half the claim
**Symptom** none yet.
**Cause** `if (d.home) assert reachesSiteHomepage; else assert reachesHub` — one of
the two was always untested for any given page.
**Guard** two independent assertions per page: reaches the product, and (except
for the hub) reaches the hub.

### B5 · The door would have dropped the language
**Symptom** a `?lang=zh-CN` review link serving English.
**Cause** a hand-written redirect target with no query string. `i18n.js` reads
`?lang=` once, on the page that finally renders.
**Guard** `entry.carriesTheLanguageQuery.{zh-CN,en-US}` reads the landed page's
`data-lang` and `KK.i18n.lang`.

### B6 · `location.assign` would have made Back a loop
**Guard** `entry.theDoorIsNotAStepInHistory` — go `hub → root`, let the hop
happen, press Back, require `/hub/`.

### B7 · The no-JavaScript path was untested
**Symptom** none yet; the risk is that the only fallback for a scripting-off
reader is a `<noscript>` meta refresh, and every other test runs with JS on.
**Guard** two assertions in a `javaScriptEnabled: false` context: the hop happens,
and — since the door is then the only thing anyone sees — its control is a real
≥44px box that leads to something which answers.

---

## C · Policy and delivery

### C1 · Three writers for one language declaration, zero readers
**Cause** `<html lang>` written by `i18n.js`, `<body data-lang>` written by two
other files with a different value space, and no CSS or assertion read either.
**Guard** one writer, and `lang.*.NothingElseClaimsToDeclareTheLanguage` asserts
`body[data-lang]` is absent.

### C2 · `seo` could only ever test one index policy
**Cause** `index, follow` was a literal inside the assertion, and "exactly one
canonical" was assumed for every document. The door needs the opposite of both.
**Guard** the policy is data on each row — expected robots value and expected
canonical, including a row that expects **no** canonical — compared in both
directions.

### C3 · The sitemap would have contradicted the door
**Cause** `/v22/` is now `noindex`; leaving it in `sitemap.xml` re-creates the
exact contradiction the suite already forbids (a submitted URL whose document
refuses indexing).
**Guard** `/v22/` left the sitemap in the same step that made it `noindex`;
`/v22/hub/` entered it. Entry count unchanged (4 → 4).

### C4 · A 30-day `immutable` cache on a non-fingerprinted stylesheet
**Symptom** a fix that could not be delivered — including the fix for the rule
itself.
**Cause** a generic `\.(css|js)$` rule with `immutable` matched a file whose name
never changes.
**Guard** the reference gains `?v=rN` (a cached `immutable` browser only re-fetches
a new URL) **and** nginx sends `must-revalidate` in a block placed **before** the
generic one — nginx takes the first matching regex, not the longest.

### C5 · A service worker that served a pre-change snapshot
**Symptom** a shipped change that looked like it had never been published.
**Cause** `/` was precached; when the network failed the old snapshot rendered as a
normal page.
**Guard** the SW script is never long-cached and `/` is never precached.

### C6 · An upload falsified its own documentation
**Symptom** the live README said "`docs/` is one revision behind" — a sentence the
upload had just made false.
**Guard** before publishing, grep the documents for self-descriptions
(`behind|pending|to be synced`); after publishing, grep the **live bytes** for the
old wording and require zero.

### C7 · A deploy that reported failure had already shipped
**Cause** `SITES_SANDBOX_UNAVAILABLE` with `result unknown` — the third attempt had
written every file.
**Guard** the deploy's answer is trusted in neither direction: the served bytes are
hashed file by file, compared to the archive, and the `Last-Modified` of the
documents must be one instant, not four.

### C8 · The baseline was a stale local copy
**Symptom** another author's work was nearly reverted.
**Cause** the change was diffed against last round's local tree instead of the
live one.
**Guard** pull the live tree first, always; `set(changed) == set(expected)`, both
numbers reported (57 same / 10 changed), because only the pair is evidence.

---

## D · Platform traps that cost a round each

### D1 · A shell container wipes anything written into it
`os.js` builds the view nav with `clear(nav)` then appends only its own buttons, so
a statically written `<a>` inside `<nav class="viewnav">` is deleted at boot. Read
the builder before editing the markup.

### D2 · `touch-action` is not inherited; `pointer-events` is
`touch-action` resolves as the **intersection of the whole ancestor chain**, so
reading it per-element returns `auto` while the effective value is `manipulation`.
`pointer-events: none` on an overlay is inherited, so giving a child `z-index`
alone leaves every button dead — and `.click()` still "works" on an element no
pointer can reach, which is why tap assertions use a real pointer.

### D3 · A fixed bar wraps, so an offset computed from a token is wrong
At 430px the bar's real bottom edge was 122px while the shell had reserved 92px;
the sticky nav sat 30px underneath it and its buttons were unreachable.
`--hud-end` is now measured from the live box (`ResizeObserver`, which is exactly
the event a wrap fires), and `scroll-margin-top` accounts for the *sticky nav's*
height too.

### D4 · `%` in a format string
`"%{http_code}"` and `%Y` inside a Python `%`-formatted string are consumed by the
formatter. Build such strings by concatenation.

### D5 · Two exec calls on one SSH connection
The second often dies with `EOFError`; merge the commands into one invocation or
reconnect. High-frequency reconnects get rate-limited and take the tunnel with
them.

---

## Meta

Three of the twenty (A6, B3, B4) were found by **reviewing an assertion**, not by
running the product. That ratio is not an accident: at this point the gate is a
larger surface than the app, and it deserves the same suspicion.
