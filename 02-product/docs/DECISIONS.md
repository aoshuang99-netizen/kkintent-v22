# Decisions — round 2

2026-10-16 · five questions left open at the end of the previous round, and what
each answer changed. Nothing here is connected to production.

The rule this document follows: **an answer only counts if it is enforced
somewhere that can fail.** So every decision below names the file it lives in,
the check that guards it, and what the rejected alternative was — because the
rejected alternative is usually the interesting part.

---

## 1 · Which direction continues — N, S, or a fusion?

**Answer: S. The `anticipate` shell is the main line, and it is now named
意图操作系统 / Intent OS. Concept N is kept online as a frozen reference.**

### What changed

- `hub` now labels the two cards `data-status="chosen"` and
  `data-status="frozen"`, and only the chosen one carries the primary button. A
  reader cannot land on the hub and be unsure which one is the product.
- N is **not deleted**. It is the only place the terminal-with-`data-src`
  mechanism and the full four-state rail still exist, and those are the evidence
  for claims made elsewhere. Deleting the reference and keeping the claim would
  have been the wrong trade.
- The one part of N that earned its place was **carried into the main line**:
  confirming a card on the orbit board now assembles that intent into a real
  dependency graph, built by the same `KK.preview.buildPipeline` adapter N uses.
  Assembly **accumulates** inside a workspace — a second confirmed card is added
  to the graph you already have rather than replacing it.

### Where it is enforced

| Check | What it would catch |
|---|---|
| `hub.oneDirectionChosenOneFrozen` | both cards marked the same, or neither marked |
| `hub.chosenCardIsThePrimaryAction` | a primary CTA on the frozen card |
| `retain.s.assemblyProducesAnAssembledGraph` | the carried-over graph silently not being built |
| `retain.s.theVisibleSurfaceShowsTheRestoredWork` | the ledger claiming 5 nodes while the DOM shows none |

### Rejected

- **Fusion of both shells into a third surface.** Two view routers fused into
  one would have produced a six-view shell where half the views are not part of
  the chosen direction, and the honest thing about N (that it is a reference)
  would have been lost.
- **Deleting N.** Cheaper, and it would have made the package tidier. But the
  claim "the terminal only prints measured values" is only checkable while the
  terminal exists.

---

## 2 · Does sound stay default-off in the shipping version?

**Answer: yes — and it is now stricter than the previous build.**

### What changed

The previous build defaulted to off but **remembered "on"** in
`sessionStorage`. That is a weaker promise than it looks: someone who turned
sound on, then navigated back to the page, was greeted by noise at the moment of
arrival — the single worst failure mode a decorative audio layer can have.

Now:

- `KK.sound.init()` sets `enabled = DEFAULT_ON`, which is `false`, and reads
  nothing from storage.
- **Nothing is ever persisted.** `state().persisted` is a hard `false`, so the
  claim is readable rather than inferable.
- The first `AudioContext` is created inside a click, never at boot. That is
  both the browser's requirement and ours: `ctxState === 'none'` before the
  first gesture is a checkable statement, not a promise.
- Removed: `readPref()` / `writePref()` and the `kkintent.sound` storage key.

### Where it is enforced

| Check | What it would catch |
|---|---|
| `sound.startsOff` | `defaultOn` quietly flipping to true |
| `sound.createsNoAudioContextBeforeAClick` | an eager `AudioContext` at boot |
| `sound.hasPlayedNothing` | a bootstrap chime |
| `sound.isOffAgainAfterAReload` | the exact regression: remembering "on" |
| `sound.isNeverPersisted` | storage creeping back in |
| `hub.soundStartsOffOnTheHubToo` | the hub quietly keeping its own rule |

### Rejected

- **Persisting the choice with a visible toggle.** Familiar, and wrong here: the
  cost of being surprised by sound is much higher than the cost of clicking
  twice, and there is no functional loss — the layer is decorative by design and
  labelled as such.

---

## 3 · Real model later: same payload contract?

**Answer: yes — the same payload, published as `kk.prediction.v1` and validated
on every prediction.**

### What changed

`KK.preview.PREDICTION_CONTRACT` is now a data structure, not prose. It lists
every field, its type, and whether it is required; `validatePrediction(p)`
checks shape, unknown fields, unknown basis ids, and the two invariants that
matter; `confidenceFromBasis(basis)` is the single scoring function, so
`predict()` and the checker cannot drift apart.

Two fields are allowed to change meaning when a real model arrives:

