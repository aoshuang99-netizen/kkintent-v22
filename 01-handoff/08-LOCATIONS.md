# 08 — Where v22 lives, and how to reach it

Read this before anything else. It answers two questions only: **where the code
is**, and **which URL serves it**. Every path and every URL below was measured on
2026-10-17 against the live host, not recalled.

---

## 0. The answer that decides how you work

**As of 2026-10-17 there is one.**

**The repository:** `https://github.com/aoshuang99-netizen/kkintent-v22` — private,
one commit, the full 117-file archive. Clone it and work from there.

**Until that day** v22 had no git repository. Not on the workstation, not on the
server. Both copies were plain directories of files, and the measurements below
were taken then. They are kept because they remain true of the **production
directory**, which is still outside version control:

```
git -C C:\Users\AS\WorkBuddy\20260420163622\kkintent_public rev-parse --is-inside-work-tree
  -> fatal: not a git repository (or any of the parent directories)

git -C /opt/kk-match/frontend/v22  rev-parse --is-inside-work-tree
  -> fatal: not a git repository (or any of the parent directories)
git -C /opt/kk-match              rev-parse --is-inside-work-tree
  -> fatal: not a git repository (or any of the parent directories)
```

Consequences, and they are the whole reason this document exists:

* There is no `git log`, no `git diff` against a parent commit, no branch, no
  revert. **A revision is identified by content hash, not by SHA of a commit.**
* "Roll back" means restoring a `cp -a` backup directory (listed in §4), and the
  only way to know what changed is to hash both sides and compare sets.
* **The repository lives outside the web root** (decision taken 2026-10-17). Do not
  `git init` inside `/opt/kk-match/frontend/v22`: nginx serves that directory
  directly, so `.git/` would be publicly fetchable at
  `https://kkmatch.com/v22/.git/config`. Put the repository outside the web root
  and deploy *from* it, or keep using hashes.

---

## 1. The two authoritative copies

| | Workstation | Production host |
|---|---|---|
| Path | `C:\Users\AS\WorkBuddy\20260420163622\kkintent_public` | `129.211.8.167:/opt/kk-match/frontend/v22` |
| Role | full source of truth — code **and** gate **and** documents | the subset nginx actually serves |
| Files | **67** (7,343,948 B) | **30** (1.2 MB) |
| Contents | `index.html`, `hub/`, `preview/`, `assets/`, `e2e/`, `docs/`, `README.md` | `index.html`, `hub/`, `preview/`, `assets/` |

The 37 files that exist locally but **not** on the host are deliberate, and they
are exactly:

```
README.md
docs/    (31 files: 6 markdown + 25 png screenshots)
e2e/     (5 files: acceptance.js, mobile-fidelity.js, probe-deep.js,
                probe-round3.js, probe-smoke.js)
```

Do not try to fetch them from the site — they are not there, and that is not a
bug. The gate and the documentation live outside the web root because publishing
a 155 KB test harness and a screenshot archive is not a feature.

Verified 2026-10-17 by pulling all 67 paths from both origins:

| Origin | identical | different | absent |
|---|---|---|---|
| `https://kkmatch.com/v22` | **30 / 30 served** | 0 | 37 (the set above, by design) |
| `https://kkmatch-gcai-preview.app.workbuddy.host` | **67 / 67** | 0 | 0 |

The workstation tree is therefore byte-identical to *both* public copies,
simultaneously. Per-file SHA-256 is in `manifests/manifest_local.tsv`.

### Access

```
host      129.211.8.167
user      root           (password held by the operator, not in this package)
key file  none — password auth
stack     OpenCloudOS 9.4, kernel 6.6.117-45.oc9, OpenSSH 9.3, nginx 1.26.3
```

From this workstation the connection is made with Python + paramiko. Two settings
are not optional: `HOME` must point at a temp directory holding an **empty**
known_hosts file (otherwise paramiko reads the real `~/.ssh` and fails on a host
key it has never seen), and `look_for_keys=False` must be set or it will try
agent/public-key auth first and hang instead of falling back to the password.

---

## 2. Which process serves it

```
nginx -T | grep -A2 'location \^~ /v22/'
    location = /v22 { return 301 /v22/; }
    location ^~ /v22/ {
        root /opt/kk-match/frontend;
```

**The files are served straight off the host filesystem.** There is a container
named `kkmatch-frontend` on `127.0.0.1:8080`, but nothing proxies `/v22/` to it —
`root /opt/kk-match/frontend` wins, and `/api/` is the only thing pointed at a
backend (`127.0.0.1:8001`). So:

* Copying a file into `/opt/kk-match/frontend/v22/` **is** the deployment. No
  restart, no reload, no `docker cp`. The next request reads the new bytes.
* `docker cp` into `kkmatch-frontend` would change nothing a visitor can see.
  This has been gotten wrong before; it is written down here so it is not gotten
  wrong again.
* nginx config changes are a different matter and do need
  `nginx -s reload` + a bounded wait — reload is asynchronous and the old worker
  can still answer the request you make immediately afterwards.

---

## 3. URLs

All values returned HTTP 200 on 2026-10-17 unless noted.

### Production — `https://kkmatch.com/v22/`

