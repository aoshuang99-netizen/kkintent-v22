# 01 · Context — what this product is

## The thesis

> An interface that states what it knows, and what it does not.

Everything in the build is a consequence of that sentence. There is no model
behind it, no account, no audio recording, no network request. What there is:
text that tells you how sure it is, chips that name the features behind that
number, receipts that say `externalWorldChanged: false`, and a capability table
that lists what is **not** connected in the same table that lists what is.

That choice is also the engineering constraint. Because the product *promises*
honesty, every claim has to be checkable, and the gate (`code/acceptance.js`) is
where the promises become assertions. A claim without an assertion is treated as
a bug in the claim, not as marketing.

## The three surfaces

| Surface | Path | Role |
|---|---|---|
| **concept S — anticipate** | `preview/intent/anticipate/` | **the main line.** The intent field: an interface that answers before the sentence is finished, and shows why. |
| concept N — compile | `preview/intent/compile/` | **frozen reference.** An instruction becoming a dependency graph you watch being built. Kept online because "the terminal only prints measured values" is only checkable while the terminal exists. |
| long-scroll page | `preview/site/` | the public marketing surface — the same thesis told without the app shell. |
| the hub | `hub/index.html` | the decision record: two concept cards, five rulings, an audit of five reference sites. |

Since round 8 the root `index.html` is a **door** that forwards to concept S. The
hub is one click from every preview page and every preview page has a direct
route back to `kkmatch.com`.

## What concept S actually does

Three views, one model, no backend.

1. **The field.** You type; a *local template* completes the rest as a ghost
   tail. Two characters are enough. Alongside the tail: a confidence number, and
   a list of the sentence features that produced it (length, question mark,
   imperative marker, Chinese/English mix…). `Tab` accepts, `Esc` dismisses,
   typing ignores. The field never types for you.
2. **The orbit board.** Each confirmed intent becomes a card on a real
   spring-damper integrator — about 60 lines of physics, stepped
   deterministically, deliberately not Matter.js. Cards can be thrown (measured
   displacement 155 px, returns to 0), never overlap at rest, and pause when the
   board is not visible.
3. **The ledger.** Receipts and consents. A receipt records what happened, in
   which workspace, with `externalWorldChanged: false`. A consent records one of
   three outcomes — granted, denied, unavailable — in its own field, so "denied"
   can never be read as "not asked".

Assembling a card produces a dependency graph that persists inside its
workspace. Switching workspace swaps the assembled work and leaves the account
slice alone: a switch is a change of context, not a `git reset`.

## What concept N does

A sentence enters at the top. A dependency graph assembles below it node by
node. A terminal prints every step, and **every line carries the path of the
value it prints** (`data-src="result.counts.nodes"`), so a line that prints a
number can be traced to the number. A node can be run, blocked, or denied; a
blocked node refuses to run and re-blocks the nodes downstream of it without
undoing work that had already completed. The rail shows disabled states as
disabled.

N is frozen. Its purpose is to remain a *checkable* object: delete it and the
claim "the terminal only prints measured values" becomes unfalsifiable.

## The rulings this product is built on

Five questions were open after round 1. Each was answered, and the answer lives
in a file with a check that guards it.

| # | Question | Ruling |
|---|---|---|
| 1 | Which concept is the product? | **S is the main line.** N is kept as a frozen reference. |
| 2 | Does the field call a model? | **No.** A local template with a published contract; `notAModel: true` is in the payload. |
| 3 | Will a real model return the same payload? | **Yes — `kk.prediction.v1`.** Exactly two fields may change meaning; the contract is validated, not asserted. |
| 4 | Add ScrollTrigger? | **Yes, for exactly one page.** The concept shells still do not import it. |
| 5 | Keep assembled work across a workspace switch? | **Yes.** Three slices; the swap is not a reset. |

## What the interface does *not* do

Stated here because the product states it, and because a reviewer's most useful
question is usually "what did you quietly leave out".

* No account, no login, no persistence beyond `sessionStorage` in one tab.
* No model, no endpoint, no network request at runtime.
* No microphone capture — the consent flow records the *decision* about
  microphone access and never asks the browser for a stream.
* No analytics, no telemetry, no third-party requests (three.js, GSAP and
  ScrollTrigger are vendored; there is not one CDN reference).
* English by default, Chinese selectable, and the browser's locale is
  deliberately ignored — a visitor in China was previously served Chinese before
  asking for anything, which is the same class of error as a confidence number
  with nothing behind it.

## The one number worth remembering

The gate reports **589 assertions, 0 failures, 33 INFO**. The INFO count is the
interesting one: those are *measured values recorded rather than judged* — frame
timings, published offsets, per-tier element sizes. They exist so that a future
round can see what changed without re-deriving it, and they are the reason the
suite is not a pass/fail scoreboard.
