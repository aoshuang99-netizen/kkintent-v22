# 02 · Architecture

## Shape

```
index.html                  the door  (forwards to concept S; noindex, no canonical)
hub/index.html              the hub   (decision record; indexable, self-canonical)
preview/intent/anticipate/  concept S (index.html + concept-anticipate.css + i18n-anticipate.js + concept-anticipate.js)
preview/intent/compile/     concept N (same four-file shape)
preview/site/               long-scroll page (same four-file shape)
assets/css/                 tokens · base · os (the shell) · one package per surface
assets/js/                  i18n · i18n-shared · i18n-<surface> · store · adapters · field · sound · os · <surface>
assets/vendor/              three.js r147 · GSAP 3.12.5 · ScrollTrigger 3.12.5 (vendored, no CDN)
docs/                       reference audit · source review · specs · decisions · delivery
e2e/                        the acceptance gate
```

**Rule: a surface ships exactly four files of its own.** Everything else is the
shared layer, maintained centrally. A surface editing the shared layer "in
passing" is how two surfaces start disagreeing — and `cross` asserts that the
concept packages do not leak into each other's page.

## Load order

Every page loads, in this order and with `defer`:

```
three.min.js → [gsap.min.js → ScrollTrigger.min.js, site only]
→ i18n.js → i18n-shared.js → i18n-<surface>.js
→ store.js → adapters.js → field.js → sound.js → os.js → <surface>.js
```

Each file is an IIFE that hangs its public surface on `window.KK`. There are no
modules, no bundler, and no build step: what is on disk is what is served.

| Namespace | File | Public surface |
|---|---|---|
| `KK.i18n` | `i18n.js` | `init · register · t · has · apply · setLang · toggle · keys · stats` |
| `KK.store` | `store.js` | `addReceipt · addConsent · setScenario · snapshot · …` (tab-scoped `sessionStorage`) |
| `KK.preview` | `adapters.js` | `PREDICTION_CONTRACT · predict · validatePrediction · confidenceFromBasis · modelAdapterContract` |
| `KK.field` | `field.js` | `init · stats` — `backend: 'webgl' \| 'css-fallback'` |
| `KK.sound` | `sound.js` | `init · state · toggle` — `defaultOn`, `persisted`, `gestures` |
| `KK.os` | `os.js` | the shell: HUD, view nav, sheets, toaster, terminal, boundary table |
| `KK.anticipate` / `KK.compile` / `KK.site` / `KKHub` | surface package | that surface's state machine, exposed for the gate |

## The four things that are easy to get wrong

### 1. The language declaration has exactly one writer

`i18n.js` writes `lang` (BCP-47) and `data-lang` (`en`/`zh`) onto `<html>` and
**only** `<html>`. It used to be written by three files with two value spaces —
`en` on `<html>`, `en-US` on `<body>` — and nothing read either. The gate asserts
both directions: the declaration follows the text, and nothing else claims to
declare it.

`?lang=` outranks everything, including a stored choice, so a review link can
hand someone a language. `navigator.language` is deliberately **not** consulted;
the default is English, full stop.

`apply(root)` rewrites text nodes in place. It never creates or removes elements,
so a language switch preserves the draft in the composer, the card positions,
the open sheet and the scroll offset.

### 2. The shell owns its containers

`os.js` builds the HUD, the view nav, the console sheet and the toaster by
`clear()`-ing its container and appending its own nodes. **A statically written
anchor inside `<nav class="viewnav">` is wiped at boot** — this cost a round. If
you need a persistent link, put it in the footer, not in a shell container.

### 3. Offsets are measured, never assumed

The fixed bar can wrap to two rows at narrow widths or at 200% zoom. So its
height is measured from the live box and published as `--hud-end`; the sticky
nav's height is published as `--nav-h`. Nothing positions itself against a token
that assumes one row. (430px, real numbers: the bar's bottom edge was 122px while
the shell had reserved 92px; the sticky nav sat 30px underneath it and its
buttons were dead.)

### 4. `data-booted`

Every surface sets `document.body[data-booted="true"]` as its **last** act. The
gate's `boot()` waits for it. This is why the door (`index.html`) is never
`boot()`ed — it has no JS bundle and never sets the flag. Any new page must set
it or the gate will time out rather than fail, which is a worse signal.

## The prediction contract

`kk.prediction.v1` — 12 required fields, 5 invariants, one scoring function.

```
contract · mode · previewOnly · provider · notAModel · scenario · fired
tailId · confidence · confidenceBand · basis · features
```

```
tailId is null whenever fired is false
confidence === confidenceFromBasis(basis)      // one function, stated once
every basis[].id is a key of weights
notAModel is true exactly when no model produced the tail
no network request is made; there is no endpoint in this build
```

`notAModel` is deliberately **not pinned to true in the contract**. The contract
describes a shape that a real model must also satisfy; pinning it would mean the
gate passes for the wrong reason the day a provider is connected. Exactly two
fields may change meaning when that happens — `provider` and `notAModel` — and
that is written down rather than discovered.

`validatePrediction()` returns a **description** of what is wrong, never a
boolean, because "invalid" on its own is not actionable.

## The field / backdrop

`KK.field` renders a WebGL particle field driven by GSAP, and falls back to a CSS
backdrop when WebGL is unavailable. The fallback:

* records **why** (`markFallback(reason)`),
* publishes it (`document.body[data-field-backend]`),
* is reachable from a URL (`?field=css`), so the honest path is testable rather
  than hypothetical,
* keeps every function of the surface working.

The gate asserts the backend is `webgl` when WebGL exists, and that the fallback
builds no meshes, says so on screen, and still works.

## The store

Tab-scoped `sessionStorage` (`PREVIEW_ADAPTER`). Three slices:

* **assembled work** — per workspace, so a switch swaps rather than resets;
* **receipts** — `{ stepId, titleKey, mode, status, externalWorldChanged, scenarioAtWrite }`;
* **consents** — `{ kind, granted, outcome }`, where `outcome` is separate from
  `granted` so "denied" is never confused with "never asked".

Closing the tab clears it. Nothing is ever sent anywhere.

## Sound

Off by default, unpersisted until a deliberate settings surface exists. The first
`AudioContext` is created **inside a click** and never at boot. `state()` exposes
`defaultOn` / `persisted` / `gestures` / `plays` so the promise is readable from
outside rather than inferable — and the button states the truth in words, not
only in an icon.

## Why no framework, no bundler, no build

The product's claim is that what you see is what is measured. A build step adds a
layer between the file and the served byte, and every claim about the served byte
then needs a second claim about the build. The gate reads the **served** bytes,
the deployed tree is verified by sha256 file by file, and the tree on the server
is byte-identical to the tree in the repository. That is only affordable because
there is no build.
