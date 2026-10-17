# -*- coding: utf-8 -*-
"""Update README.md + docs/DELIVERY.md for the round-8 shape change.

The rule this script exists for: an upload falsifies every sentence that
describes the state of the upload. Here the change falsifies something worse --
three paragraphs that describe the *structure* (which URL is the hub, which
documents are indexable), and the gate totals. They are edited before the
package is published, not after.

Numbers written here are arithmetic from the code and are verified by the runs
that follow; if a run disagrees, the run wins and the doc is fixed again.
"""
import os

ROOT = r"C:\Users\AS\WorkBuddy\20260420163622\kkintent_public"


def read(rel):
    with open(os.path.join(ROOT, rel), "rb") as fh:
        raw = fh.read()
    assert raw.count(b"\r") == 0, rel + ": not pure LF"
    return raw.decode("utf-8")


def write(rel, s):
    data = s.encode("utf-8")
    assert data.count(b"\r") == 0
    with open(os.path.join(ROOT, rel), "wb") as fh:
        fh.write(data)
    print("write %-22s %6d B" % (rel, len(data)))


def sub1(t, old, new, where):
    n = t.count(old)
    assert n == 1, "%s: %d matches, expected 1:\n%r" % (where, n, old[:120])
    return t.replace(old, new)


# =============================================================== README.md ==
r = read("README.md")

r = sub1(
    r,
    """| `https://kkmatch.com/v22/` | the hub |
| `https://kkmatch.com/v22/preview/intent/anticipate/` | **Intent OS** (main line) |""",
    """| `https://kkmatch.com/v22/` | the door — forwards to the intent field |
| `https://kkmatch.com/v22/hub/` | the hub: two concept cards, the ruling, the reference audit |
| `https://kkmatch.com/v22/preview/intent/anticipate/` | **Intent OS** (main line) |""",
    "README live table: hub rows",
)

r = sub1(
    r,
    "| `https://kkmatch-gcai-preview.app.workbuddy.host/` | the same content, re-synced 2026-10-17 — **all 66 files byte-identical** to this package, `docs/` and `e2e/` included |",
    "| `https://kkmatch-gcai-preview.app.workbuddy.host/` | the same content, re-synced 2026-10-17 — **all 67 files byte-identical** to this package, `docs/` and `e2e/` included |",
    "README live table: share link",
)

r = sub1(
    r,
    """**Openly indexable since round 6.** Every document declares
`<meta name="robots" content="index, follow">` and a self-referential
`<link rel="canonical">` pointing at its own clean URL (no query), and
`sitemap.xml` lists all four.""",
    """**Openly indexable since round 6 — except the door.** The four documents that
carry content declare `<meta name="robots" content="index, follow">` and a
self-referential `<link rel="canonical">` pointing at their own clean URL (no
query); `sitemap.xml` lists those four at their own paths.

The root is not one of them. Since round 8 it is a **forwarding page**, and it
says so: `noindex, follow`, and **no canonical at all**. A page that navigates
away in the same tick has nothing to rank, and a canonical on it would enter it
into the same URL as the page it opens. That is a *policy per document*, not one
policy plus an exception: `seo` carries the expected robots value and the
expected canonical on each row — including the row that expects no canonical —
and compares the served bytes against that row in both directions.

The consequence is that `/v22/` itself leaves the sitemap and `/v22/hub/` enters
it. Keeping the old entry would have produced exactly the contradiction the
section below forbids: a URL submitted for indexing whose document says
`noindex`.""",
    "README index policy",
)

r = sub1(
    r,
    """Start at `index.html` — it is the hub: the two concept cards, the ruling on which
one is the product, and the audit of the five reference sites.""",
    """`index.html` is a door: open it and you land on the intent field. The hub —
the two concept cards, the ruling on which one is the product, and the audit of
the five reference sites — is `hub/index.html`, and every preview page links back
to it.""",
    "README start-here",
)

r = sub1(
    r,
    """Last run: **573 / 573 PASS · 0 FAIL · 0 UNSUPPORTED · 33 INFO**, 21 sections,
**against `https://kkmatch.com/v22`**, across three device tiers (phone
320/390/430 · tablet 768/834/1024 · desktop 1280/1440). That is the round-6
total of 537 plus the 16 `nav` and 20 `navclosure` assertions, minus the 2
`shots` assertions this machine cannot run (`DELIVERY.md` §11.12);
537 + 16 + 20 = 573 executed of 575 declared.""",
    """Last run: **587 / 587 PASS · 0 FAIL · 0 UNSUPPORTED · 33 INFO**, 20 sections,
**against `https://kkmatch.com/v22`**, across three device tiers (phone
320/390/430 · tablet 768/834/1024 · desktop 1280/1440). 589 are declared; the 2
`shots` assertions are the only ones this machine cannot run (`DELIVERY.md`
§11.12), so 587 execute.

Round 8 changed the totals in three places and nowhere else: `hub` grew by the
eight assertions that measure the door itself (`hub` 18 → 26), `seo` went from
four documents to five (`seo` 32 → 35, because the door's row drops the
"exactly one canonical" assertion and gains "no canonical, and the policy is the
opposite one"), and `navclosure` split one either/or into two independent claims
(`navclosure` 20 → 23). 575 + 8 + 3 + 3 = 589. The INFO total did not move — 33
again — which is the check that none of the three edits quietly turned a measured
value into a verdict.""",
    "README gate totals",
)

