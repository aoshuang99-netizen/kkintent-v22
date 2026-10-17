# -*- coding: utf-8 -*-
"""Fetch every file of the package from an origin and hash it.

Used three times per release, always the same way:
  * before a deploy, to establish what the origin actually serves now (the
    baseline is the LIVE tree, never a local copy left over from last round);
  * after a deploy, to prove the bytes arrived;
  * against production as well, to prove the two origins agree.

Writes one line per file to the given TSV:  <sha256>\t<status>\t<bytes>\t<path>

Usage:  python fetch_origin.py <base-url> <file-list> <out.tsv> [--jobs N]
"""
import concurrent.futures as cf
import hashlib
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = sys.argv[1].rstrip("/")
LIST = sys.argv[2]
OUT = sys.argv[3]
JOBS = int(sys.argv[4]) if len(sys.argv) > 4 else 8

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

# An empty ProxyHandler: this shell sets HTTP_PROXY for other work, and a
# verification run that silently goes through a proxy is measuring the proxy.
OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}),
                                     urllib.request.HTTPSHandler(context=CTX))


def one(rel):
    url = BASE + "/" + urllib.parse.quote(rel)
    req = urllib.request.Request(url, headers={"User-Agent": "kkintent-verify/1"})
    try:
        with OPENER.open(req, timeout=45) as r:
            body = r.read()
            return rel, hashlib.sha256(body).hexdigest()[:16], r.status, len(body)
    except urllib.error.HTTPError as e:
        return rel, "-", e.code, 0
    except Exception as e:                                    # noqa: BLE001
        return rel, "-", "ERR " + type(e).__name__, 0

files = [l.strip() for l in open(LIST, encoding="utf-8") if l.strip()]
rows = []
with cf.ThreadPoolExecutor(max_workers=JOBS) as ex:
    for rel, h, st, n in ex.map(one, files):
        rows.append((rel, h, st, n))

with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
    for rel, h, st, n in rows:
        fh.write("%s\t%s\t%s\t%d\n" % (h, st, rel, n))

bad = [r for r in rows if r[2] != 200]
print("%s : %d files, %d ok, %d not-200" % (BASE, len(rows), len(rows) - len(bad), len(bad)))
for r in bad[:12]:
    print("   %-56s %s" % (r[0], r[2]))
