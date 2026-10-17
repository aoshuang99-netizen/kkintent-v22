# 04 · Red lines

Each of these exists because ignoring it produced a specific defect. The incident
is part of the rule: a constraint without its story is a preference, and
preferences get traded away in the next round.

## 1. Nothing is presented as measured that was not measured

Every terminal line carries the path of the value it prints. Every confidence
number is the output of `confidenceFromBasis()`, the same function the gate calls.
Every card names the features behind its number. The boundary table is generated
from the capability list, not typed.

**Failure mode this prevents:** a number that looks measured. Once one is allowed,
the rest are unfalsifiable and the product's thesis is decoration.

## 2. One fact, one writer

The language declaration has one writer (`i18n.js`) and one element (`<html>`).
`common.home` has one owner (`i18n-shared.js`). The prediction contract has one
scoring function. The hub's URL is written once per page, in that page.

**Incident.** `lang` was written by three files with two value spaces — `en` on
`<html>`, `en-US` on `<body>` — and **nothing read either one**. Drift is not
caused by disagreement; it is caused by two writers and zero readers. A field
that is collected but never asserted is where it hides.

## 3. A measured field that no assertion looks at is a liability

Either upgrade it to an assertion or delete it. `stats().missing` accumulated as
the page rendered, so it could only ever prove that *the keys which happened to
be reached* were complete — a key that is never rendered could be English-only
forever and never report. `gaps()` now walks the whole dictionary.

## 4. Deletion is a set operation, never a substring whitelist

Before writing, collect the lines that will disappear and compare them against
the **exact** set the patch is supposed to remove. Anything extra stops the
patch.

**Incident.** A patch intended to touch one block silently took 35 lines of a JS
file with it — a whitelist of "lines that may be removed" would have passed it.

## 5. Never slice by an index computed before a `replace`

**Incident.** `s.replace(a, b)` then `s[:i] + … + s[j:]` with `i`/`j` measured on
the *old* string: the offsets shifted and 35 lines vanished. Any index used for
slicing must be recomputed on the string it will slice.

## 6. EOL is measured, never remembered

A "confirmed CRLF" note in the previous round was wrong: every text file in this
package is pure LF. Every write in the patch scripts asserts `b"\r" not in data`.

**Rule:** look at the bytes of the file you are about to edit. Not at a note. Not
at `grep -c $'\r'`, which counts *lines containing* a CR and will happily return
the line count for an LF file.

## 7. Anchored patches, with count assertions

Every edit in `scripts/patch_*.py` asserts `text.count(anchor) == n` before
replacing. A patch that "probably matched" is the failure this exists to prevent,
and its symptom is a timeout twelve seconds later in a different file.

## 8. A local static server is not a weaker production, it is a different origin

`python -m http.server` sends no `X-Robots-Tag`, so a header assertion passes
without ever reading one; and it answers a directory request with a 200 listing
where nginx answers `=404`, so a broken link looks healthy. A byte-identical tree
proves the *content* travelled. Headers, status codes and 404 behaviour can only
be judged on the real origin.

## 9. "It is in the DOM" and "the reader can see it" are two different claims

Ask the renderer: a non-empty `getBoundingClientRect`, and the string present in
`innerText` (which excludes `display:none` nodes).

**Incident.** The homepage entry to `/v22/` was `display:none` below 700px for a
whole round. An existence check was green the entire time.

## 10. A positional selector does not survive an insertion

`.navlinks a:nth-child(4){display:none}` hid "the 4th link". Adding a new entry
**in front of** it promoted the new entry to 4th, so the thing being shipped was
invisible on every phone. Style by what an element *is*
(`a[href="/privacy"]`), never by where it sits, whenever anything may be
inserted before it.

## 11. A relative path is a claim about depth

`href="../../"` from `preview/site/` reaches the root; the same string from
`preview/intent/anticipate/` reaches `preview/`. Copying the pattern copies the
syntax and not the destination.

And: `new URL('./', 'https://host/v22')` is `https://host/` — the last segment is
treated as a file name. Build base URLs by appending the slash explicitly.

## 12. A link that resolves is not a way out

Assert the **return** journey as a property: at least one rendered link whose href
is not an in-page fragment, that clears 44px, that resolves, and that points at a
specific destination. A link count proves nothing; a skip link satisfies it.

## 13. A check that pins its input cannot observe the default

Every boot in the gate passed `?lang=en-US`, so nothing ever exercised the
no-parameter path — and the default spent four rounds being the browser's locale.
Test the default against explicit branches and compare **relatively**
(default == explicit A, default != explicit B). A hard-coded expected string both
fears a copy edit and cannot see the environment.

## 14. A judgement that samples a window measures the machine

Read state synchronously where possible. Where you must wait, wait for a bounded
condition, never for a fixed sleep.

**Incident.** `collapse > 0.25` sampled 450ms after the trigger, while the easing
advanced 0.085 per frame: on a loaded desktop only one step had happened and the
assertion failed for a reason that had nothing to do with the code. A second one:
`page.evaluate(fn, [10, 1400])` passed an array where two arguments were expected,
so `ms` was `undefined`, `frames` was 1, and the median it reported had **never
measured anything**.

## 15. A failure caused by the shape of the run is not a product defect

`cross` reads values that the `n` and `s` sections collect. Run alone it reports
three failures; run as `n,s,cross` it reports 150/150. Before reporting a failure,
check whether that section's input is produced by another section.

## 16. Long cache is a claim about immutability

A non-fingerprinted `gc-ai.css` picked up the generic `\.(css|js)$` 30-day
`immutable` rule, so **any change, including the fix for that rule, could not be
delivered for a month**. A service worker script must never be long-cached, and a
site SW must not precache `/`: a snapshotted homepage will happily serve as a
"normal page" when the network fails, making a shipped change look like it was
never published.

Two things are needed to fix one such file: the reference gains `?v=rN` (a cached
`immutable` browser only re-fetches a new URL), and nginx sends
`must-revalidate` for it — in a block that comes **before** the generic one,
because nginx takes the first matching regex, not the longest.

## 17. A deploy is proven by what the origin serves, in both directions

Never trust the tool's own answer — a deploy that reported failure three times
had already written every file. And never trust a local copy either: the baseline
for a change is the **live tree**, pulled fresh, or you will revert someone else's
work while thinking you are editing yours.

## 18. The difference must equal the change, not look small

Publish a set comparison: `set(changed) == set(expected)`. A run that touches 9
of 10 expected files and one extra should stop.

**Incident.** An audit that reported "56 same, 10 diff" was only meaningful
because the ten formed an exact set. "The diff looks small" is not an assertion.

## 19. An upload falsifies every sentence about the upload

Before publishing, `grep -i "behind|pending|to be synced"` the documents. After
publishing, grep the **live bytes** for the old wording and require zero.

**Incident.** A README paragraph saying "`docs/` is one revision behind" survived
the upload that made it false, because the upload is not a diff of prose.

## 20. Secrets have one home and it is not the front end

`ADMIN_API_KEY` never enters the browser bundle, never enters a world-readable
config, and never enters a document. Credentials are not written into scripts
that are kept in a repository.
