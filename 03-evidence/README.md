# 03-evidence — what each file proves

Nothing here is a narrative. Each file is a measurement that could have come out
the other way, and the point of keeping it is that a reader can re-derive the
conclusion without trusting the person who wrote the summary.

## before-round8/

The **nine files round 8 changed**, in the exact byte state they had *before* the
change (copied out of `public.bak_hubroot_20261017_120603`, a `cp -a` taken
immediately before the patch ran). The tenth file of the change set,
`hub/index.html`, did not exist before, so it is absent here — its absence *is*
the evidence that it was created rather than moved.

Diff any of these against its counterpart in `02-product/` to see precisely what
the round did. This is the only "before" that exists for that round: these bytes were captured
before any repository existed (see `01-handoff/08-LOCATIONS.md` §0), so a
side-by-side is the whole mechanism. Copying them into git now would be a
reconstruction, not a record.

> Note on `before-round8/README.md`: that is the **product's** README in its
> pre-change state — one of the nine files this round rewrote. It is not a
> description of this folder. Filenames were kept identical on purpose so
> `diff before-round8/<path> 02-product/<path>` needs no path translation.

## *.tsv — per-file hashes pulled over the public origin

Format: `sha256-prefix \t http-status \t path \t bytes`

| File | When | What it proves |
|---|---|---|
| `prod_baseline.tsv` | before the change | what production served **at that moment** — the baseline was pulled from the live origin, never from a local copy of a previous round |
| `prod_after.tsv` | after the change | 30/30 byte-identical to `02-product/` |
| `share_baseline.tsv` | before the upload | the share link was one revision behind: 56 identical, 10 different, 0 missing |
| `share_after.tsv` | after the upload | 67/67 byte-identical — zero missing, zero extra |

The pair is the assertion, not either file alone. `after` without `before` cannot
distinguish "uploaded the right thing" from "uploaded everything"; `before`
without `after` cannot distinguish "changed what I meant" from "changed it and
broke two neighbours".

## manifest_local.tsv / manifest_compare.json / files67.txt

- `files67.txt` — the canonical path list every comparison was driven from. Fixed
  before the work started, so the comparison could not be quietly redefined after.
- `manifest_local.tsv` — `sha256 \t bytes \t path` for all 67 local files.
- `manifest_compare.json` — the same 67 paths fetched from **both** origins:
  production answered 30 and was identical on all 30; the share link answered all
  67 and was identical on all 67. The 37 production non-answers are `README.md`,
  `docs/` (31) and `e2e/` (5) — deliberate, because a 155 KB test harness and a
  screenshot archive do not belong in a web root.

## logs/

Raw stdout of the gate runs, unedited, including the parts that are not green.

| File | Origin | Result |
|---|---|---|
| `gate_prod.log` | `https://kkmatch.com/v22` | 587 executed / 587 PASS / 0 FAIL / 33 INFO |
| `gate_share.log` | share link | contains **two FAIL lines** — see below |
| `touch_share.log` | share link, `touch` re-run alone | 91 / 91 PASS |
| `gate_local.log` | `127.0.0.1:18091` | pre-deploy run; kept for completeness |

### The two FAIL lines in `gate_share.log` are machine-side, and here is how that was established

```
FAIL  site.desktop.noConsoleErrors
FAIL  site.RM.noConsoleErrors
      ["console.error: THREE.WebGLRenderer: A WebGL context could not be created.
        Reason: ... VENDOR = 0x10de, DEVICE = 0x1d01 ..."]
```

At the same time the disk was at 0 bytes free, and sibling processes were dying
with `STATUS_COMMITMENT_LIMIT (0xC000012D)` and `STATUS_DLL_INIT_FAILED
(0xC0000142)` — `df` itself crashed. After resources recovered, the **same
section against the same bytes passed 53/53**. The evidence that this was not a
product defect is therefore threefold: the error text names the GPU context, the
process exit codes name exhaustion, and the re-run is green without any change to
the product.

`gate_share.log` is kept **with** those two lines rather than being replaced by
the clean re-run, because a log edited to look right is no longer a log.

## What is deliberately absent

- **Screenshots of this round.** The sandbox blocks Playwright from writing image
  files (`EPERM`). Rather than claim a pass, `shots` is reported as two unrun
  assertions; the substitute evidence is the hash chain above.
- **Any credential.** The host address appears only in
  `01-handoff/08-LOCATIONS.md` and `locations.json`, by design, with no password.
