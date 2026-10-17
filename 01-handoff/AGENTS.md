# AGENTS.md

Instructions for an agent working on the KK Intent OS preview. Read
`04-RED-LINES.md` before touching anything; this file is the operational subset.

## Layout

**Where this tree lives, and which URL serves it: `08-LOCATIONS.md`.** Read it
first — there is no git repository, the served copy is a 30-file subset of this
67-file tree, and the deployment is a file copy into an nginx `root`. Everything
below assumes you know that.

```
index.html                  the door  (forwards to preview/intent/anticipate/)
hub/index.html              the hub   (the decision record)
preview/intent/anticipate/  concept S — the main line
preview/intent/compile/     concept N — frozen reference
preview/site/               the long-scroll page
assets/{css,js,vendor}/     shared layer + one package per surface
docs/                       reference audit · source review · specs · decisions · delivery
e2e/acceptance.js           the gate
```

A surface ships exactly four files of its own (`index.html`, one CSS, one i18n,
one JS). **Do not edit the shared layer from a surface's task.** If a surface
needs a shared change, say so and make it a separate, named change.

## Before writing

1. **Read the live tree first.** A change is diffed against what the origin
   serves now, never against a local copy from a previous round.
2. **Measure the file you are about to edit**, including its EOL. Every text file
   in this package is pure LF — verify, do not assume.
3. **Write the expected change set down** as a list of paths. You will compare
   against it afterwards, in both directions.

## While writing

* Use anchored patches: assert `text.count(anchor) == n` before replacing.
* Never slice a string by an index measured before a `replace`.
* Preserve LF; assert `b"\r" not in data` on every write.
* Do not add a build step, a framework, a bundler, or a CDN reference.
* Do not add a clock-dependent assertion. Read state synchronously; when you must
  wait, wait for a bounded condition with `waitForFunction` / `waitForURL`.
* New user-visible strings go into the surface's own i18n package **with both
  `en-US` and `zh-CN`** — `gaps()` walks the whole dictionary and will fail.

## After writing

1. `node --check` every JS file, and validate every inline `<script>` block by
   extracting it and checking it the same way.
2. Re-run the gate on **the real origin**, with the production grouping:
   `hub,lang` · `n,s,cross` · `sound,contract,retain` · `site,rm,fb` · `widths` ·
   `appbar` · `mob,zoom` · `touch` · `seo` · `nav` · `navclosure`.
   A section that fails alone may be missing input produced by another section.
3. Verify the deployed bytes: hash every file from the origin and compare to the
   local tree. `scripts/verify_release.py` does this and prints the two numbers
   that matter — how many are identical, and whether the difference set equals the
   expected change set.
4. If documents were changed, grep the **live** bytes for any stale self
   description ("behind", "pending", "to be synced").

## Never

* Report an edit as done without reading the result back from disk.
* Report a deploy as done based on the deploy tool's message — in either
  direction.
* Claim a pass for something you could not run. The suite has an explicit
  `UNSUPPORTED` state and two documented unrun assertions; use them.
* Delete or rename a file to "clean up" a task you were not asked to clean up.
* Touch `docs/shots/*.png` — they are evidence of a previous state.
* Commit credentials, host addresses, or keys into any file that ships.
  **One narrow exception, and it is named:** `08-LOCATIONS.md` states the host
  address and the deployment path, because a reviewer who cannot tell a served
  file from an intended one is not reviewing anything. It contains no password,
  no key, and no session token — and it, plus its machine-readable twin
  `locations.json`, is the only place allowed to break this rule. If you find the
  host address anywhere else, that is a bug, not a style question.

## Where the numbers live

`docs/DELIVERY.md` §6 is the authoritative table of what each gate section
proves, and `README.md` carries the running totals. If you change an assertion
count, both must move in the same change — they are the two places a reader will
look, and they are already wrong for one round each time someone forgets.
