# Source review — the HTML that came attached to the brief

We read the pasted file line by line. As pasted **it does not run**, and most of
the reasons are copy-paste damage rather than design errors. Every item below was
checked against the text.

## Fatal

| # | Defect | Why it matters |
|---|---|---|
| 1 | All three library tags point at `https://cloudflare.com` — a placeholder domain that serves no JavaScript. | Three.js and GSAP never load, so the page renders a black screen and every later line fails. This alone is fatal. |
| 2 | `init()` calls `this.build3DScene()`, but the method is named `init3DScene()`. | A `TypeError` on the first tick, so the renderer is never created and no particle field ever exists. |
| 3 | Several statements lost their quoting: `line.className = terminal-line ${log.style};`, `console.log(🤖 隔离显存清洗成功。…${val})`, and an `innerHTML` assignment with unescaped Chinese text and a raw `<br>`. | These are syntax errors, so the whole `<script>` block fails to parse. Not one line in it executes. |

## Silent

| # | Defect | Why it matters |
|---|---|---|
| 4 | `routeModelSilent` reads `this.backgroundNebula`, but the property that gets created is `nebulaSystem`. | A silent no-op: the "reset the field" branch never resets anything, and nothing reports it. |
| 5 | The markup uses `class="pulse-indicator"` while the stylesheet defines `.status-pulse`. | The status light is invisible on every screen. A small bug, but it is the one users look at to know the system is alive. |

## Claims that cannot be true

| # | Defect | Why it matters |
|---|---|---|
| 6 | The "GPU particle gravitational collapse" is `gsap.to(this.nebulaSystem.scale, {x:0.1,y:0.1,z:0.1})` — a scale tween on one `Points` object. | It is not a shader, it is not per-particle, and it cannot react to a signal. Concept N implements the same idea as a real vertex-shader uniform and exposes the live value so the difference is checkable. |
| 7 | The terminal prints "沙盒加密开启" (sandbox encryption enabled), "采样率: 12k Hz" (sampling rate 12k Hz) and "底层协议无缝连接成功" (underlying protocol connected seamlessly). | Specific technical claims, none measured and none measurable in that page — exactly the kind of line that trains a user to distrust everything else on screen. Our terminal gives every line the path of the value it displays, and the gate script verifies every line resolves. |

Also noted: the gate script's `N.terminalMakesNoUnmeasurableClaim` assertion runs
`/加密|12k ?Hz|无缝|seamless|encrypted|guaranteed/i` over every rendered line. It
passes — and it would fail on the pasted source's own terminal text.

## Kept from the source

1. **The three-layer mount.** A bottom canvas (`z-index: 1`), a floating frosted
   HUD (`z-index: 100`), and an intent frame in the middle (`z-index: 10`). We
   turned that into a documented token contract (`--z-field`, `--z-stage`,
   `--z-hud`, `--z-sheet`, `--z-toast` in `assets/css/tokens.css`).
2. **The main chain.** One button compiles, nodes and links assemble in front of
   you, a terminal narrates it as it happens.
3. **A workspace/model switcher in the HUD** — rebuilt to actually reconfigure
   the blueprint, and to say out loud what a switch does to your receipts.
4. **Sound as a cue** and a restrained dark palette with a single accent — kept,
   with sound defaulting to off.

## Dropped or rewritten

1. Placeholder CDN URLs, a status light with no matching rule, and a sampling
   rate that exists nowhere.
2. `alert()` for validation — replaced with an inline error region wired to
   `role="alert"`.
3. Claims like "world-class, the only one", "guaranteed 120Hz" and "seamless
   protocol connection" — replaced with a capability panel that states, per
   feature, whether it is connected, sandboxed, or not present.