r = sub1(
    r,
    """```
index.html                  the hub
preview/intent/anticipate/  Intent OS""",
    """```
index.html                  the door (forwards to concept S)
hub/index.html              the hub
preview/intent/anticipate/  Intent OS""",
    "README layout",
)

r = sub1(
    r,
    """* **A local static server is not a weaker production, it is a different one.**""",
    """* **A URL is part of the contract, so moving one is a change to the product.**
  Round 8 made `/` forward to concept S and moved the hub to `/hub/`. Four HTML
  files, one dictionary and the gate had to move together, because "back to the
  hub" was written as `../../../` (a claim about depth) in two of them and as
  `../../` in the third — the same intent, three different strings, all of which
  suddenly pointed at the wrong place. Moving the hub without moving them would
  have produced a page that links to itself.
* **A page that navigates away is not a page.** The root carries
  `noindex, follow`, no canonical, no stylesheet, no external script, and it
  forwards `?lang=` verbatim — because `i18n.js` reads that query once, on the
  page that finally renders, so a door that drops it silently forces the default
  language on a reviewer who was handed a Chinese link. Three separate
  assertions, because they fail for three unrelated reasons.
* **A relative path is not a destination until it is resolved.** Round 8 moved
  one directory and `hub.linksToSite` — which compared hrefs to the literal
  `'preview/site/'` — would have failed while the link stayed correct. The
  assertion now resolves against the document and compares absolute URLs.
* **A local static server is not a weaker production, it is a different one.**""",
    "README standing rules",
)

write("README.md", r)

# ========================================================== docs/DELIVERY.md ==
d = read("docs/DELIVERY.md")

d = sub1(
    d,
    "2026-10-16 · **Round 5** — the interface is English by default,",
    """2026-10-17 · **Round 8** — the root of the preview stopped being the hub.
`/v22/` now forwards to concept S (the intent field), and the three-surface hub
moved, unchanged, to `/v22/hub/`. Nothing was deleted: the hub is one click from
every preview page, and every page gained a direct route back to kkmatch.com.
2026-10-16 · **Round 5** — the interface is English by default,""",
    "DELIVERY header",
)

d = sub1(
    d,
    """* Gate result round 6: **537 / 537 PASS, 0 FAIL, 0 UNSUPPORTED, 33 INFO** — the""",
    """* **Round 8 ruling:** the preview opens on **concept S**, not on the hub. The
  request was one line — *"I need the version that opens on 先觉之境"* — and it
  was resolved as *root path goes straight there, hub preserved at `/hub/`*
  rather than by renaming the concept or only changing the default language.
  The door is `noindex, follow` with no canonical, forwards `?lang=` verbatim,
  and uses `location.replace` so Back does not bounce the reader into the hop
  again. Twelve files moved together (four HTML, one dictionary, the gate, the
  sitemap, five documents); §11.18 records why moving the hub alone would have
  produced a page that links to itself.
* Gate result round 8: **587 executed / 589 declared, 0 FAIL, 0 UNSUPPORTED,
  33 INFO, 20 sections, against `https://kkmatch.com/v22`**. The two declared
  but unrun are `shots` (§11.12). Round 7's 575 became 589 by three changes and
  no others: `hub` 18 → 26 (the door), `seo` 32 → 35 (five documents instead of
  four, and one assertion replaced by a two-direction one), `navclosure` 20 → 23
  (one either/or split into two claims). The INFO total is **33 again**, which
  is what says none of the three edits turned a measured value into a verdict.
* Gate result round 6: **537 / 537 PASS, 0 FAIL, 0 UNSUPPORTED, 33 INFO** — the""",
    "DELIVERY round-8 bullet",
)

