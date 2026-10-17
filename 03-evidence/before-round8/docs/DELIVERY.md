# Delivery — KKmatch Intent OS, three static surfaces

2026-10-16 · **Round 5** — the interface is English by default, and Chinese is an
option the visitor chooses. It already was not: the boot chain ended with
`navigator.language`, so a browser set to `zh-CN` was served Chinese before the
visitor had asked for anything.
**Round 4** — the three surfaces are now served by kkmatch.com itself, under
`/v22/`, and the hub's top bar was rebuilt to the app-bar standard. The gate runs
against the live URL in three device tiers.
**Round 3** — the shell now behaves like an app on a phone, and every claim about
that is measured rather than asserted.
**Round 2** — the five questions from round 1 were answered and are now enforced
in code. See `docs/DECISIONS.md` for the rulings themselves.

## 0. What was asked, and what was done

Round 1 asked for three things: read the reference list, look at the reference
sites, and produce **two new interaction design previews** that keep what is worth
keeping. It also attached a single-file HTML "production-grade" implementation.

Round 2 answered the open questions from round 1 and, by ruling, promoted one of
the two concepts to the main line and added a third surface.

* The five reference sites were fetched. **One description was falsified, one was
  partly true with its central claim unverified, three could not be verified.**
  → `docs/REFERENCE_AUDIT.md`
* The attached HTML was reviewed line by line. **It does not run** — one
  placeholder CDN, one wrong method name, three syntax errors, two silent no-ops,
  and a terminal that prints numbers nothing measured.
  → `docs/SOURCE_REVIEW.md`
* N and S were built from what survived. → `docs/SPEC_COMPILE.md`,
  `docs/SPEC_ANTICIPATE.md`
* **Round 2 ruling:** S is the main line, named 意图操作系统 / **Intent OS**. N is
  kept online as a **frozen reference**, not deleted. A third surface
  (`preview/site/`) is the long-scroll marketing page. → `docs/DECISIONS.md`
* Gate result round 6: **537 / 537 PASS, 0 FAIL, 0 UNSUPPORTED, 33 INFO** — the
  507 round-5 assertions **plus the 32 new `seo` ones, minus the 2 `shots`
  assertions** this round could not run (the reasons are §11.12, not a clean
  pass). 507 − 2 + 32 = 537 exactly.
* Gate result round 7: **573 / 573 PASS, 0 FAIL, 0 UNSUPPORTED, 33 INFO**,
  **21 sections, run against `https://kkmatch.com/v22`** — 553 above plus the 20
  new `navclosure` assertions. This round also re-ran every earlier section on
  production after seven files changed; the round-6 figures had been produced
  against a **local `python -m http.server`**, which is not the same origin and,
  as §11.16 records, cannot even evaluate two of the `seo` claims.
* Gate result round 6 follow-up: **553 / 553 PASS, 0 FAIL, 0 UNSUPPORTED,
  33 INFO** — the 537 above **plus the 16 new `nav` assertions**, again minus the
  2 `shots` ones this machine cannot run. 537 + 16 = 553 exactly. `nav` guards
  the homepage entry into `/v22/`, and it exists because that entry shipped
  **invisible** below 700px — see §11.15. **These 553 ran on a local static
  server, not on production**; round 7 repeats them on the real origin.
* Gate result round 5: **507 / 507 PASS, 0 FAIL, 0 UNSUPPORTED, 33 INFO, exit 0**
  (141.1 s) — **run against the live production URL**, up from 467 / 467 in
  round 4, 408 / 408 in round 3, 347 / 347 in round 2 and 220 / 220 in round 1.

### Round 3 — the phone

The brief for this round was one sentence: *deploy it, make sure the data and the
interactions are right, the layout and the copy are right, nothing is covered,
and on a phone it has to feel like a real app.* Four of those five are things the
existing gate already measured. The fifth — *feels like a real app* — was not, so
it became a measurement before it became a change:

* A read-only touch probe (`e2e/mobile-fidelity.js`) was written first and run
  against the **unmodified** build. It found four real defects (a top bar wider
  than the screen, two buttons that no tap could reach, a sheet that did not stop
  the page behind it, and a missing `viewport-fit`), plus two defects in the
  probe itself.
* Fixing those exposed a fifth: the fixed bar **wraps to two rows** on a narrow
  screen, so its real height stops matching the `--hud-h` token that the rest of
  the page positions itself against — and the sticky view nav ended up 30px
  inside the glass bar, unclickable.
* Every one of them is now guarded by an assertion that fails on the old build.
  The new `touch` section runs 12 device/surface combinations at 320 / 390 / 430
  and reads every number off the live page.
* Two of the failures seen while doing this were **in the gate, not the product**
  — fixed-duration races that turn into false failures on a busy desktop, and a
  frame-timing helper whose two-argument signature meant it had never measured
  anything at all. Both are documented in §7.

### Round 4 — into production

The brief for this round had three parts: build the hub top bar to the industry
standard, put the surfaces on real routes, and prove it on all three device
tiers. What was done:

* **The hub top bar is now a real app bar.** It was two rows (121 px) below
  390 px because every control carried its own text label. It is now one row at
  every width from 320 to 1440 (75 px): the wordmark is a truncating flex title,
  and the three trailing actions are 44×44 icon buttons with accessible names —
  which is what Material's top app bar and Apple's navigation bar both specify.
  Nothing was removed; the labels the icons replaced moved into
  `aria-label` / `title`, and the language action keeps a visible two-letter code
  because a bare globe cannot say what pressing it would do.
* **The surfaces are served by production** at `https://kkmatch.com/v22/`,
  `/v22/preview/intent/anticipate/`, `/v22/preview/intent/compile/` and
  `/v22/preview/site/`. One nginx prefix block (`^~ /v22/`) re-declares the three
  security headers `add_header` would otherwise swallow, and falls back to `=404`
  rather than the homepage — so an unknown path under `/v22/` cannot become a
  soft 404. Until round 6 the block also sent
  `X-Robots-Tag: noindex, nofollow, noarchive`; §Round 6 below explains why that
  header and the four documents' robots tags had to be reversed in the same step
  rather than separately.
* **The web root carries the product, not the test bench.** 29 runtime files
  (1.09 MB) went to the server; the gate, the probes and the delivery documents
  — which contain this machine's absolute paths — stayed in the repository. The
  published archive keeps them; the web root does not.
* **The gate ran against the live URL**, in three tiers — phone (320 / 390 /
  430), tablet (768 / 834 / 1024) and desktop (1280 / 1440) — plus a new
  `appbar` section whose 21 assertions fail on the two-row bar.

### Round 5 — English by default

The brief had two parts: English by default with Chinese selectable, and
re-sync the share link. The first part turned out to be a real defect rather
than a preference.

* **The default was not English.** `i18n.init()` resolved the language as
  `?lang= → sessionStorage → navigator.language → 'en-US'`. The static markup was
  English, so a browser set to Chinese rendered English and then flipped once the
  script booted. The chain is now `?lang= → sessionStorage → 'en-US'`, with **no
  browser-locale step at all**: the browser's locale is not a choice the visitor
  made on this site, whereas the toggle is.
