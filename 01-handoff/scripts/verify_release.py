#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""verify_release.py — prove a deployed tree equals the local one, both ways.

The two numbers that matter are reported together, always:

    identical : how many files are byte-for-byte the same   (nothing was broken)
    different : which files differ, and is that set exactly  (only the intended
                the set you meant to change                  files moved)

Reporting only the first is how an unrelated file gets carried along. Reporting
only the second is how a file silently fails to upload.

Usage
-----
  python verify_release.py --local DIR --base URL --list FILES.txt \
                           [--expect A,B,C]      # exact paths allowed to differ
                           [--baseline OLD.tsv]  # compare against a saved run

  --list        one relative path per line (the canonical file list)
  --expect      comma-separated relative paths that are ALLOWED to differ or to
                be new. If given, the difference set must equal it exactly.
  --baseline    a TSV written by a previous run (sha, status, path, bytes); the
                current origin is re-fetched and compared against it, which is
                what "the baseline is the live tree, not a local copy" means.

Exit code: 0 when the difference set equals --expect (or when --expect is
omitted and nothing differs), 1 otherwise. A tool that cannot fail is not a
check.
"""
import argparse
import concurrent.futures as cf
import hashlib
import os
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def opener():
    # An empty ProxyHandler: this shell sets HTTP_PROXY for other work, and a
    # verification that silently goes through a proxy measures the proxy.
    return urllib.request.build_opener(urllib.request.ProxyHandler({}),
                                       urllib.request.HTTPSHandler(context=CTX))


def fetch_one(base, rel):
    url = base.rstrip("/") + "/" + urllib.parse.quote(rel)
    req = urllib.request.Request(url, headers={"User-Agent": "kkintent-verify/1"})
    try:
        with opener().open(req, timeout=45) as r:
            body = r.read()
            return rel, hashlib.sha256(body).hexdigest(), r.status, len(body)
    except urllib.error.HTTPError as e:
        return rel, "", e.code, 0
    except Exception as e:                                   # noqa: BLE001
        return rel, "", "ERR:" + type(e).__name__, 0


def fetch_all(base, files, jobs=8):
    out = {}
    with cf.ThreadPoolExecutor(max_workers=jobs) as ex:
        for rel, h, st, n in ex.map(lambda r: fetch_one(base, r), files):
            out[rel] = (h, st, n)
    return out


def sha_local(root, rel):
    with open(os.path.join(root, rel.replace("/", os.sep)), "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--local", required=True)
    ap.add_argument("--base", required=True)
    ap.add_argument("--list", required=True)
    ap.add_argument("--expect", default="")
    ap.add_argument("--baseline", default="")
    ap.add_argument("--jobs", type=int, default=8)
    a = ap.parse_args()

    files = [l.strip() for l in open(a.list, encoding="utf-8") if l.strip()]
    served = fetch_all(a.base, files, a.jobs)

    rows = []
    for rel in files:
        h, st, n = served[rel]
        if st != 200:
            rows.append((rel, "MISSING(%s)" % st))
            continue
        try:
            lh = sha_local(a.local, rel)
        except FileNotFoundError:
            rows.append((rel, "NOT-LOCAL"))
            continue
        rows.append((rel, "SAME" if lh == h else "DIFF"))

    same = [r for r, v in rows if v == "SAME"]
    bad = [(r, v) for r, v in rows if v != "SAME"]

    print("%-46s %s" % ("origin", a.base))
    print("%-46s %d" % ("files fetched", len(files)))
    print("%-46s %d" % ("byte-identical", len(same)))
    print("%-46s %d" % ("not identical", len(bad)))
    for r, v in bad:
        print("     %-12s %s" % (v, r))

    if a.baseline:
        base = {}
        for line in open(a.baseline, encoding="utf-8"):
            parts = line.rstrip("\n").split("\t")
            if len(parts) == 4 and parts[1] == "200":
                base[parts[2]] = parts[0]
        changed = [r for r in base if served.get(r, ("", 0, 0))[0] != base[r]]
        new = [r for r in files if r not in base]
        print("%-46s %d" % ("baseline: unchanged", len(base) - len(changed)))
        print("%-46s %d %s" % ("baseline: changed", len(changed), sorted(changed)))
        print("%-46s %d %s" % ("baseline: new", len(new), sorted(new)))
        if a.expect:
            want = set(p.strip() for p in a.expect.split(",") if p.strip())
            got = set(changed) | set(new)
            ok = got == want
            print("%-46s %s" % ("difference set == expected", ok))
            if not ok:
                print("     extra   :", sorted(got - want))
                print("     missing :", sorted(want - got))
            return 0 if ok else 1
        return 0

    if a.expect:
        want = set(p.strip() for p in a.expect.split(",") if p.strip())
        got = set(r for r, v in bad)
        ok = got == want
        print("%-46s %s" % ("difference set == expected", ok))
        if not ok:
            print("     extra   :", sorted(got - want))
            print("     missing :", sorted(want - got))
        return 0 if ok else 1

    return 0 if not bad else 1


if __name__ == "__main__":
    sys.exit(main())
