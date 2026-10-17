# KK Intent OS — handoff package for a second review

**What this is.** Everything needed to plan, audit and extend the KKmatch Intent
OS preview without re-reading a 12-round conversation: the design as it actually
is (not as it was described in round 1), the code architecture, the acceptance
gate, the constraints that must not be broken, and the catalogue of bugs that
produced those constraints.

**What this is not.** It is not a proposal. Every statement about the product in
here is traceable to a file in `../kkintent_public/` or to an assertion in
`code/acceptance.js`. Where something is unverified, it says so — that habit is
the product's whole thesis, and this package is held to the same standard.

**State at handoff:** round 8, 2026-10-17. 67 files, 589 gate assertions in 20
sections, 587 executed on production, 0 failing, 33 INFO records.

---

## How to use this with Codex / GPT

Three passes, in this order. Each one produces a different artefact and they
should not be merged — the failure mode of a single mega-pass is that the audit
gets skipped and the plan inherits the audit's blind spots.

### Pass 1 — audit (read-only)

Read in this order: `01-CONTEXT.md` → `02-ARCHITECTURE.md` →
`03-ROUND8-ROUTING.md` → `code/acceptance.js`. Then answer, with file-and-line
citations:

1. Name every place where the same fact is written by more than one writer.
   (`04-RED-LINES.md` §2 lists the ones already known; find new ones.)
2. Name every assertion in `code/acceptance.js` that could pass while the thing
   it describes is broken. `05-FAILURE-LIBRARY.md` §4 gives four known shapes of
   this; find more.
3. Name every user-visible claim in the product copy that has no corresponding
   assertion.

Do not propose changes in pass 1. The value of the pass is the list.

### Pass 2 — plan (still read-only)

Using the audit, propose a next round with at most **five** items. Each item must
carry: the claim being made, the assertion that would fail if it were false, the
files it touches, and what it makes worse. An item without a falsifiable
assertion is not a plan item, it is a wish. `07-BACKLOG.md` contains the open
questions already identified — treat it as input, not as a menu.

### Pass 3 — implement

Follow `AGENTS.md`. Non-negotiables: anchored patches with count assertions,
LF-only writes, no clock-dependent assertions, and never report an edit as done
without reading the result back.

---

## Contents

| File | What it is |
|---|---|
| `01-CONTEXT.md` | The product in two pages: the thesis, the three surfaces, what was chosen and what was frozen |
| `02-ARCHITECTURE.md` | The code: namespaces, load order, the field/backdrop, the store, the prediction contract, i18n |
| `03-ROUND8-ROUTING.md` | Round 8 in full — root becomes a door, the hub moves to `/hub/`, and why that was twelve files and not one |
| `04-RED-LINES.md` | Constraints, each with the incident that created it |
| `05-FAILURE-LIBRARY.md` | 28 defects: symptom → cause → the assertion that now guards it |
| `06-GATE.md` | The gate section by section: what each one proves and how to run it split without lying to yourself |
| `07-BACKLOG.md` | Open questions and candidate work, each phrased so it can fail |
| `08-LOCATIONS.md` | **Where v22 is and which URL serves it** — paths, URLs, backups, the fact that there is no git repository, and how to baseline before changing anything |
| `AGENTS.md` | Instructions for an agent working in this repository |
| `code/acceptance.js` | The gate itself, as shipped |
| `scripts/` | The tools this round actually used: `verify_release.py` (two-way tree comparison), `fetch_origin.py` (hash every path from an origin), the three anchored patch scripts, `click.js` (real-pointer nav chain) and two read-only probes |
| `manifests/` | `files67.txt` (the canonical file list), SHA-256 of all 67 files, and the two-origin comparison that proved 30/30 on production and 67/67 on the share link |
| `locations.json` | The machine-readable form of `08-LOCATIONS.md`: copies, origins, URLs, gate totals, backups |

Verify the package itself before trusting anything in it:

```bash
python scripts/verify_release.py --local ../kkintent_public \
    --base https://kkmatch-gcai-preview.app.workbuddy.host \
    --list manifests/files67.txt
# expected: files fetched 67 / byte-identical 67 / not identical 0 / exit 0
```

## What is deliberately excluded

* **Credentials.** `08-LOCATIONS.md` names the host, its path layout and every
  public URL, because none of that is secret and a reviewer without them cannot
  tell a served file from an intended one. The root password is **not** here, by
  design: it is held by the operator and passed out of band.
* **Screenshots.** They are in `../kkintent_public/docs/shots/`. They are images
  of a previous state and none of the assertions depends on them.
* **Two assertions.** `shots` cannot run on this machine (the sandbox blocks the
  write with `EPERM`). Rather than claim a pass, the gate reports two fewer
  executed assertions and `05-FAILURE-LIBRARY.md` §5 explains the substitute
  evidence chain.