* **No assertion had ever looked at this**, because every boot in the gate pinned
  `?lang=en-US`. A check that pins its input cannot see what the default is. A
  new `lang` section (34 assertions) measures the **default boot against an
  explicit English boot and an explicit Chinese boot of the same page, in the
  same browser locale** — relative comparison on purpose, so a copy edit cannot
  break it and a machine's locale cannot hide it.
* **Chinese is complete, checked against the whole dictionary.** Choosing it does
  not drop the reader into untranslated strings: `gaps()` reports every key that
  lacks a value in a supported language, and the gate asserts it is empty on all
  four surfaces. That is a stronger question than the existing `missing` array,
  which can only ever report keys the page happened to render.
* **The tab title now follows the language.** All four documents wire `<title>`
  to a `*.docTitle` key through the same in-place pass that rewrites the body.
  The hub had a `hub.docTitle` key registered and never used, and its static
  title was still round-1 copy.
* **The language declaration has one owner.** `i18n.js` writes `lang` and
  `data-lang` on `<html>`; three other writes of `data-lang` onto `<body>` were
  removed, because they used a second value space (`en-US` where `<html>` said
  `en`) and nothing read them. The gate now asserts the declaration on `<html>`
  **and** asserts that nothing else claims to declare it.
* **The share link was re-synced** after a transient upload failure (the first
  attempt closed the socket; the retry succeeded, same link). Both origins were
  then verified byte-for-byte against the local bundle.

## 1. The three surfaces, and how they relate

| | **S · anticipate → Intent OS** | **N · compile** | **site · long-scroll page** |
|---|---|---|---|
| status | **main line** (`data-status="chosen"`) | **frozen reference** (`data-status="frozen"`) | the public surface |
| one line | The field answers before you finish the sentence | An instruction becomes a graph you watch being built | Why the field can be trusted |
| core verbs | predict · accept · **assemble** · throw | compile · assemble · approve | read · try · check |
| views | Intent field / Orbit board / Ledger | Intent frame / Pipeline / Log & receipts | one page, scroll-driven |
| signature | ghost completion with confidence + reasons; Tab/Esc; spring-damper orbit board with mutual separation; **confirming a card assembles a real dependency graph** | shader-driven collapse, staggered 3D assembly, travelling packets, bidirectional dependency graph, approval gate | pinned four-step sequence scrubbed by scroll progress; reveal-on-reach; hero composer running the real adapter |
| honesty device | every card shows its confidence and the features behind it | every terminal line carries the path of the value it prints | the boundary table is generated from `capabilities()`, not written by hand |
| carries | the product direction | evidence for the terminal-with-`data-src` claim and the four-state rail | — |

**Why N is not deleted.** The claim *"the terminal only prints measured
values"* is only checkable while the terminal exists. Deleting the reference and
keeping the claim would have been the wrong trade (`docs/DECISIONS.md` §1).

**What N contributed to the main line.** The one part of N that earned its place
was the dependency graph. On the orbit board, confirming a card now **assembles
that intent into a real graph** via the same `KK.preview.buildPipeline` adapter,
and assembly **accumulates** inside a workspace: a second confirmed card is added
to the graph you already have rather than replacing it.

Shared by all three: the bottom field, the HUD, the boundary panel, the i18n and
store layers, and the same floors — 44px targets, 12px minimum type, EN + ZH,
reduced motion honoured. The two concept shells route views instead of scrolling
and therefore **do not load ScrollTrigger**; only `preview/site/` does.

## 2. Structure

```
kkintent_preview/
  index.html                       hub: the two concepts, the ruling, the reference audit
  README.md                        what this is, how to serve it, how to run the gate
  assets/css/   tokens · base · os · hub
                concept-compile · concept-anticipate · concept-site
  assets/js/    i18n · i18n-shared · i18n-hub · i18n-compile · i18n-anticipate · i18n-site
                store · adapters · field · sound · os · hub
                concept-compile · concept-anticipate · concept-site
  assets/vendor/three.min.js (r147) · gsap.min.js (3.12.5) · ScrollTrigger.min.js (3.12.5)
                                                                            ← all local, no CDN
  preview/intent/compile/index.html
  preview/intent/anticipate/index.html
  preview/site/index.html
  docs/         REFERENCE_AUDIT · SOURCE_REVIEW · SPEC_COMPILE · SPEC_ANTICIPATE
                DECISIONS · DELIVERY
  e2e/          acceptance.js · mobile-fidelity.js · probe-smoke.js · probe-deep.js
  _audit/       acceptance-results.json · acceptance-measured.json · shots/ (25 png)
```

Shared-layer contract, unchanged in shape from the A/B/C/H round:

* **i18n** — dictionary values are plain text written with `textContent`; a
  language switch rewrites text in place and never re-mounts a view, so the draft
  survives; missing keys warn and return the key; duplicate keys across packages
  warn. Concept packages are strictly namespaced (`n.*` / `s.*` / `site.*`) and
  the gate asserts none leaks into another page.
* **store** — now **three** slices (see §3). Every entry keeps `scenarioAtWrite`.
* **adapters** — `KK.preview.*` is the only source of "service" values; every
  return carries `{mode: 'DEMO'|'SANDBOX'|'NOT_CONNECTED', previewOnly: true}`;
  no network request anywhere in the file. `PREDICTION_CONTRACT` publishes the
  payload as data (§4).

## 3. The store's three slices — a switch is a swap, not a reset

| slice | contents | on a workspace switch |
|---|---|---|
| scenario | `context` — the parse of what you are working on | **rebuilt** |
| assembled work | `pipeline`, `cards`, `signals` | **swapped via per-workspace slots** |
| account | `artifacts`, `receipts`, `consents`, `auditLog` | **untouched** |

Round 1 fixed the account slice: a workspace switch used to show
`receipts 1 → 0` — the user lost a receipt they had just earned, with no
explanation. That was reported as an open seam and left to a product decision.

Round 2 answered the remaining half and went one slice further. `state.slots.
pipeline[key]` / `.cards[key]` / `.signals[key]` hold each workspace's own work;
`setScenario` stashes the outgoing workspace and restores the incoming one. The
rule in the header of `store.js` is:

> a workspace switch is a change of context, not a `git reset`.

`assembledAt` is the **identity of the graph**: written once at first assembly
and never overwritten afterwards (`lastAssembledAt` carries the latest touch).
The retention checks compare it across a switch, which is what makes "restored
exactly" a testable statement rather than a hope.

Assertions: `retain.{s,n}.{assemblyProducesAnAssembledGraph,
switchingAwayDoesNotDestroyIt, theOutgoingSlotStillHoldsIt,
comingBackRestoresItExactly, theRestoredGraphIsNotEmpty,
theVisibleSurfaceShowsTheRestoredWork, theToastSaysWhatWasKept,
theToastDoesNotClaimThePipelineWasCleared, retentionIsReadableFromTheDom,
receiptsStillSurviveTheSameSwitch}`.

