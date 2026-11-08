"""The laptop options on the same fake library as bench.mjs (run that first):  python spike/search/bench.py

B. Laptop, Python: the same ladder ported line for line (rank.mjs), answers checked against the JS ones.
C. SQLite FTS5 (the option not asked about): the database's own full-text index finds the candidates, the ladder ranks
   them. The same SQLite is in expo-sqlite, so this could also run on the phone, at the cost of a native module.
Plus a round trip through a real local HTTP server, to show what serving a search costs before the network.
"""
import http.client
import json
import math
import re
import sqlite3
import statistics
import sys
import tempfile
import threading
import time
import unicodedata
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, unquote

OUT = Path(__file__).resolve().parent.parent / "output" / "search"
VOWEL = re.compile(r"[aeiouy]")
SPLIT = re.compile(r"[^\w]+|_")


def words(text):
    t = unicodedata.normalize("NFKD", text.lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"['’`]", "", t)
    return [w for w in SPLIT.split(t) if w]


def stem(word):
    w = word
    if len(w) <= 3 or w.isdigit():
        return w
    if w.endswith("ing") and len(w) >= 5:
        w = w[:-3]
    elif w.endswith("in") and len(w) >= 5 and VOWEL.search(w[:-2]):
        w = w[:-2]
    elif w.endswith("ed") and len(w) >= 5:
        w = w[:-2]
    elif w.endswith("es") and len(w) >= 5 and re.search(r"(ss|sh|ch|x|z)es$", w):
        w = w[:-2]
    elif (w.endswith("s") or w.endswith("z")) and not w.endswith("ss") and len(w) >= 4:
        w = w[:-1]
    if w == word and w.endswith("e") and not w.endswith("ee") and len(w) >= 4:
        w = w[:-1]
    if len(w) >= 3 and w[-1] == w[-2] and not VOWEL.match(w[-1]):
        w = w[:-1]
    return w


def stems(text):
    return [stem(w) for w in words(text)]


def build(tags):
    items = [(t, stems(t["text"])) for t in tags]
    holders = {}
    for i, (_, st) in enumerate(items):
        for s in set(st):
            holders.setdefault(s, []).append(i)
    return {"items": items, "holders": holders, "n": len(items)}


def weight(index, s):
    return math.log(1 + index["n"] / (1 + len(index["holders"].get(s, ())))) + 0.05


def has_phrase(hay, needle):
    k = len(needle)
    return any(hay[i:i + k] == needle for i in range(len(hay) - k + 1)) if k else False


def in_order(hay, needle):
    at = 0
    for s in hay:
        if at < len(needle) and s == needle[at]:
            at += 1
            if at == len(needle):
                return True
    return not needle


def judge(index, item_stems, query):
    held = set(item_stems)
    unique = list(dict.fromkeys(query))
    got = total = 0.0
    for s in unique:
        w = weight(index, s)
        total += w
        if s in held:
            got += w
    if not all(s in held for s in unique):
        tier = 1
    else:
        tier = 4 if has_phrase(item_stems, query) else 3 if in_order(item_stems, query) else 2
    return tier, (got / total if total else 0)


def rank(index, candidates, query, limit=20):
    out = []
    for i in candidates:
        tag, st = index["items"][i]
        tier, score = judge(index, st, query)
        out.append((-tier, -score, len(st), tag["at_sec"], tag["id"]))
    out.sort(key=lambda r: r[:4])
    return [r[4] for r in out[:limit]]


def search(index, text, limit=20):
    query = stems(text)
    if not query:
        return []
    seen = set()
    for s in set(query):
        seen.update(index["holders"].get(s, ()))
    return rank(index, seen, query, limit)


def fts_db(tags, index, path):
    """C: an FTS5 table of each tag's stems (so slang endings still meet), row id = the tag's place in the list."""
    conn = sqlite3.connect(path)
    conn.execute("CREATE VIRTUAL TABLE t USING fts5(stems, tokenize='unicode61')")
    conn.executemany("INSERT INTO t(rowid, stems) VALUES (?, ?)", ((i, " ".join(st)) for i, (_, st) in enumerate(index["items"])))
    conn.commit()
    return conn


def fts_search(conn, index, text, limit=20):
    query = stems(text)
    if not query:
        return []
    match = " OR ".join('"' + s.replace('"', '""') + '"' for s in dict.fromkeys(query))
    rows = conn.execute("SELECT rowid FROM t WHERE t MATCH ?", (match,)).fetchall()
    return rank(index, (r[0] for r in rows), query, limit)


def timed(fn, searches):
    for q in searches[:20]:
        fn(q)
    times, answers = [], {}
    for q in searches:
        t = time.perf_counter()
        answers[q] = fn(q)
        times.append((time.perf_counter() - t) * 1000)
    times.sort()
    pct = lambda p: round(times[min(len(times) - 1, int(p / 100 * len(times)))], 2)
    return {"search_median_ms": pct(50), "search_p95_ms": pct(95), "search_max_ms": round(times[-1], 2)}, answers


def main():
    tags = json.loads((OUT / "fake-tags.json").read_text(encoding="utf-8"))
    searches = json.loads((OUT / "searches.json").read_text(encoding="utf-8"))
    js = json.loads((OUT / "answers-js.json").read_text(encoding="utf-8"))
    results = {}

    t = time.perf_counter()
    index = build(tags)
    build_ms = (time.perf_counter() - t) * 1000
    stats, answers = timed(lambda q: search(index, q), searches)
    same = sum(answers[q] == js[q] for q in searches)
    results["B laptop, Python"] = {"build_ms": round(build_ms, 1), **stats, "same_answers_as_js": f"{same}/{len(searches)}"}

    db = Path(tempfile.mkdtemp(prefix="vault-fts-")) / "fts.db"
    t = time.perf_counter()
    conn = fts_db(tags, index, db)
    fts_build = (time.perf_counter() - t) * 1000
    stats, answers = timed(lambda q: fts_search(conn, index, q), searches)
    same = sum(answers[q] == js[q] for q in searches)
    results["C SQLite FTS5 + ladder"] = {"build_ms": round(fts_build, 1), "db_mb": round(db.stat().st_size / 1e6, 2), **stats,
                                         "same_answers_as_js": f"{same}/{len(searches)}"}
    conn.close()

    # one search served over HTTP on this laptop: the cost before Tailscale's own trip to the phone
    class H(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def do_GET(self):
            body = json.dumps({"ids": search(index, unquote(self.path[3:]))}).encode()
            self.send_response(200)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *a):
            pass

    srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    c = http.client.HTTPConnection("127.0.0.1", srv.server_port)

    def over_http(q):
        c.request("GET", "/q/" + quote(q))
        return json.loads(c.getresponse().read())["ids"]

    stats, answers = timed(over_http, searches)
    results["B laptop, Python, through local HTTP (no network yet)"] = stats
    srv.shutdown()

    print(json.dumps(results, indent=2))
    (OUT / "bench-py.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
