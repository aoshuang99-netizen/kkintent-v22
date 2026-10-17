# Concept S — anticipate → 意图操作系统 / **Intent OS**

**Main line** (`data-status="chosen"`). Round 2 ruling promoted this shell from
"a concept" to the product direction and gave it its name. Concept N is a frozen
reference; see `docs/SPEC_COMPILE.md` and `docs/DECISIONS.md`.

**The field answers before you finish the sentence — and shows its reasons.**

Open: `preview/intent/anticipate/` (add `?lang=zh-CN`).

## Views

| View | Test id | What it does |
|---|---|---|
| Intent field | `s-input`, `s-ghost`, `s-chips`, `s-predict`, `s-basis` | Ghost completion with a confidence meter and the features that produced it. |
| Orbit board | `s-board`, `s-card`, `s-dock`, `s-overlap` | Cards on a real spring-damper integrator with mutual separation. **Confirming a card assembles it into a dependency graph.** |
| Ledger | `s-signals`, `s-artifacts`, `s-receipts`, `s-consents`, `s-pipeline`, `s-contract` | Everything the session measured, produced and recorded — plus the assembled pipeline and the live prediction contract. |

## Ghost completion you can argue with

The prediction is a **local template**, and the payload says so — and the payload
is now published as a contract (`kk.prediction.v1`, see below).

* A tail is only offered when an **opening** matched. We never draw a
  "completion" that does not continue what the user actually typed.
  `今天天气不错` gets no ghost even though the previous input scored 0.74 —
  asserted by `S.ghostStaysAwayWithoutAnOpening`.
* `confidence` is a sum of measured features (instruction verb, word count inside
  the useful range, lexicon hits, matched opening) and `basis` returns those
  features so the UI can show the reasoning.
* **Tab accepts, Esc dismisses** — a keyboard path for a pattern that is usually
  pointer-only. Both are asserted.
* When the prediction is not fired, the stale `data-confidence` is removed from
  the DOM rather than left behind (`S.staleConfidenceIsNotLeftInTheDom`).

### The payload, published as `kk.prediction.v1`

`KK.preview.PREDICTION_CONTRACT` is a data structure: 12 fields with types and
requiredness, the four `weights`, the `cap` (0.97), and five invariants.
`validatePrediction(p)` returns a **report** (`{name, ok, missing, wrongType,
unexpected, broken}`), not a boolean; `confidenceFromBasis(basis)` is the single
scoring function that `predict()` and the checker both call, so the number and
the reasons cannot drift apart.

`notAModel` is **deliberately not pinned to `true`**. A flag that can only ever
hold one value is decoration, not information. What is pinned is the rule — true
exactly when no model produced the tail — and the local adapter must return
`true`. Exactly **two** fields may change meaning when a real model arrives:

| field | today | with a model |
|---|---|---|
| `provider` | `preview.template.v1` | the real model id |
| `notAModel` | `true` | `false` |

The hole is described rather than filled: `modelAdapterContract()` returns
`{status:'NOT_CONNECTED', endpoint:null, transport:null, mustReturn, mustSatisfy,
mustChange[2], mustNotChange}` and the ledger (`s-contract`) renders it.

## Assembling intent into a graph (carried over from N)

Confirming a card on the orbit board does not just record a receipt — it
**assembles that intent into a real dependency graph**, built by the same
`KK.preview.buildPipeline` adapter concept N uses.

* Assembly **accumulates inside a workspace.** A second confirmed card is added
  to the graph you already have (its id is pushed, `markAssembled()` refreshes the
  timestamp) rather than replacing it.
* `assembledAt` is written **once**, at first assembly, and never overwritten;
  `lastAssembledAt` carries the most recent touch. `assembledAt` is the identity
  of the graph, which is what lets the retention checks compare it across a
  workspace switch.
* The ledger's `s-pipeline` card renders it: `data-count` / `data-edges` /
  `data-assembled` / `data-scenario`, nodes grouped by lane, each with
  `data-node-state`.

## The store keeps three slices — a switch is a swap, not a reset

| slice | contents | on a workspace switch |
|---|---|---|
| scenario | `context` | **rebuilt** |
| assembled work | `pipeline`, `cards`, `signals` | **swapped via per-workspace slots** |
| account | `artifacts`, `receipts`, `consents`, `auditLog` | **untouched** |

`state.slots.pipeline[key]` / `.cards[key]` / `.signals[key]` hold each
workspace's own work. `setScenario` stashes the outgoing workspace and restores
the incoming one; the toast names the receipt count, says the draft was kept, and
says how many workspaces are holding a pipeline and how many nodes this one has.
Nothing is destroyed in either direction.

Cards and node states survive a **reload** too: `persistCards()` / `restoreCards()`
persist id/text/tone/conf/`parked`/`confirmed` — and deliberately **not** `x`/`y`/
`vx`/`vy`, because position is a rendering concern, not state. On boot the module
re-points the slots at the live objects, which is what fixed the silent
reload-breaks-it defect (`DELIVERY.md` §7.6).

## The orbit board

~60 lines of spring/damping/separation, no physics engine:

* each card is pulled to its own home slot by a spring and damped;
* pairwise separation resolves overlap on the cheaper axis, so two cards never sit
  on top of each other — the integrator does it, not a `z-index`;
* dragging a card sets its position directly and measures velocity; releasing it
  flings it with the measured velocity and the spring brings it back;
* arrow keys nudge a focused card (Shift = a bigger step).

`KK.anticipate.step(seconds)` advances the simulation **deterministically**, which
is what lets the gate prove the claims instead of asserting them:

```
overlapsAtRest 0 · distAtRest [0,0,0]
fling(1100, -800) → 0.2 s → 155 px displaced
                 → 4.0 s → 0 px from home
```

**Why no Matter.js.** A physics engine would have replaced a checkable claim with
a plausible one. The determinism above is the reason `overlapsAtRest 0` is a
verifiable statement rather than a screenshot.

## Motion is never required

* `prefers-reduced-motion: reduce` opens the board in **list mode** automatically,
  with a visible explanation, and the same buttons.
* The Free / List toggle is always available and states the current mode in words.
* List mode is the same DOM: `position: static`, `transform: none`, physics loop
  stopped, nothing hidden (`S.listModeHidesNothing`).
* Leaving the board stops the loop; coming back restarts it
  (`S.orbitBoardPausesWhenYouLeaveIt`).

## Permission outcomes, measured in three states

The ledger's microphone test asks the browser for real and records whatever it
answers: `granted`, `denied`, or `unavailable` (no microphone path / no
`navigator.mediaDevices`). A refusal is never recorded as "unavailable" and vice
versa. No audio is recorded — the preview has no recorder, and the toast says so.

## Ledger counters agree with the store

`data-count` on each column is compared against `KK.store.snapshot()` for signals,
artifacts and consents, and `s-pipeline`'s `data-count` / `data-assembled` are
compared against `KK.store.state.pipeline`, so the UI cannot quietly disagree with
the state it claims to be showing — including the claim that work was restored.

## Honest degradation

No WebGL → the field falls back to a static CSS gradient with the reason recorded.
The ghost, the board and the ledger are unaffected.

## Console surface

`KK.anticipate` exposes `state()` (now including `pipeline` and `slots`),
`restore()`, `assemble(id)`, `sound()`, `contract()`, `prediction(text)` and
`slots()` so every claim above can be checked from the outside.
