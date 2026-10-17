# 07 · Backlog — open questions, phrased so they can fail

Not a feature list. Each item is a **claim the product cannot currently make
honestly**, followed by the assertion that would settle it. An item without such
an assertion is a wish and does not belong here.

Ordered by how much of the product's thesis is at stake, not by effort.

---

## 1 · The field's confidence is monotone but not calibrated

**What is claimed** "confidence 0.62" with a basis list.
**What is not** that 62% of predictions with that score are accepted. The number
is the sum of hand-set weights (`WEIGHTS`), monotone in signal, and the gate only
proves monotonicity and range.
**The honest options** (a) rename it so it does not read as a probability, or
(b) measure it: log accept/dismiss for a local session and report the empirical
rate next to the score. (b) is a real product improvement and is achievable
without a backend — but it needs a definition of "accepted" that survives the
user editing the ghost instead of pressing Tab.
**Assertion that would settle it** a recorded distribution over ≥200 local
predictions with `|stated − observed| < 0.1` per band, or the word "confidence"
replaced everywhere it is not backed by that number.

## 2 · `notAModel` will be the first field to lie

**What is claimed** the payload self-identifies as not-a-model.
**What is not** that the flip is safe. When a provider is connected, `withModel()`
must flip `provider` **and** `notAModel` together; nothing currently prevents a
future adapter from flipping one and forgetting the other.
**Assertion that would settle it** a contract test that a payload with
`provider !== 'PREVIEW_ADAPTER'` and `notAModel === true` is rejected by
`validatePrediction()` — i.e. make the pairing an invariant, not a convention.

## 3 · Consent records the decision, not the capability

**What is claimed** "microphone: denied" is recorded.
**What is not** that a denial actually prevents anything — no `getUserMedia` call
exists at all, so "denied" and "unavailable" are behaviourally identical.
**Assertion that would settle it** either remove the microphone row from the
capability table (it is currently the one row where the honest answer is "this
control would do nothing"), or wire a real `getUserMedia` behind the grant and
assert that denial produces zero streams.

## 4 · The assembly graph has no persistence story

**What is claimed** assembled work survives a workspace switch.
**What is not** that it survives a reload — it does, but only because
`sessionStorage` happens to hold it, which means "retention" is currently two
different mechanisms with one name.
**Assertion that would settle it** decide which one the product promises, then
name it in the copy and assert the other one is explicitly absent.

## 5 · The long-scroll page and the concept shells do not share a header

**What is claimed** one product.
**What is not** that a visitor perceives one product: `site` has its own nav,
`anticipate`/`compile` have the app bar, the hub has a third. The three were
allowed to diverge because each surface was shipped with its own four files.
**Assertion that would settle it** a cross-surface check on the *position,
height and label* of the primary navigation — not that they are identical, but
that moving between them does not move the reader's target.

## 6 · Nothing is keyboard-complete

**What is claimed** the orbit board and the ledger are usable.
**What is not** that they are usable without a pointer. Cards can be thrown,
sheets can be dragged, the rail responds to taps — all measured with a real
pointer, none measured with a keyboard. The ghost completion is the one flow that
is (Tab/Esc).
**Assertion that would settle it** a keyboard-only traversal that reaches every
control, in one pass, on each surface, with focus visible at every step.

## 7 · `prefers-reduced-motion` is honoured, `prefers-contrast` is not

**What is claimed** motion is never required.
**What is not** that the interface is readable at high contrast or with a
forced-colors palette. The dark palette is hand-tuned and has never been measured
against WCAG contrast ratios — the gate measures *size*, not luminance.
**Assertion that would settle it** contrast ratio ≥ 4.5:1 computed from the
served CSS for every text/background pair actually rendered, per surface.

## 8 · The gate is now larger than the product

**What is not claimed, but true** `e2e/acceptance.js` is ~2,800 lines against
~4,000 lines of product. Three of the defects in `05-FAILURE-LIBRARY.md` were
found by reviewing the *gate*, not the app.
**The question worth answering** which assertions have never failed and cannot
be made to fail? A green assertion that has never been observed red is a
hypothesis. The cheapest experiment: for each section, mutate the product in the
way that section claims to guard and check that it goes red — one mutation per
section, scripted, so it can be repeated.

## 9 · Two origins, one of which cannot be measured the same way

**What is claimed** the share link serves the same product.
**What is not** that it behaves the same: it has no nginx, so header assertions
there would pass without reading anything, which is why `seo` is skipped. The
current answer is "measure 536 of 589 there and say so". A better answer is a
capability probe that reports *which* assertions are unmeasurable on a given
origin and why, rather than a hand-maintained exclusion list.