d = sub1(
    d,
    """**575 assertions in 21 sections**, 33 of them INFO records (measured values, not
pass/fail). Round 5 ran the 18-section version against `https://kkmatch.com/v22`,
not a local copy. Round 6 adds the `seo` section, which **must** be run against a
served origin: it reads the response headers, and a source tree has none. The
round-6 follow-up adds `nav`, which is **production-only** by construction — it
guards the homepage entry into `/v22/`, and the homepage is not part of this
package — and reports UNSUPPORTED everywhere else rather than inventing a pass.
Round 7 adds `navclosure`: every surface must be leavable without the browser's
Back button.

Of the 575, 573 were executed **on production this round** — the two `shots`
assertions could not run here, and §11.12 says why rather than counting them as
a pass. The round-6 run of the same assertions happened on a local
`python -m http.server`; §11.16 records what that origin cannot measure.

**The same sections were also run against the share-link origin on 2026-10-17**,
after the upload, so that "the share link matches" is a measurement and not a
claim. `seo` and `nav` are skipped there by construction — the share link has no
nginx headers to read, and the homepage is not part of this package — and `shots`
still cannot run, so 575 − 32 − 16 − 2 = **525 assertions, 525 PASS, 0 FAIL,
33 INFO**. The INFO total being *identical* to production's is the point: the two
origins produce the same measured values, not merely the same verdicts.""",
    """**589 assertions in 20 sections**, 33 of them INFO records (measured values, not
pass/fail). Round 5 ran the 18-section version against `https://kkmatch.com/v22`,
not a local copy. Round 6 adds the `seo` section, which **must** be run against a
served origin: it reads the response headers, and a source tree has none. The
round-6 follow-up adds `nav`, which is **production-only** by construction — it
guards the homepage entry into `/v22/`, and the homepage is not part of this
package — and reports UNSUPPORTED everywhere else rather than inventing a pass.
Round 7 adds `navclosure`: every surface must be leavable without the browser's
Back button. Round 8 adds no section: the door is measured inside `hub`, because
a section of its own would have made "the run is green" depend on remembering to
pass one more name on the command line.

Of the 589, 587 were executed **on production this round** — the two `shots`
assertions could not run here, and §11.12 says why rather than counting them as
a pass. The round-6 run of the same assertions happened on a local
`python -m http.server`; §11.16 records what that origin cannot measure.

**The same sections were also run against the share-link origin on 2026-10-17**,
after the upload, so that "the share link matches" is a measurement and not a
claim. `seo` and `nav` are skipped there by construction — the share link has no
nginx headers to read, and the homepage is not part of this package — and `shots`
still cannot run, so 589 − 35 − 16 − 2 = **536 assertions, 536 PASS, 0 FAIL,
33 INFO**. The INFO total being *identical* to production's is the point: the two
origins produce the same measured values, not merely the same verdicts.

Row counts below are what each section reported, not a partition of the total:
the `n` and `s` families are counted again in the two mobile rows, so the column
does not add up to 589 and never did.""",
    "DELIVERY section-6 intro",
)

d = sub1(
    d,
    "| `hub` | 20 | one direction chosen and one frozen,",
    "| `hub` | 26 | **the root is a door**: it lands on concept S · it carries `?lang=zh-CN` and `?lang=en-US` across the hop and the landed page really is in that language · Back returns to where the reader came from, not into the hop again · with scripting off the `<noscript>` refresh still hops, and the door's own control is a ≥44px box that leads to something which answers · one direction chosen and one frozen,",
    "DELIVERY hub row",
)

d = sub1(
    d,
    "| `seo` | 32 | (4 documents × 8) **the index policy the origin actually serves** — per document: exactly one `<meta name=\"robots\">`, its value **exactly** `index, follow` (a positive assertion, so quietly *losing* the tag fails the same way as keeping `noindex`) · exactly one self-referential `<link rel=\"canonical\">` pointing at that document's own **clean** URL with the query stripped · **zero `noindex` / `nofollow` / `noarchive` in the served bytes and in the served headers** · a non-empty `<title>` and `<meta name=\"description\">` · the sitemap lists the URL and its directive does not contradict it |",
    "| `seo` | 35 | (5 documents × 7) **the index policy the origin actually serves**, where the policy is data on each row rather than a literal in the assertion — per document: exactly one `<meta name=\"robots\">` whose value **equals the one that document declares**, and a `<link rel=\"canonical\">` that equals the one it declares **in both directions** (the four content documents declare a clean self URL and must carry exactly one; the door declares `null` and must carry none) · the presence of an invisible directive **equals** the declared policy, so an indexable page that gains `noindex` and a door that loses it fail the same assertion, for opposite reasons · **no `X-Robots-Tag` in the served headers** · a non-empty `<title>` and `<meta name=\"description\">`. Round 8 rewrote this row set because a single hardcoded `index, follow` could only ever test one of the two policies |",
    "DELIVERY seo row",
)

d = sub1(
    d,
    "| `navclosure` | 20 | (4 documents × 5) **each surface can be left without the browser's Back button**",
    "| `navclosure` | 23 | (4 documents × 5, plus 3) **each surface can be left without the browser's Back button**",
    "DELIVERY navclosure row count",
)

d = sub1(
    d,
    """· the three surfaces each reach the hub, and the hub reaches `kkmatch.com`. Written after round 6 shipped `anticipate` and `compile` with exactly one anchor each — the skip link — so a reader arriving from the homepage could only escape with Back (§11.17) |""",
    """· **every surface reaches `kkmatch.com`**, and **every surface except the hub reaches the hub** — two independent claims since round 8, because the root now lands on `anticipate`: a page that can reach the product but not the hub, or the hub but not the product, has to fail something. Written after round 6 shipped `anticipate` and `compile` with exactly one anchor each — the skip link — so a reader arriving from the homepage could only escape with Back (§11.17) |""",
    "DELIVERY navclosure row text",
)

write("docs/DELIVERY.md", d)
print("OK")