| field | today | with a model |
|---|---|---|
| `provider` | `preview.template.v1` | the real model id |
| `notAModel` | `true` | `false` |

**`notAModel` is deliberately not pinned to `true`.** A flag that can only ever
hold one value is decoration, not information. What is pinned is the rule — it
must be true exactly when no model produced the tail — and the local adapter
must therefore return `true`. The gate checks the local adapter's value; the
contract documents the flip.

`confidence` must remain **a function of the disclosed basis**. A model that
returns a number plus a separate list of reasons that do not produce that number
is returning two unrelated claims, and the second one is what gets shown to the
user as justification.

The hole itself is also data: `modelAdapterContract()` returns a
`NOT_CONNECTED` descriptor with a null endpoint, and the ledger renders it. The
answer to "could you plug a model in?" is a table, not a promise.

### Where it is enforced

| Check | What it would catch |
|---|---|
| `contract.everyCaseValidates` | seven inputs, all must produce a valid payload |
| `contract.payloadHasNoUndeclaredFields` | a field added to `predict()` but not to the contract |
| `contract.confidenceEqualsTheSumOfItsDisclosedBasis` | the number and the reasons diverging |
| `contract.tailIdIsNullExactlyWhenItDoesNotFire` | a "completion" with nothing to complete |
| `contract.everyBasisIdIsAWeight` | an invented reason that contributes nothing |
| `contract.exactlyTwoFieldsAreAllowedToChangeMeaning` | a third field quietly becoming model-dependent |
| `contract.aRealModelMustReturnTheSameShape` | the contract's pinned field list drifting from the real one |

### Rejected

- **A second, model-shaped payload.** Then the UI, the copy and the gate would
  all need two paths, and the day the model shipped every honesty property we
  had verified would have been verified against the *unused* shape.
- **Pinning `notAModel: true` as a contract invariant.** Tempting, and it would
  have made the flag unchallengeable — which is precisely why it is not done.

---

## 4 · A long-scroll marketing page, which needs ScrollTrigger?

**Answer: yes. ScrollTrigger 3.12.5 is vendored into the bundle, and exactly
one page loads it.**

### What changed

- New surface: `preview/site/` — `index.html`, `assets/css/concept-site.css`,
  `assets/js/i18n-site.js`, `assets/js/concept-site.js`. Same four-file
  convention as the two concepts.
- `assets/vendor/ScrollTrigger.min.js` — 43,380 B,
  sha256 `ad33c2df9ada8a66…`. **Vendored, not from a CDN**, same as three and
  gsap.
- The two concept shells **still do not import it.** They are view routers with
  nothing to scroll; importing it there would have been dead weight carried for
  the look of it. The rule the project follows is not "use ScrollTrigger" or
  "avoid ScrollTrigger" — it is *import it where the scroll carries meaning*.
- What is real on the page: the progress bar reads ScrollTrigger's own
  `progress`; the pinned four-step sequence is scrubbed by the pin's position;
  the hero composer calls the **real** `KK.preview.predict`; the boundary table
  is generated from `KK.preview.capabilities()`.

### Two things this page got right by construction

**Content is visible without JS.** Every reveal is expressed as
`[data-st="on"] .reveal { opacity: 0 … }`. With no ScrollTrigger, no JS, or
reduced motion, `data-st` is never set to `"on"`, the hidden state never
applies, and the document reads normally. A marketing page that is blank when a
script fails is a CSS-layer problem, not a "remember to handle it" problem.

**The pinned sequence degrades into a list.** The four steps are one `<ol>`.
Pinned, ScrollTrigger scrubs a highlight through them. Unpinned, all four are
simply visible.

### Where it is enforced

| Check | What it would catch |
|---|---|
| `site.scrollTriggerIsActuallyWired` | 20+ triggers, and a real pin |
| `site.nothingIsRevealedBeforeItIsReached` | everything revealed on load, i.e. the scroll doing nothing |
| `site.scrollingRevealsEverything` | a reveal that never fires |
| `site.progressBarFollowsTheScroll` | a progress bar that is decoration |
| `site.exactlyOneStepIsMarkedActive` | the scrub marking all four steps |
| `site.RM.createsNoScrollTriggerAtAll` | reduced motion quietly ignored |
| `site.RM.everySectionIsVisibleWithoutScrolling` | the reduced-motion page inheriting the hidden state |
| `site.noJs.showsRealTextNotABlankScreen` | the page depending on JS to say anything at all |
| `site.languageSwitchRecomputesTheScrollGeometry` | a pin that ends in the wrong place after the text reflows |

### Rejected