| URL | What it is | Bytes |
|---|---|---|
| `https://kkmatch.com/v22` | 301 → `/v22/` | — |
| `https://kkmatch.com/v22/` | **the door** — forwards to concept S (先觉之境 / anticipate) | 3,270 |
| `https://kkmatch.com/v22/hub/` | the three-surface hub (the old entry page) | 16,087 |
| `https://kkmatch.com/v22/preview/intent/anticipate/` | concept S — the intent field | 3,639 |
| `https://kkmatch.com/v22/preview/intent/compile/` | concept N — the compile pipeline (archived reference) | 3,636 |
| `https://kkmatch.com/v22/preview/site/` | the marketing surface | 10,121 |
| `https://kkmatch.com/sitemap.xml` | sitemap; the four `/v22/` entries are listed there | 14,130 |

`/v22/` is **not** an HTTP redirect. It answers `200` with a 3,270-byte HTML
document that hops in JavaScript, keeps `?lang=`, and carries a
`<meta http-equiv="refresh">` inside `<noscript>` for readers without scripting.
So `curl -I https://kkmatch.com/v22/` will show `200`, not `301`, and that is
correct. Anything that treats "redirect" as "3xx" will misread this page.

### Share link — `https://kkmatch-gcai-preview.app.workbuddy.host/`

Same content, all 67 files, same door semantics:

| URL | Bytes |
|---|---|
| `https://kkmatch-gcai-preview.app.workbuddy.host/` | 3,270 (door) |
| `https://kkmatch-gcai-preview.app.workbuddy.host/hub/` | 16,087 |
| `https://kkmatch-gcai-preview.app.workbuddy.host/preview/intent/anticipate/` | 3,639 |
| `https://kkmatch-gcai-preview.app.workbuddy.host/preview/intent/compile/` | 3,636 |
| `https://kkmatch-gcai-preview.app.workbuddy.host/preview/site/` | 10,121 |
| `https://kkmatch-gcai-preview.app.workbuddy.host/e2e/acceptance.js` | 155,595 |

The byte counts matching production one-for-one is the point: these are the same
documents, not two similar builds.

**Use the share link to read the gate; use production to run the `seo` and `nav`
sections.** `seo` asserts HTTP response headers that only nginx emits, and `nav`
needs the real homepage at `/` to compare against — neither exists on the share
link, so both sections are skipped there by construction.

---

## 4. Backups on the host

There is no VCS, so these directories are the entire history. `cp -a`, same
inode ownership, immediately before each change:

```
/opt/kk-match/frontend/v22.bak_r6_20261016_204204
/opt/kk-match/frontend/v22.bak_r7_20261017_111643
/opt/kk-match/frontend/v22.bak_hubroot_20261017_0428     <- the root-path round
/opt/kk-match/frontend/sitemap.xml.bak_r6_20261016_204306
/opt/kk-match/frontend/sitemap.xml.bak_hubroot_20261017
```

Restoring one is three commands and sixty seconds — but it restores *everything*,
including files nobody meant to touch, because a directory copy cannot tell the
difference between a change and a bystander. That is why every round is preceded
by a hash-set comparison rather than a copy: see `scripts/verify_release.py`.

---

## 5. How to establish a baseline before you change anything

```bash
# 1. hash every path, on both sides, and compare the two sets
python scripts/verify_release.py --local ../kkintent_public \
    --base https://kkmatch-gcai-preview.app.workbuddy.host \
    --list manifests/files67.txt

# baseline right now, measured 2026-10-17:
#   files fetched 67 / byte-identical 67 / not identical 0 / exit 0

# 2. change something

# 3. run it again; the set of differing paths must EQUAL the set you intended,
#    passed as --expect, or the exit code is 1
python scripts/verify_release.py --local ../kkintent_public \
    --base https://kkmatch.com/v22 --list manifests/files67.txt \
    --expect index.html,hub/index.html,preview/site/index.html
```

`manifests/files67.txt` is the canonical list. `manifests/manifest_local.tsv`
holds `sha256 · bytes · path` for all 67 so you can check a single file without
fetching anything.

Against **production** the same command reports `30 byte-identical` and `37 not
identical` — the 37 are 404s, not divergences, and that is the expected result
(§1). The 37 are the gate, the documents and the screenshots, which are not
published. If that number ever drops below 30, a published file is missing.

`scripts/verify_release.py` prints three numbers, and the assertion is their
combination, not any one of them: **files fetched**, **byte-identical**,
**not identical** (plus the names of the ones that are not). A change is correct
when the non-identical set *equals* the intended set and every other file is
byte-identical. Report only the first number and an unrelated file rides along
unnoticed; report only the second and a file that never uploaded stays invisible.

---

## 6. If you need to reproduce the environment

| Thing | Value |
|---|---|
| Node | `C:/Users/AS/.workbuddy/binaries/node/versions/22.22.2-6/node.exe` |
| `NODE_PATH` | `C:/Users/AS/.workbuddy/binaries/node/workspace/node_modules` |
| Python (paramiko) | `C:/Users/AS/.workbuddy/binaries/python/envs/default/Scripts/python.exe` |
| Python (pure stdlib) | `.../python/versions/3.13.12/python.exe` with `PYTHONPATH=` cleared |
| Browser | `C:/Users/AS/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe` |
| curl | needs `--noproxy '*'`; the machine has a proxy that otherwise intercepts |

Two traps that have cost real time:

* **`PYTHONPATH` is polluted** in this environment and points at a shim that
  breaks the interpreter at startup (`Failed to import encodings module`).
  Always run `PYTHONPATH= python ...`.
* **Git Bash `/tmp` is not visible to Windows Python.** Stage files under
  `C:/Users/AS/AppData/Local/Temp/`. A log written to `/tmp/x.log` and read from
  Python as `/tmp/x.log` produces `FileNotFoundError` even though `cat` shows it.
