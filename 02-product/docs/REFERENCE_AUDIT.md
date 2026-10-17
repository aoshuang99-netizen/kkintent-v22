# Reference audit — what is actually on those five sites

Checked 2026-10-16 by fetching each page. Verdicts are about **the description in
the brief**, not about the sites: "falsified" means the description contradicts
what the page shows, "unverified" means we could not obtain evidence either way.
Unverified is not a euphemism for false; it is reported as unverified.

| # | Reference | Brief's claim | What is actually there | Verdict | Kept |
|---|---|---|---|---|---|
| 1 | **Cerebrium** | Homepage is "a tech nebula core of tens of thousands of real-time 3D WebGL particles"; requires Three.js + GLSL + WebGPU; "Awwwards top-tier regular" | A conventional landing page for **serverless GPU infrastructure**: one hero sentence ("Real-time AI infrastructure that scales with you"), four feature blocks, a **Terminal component** showing a real CLI run (`cerebrium run … ✓ Prepared 2 files ✓ Uploaded successfully`) with epoch progress bars (`Epoch 1/3 [████████░░░░] 28% loss=1.42 lr=3e-4 00:12`), case-study cards, and a SOC 2 / HIPAA / GDPR / gVisor compliance section. **No particle nebula on the homepage.** | **Falsified** | The terminal component — a compile log that prints real progress. It is the strongest pattern in the whole brief and concept N's main chain is built on it. Also the observability framing (three measured columns) |
| 2 | **Cosmos** | Inspiration network where elements float weightless; fluid elastic feedback on every drag; "Matter.js deeply applied" | The site is real and is a visual inspiration network — colour search ("Find your next lamp with character"), collections, and a **"Hide AI"** toggle are all present. But the landing page is a conventional vertical structure, and we obtained **no evidence** of Matter.js or of free-floating layout | **Partly true · physics unverified** | Retrieval by attribute rather than keyword; the idea of a user-owned switch that turns the AI layer off (→ concept S's list mode) |
| 3 | **Framer / Framer AI** | In its AI window all UI controls and Bento layouts assemble live through seamless animation; GSAP + Flip + Rive | The tool exists and the direction is plausible, but the AI window requires an account, so the live-assembly behaviour could not be verified | **Unverified** | Staggered assembly as a rhythm — implemented for real with a GSAP timeline over meshes the app actually built, not a pre-rendered video |
| 4 | **v0.app** | Pure black page with hairline HUD grid lines; the input predicts your whole instruction as ghost text after two characters | What loads is a **template gallery** — "What do you want to create?" followed by a wall of template cards. No black HUD grid and no predictive ghost text observed | **Unverified** | The one-question opening; templates as a way to start. Ghost completion is implemented in concept S as our own pattern and credited to nobody |
| 5 | **Active Theory** | Full-screen 3D holographic OS; Tone.js generates ambient white noise from the mouse path | The studio is real and its reputation for immersive work is real, but the page returned a minimal text skeleton (divider runs and a counter) to our fetch, so neither the 3D scene nor the audio could be verified | **Unverified** | Sound as a spatial cue — a synthesised chime on focus. In both concepts it is **off by default** and the button states its state in words |

## What this audit changed

1. **The "GPU particle gravitational collapse" had to be built for real.** The
   only reference for it in the brief does not contain it. So concept N
   implements it as an actual vertex-shader uniform (`uCollapse`), per particle,
   and exposes the live value at `KK.field.stats().collapse` so the claim is
   checkable instead of decorative.
2. **The compile log had to print measurements.** Cerebrium's terminal is the
   only pattern in the brief that survived contact with the real page, and it is
   a pattern about honesty (a real CLI run, real epoch progress). Concept N's
   terminal therefore prints `work.*` measured with `performance.now()` and
   labels its presentation pacing as pacing.
3. **Three of five references could not be verified.** That is stated in the hub
   page itself, in both languages, rather than being quietly absorbed into the
   design as if it had been confirmed.

## Stack notes

* `three@0.147.0` — **the last official UMD build**. `build/three.min.js` at
  r150+ prints "Scripts 'build/three.js' and 'build/three.min.js' are deprecated
  with r150+, and will be removed with r160". We downloaded r160 to check and it
  does print exactly that (it is a deprecation shim). r147 gives a global `THREE`
  with no console warning; production should move to ESM + importmap.
* `gsap@3.12.5` — used only for the staggered assembly timeline.
* **ScrollTrigger is deliberately not included.** This shell routes views instead
  of scrolling one long page, so a scroll-linked animation engine would be a
  dependency with no consumer. If a scrolling page is wanted later, it is a
  one-line addition.
* **Matter.js is deliberately not included.** The orbit board needs ~60 lines of
  spring/damping/separation, not a physics engine.
* Vendor integrity: `three.min.js` 607,784 B · sha256 `f34446bf875b5fb0…`;
  `gsap.min.js` 72,214 B · sha256 `28033e449a31ebcc…`. Both served locally, no CDN.