## 4. The prediction payload, published as `kk.prediction.v1`

The answer to question 3 was "same payload" — so the payload became **data**.
`KK.preview.PREDICTION_CONTRACT` lists every field, its type and whether it is
required; `validatePrediction(p)` returns a report (`{name, ok, missing,
wrongType, unexpected, broken}`) rather than a boolean; `confidenceFromBasis
(basis)` is the single scoring function that both `predict()` and the checker
call, so the number and the reasons cannot drift apart.

Fields allowed to change meaning when a real model arrives — **exactly two**:

| field | today | with a model |
|---|---|---|
| `provider` | `preview.template.v1` | the real model id |
| `notAModel` | `true` | `false` |

**`notAModel` is deliberately not pinned to `true`.** A flag that can only ever
hold one value is decoration, not information. What is pinned is the rule — it is
true exactly when no model produced the tail — and the local adapter must return
`true`.

The hole itself is data too: `modelAdapterContract()` returns a `NOT_CONNECTED`
descriptor with a null endpoint and no transport, and the ledger renders it. The
answer to "could you plug a model in?" is a table, not a promise.

## 5. Sound is off, and now cannot be remembered as on

Round 1 shipped with sound off but **persisted "on"** in `sessionStorage` — so
someone who had turned it on was greeted by noise on their next arrival. That is
the worst failure mode a decorative audio layer can have.

Round 2 removes the storage key entirely. `init()` honours `DEFAULT_ON = false`
and reads nothing; the first `AudioContext` is created inside a click and never
at boot; `state()` exposes `defaultOn` / `persisted` / `gestures` so the promise
is **readable from the outside** rather than inferable. `ctxState === 'none'`
before the first gesture is a checkable statement.

## 6. Gate — what each section proves

**575 assertions in 21 sections**, 33 of them INFO records (measured values, not
pass/fail). Round 5 ran the 18-section version against `https://kkmatch.com/v22`,
not a local copy. Round 6 adds the `seo` section, which **must** be run against a
served origin: it reads the response headers, and a source tree has none. The
round-6 follow-up adds `nav`, which is **production-only** by construction — it
guards the homepage entry into `/v22/`, and the homepage is not part of this
package — and reports UNSUPPORTED everywhere else rather than inventing a pass.
Round 7 adds `navclosure`: every surface must be leavable without the browser's
Back button.

Of the 575, 573 were executed **on production this round** — the two `shots`
assertions could not run here, and §11.12 says why rather than counting them as
a pass. The round-6 run of the same assertions happened on a local
`python -m http.server`; §11.16 records what that origin cannot measure.

**The same sections were also run against the share-link origin on 2026-10-17**,
after the upload, so that "the share link matches" is a measurement and not a
claim. `seo` and `nav` are skipped there by construction — the share link has no
nginx headers to read, and the homepage is not part of this package — and `shots`
still cannot run, so 575 − 32 − 16 − 2 = **525 assertions, 525 PASS, 0 FAIL,
33 INFO**. The INFO total being *identical* to production's is the point: the two
origins produce the same measured values, not merely the same verdicts.

