# 03 · Round 8 — the root becomes a door

## The request

> "I need the version that opens on 先觉之境."

先觉之境 is concept S — the intent field. The hub was, and remains, a
*comparison* page: two concept cards, five rulings, an audit of five reference
sites. It answers "which direction did you choose and why". It does not answer
"show me the thing".

Three resolutions were offered. The one selected was **root path goes straight
to concept S, hub preserved at `/hub/`**. Rejected: changing only the default
language (the hub would still be the first thing anyone saw), and renaming
概念 意图场 to 先觉之境 (a copy change that would not have changed the route).

## The design

### The door (`index.html`)

* Forwards to `preview/intent/anticipate/`, **carrying `location.search` and
  `location.hash` verbatim**.
* `location.replace`, not `assign`: history is `[where you came from, intent
  field]`, so Back does not bounce the reader forward into the hop again.
* `noindex, follow`, and **no canonical**. A page that navigates away in the same
  tick has nothing to rank, and a canonical on it would enter it into the same
  URL as the page it opens.
* `<noscript><meta http-equiv="refresh" …></noscript>` as the only fallback that
  can move a reader whose scripting is off. It is inside `<noscript>` on purpose:
  with scripting on it never exists, so it cannot race the inline redirect.
* No stylesheet link, no external script, no canvas. The page must render in one
  round trip and must not depend on any file in the bundle. If the bundle were
  broken, the door would still open the door.
* Its visible state (only ever seen with scripting off) carries both languages
  and one control that is a real ≥44px box.

### The hub (`hub/index.html`)

Byte-for-byte the old `index.html` with one level of `../` added to its 18
relative references, and its canonical changed from `/v22/` to `/v22/hub/`. Its
content did not change: the two cards, the five rulings, the five reference
verdicts, the seven source definitions, the kept/dropped lists, the split table.

### The exits

"Back to the hub" was written **four different ways**:

| File | Was | Now |
|---|---|---|
| `preview/intent/anticipate/index.html` | `../../../` | `../../../hub/` |
| `preview/intent/compile/index.html` | `../../../` | `../../../hub/` |
| `preview/site/index.html` (×3) | `../../` | `../../hub/` |
| `hub/index.html` | `https://kkmatch.com/` | unchanged |

Left alone, `anticipate`'s own "Back to the hub" would have landed on
`anticipate`. Nothing in a diff review would have looked wrong: the string had
not changed, only the thing it pointed at.

Every preview page also gained a direct `https://kkmatch.com/` link, registered
once as `common.home` in `i18n-shared.js` (which every surface loads) rather than
once per concept. Rationale: the share link's root now lands on `anticipate`, so
the *landing page* was two hops from the product. `navclosure` now asserts both
claims separately for every surface — reaches the hub, reaches the product —
because the old either/or would have hidden whichever half was not taken.

## Why this was twelve files and not one

| File | Why it had to move |
|---|---|
| `index.html` | becomes the door |
| `hub/index.html` | new; the old hub, one level down |
| `preview/intent/anticipate/index.html` | exit link + new home link |
| `preview/intent/compile/index.html` | exit link + new home link |
| `preview/site/index.html` | three exit links + new home link |
| `assets/js/i18n-shared.js` | `common.home` |
| `assets/js/i18n-hub.js` | `hub.nav.home` deleted (one key, one writer) |
| `e2e/acceptance.js` | 11 addresses, 2 depth-encoded assertions, 1 policy-encoded section, +8 new assertions |
| `README.md` | which URL is what; the index policy; the totals |
| `docs/DELIVERY.md` | header, round-8 bullet, §6 totals, three table rows, §11.18 |
| `sitemap.xml` (production) | the door leaves, the hub enters, four lastmods move |
| `/opt/kk-match/frontend/v22/` (production) | 7 files |

The coupling is worth naming: **a URL is part of the contract**, and "back to X"
in four files is four claims about directory depth. Changing one directory
changes every one of them, and none of them is named in the change you are
making.

## What the gate learned

Eight new assertions, all inside the `hub` section rather than a new section —
a section of its own would make "the run is green" depend on remembering one
more name on the command line.

| Assertion | What it would catch |
|---|---|
| `entry.rootLandsOnConceptS` | the redirect is missing, or points somewhere else |
| `entry.carriesTheLanguageQuery.zh-CN` / `.en-US` | the door drops `?lang=`, so a Chinese review link silently serves English |
| `entry.theDoorIsNotAStepInHistory` | `assign` instead of `replace`; Back loops |
| `entry.theDoorOpensWithoutJavaScript` | the `<noscript>` refresh is missing or malformed |
| `entry.theDoorHasAUsableControlWithoutJavaScript` | the only state a reader ever sees the door is unmeasured: a 44px *rule* is not a 44px *box* |
| `entry.theDoorLeadsToSomethingThatAnswers` | the control points at a 404 |
| `entry.noConsoleErrors` | the redirect throws |

Three existing assertions changed shape rather than merely changing value:

* `hub.linksToTheLongScrollPage` compared hrefs to the literal `'preview/site/'`.
  It now resolves against the document and compares absolute URLs — depth-free.
* `seo` carried `index, follow` as a literal and required exactly one canonical.
  It now carries the expected robots value and the expected canonical **per row**,
  including a row that expects *no* canonical. Both policies are tested by the
  same loop; a `if (slug === 'entry')` branch would have left one of them
  permanently untested.
* `navclosure` split `reachesSiteHomepage XOR reachesHub` into two independent
  claims.

## Numbers

| | before | after |
|---|---|---|
| files in the package | 66 | 67 |
| files served by production under `/v22/` | 29 | 30 |
| declared assertions | 575 | 589 |
| executed on production | 573 | 587 |
| INFO records | 33 | 33 |
| `seo` documents | 4 | 5 |
| `sitemap.xml` `/v22/` entries | 4 (`/v22/` + 3) | 4 (`/v22/hub/` + 3) |

The INFO total not moving is the check that none of the three edits turned a
recorded measurement into a verdict.