- **Hand-rolling the pin and the reveal.** ~150 lines of scroll maths, worse
  than the library, and it would have needed its own tests to reach the same
  confidence.
- **Loading ScrollTrigger on every page** "for consistency". Consistency with a
  dependency nobody uses is not consistency.

---

## 5 · Should switching workspace keep the assembled pipeline?

**Answer: yes. A workspace switch is a swap, not a reset.**

### What changed

The store's contract had two slices. It now has three:

| slice | contents | on a workspace switch |
|---|---|---|
| scenario | `context` (the parse of what you are working on) | **rebuilt** |
| assembled work | `pipeline`, `cards`, `signals` | **swapped via per-workspace slots** |
| account | `artifacts`, `receipts`, `consents`, `auditLog` | **untouched** (unchanged from last round) |

`state.slots.pipeline[key]` / `.cards[key]` / `.signals[key]` hold each
workspace's own work. `setScenario` stashes the outgoing workspace and restores
the incoming one. Nothing is destroyed in either direction, and the toast says
what was kept instead of claiming the pipeline was cleared.

### Three real defects this work exposed

1. **`setNodeState` did not re-point the slot.** Node state was part of the
   assembled work but never reached the slot — it only worked by object
   aliasing, and a page reload (which JSON-parses the slot into a *separate*
   object) silently broke it. Fixed by stashing on every node-state write and by
   re-pointing the slot at the live objects on load.
2. **`nextState` in concept N replaced the pipeline record instead of merging.**
   Writing a fresh `{ nodes, edges, scenario }` dropped `assembledAt`,
   `builtAt`, `fingerprint` and `cards` — so **running one node un-assembled the
   graph**, and a switch would then restore it as "not assembled". The gate
   caught this as `retain.n.assemblyProducesAnAssembledGraph` failing.
3. **`markAssembled` overwrote `assembledAt` on every call.** That made the
   first-assembly timestamp meaningless, and it is exactly what the retention
   check compares. Now `assembledAt` is the first assembly and is never
   overwritten; later additions update `lastAssembledAt`.

Plus one cross-concept bug found while fixing the shape mismatch:
**concept N wrote `signals` as a bare object while concept S keeps an array.**
Two concepts disagreeing about the shape of a shared field is only visible when
one page reads what the other wrote — which is what happens on a reload in the
same tab, since both pages share one `sessionStorage` key. N now writes the
array shape.

### Where it is enforced

| Check | What it would catch |
|---|---|
| `retain.*.assemblyProducesAnAssembledGraph` | defect 2 above |
| `retain.*.switchingAwayDoesNotDestroyIt` | the old behaviour |
| `retain.*.theOutgoingSlotStillHoldsIt` | a slot that is never written |
| `retain.*.comingBackRestoresItExactly` | node ids, states and `assembledAt` all compared |
| `retain.*.theVisibleSurfaceShowsTheRestoredWork` | the store holding a graph the DOM does not show |
| `retain.*.theToastDoesNotClaimThePipelineWasCleared` | copy drifting away from the contract |
| `retain.*.theToastSaysWhatWasKept` | a silent switch |
| `retain.*.retentionIsReadableFromTheDom` | state only readable from inside the store |
| `retain.n.receiptsStillSurviveTheSameSwitch` | a receipt regression re-introduced |

### Rejected

- **Keeping only the current workspace's graph and recompiling on return.** A
  recompile is not a restore: node states, the fingerprint and the assembly
  timestamp would all be regenerated, and the user would have to redo whatever
  they had already approved.
- **Keeping the outgoing graph visible while in the new workspace.** It belongs
  to another workspace, and showing one workspace's graph under another
  workspace's label is a different lie from deleting it. The new workspace shows
  its own slot, which is empty until you build something there.

---

## Bonus: a defect the gate found that was not on the list

Opening the boundary panel during the nine-width sweep exposed that the
capability table's `<code>` identifiers were rendering at **11.04px** — below
the project's own 12px floor. It had never been caught because on the concept
pages the panel is a closed `<details>`, so every leaf inside it measured
`height: 0` and was filtered out of the type check.

On the new page the panel is open by default, so it surfaced immediately. The
fix was in my own new CSS (a `.st-sec code { font-size: .92em }` rule leaking
into the shared panel), and the durable fix is a new assertion:
`widths.<surface>NoTypeBelow12pxWithThePanelOpen`, which measures **with the
panel open** on all three surfaces.

Lesson worth keeping: **a hidden element is an untested element.** The panel was
"checked" on every page for two rounds while never once being measured.