| Section | n | The claim it checks |
|---|---|---|
| `hub` | 20 | one direction chosen and one frozen, and only the chosen card carries the primary action · the five reference verdicts are specific · the ruling section has five rows · sound starts off here too · the contract is named here · the boundary panel carries the new capability row · every preview link resolves 200 · no duplicate i18n key · **every control in the phone top bar is on screen and ≥44px** |
| `N` | 76 | refuses short input · payload labelled DEMO/notAModel · blueprint counts · `work.*` measured · pacing disclosed **separately from compute** · dependency rule applied at compile · **the compile drives the shader uniform, read synchronously** · **that uniform then converges to its target** · 5 meshes / 4 tubes / 4 packets · rail states and disabled buttons · **every terminal line resolves its `data-src` and contains that value** · no unmeasurable claim · local node → `PREVIEW_ADAPTER` receipt · blocked node refuses · reopen re-blocks downstream **and does not undo completed work** · deny changes nothing · approve → `SANDBOX` receipt with `externalWorldChanged: false` |
| `S` | 66 | ghost only on a matched opening · needs two characters · no stale confidence left in the DOM · confidence in range and monotone in signal · band matches the number · ≥ 2 reasons · Tab accepts / Esc dismisses · 3 cards, no overlap, resting exactly on their slots · a throw displaces 155 px and returns to 0 · list mode turns physics off and hides nothing · board pauses when you leave it · microphone outcome recorded in one of three states · ledger counts match the store |
| `site` | 63 | ScrollTrigger is loaded, gsap is loaded for it, and it is **actually wired** (20+ triggers, a real pin) · the document is long enough to scroll · nothing is revealed before it is reached · the first screen is already readable · the hidden state is scoped to the scroll driver · scrolling reveals everything · the progress bar follows the scroll · the pinned sequence scrubs to the last step with exactly one active · hero says nothing when there is nothing to say, runs the **real** adapter, states its confidence and reason count, refuses to invent a completion, and is labelled not-a-model · the contract table matches the adapter · language switch recomputes the scroll geometry · **reduced motion**: creates no ScrollTrigger at all, says why, the hidden state never applies, every section visible without scrolling, no content faded out, all steps stated rather than scrubbed · **no-JS**: real text, not a blank screen, and still links to every surface |
| `touch` | 90 | **three tiers** (phone 320/390/430 · tablet 768/834/1024 · desktop 1280/1440) × four surfaces: **the layout viewport equals the device width** · **no control is covered** · tap feedback is not the browser flash (recorded as not-applicable on the desktop tier, which has no touch) · taps are not held for the zoom wait · no sideways scroll · `viewport-fit=cover` declared · the bar and the sticky nav do not overlap · the first content block starts below the bar · **the sheet freezes the page behind it and hands the scroll offset back** · **a 150px drag dismisses it, a 26px drag does not** · sound and language left the phone bar so the sheet must still carry them, at 44px, and they must work · **the skip link does not land behind the sticky chrome** · **scrolling does not freeze** · the rail's Sound / Language answer a **real pointer tap** |
| `appbar` | 21 | **the hub top bar is an app bar, not a wrapped row** — measured per tier: one row · every action ≥44px · every action has an accessible name · no action leaves the viewport · no action's content overflows its own target · the icon actions really paint an icon and not just a fallback label · the title is built to truncate rather than push (a ~380-character wordmark is injected and the bar must still hold one row) · 320px still holds one row · the sound icon survives its own state update · the sound toggle tells assistive tech the truth (`aria-pressed`) |
| `retain` | 22 | (11 per concept) assembly produces an assembled graph · switching away does not destroy it · the outgoing slot still holds it · coming back restores it **exactly** (node ids, states and `assembledAt` compared) · the restored graph is not empty · the visible surface shows the restored work · the toast says what was kept and does **not** claim the pipeline was cleared · retention is readable from the DOM · receipts still survive the same switch |
| `contract` | 16 | seven inputs (`''` · `一` · `帮我` · `今天天气不错` · a long Chinese sentence · `help` · `why`) each produce a valid payload · the payload self-identifies · no undeclared fields · **`confidence` equals the sum of its disclosed basis** · `tailId` is null exactly when it does not fire · the band is derived from the number · every basis id is a weight · the local adapter says it is not a model · the ledger shows the same contract name and field count and agrees with the live check · the adapter hole is **described, not filled** · a real model must return the same shape · exactly two fields may change meaning · the flip is documented, not hardcoded |
| `sound` | 9 | starts off · creates no `AudioContext` before a click · has played nothing · the button states the truth **in words** · turns on only on a click · the play count is real · is off again after a reload · is never persisted · no console error |
| `zoom` | 15 | 200% (640 CSS px @ dsf 2), all three surfaces: no overflow · no clipped text · no type below 12px · controls still ≥ 44px · the reading rail does not cover the headline |
| `cross` | 13 | headlines differ in both languages · concept packages do not leak into each other's page · **the site page carries only its own package** · shared keys are identical on all three · **the site's copy of the S tails matches the S package** (loaded at runtime and compared, so two copies cannot drift) · receipt/consent contracts identical |
| `seo` | 32 | (4 documents × 8) **the index policy the origin actually serves** — per document: exactly one `<meta name="robots">`, its value **exactly** `index, follow` (a positive assertion, so quietly *losing* the tag fails the same way as keeping `noindex`) · exactly one self-referential `<link rel="canonical">` pointing at that document's own **clean** URL with the query stripped · **zero `noindex` / `nofollow` / `noarchive` in the served bytes and in the served headers** · a non-empty `<title>` and `<meta name="description">` · the sitemap lists the URL and its directive does not contradict it |
| `nav` | 16 | (4 widths × 4) **the homepage entry into `/v22/` is actually rendered — not merely present in the DOM** — at 320 / 390 / 430 and 1440px: the nav exists · `<a href="/v22/">` is in it · its computed box is non-empty (`display`, `visibility` and `getBoundingClientRect`) · the string `Intent OS` is in the nav's `innerText`, which excludes `display:none` nodes. Written after the entry shipped invisible below 700px (§11.15). **Production-only** — anywhere else this section reports UNSUPPORTED rather than guessing |
| `navclosure` | 20 | (4 documents × 5) **each surface can be left without the browser's Back button** — the property the `hub` section could not see, because "every preview link resolves 200" describes the outbound journey and says nothing about the return one. Per document: the page loads · at least one **rendered** link that is not an in-page fragment (a skip link cannot satisfy it) · every such exit is ≥44px · every such exit resolves (a `<loc>`-style 200, not a directory listing) · the three surfaces each reach the hub, and the hub reaches `kkmatch.com`. Written after round 6 shipped `anticipate` and `compile` with exactly one anchor each — the skip link — so a reader arriving from the homepage could only escape with Back (§11.17) |
| `widths` | 20 | **4 surfaces** (the hub is now included — it never was, and that is exactly why its top bar was allowed to overflow) × widths spanning **three tiers** (320…1600) with the boundary panel **open**: no document overflow · no element leaving the viewport · no type below 12px · **no control covered by another element** (hit-tested at its centre) |
| `lang` | 34 | **English is the default on a browser set to Chinese** — the default boot is compared against an explicit `?lang=en-US` boot and an explicit `?lang=zh-CN` boot of the same page in the same locale (4 surfaces × 6 checks) · the `lang` / `data-lang` declaration on `<html>` follows the text, and **nothing else claims to declare it** · Chinese is still selectable and renders different text · **every key in the dictionary has a value in both languages**, and nothing on the page falls back to its own key name · **the tab title follows the language** · the bytes the server sends already declare English — checked on the served document, not the DOM · **the toggle in the top bar really selects Chinese** (a real pointer tap, on a phone) and the choice survives a reload · an explicit `?lang=` still outranks the stored choice, so a review link can hand someone a language · no console errors |
| `n` / `s` mobile | 32 / 32 | 390×844 touch context: no console error · i18n complete · no overflow · 44px targets · field backend stated · HUD · **the language is declared on `<html>` and nowhere else** · boundary panel · skip link · h1 · type floors |
| `FB` | 5 | no WebGL → falls back with a recorded reason · says so on screen · builds no meshes · every function still works · no console error |
| `RM` | 4 | reduced motion → the 3D field draws **one frame** then stops, drift off · the orbit board opens in list mode with an on-screen explanation |
| `shots` | 2 | the evidence screenshots exist and are non-empty — **not run this round**: the write is blocked by this machine's file-system shim, and §11.12 records the substitute evidence chain instead of claiming a pass |
| INFO ×33 | — | measured values recorded per surface × language × viewport × tier, plus **the frame budget per product surface** and the sticky-offset values actually published |

### 6.1 The app contract on a phone, measured

All numbers read from the live page at 320 / 390 / 430 px, `isMobile`, dsf 3.
Round 4 added the hub's own bar to the same discipline:

| | before (round 3) | after (round 4) |
|---|---|---|
| hub top bar at 390px | **two rows, 121 px** — four text-labelled controls did not fit | **one row, 75 px**, at every width 320…1440 |
| hub top bar controls | text labels, 42×20 hit areas | **three 44×44 icon buttons** with `aria-label` / `title`; the language action keeps a visible code because a bare globe cannot say what it does |
| a title that is too long | pushed the actions off the edge (the round-3 defect) | the title truncates; **a ~380-character wordmark is injected and the bar must still hold one row** (`appbar.survivesAnAbsurdlyLongTitle`) |

| | before | after |
|---|---|---|
| layout viewport on a 390px device (hub) | **489 px** — the whole page rendered zoomed out | 390 px |
| controls a tap could not reach, per surface | site 2 · anticipate 3 @430 · compile 3 @430 | **0** |
| sheet open: document movement under two 400px swipes | **375 px** (anticipate) · **519 px** (compile) | **0 px**, and the offset is restored on close |
| sheet dismissal | button only | 150px drag → closed · 26px drag → stays open |
| bar / sticky nav | bar really 122 px tall at 430, nav placed at 92 px → **nav 30px inside the bar** | bar 56 px (12…68), nav 92…148 |
| skip link landing | top of the target at **92 px**, i.e. 40 px behind the sticky nav | **148 px** = the nav's measured bottom |
| `--safe-t` / `--safe-b` | `0px` on all four surfaces (`viewport-fit` absent) | wired to `env()`, `viewport-fit=cover` declared on all four |

Round 5, read on a browser whose locale is set to `zh-CN` with nothing stored —
i.e. what a visitor in China actually gets on a first visit:

| | before (round 4) | after (round 5) |
|---|---|---|
| language on first load, browser set to Chinese | **`zh-CN`** — the visitor was served Chinese before asking, and saw English flip to Chinese as the script booted | **`en-US`**, identical to an explicit `?lang=en-US` boot, and different from `?lang=zh-CN` |
| keys lacking a value in a supported language | unknown — `missing` only reports what the page happened to render | **0**, on all four surfaces (224 / 204 / 166 / 167 keys) |
| tab title when Chinese is chosen | English (the `<title>` was never wired to the dictionary) | follows the language on all four documents |
| `data-lang` on `<body>` | `en-US` (hub at boot) · nothing (surfaces) · `zh-CN` after a switch — **three writers, two vocabularies, no reader** | absent; `<html>` is the single declaration, asserted |

Three screenshots taken from the live URL in a `zh-CN` browser are the visual
half of that table: `docs/shots/lang-1-default-on-a-chinese-browser.png` (English,
before anything is pressed), `lang-2-after-choosing-chinese.png` (the same page
after a tap on the toggle) and `lang-3-anticipate-in-chinese.png` (the product
surface reading in the reader's language).
| tap feedback / tap delay | browser blue flash, default `touch-action` | `rgba(0,0,0,0)`, `manipulation` as the intersection baseline |
| frame budget while scrolling (390px) | not measured — the helper was broken | anticipate p95 16.8 / worst 16.8 / **0 dropped** · compile the same · site p95 16.7 / worst 16.8 / **0 dropped** |

Every row of that table was measured on a desktop where the user's own browser
and their anti-detect browser were holding 15.4 GB of the machine's 16 GB. The
frame numbers above were taken in a window where that pressure let up; under
pressure the same measurement produced `framesDrawn: 1` over 2.5 s. That is why
the only frame claim left in the gate is about a **hard freeze**, not a frame
rate — see §7.17 and §7.18.

## 7. Bugs found and fixed by the gate

Round 1: five. Round 2: five. Round 3: eight (five in the product, three in the
gate). The round-3 set is §11–18 below.

1. **Empty buttons after a compile.** `renderCurrent()` rebuilt `[data-i18n]`
   nodes without running the translation pass. Fixed in both concepts; the
   general assertion `everyI18nNodeHasVisibleText` now guards it.
2. **Boundary table overflowed at ≤ 430px** once the panel was opened. Fixed by
   stacking the table below 720px; the width sweep now runs with the panel open.
3. **Card confidence came from the wrong text** — `addFromDraft` reused the
   composer's last prediction. Now each card is scored from its own text.
4. **Stale confidence left in the DOM** when a prediction was withdrawn.
5. **`three@0.160.0` `build/three.min.js` is a deprecation shim** — it prints the
   r150+ warning. Vendored r147 instead and documented the migration path.

Round 2 — three real defects surfaced by the retention work, plus one
cross-concept shape disagreement:

6. **`setNodeState` never re-pointed the slot.** Node state is part of the
   assembled work but never reached `slots.pipeline[key]`; it only worked by
   object aliasing, and **a page reload broke it silently** (JSON parse in
   `load()` produces a separate object). Fixed by stashing on every node-state
   write *and* re-pointing the slots at the live objects on load.
7. **`nextState` in concept N replaced the pipeline record instead of merging
   it.** Writing a fresh `{nodes, edges, scenario}` dropped `assembledAt`,
   `builtAt`, `fingerprint` and `cards` — so **running one node un-assembled the
   graph**. Caught by `retain.n.assemblyProducesAnAssembledGraph`.
8. **`markAssembled` overwrote `assembledAt` on every call**, making the
   first-assembly timestamp meaningless — and it is exactly what the retention
   check compares. Now first assembly only; later additions touch
   `lastAssembledAt`.
9. **N wrote `signals` as a bare object while S keeps an array.** Two concepts
   disagreeing about the shape of a shared field is only visible when one page
   reads what the other wrote — which happens on a reload in the same tab, since
   both pages share one `sessionStorage` key. N now writes the array shape.
10. **Capability-table `<code>` rendered at 11.04px** — below the project's own
    12px floor — and had never been caught, because on the concept pages the
    panel is a closed `<details>` and every leaf inside measured `height: 0` and
    was filtered out of the type check. The new page has the panel open by
    default, so it surfaced immediately. The offending rule was in the new CSS
    (`.st-sec code { font-size: .92em }` leaking into the shared panel); the
    durable fix is `widths.<surface>NoTypeBelow12pxWithThePanelOpen`.
    **Lesson: a hidden element is an untested element.**

Round 3 — five product defects and three defects in the gate itself. All five
product defects were found by the touch probe **before** anything was changed,
and each is now guarded by an assertion that fails on the old build.

11. **The hub's top bar was 98px wider than a 390px phone.** Three controls
    (a 147px link, a 105px Sound button, a 62px language button) plus a wordmark
    measured 488px, past the right edge, where `overflow-x: clip` made them not
    merely tight but **unreachable**. And Chrome did not clip and move on: it
    **widened the layout viewport to 489px and rendered the entire page zoomed
    out**. Root cause of it never being seen: the width sweep's `CAPS` list did
    not include the hub, and its overflow test was
    `documentElement.scrollWidth - innerWidth` — which `overflow-x: hidden/clip`
    makes permanently 0. Fixed with `min()`-guarded grid tracks, a wrapping row,
    and two new assertions: the hub is in `CAPS`, and the sweep now measures
    **element rects** and **hit-tests every control** instead of trusting one
    number from `<html>`.
12. **Sound and Language on the long-scroll page could not be tapped at all.**
    `.st-rail` is an overlay with `pointer-events: none`; `pointer-events` is
    inherited, and the rule that re-armed the rail's children
    (`.st-rail > *`) set only `z-index`. The buttons were painted, sized, and
    dead — a real `locator.tap()` timed out after 4000ms. Only the interactors
    are re-armed now; the spacer and the progress track stay transparent.
13. **An open sheet did not stop the page behind it.** Two 400px swipes moved the
    document 375px on anticipate and 519px on compile. Fixed with a body-pin
    scroll lock (`top` carries the offset, so locking cannot jump the reader to
    the top) behind a depth counter, because the confirm sheet can open on top of
    the console sheet.
14. **`viewport-fit=cover` was missing on all four pages**, so `env(safe-area-inset-*)`
    resolved to `0px` and the "safe area" tokens were decoration. Declared
    everywhere; the HUD, the rail and the bottom padding now read `--safe-t` /
    `--safe-b`.
15. **The fixed bar wraps to two rows on a narrow screen, and everything
    positioned against `--hud-h` was wrong by the wrapped amount.** Measured at
    430px: the bar's real bottom was **122px**, while `.shell` reserved 92px and
    the sticky view nav was placed at 92px — so the nav sat 30px inside the glass
    and its buttons were covered. The token was a guess that only holds while the
    bar is one row. It is now **measured from the live box** and kept current by a
    `ResizeObserver` (published as `--hud-end`), which is exactly the event that
    fires when a wrap happens; the phone bar also collapses to one row by moving
    Sound and Language into the console sheet they were already duplicated in.
16. **`scroll-margin` accounted for the HUD but not the sticky nav.** The skip
    link's target landed at 92px — 40px behind the view nav. The nav is sticky
    too, and it is the *lower* of the two, so it is the one that matters. Its
    height is now measured into `--nav-h` and folded into `--stick-offset`; the
    landing is 148px, i.e. the nav's measured bottom. This one was **introduced by
    the round-3 fix for #15** and caught by the probe written in the same round.
17. **`field.pulse()` scheduled an unmanaged expiry timer.** Two pulses in flight
    is normal — the compile issues one and a re-render can issue another — and the
    **older** `setTimeout` would fire and drag `ctx.target` back to the resting
    0.22 while the newer pulse was still meant to be holding. The newest intent
    did not win. Fixed with a single timer handle that every pulse and `settle()`
    cancels. It presented as a *test* flake (`collapse` peaking at 0.22 instead of
    1) and was only untangled by reading the driver rather than sleeping longer.
18. **Three defects in the gate itself**, all of the same kind — measuring a
    window instead of a state:
    * `N.shaderCollapseUniformMoved` sampled an eased value after a fixed 450ms.
      The uniform eases 0.085 **per frame**, so on a starved renderer a single
      450ms frame leaves it at exactly one step. It is now two claims, both
      throughput-independent: the field's target and signal are read
      **synchronously in the same tick** as the compile, and convergence is tested
      separately with a no-expiry target and a 12s bound.
    * `S.permission*` slept a fixed 1200ms for a browser permission answer and
      left the consent list empty on a busy run. Now it polls for the condition,
      bounded at 4s.
    * `mobile-fidelity.js`'s `frameTiming(stepPx, ms)` was called through
      `page.evaluate(fn, [10, 1400])`, which passes **one** argument — so `ms` was
      `undefined`, `now - t0 < undefined` was false on the first tick, and every
      run reported `frames: 1` with a null median. **The frame-timing measurement
      had never measured anything.** The probe also reported `touch-action` per
      element, which is `auto` for every descendant even when the whole tree is
      effectively `manipulation` (the property is not inherited; what governs
      behaviour is the intersection with every ancestor). Both fixed.

    **Lesson for the third time: a judgement that samples a window measures the
    machine; a judgement that reads a state measures the code.**
19. **The hub app bar's first fix wrapped on a long title.** With
    `flex-wrap: wrap` on the bar and the title allowed to grow, a ~380-character
    wordmark took its **own row**: line-breaking uses each item's base size,
    before shrinking, so the title won the row and the bar went two rows again —
    the exact defect being fixed. The standard app-bar answer is a zero-basis
    growing title (`flex: 0 1 auto; min-width: 0; text-overflow: ellipsis`), and
    the gate now injects that wordmark and asserts one row. Caught by the new
    `appbar` section on its first run, before anything shipped.
20. **Two deployment defects, both caught by checks written for them:**
    * The publish manifest stored **backslash** paths on Windows, so every
      downstream check that split on `/` silently matched nothing — the
      "runtime debris" scan reported **1 of 29** files scanned. Paths are now
      normalised at generation and again on read. A check that reports a number
      that *cannot be right* is itself a defect, not a pass.
    * The noindex `<meta>` was injected next to one that was already there, so
      every document carried **two** robots metas. Harmless in behaviour (crawlers
      merge them and take the strictest) but a markup flaw; consolidated into one
      and upgraded to include `noarchive`.
21. **The default language was the browser's, not the product's.** The brief said
    "default English, Chinese selectable". The second half was true; the first was
    not. `i18n.init()` ended its resolution chain with
    `norm(navigator.language)`, so a browser set to `zh-CN` was served Chinese
    before the visitor had asked for anything — and because the static markup is
    English, they first saw English and then a flip once the script booted. The
    browser's locale is not a choice made on this site; the toggle is. Removed.
    **The reason it survived four rounds of gates is the interesting part:** every
    boot in the gate passed `?lang=en-US`, so no assertion had ever exercised the
    no-parameter path. A check that pins its input cannot observe the default. The
    new `lang` section compares the default boot against an explicit English boot
    **and** an explicit Chinese boot in the same locale — three boots, relative
    comparison — which is a shape a pinned parameter can never accidentally
    satisfy.
22. **A second, quieter defect found while fixing #21: the language declaration
    had three writers and two value spaces.** `i18n.js` put `data-lang="en"` and
    `data-lang="en-US"`-style short forms on `<html>`; `hub.js` and `os.js` put the
    **full tag** (`en-US`) on `<body>`, and only after a switch, so the surfaces'
    `<body>` carried nothing at all on first load. Nothing read either attribute —
    no stylesheet, and the gate collected the `<body>` one and never asserted it.
    It was dead state that would have drifted the moment anything started reading
    it. Now `i18n.js` is the single writer of both attributes on `<html>`, the
    `<body>` writes are gone, and the gate asserts the declaration **and** that
    nothing else claims to declare it. Recorded as a general rule: a measured
    field nobody asserts is where drift hides.
23. **Choosing Chinese could have dropped the reader into untranslated strings,
    and no check would have said so.** `KK.i18n.stats().missing` only reports keys
    that a page *happened to render*, so a key on an unvisited branch could be
    English-only forever. `gaps()` now walks the whole dictionary and reports every
    key lacking a value in any supported language; the gate asserts it is empty on
    all four surfaces (measured: 224 / 204 / 166 / 167 keys, 0 gaps). The
    dictionary turned out to be complete — the point is that this is now known
    rather than assumed.

## 8. How to run

```bash
# serve (any static server; the gate assumes this port)
python -m http.server 18091 --bind 127.0.0.1      # from kkintent_preview/

# full gate against a local copy
NODE_PATH=<node_modules> node e2e/acceptance.js http://127.0.0.1:18091

# full gate against production (all three tiers, as run for round 5)
NODE_PATH=<node_modules> node e2e/acceptance.js https://kkmatch.com/v22

# subsets
node e2e/acceptance.js http://127.0.0.1:18091 site,widths
node e2e/acceptance.js http://127.0.0.1:18091 retain
node e2e/acceptance.js http://127.0.0.1:18091 sound,contract
node e2e/acceptance.js http://127.0.0.1:18091 touch      # the three-tier phone contract
node e2e/acceptance.js http://127.0.0.1:18091 appbar     # the hub top bar
node e2e/acceptance.js http://127.0.0.1:18091 lang       # English by default, Chinese selectable
node e2e/acceptance.js http://127.0.0.1:18091 seo       # sitemap/index policy vs. the bytes the origin serves

# the read-only touch probe (no assertions of its own, just the numbers)
node e2e/mobile-fidelity.js http://127.0.0.1:18091 [hub,anticipate,compile,site]
```

### Deploying to /v22

The web root is **not** the published archive. `kkintent_preview/_webpack.py`
builds `kkintent_web` — the 29 runtime files only — and asserts that every file
is byte-identical to the archive, that no `docs/` or `e2e/` came along, and that
no file contains a machine path. `_kk_v22_patch.py` builds the nginx block and
shadow-validates it (`nginx -t -c <new file>`) before anything is installed;
`_kk_v22_apply.py` installs it after a baseline-hash guard and proves it landed
by behaviour (`/v22` must answer 301), not by reading the file back;
`_kk_v22_deploy.py` uploads and byte-verifies.

The gate writes `_audit/acceptance-results.json` (every assertion) and
`_audit/acceptance-measured.json` (every measured value) and exits non-zero on
any failure. `_audit/` is never published.

URL switches: `?lang=zh-CN|en-US` (deterministic language) · `?field=css`
(force the honest fallback path).

## 9. Boundaries

No surface calls a model, records audio, sends a message, stores an account or
touches anything on kkmatch.com. Every value that would come from a service is
produced by a local adapter and labelled `DEMO` or `SANDBOX`. Approving a gated
step produces a receipt whose `externalWorldChanged` is `false`.

Since round 4 the surfaces are **served by** kkmatch.com under `/v22/`: static
files and one nginx block. Round 6 additionally edited three files that already
existed on the host — the home page's navigation (one link added), `sitemap.xml`
(four URLs added) and that same nginx block (one header removed). Each edit was
diffed against a backup taken **from the live file** in the same run, not against
a local copy, because a local copy can silently predate someone else's change. No
route was removed or redirected, and the whole round is reversible by restoring
the three `.bak_*` files and deleting `/opt/kk-match/frontend/v22/`.

## 10. Rulings (round 1 questions, now closed)

All five are answered and enforced; the full reasoning, the file each lives in
and the check that guards it — plus what was rejected and why — is in
`docs/DECISIONS.md`.

| # | Question | Ruling | Enforced by |
|---|---|---|---|
| 1 | N, S, or a fusion? | **S is the main line, named Intent OS. N is a frozen reference, kept online.** N's graph was carried into S. | `hub.oneDirectionChosenOneFrozen`, `hub.chosenCardIsThePrimaryAction`, `retain.s.*` |
| 2 | Sound off in the shipping version? | **Yes, and stricter — it is never persisted, so it cannot be remembered as on.** | `sound.*` (9), `hub.soundStartsOffOnTheHubToo` |
| 3 | Same payload for a real model? | **Yes — `kk.prediction.v1`, validated on every prediction. Exactly two fields may change meaning.** | `contract.*` (16) |
| 4 | Add ScrollTrigger for a long-scroll page? | **Yes — vendored 3.12.5, loaded by exactly one page. The two concept shells still do not import it.** | `site.*` (60) |
| 5 | Keep the assembled pipeline across a workspace switch? | **Yes — a switch is a swap, not a reset. Three slices.** | `retain.*` (22) |

## 11. Still open

1. **Sound as a first-class setting in production.** Off and unpersisted is the
   preview's answer; a real settings surface would need a visible toggle and a
   decision about whether it may persist once it is a deliberate setting.
2. **The ghost's real source.** The payload is fixed; when a model is connected,
   `provider` and `notAModel` are the only two fields that change. The transport
   is deliberately undescribed (`modelAdapterContract()` returns
   `NOT_CONNECTED` with a null endpoint).
3. **Matter.js** remains deliberately unimported. The orbit board is ~60 lines of
   spring/damping/separation; the gate can prove `overlapsAtRest 0` and
   `distAtRest [0,0,0]` because the integrator is stepped deterministically.
   A physics engine would have replaced a checkable claim with a plausible one.
4. ~~Going into the real product shell~~ — **closed in round 6.** The surfaces
   now live at `kkmatch.com/v22/` as an indexed part of the site: the home page
   navigation carries one `Intent OS` entry pointing at `/v22/`, all four
   documents are in `sitemap.xml`, and the namespace is no longer `noindex`. What
   remains a product decision is the **granularity** — one hub entry rather than
   three child links — and that was decided, not deferred.
5. **Two public copies exist, and they are in sync — asserted from the bytes,
   not from the deploy tool's answer.** `https://kkmatch-gcai-preview.app.workbuddy.host/`
   serves the same documents as `kkmatch.com/v22/`. Round 6 re-published it and
   the tool **reported failure three times** — `SITES_UPLOAD_FAILED` twice, then
   `SITES_SANDBOX_UNAVAILABLE` with an explicit `result unknown`. The third
   attempt had in fact shipped: the served `index.html` hashes to
   `22681af3bfd5a7b0…`, the same digest as the archive copy; all four documents
   carry `index, follow` and their own canonical with zero `noindex` residue; and
   all four report the **same** `Last-Modified`, which is one upload, not four
   partial ones. A deploy that reports failure while having shipped is exactly as
   dangerous as a success that did not, which is why neither answer is trusted
   here on its own. The `docs/` divergence this entry recorded through round 7 is
   **closed on 2026-10-17**: the package was uploaded again, its **66 files** were
   re-fetched from the share link and hashed one by one, and 66/66 matched — zero
   missing, zero extra, `docs/` and `e2e/` included. Fifty-six had not changed at
   all, so the ten that did form an exact set: the seven files of the navigation
   round plus the three documents that describe it. No file outside that set was
   touched, which is the assertion — "the difference equals the change", not "the
   difference looks small".
6. ~~The hub's phone top bar is two rows~~ — **closed in round 4.** The bar is
   now a single-row app bar at every width from 320 to 1440, with 44×44 icon
   actions and a truncating title, guarded by 21 assertions.
7. **`--safe-t` / `--safe-b` were never observed non-zero.** `viewport-fit=cover`
   is now declared everywhere and the tokens are wired to `env()`, but no headless
   Chromium reports a non-zero safe-area inset — there is no notch to report. The
   wiring is verified; the *value* can only be confirmed on a real device.
8. **The frame budget was measured under contention.** The machine used for this
   round had 1.6 GB of 16 GB free, with the user's own browser (36 processes) and
   their anti-detect browser (15 processes) holding the rest. Under that pressure
   a 2.5 s window produced **one** drawn frame. The final numbers (p95 16.8 ms,
   worst 16.8 ms, 0 dropped on all three product surfaces) were taken in a calmer
   window; on a real phone they should be better still, but that is an expectation,
   not a measurement. The gate therefore asserts only that scrolling **does not
   freeze**, and records the distribution as INFO.
9. **Left-over headless browsers were checked for and are not ours.** 51 `chrome`
   processes were running; **0** of them came from the Playwright binary. They are
   the user's own Chrome (36) and their ShardX anti-detect browser (15). Nothing
   was killed.
10. **Three pre-existing production facts were found and deliberately not
   touched.** They belong to the rest of the site, not to this preview:
   * `location /` re-declares `Cache-Control`, so the three server-level
     security headers are **not inherited** — effectively every page served by
     the fallback block is missing `X-Frame-Options`, `X-Content-Type-Options`
     and `X-XSS-Protection` (verified on `/v21/`). The `/v22/` block re-declares
     them; the rest of the site was left alone.
   * `/v21/` is publicly reachable and indexable — it has no nginx block, no
     `X-Robots-Tag`, and no sitemap entry either way.
   * `robots.txt` was left alone, and correctly so: it never `Disallow`ed
     `/v22/`, and a `Disallow` would make the documents' own index directives
     unreadable. `sitemap.xml` **was** modified in round 6 — the four `/v22/`
     URLs were added once the namespace stopped being `noindex`.
11. **Where the language choice lives is a product decision, not a defect.**
    English is the default, and the way to Chinese is the toggle: in the hub's top
    bar at every width, and in the HUD on the three product surfaces down to
    719px, below which Sound and Language move into the console sheet that already
    carried them (`n.mobileSheetSoundAndLanguageStillWork` and
    `n.mobileSheetSoundAndLanguageStillClear44px`, with the same pair for `s`,
    driven by a real pointer tap). Whether a future non-preview build
    should also offer the choice *before* any text renders — a `/en` path segment,
    or a first-visit prompt — is a routing and IA question, and it is not answered
    here on purpose.
12. **The evidence screenshots could not be re-shot in this environment.** The
    `shots` section writes 25 PNGs, and every write returns `EPERM` from the
    file-system shim this machine preloads (`cli/vendor/shim/node-brokered-fs-shim.cjs`).
    The shim is attached with `--require`, so disabling the sandbox does not lift
    it either. The section aborts at its **first** write — which is also why
    nothing was half-overwritten. The substitute chain is three independent
    checks instead of a second browser run: (a) per-file sha256 of `_audit/shots/`
    against the archive copy — 25 files, zero byte difference; (b) a full
    source-tree ↔ runtime-tree byte comparison; (c) the read-only probes against
    the origin, which never write a screenshot. Recorded here because a gate that
    cannot run is a fact about the machine, and calling it a pass would not be.
13. **Indexing exposed three things the preview never had to care about.**
    * **Performance is now part of being found.** Under `noindex` the only cost
      of a slow load was the visitor who had already arrived; now Core Web Vitals
      enter ranking. `preview/site/` loads three.js r147, so LCP is the weak
      point — and three.js is **not** removable, because "the collapse is a
      shader uniform" is a claim this package is asked to keep checkable. Cache
      and preload tuning is the legitimate follow-up; dropping the library is not.
    * **The cache directive was a decision, not a default.** The whole
      `X-Robots-Tag` line was removed — `nofollow` and `noarchive` with it — so a
      search engine **may** show a cached copy. `index, follow, noarchive` was
      the alternative and differs by one token. It is recorded because it is a
      one-off product decision that has now been made, explicitly, once.
    * **Two copies, one authority.** The share-link deployment and `/v22/` serve
      the same content, so both carry the **same absolute canonical** pointing at
      `kkmatch.com/v22/…`. The intended effect is that the share link is never
      indexed — desirable, because two copies competing for one query is worse
      than one copy being ignored.
14. **Search Console ownership was already claimed — it was not missing.**
    Probed rather than assumed: `dig TXT kkmatch.com` returns
    `google-site-verification=JDvSwFYvVE9h0lXmB5xS2D-nGsbGO9CBfvaomRFsd0Y`, and a
    `BingSiteAuth.xml` sits in the web root. A **domain-level** TXT property
    covers every subdomain and both protocols, so `/v22/` already falls inside an
    existing property and no new one is required. Three consequences worth
    stating plainly: the verification record must not be deleted; `robots.txt`
    already advertises `Sitemap: https://kkmatch.com/sitemap.xml`, so the four
    new URLs are discoverable without a manual submission; and what this package
    **cannot** do is submit them for indexing or read the resulting reports —
    that needs a signed-in session on whichever account holds the property, and
    no assertion in this document should be read as claiming otherwise.
15. **The homepage entry shipped invisible on a phone.** The homepage's mobile
    stylesheet hid "the 4th link" below 700px
    (`.navlinks a:nth-child(4){display:none}`), written back when the 4th link
    was `Privacy`. Round 6 inserted `<a href="/v22/">Intent OS</a>` in front of
    it, which promoted the new entry to 4th child — so at ≤700px the shipped
    link was `display:none`, and a correct report came back as "nothing
    changed". Measured before and after with the same predicates, on the live
    site: hidden at 320 / 390 / 430 / 700, visible at 701 / 768 / 1024 / 1440.
    Fixed by making the selector state its intent instead of a position —
    `.navlinks a[href="/privacy"]` — which restores the original behaviour
    everywhere else (verified: `/v21/` and `/astrology/` unchanged at all eight
    widths) and keeps the same number of visible entries on a phone. Two rules
    came out of it and are recorded in `README.md`: **a positional selector does
    not survive an insertion**, and **"it is in the DOM" is not the same claim
    as "the reader can see it"** — at the failing widths the anchor was present
    and `getComputedStyle` said `display:none`, so an existence check would have
    passed while the bug shipped. The delivery needed two more changes for the
    fix to travel at all: `?v=r8` on the stylesheet URL, and a
    `must-revalidate` rule in nginx, because this non-fingerprinted stylesheet
    was itself being served `immutable` for 30 days — the same trap as `/sw.js`
    (tagged `r7` in the config), in a different file.
16. **The round-6 gate ran on a local static server, not on production.** All
    seven result files of that run record `base: http://127.0.0.1:18091`. That
    is a *served* origin, so it satisfies the letter of "must be run against a
    served origin" — but it is not the origin that ships, and two of the `seo`
    claims cannot even be evaluated there: `python -m http.server` sends no
    `X-Robots-Tag`, so "the served headers carry no `noindex`" is vacuously true,
    and it answers a directory request with a 200 listing, so "this link
    resolves" passes on a broken link that nginx would answer with `=404` —
    which is exactly what happened to the first version of the new footer links.
    Round 7 re-ran all 21 sections against `https://kkmatch.com/v22` and reports
    those numbers. The tree being byte-identical to the archive is a necessary
    check, not a substitute: a predicate can be blind to a header the local
    server never emits.
17. **Two of the three surfaces were dead ends.** `anticipate` and `compile`
    rendered **one** anchor each — the in-page skip link — so a reader who
    arrived from the homepage through `Intent OS` could only leave with the
    browser's Back button, while `site` had a proper footer with "Back to the
    hub". Nothing caught it: `hub` asserted that every preview link *resolves*,
    which is the outbound journey, and 553 green assertions coexisted with the
    trap. `navclosure` now asserts the return journey as a property, not a link
    count. Two traps were found while fixing it. First, `os.js` builds the view
    nav with `clear(nav)` and then appends only its own buttons, so any anchor
    written statically into `<nav class="viewnav">` is wiped at boot — the fix
    had to go in the footer, where `site` already proved the pattern. Second,
    `href="../../"` from `/preview/intent/anticipate/` resolves to `/preview/`,
    not the hub: `site` can use two levels because it sits one directory
    shallower. The new `reachesHub` predicate caught that within one run, and
    the falsification pass confirms it: removing the footer nav fails exactly
    five assertions (`hub.reachesSiteHomepage`, and `hasVisibleExit` +
    `reachesHub` on each concept page) while `site` stays green.
