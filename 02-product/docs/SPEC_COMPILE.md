# Concept N — compile / 编译之境 · **frozen reference**

> **Status: frozen (`data-status="frozen"`), kept online on purpose.**
> Round 2 ruled that S (意图操作系统 / Intent OS) is the main line, and that N
> stays as the reference. It is **not** deleted, because the claim *"the terminal
> only prints measured values"* is only checkable while the terminal exists —
> deleting the reference and keeping the claim would have been the wrong trade
> (`docs/DECISIONS.md` §1). N is no longer a candidate for the product shell and
> receives no further feature work; it is maintained as evidence.
>
> **One part of N was carried into the main line:** the dependency graph.
> Confirming a card on S's orbit board now assembles that intent into a real graph
> through the same `KK.preview.buildPipeline` adapter, accumulating per workspace.
> See `docs/SPEC_ANTICIPATE.md` §"Assembling intent into a graph".
>
> Two defects found here in round 2 were fixed in place, because a frozen
> reference that cannot be trusted is not a reference: `nextState` used to
> **replace** the pipeline record (dropping `assembledAt`, so running one node
> un-assembled the graph), and `signals` was written as a bare object while S
> keeps an array. Both are guarded by `retain.n.*`.

**One instruction becomes a dependency graph you can watch being built, and every
number you see on the way is a number we measured.**

Open: `preview/intent/compile/` (add `?lang=zh-CN` or `?field=css`).

## Views

| View | Test id | What it does |
|---|---|---|
| Intent frame | `n-input`, `n-compile`, `n-chips`, `n-term` (result panel) | One long instruction. The frame measures it live and the chips show the measurement next to the colour, so colour is never the only signal. |
| Pipeline | `n-rail`, `n-node`, `n-inspector`, `n-degrade` | The graph as a 2D rail with lane, state, approval badge and "waiting on X". Selecting a node fills the inspector. |
| Log & receipts | `n-term`, `n-receipts`, `n-audit` | The compile log, then every receipt with its mode and its `externalWorldChanged`, then the account audit log. |

## The dependency rule (both directions)

* A node is `blocked` while any node feeding it is not `done`.
* Running a node emits a receipt; completing it unblocks its downstream.
* **Reopening** a node re-blocks its *unfinished* downstream. Completed work is
  never destroyed — reopening `nd_pattern` after `nd_rehearse` is done leaves
  `nd_rehearse` done. Both behaviours are asserted (`N.reopenBlocksTheDownstreamNode`,
  `N.reopenDoesNotUndoCompletedWork`).

## The approval gate

Exactly one node per blueprint carries `requiresApproval`. Running it opens a
confirm sheet that says, in words, that the sandbox executor records a receipt and
changes nothing outside the page.

* **Deny** → `executeNode(node, {approved:false})` returns `{executed:false,
  denied:true}`; no receipt; the node stays open; a toast says so.
* **Approve** → a `SANDBOX` receipt with `externalWorldChanged: false`.

Local (non-gated) nodes produce a `PREVIEW_ADAPTER` receipt instead — only the
gated node ever touches the sandbox executor.

## The compile log

Ten lines, each with `data-status` (`ok` / `demo` / `none`) and **`data-src`** —
the path of the value it prints inside the compile payload. The gate script
resolves every path and requires the rendered text to contain that value:

```
[OK]   Captured 82 characters from the intent frame.      ← features.chars = 82
[OK]   Graph build measured at 0.7 ms.                    ← work.graphMs  = 0.7
[DEMO] Presentation pacing 1630 ms — disclosed, not work. ← pacing.totalMs
[--]   Provider: preview.lexicon.v1 · template, not a model.
```

`work.totalMs` is real local compute (~0.9 ms measured). The 1630 ms of assembly
is **pacing**, disclosed as pacing, and never described as compute.

## The 3D network

One renderer, one camera, one loop, shared with the particle field (`KK.field.add`,
`KK.field.onFrame`). Nodes are wireframe icosahedra that scale in on a GSAP
stagger; tubes are `TubeGeometry` over a bowed `CatmullRomCurve3`; one packet per
edge travels the curve in the shared frame hook.

The collapse is a **vertex-shader uniform**, not a tween: `uCollapse` pulls and
rotates each particle toward the core, `uSignal` mixes the calm and alert spectra.
`KK.field.stats().collapse` reads the live uniform; the gate asserts it exceeds
0.25 after a compile.

## Honest degradation

No WebGL (or `?field=css`) → `data-field-backend="css-fallback"` with a recorded
reason, the pipeline view shows a notice explaining that the 3D network is off and
that the rail is the same data, and no meshes are built. Every function still
works — asserted by `FB.everyFunctionStillWorks`.

## Blueprint per workspace

| Workspace | Nodes | Edges | Approval gate |
|---|---|---|---|
| mind · 情绪与压力（CBT） | 5 | 4 | `nd_rehearse` |
| bond · 亲密与边界 | 6 | 5 | `nd_repair` |
| life · 方向与自我叙事 | 5 | 4 | `nd_bet` |

Switching a workspace **swaps** the pipeline rather than clearing it: each
workspace keeps its own slot (`state.slots.pipeline[key]`), the outgoing one is
stashed and the incoming one restored, and the graph — node ids, node states and
`assembledAt` — comes back exactly as it was. Receipts, consents and the composer
draft are untouched by the switch. The toast names the receipt count, says the
draft was kept, and says how many workspaces are holding a pipeline and how many
nodes this one has. Guarded by the 11 `retain.n.*` assertions.
