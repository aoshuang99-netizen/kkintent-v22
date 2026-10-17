# 06 · The gate

`code/acceptance.js` — one file, no test framework, no fixtures. It launches
Playwright's chromium, drives the real pages, and writes
`_audit/acceptance-results.json` next to the package. Exit code 1 if anything
failed, 2 if the script crashed.

```
node e2e/acceptance.js <base-url>                 # everything
node e2e/acceptance.js <base-url> hub,lang        # a named subset
```

`<base-url>` is an origin **and** a namespace: `https://kkmatch.com/v22`,
`https://kkmatch-gcai-preview.app.workbuddy.host`, `http://127.0.0.1:18091`.

## Why it is split

A single pass outlives this shell's command window, so it runs as groups. The
split is only trustworthy because it was reconciled: `pass + INFO` matches the
per-section counts section by section, and the INFO total is the same 33 on both
origins — so no assertion was dropped or double-counted by cutting the run up.

**Run the production grouping.** `cross` reads values that `n` and `s` collect; run
alone it reports three failures that vanish as soon as `n,s,cross` runs together.
A failure caused by the shape of the run is not a product defect.

```
hub,lang · n,s,cross · sound,contract,retain · site,rm,fb
widths · appbar · mob,zoom · touch · seo · nav · navclosure
```

## Sections

| Section | n | Proves |
|---|---:|---|
| `hub` | 26 | the two cards, one chosen and one frozen, primary action only on the chosen one · five rulings · five reference verdicts are specific · the contract is named here · eight capability rows · **and the eight door assertions** (lands on concept S · carries `?lang=` · Back does not loop · works without JS · its control is ≥44px · it leads somewhere that answers · no console errors) |
| `lang` | 34 | default is English on a Chinese browser (relative comparison, 3 boots per surface) · the `lang`/`data-lang` declaration follows the text and nothing else declares it · Chinese is selectable and renders different text · **every key in the dictionary has a value in both languages** · nothing falls back to its key name · the tab title follows the language |
| `n` | 76 | refuses short input · payload labelled DEMO/notAModel · **every terminal line resolves its `data-src` and contains that value** · blocked node refuses · reopen re-blocks downstream without undoing completed work · deny changes nothing · approve → `SANDBOX` receipt with `externalWorldChanged: false` |
| `s` | 66 | ghost only on a matched opening · two characters are enough · no stale confidence left in the DOM · confidence in range and monotone in signal · band matches the number · ≥2 reasons · Tab accepts / Esc dismisses · 3 cards, no overlap at rest · a throw displaces 155px and returns to 0 · list mode turns physics off and hides nothing · ledger counts match the store |
| `site` | 63 | ScrollTrigger really wired (20+ triggers, a real pin) · nothing revealed before it is reached · the pinned sequence scrubs to the last step with exactly one active · hero runs the **real** adapter and refuses to invent a completion · reduced motion creates no ScrollTrigger and hides nothing · **no-JS: real text, not a blank screen** |
| `touch` | 91 | three tiers × four surfaces: layout viewport equals device width · no control is covered · the sheet freezes the page behind it and hands the scroll offset back · a 150px drag dismisses it, a 26px drag does not · the skip link does not land behind sticky chrome · the rail answers a **real pointer tap** |
| `mob` | 32×2 | 390×844: no console error · i18n complete · no overflow · 44px targets · HUD · the language is declared on `<html>` and nowhere else |
| `widths` | 16 | 4 surfaces × widths across three tiers, boundary panel **open**: no document overflow · no element leaving the viewport · no type below 12px · no control covered (hit-tested at centre) |
| `appbar` | 21 | the hub's top bar is an app bar, not a wrapped row: one row per tier · every action ≥44px · every action has an accessible name · the title truncates rather than pushes (a ~380-character wordmark is injected) |
| `zoom` | 15 | 200% (640 CSS px @ dsf 2): no overflow · no clipped text · no type below 12px · controls still ≥44px |
| `retain` | 22 | assembly survives a workspace switch **exactly** (ids, states, `assembledAt`) · the outgoing slot still holds it · the toast says what was kept and does **not** claim the pipeline was cleared |
| `contract` | 16 | seven inputs each produce a valid payload · no undeclared fields · **`confidence` equals the sum of its disclosed basis** · `tailId` is null exactly when `fired` is false · every basis id is a weight · a real model must return the same shape · exactly two fields may change meaning |
| `sound` | 9 | starts off · no `AudioContext` before a click · has played nothing · the button states the truth **in words** · off again after reload · never persisted |
| `cross` | 13 | headlines differ in both languages · concept packages do not leak into each other's page · shared keys identical on all three · receipt/consent contracts identical |
| `fb` | 5 | no WebGL → falls back with a recorded reason · says so on screen · builds no meshes · every function still works |
| `rm` | 4 | reduced motion → the 3D field draws one frame then stops · the orbit board opens in list mode with an on-screen explanation |
| `seo` | 35 | 5 documents × 7: exactly one robots meta whose value **equals that document's declared policy** · a canonical that equals the declared one **in both directions** (four content documents declare a clean self URL; the door declares `null` and must carry none) · the presence of an invisible directive equals the policy · no `X-Robots-Tag` · title + description present |
| `nav` | 16 | **production only.** 4 widths × 4: the homepage entry into `/v22/` is rendered, not merely present · `Intent OS` appears in the nav's `innerText` |
| `navclosure` | 23 | every surface: loads · ≥1 rendered non-fragment link · every such exit ≥44px · every such exit resolves · **reaches the product** · and, except the hub, **reaches the hub** |
| `shots` | 2 | the evidence screenshots exist and are non-empty — **not runnable on this machine** (sandbox `EPERM`) |

Row counts are what each section reported, not a partition of the total: the `n`
and `s` families reappear in the `mob` row.

## Totals

| | declared | executed on production | executed on the share link |
|---|---:|---:|---:|
| assertions | 589 | 587 | 536 |
| failures | 0 | 0 | 0 |
| INFO records | 33 | 33 | 33 |

The share link excludes `seo` (35), `nav` (16, production-only by construction)
and `shots` (2). `seo` is excluded there on purpose even though it would pass: the
share link has no nginx, so `noXRobotsTagHeader` would pass **without reading a
header** — a green assertion that measured nothing is worse than an absent one.

## Two rules for reading results

1. **A section that fails alone may be missing its input** (see `cross`).
2. **An INFO record is not a pass.** INFO is where measured values live — frame
   distributions, published offsets, per-tier sizes. They are compared across
   rounds by eye, not judged. If the INFO count moves, something started or
   stopped being measured; that is a signal even when the pass count is identical.
