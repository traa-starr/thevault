"""D1b: read tags of files already on the laptop (no downloads); estimate mine vs unknown per folder."""
import collections, concurrent.futures as cf, json, os, re, subprocess

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
MINE = re.compile(r"(?<![a-z0-9])(l1|l1ghtxfluv|mojo|traa)(?![a-z0-9])", re.I)


def tags(f):
    try:
        p = subprocess.run(["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", f["path"]],
                           capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60)
        t = (json.loads(p.stdout or "{}").get("format") or {}).get("tags") or {}
        return {k.lower(): v for k, v in t.items()}
    except Exception:
        return None


inv = json.load(open(os.path.join(OUT, "inventory.json"), encoding="utf-8"))
local = [f for f in inv["files"] if not f["cloud"]]
with cf.ThreadPoolExecutor(8) as ex:
    res = list(ex.map(tags, local))
rows = collections.defaultdict(collections.Counter)
artists = collections.Counter()
for f, t in zip(local, res):
    r = rows[os.path.basename(f["root"])]
    r["local"] += 1
    if t is None:
        r["errors"] += 1
        continue
    f["tags"] = t
    r["has_artist"] += bool(t.get("artist"))
    f["mine_tag"] = bool(MINE.search(" ".join(str(t.get(k, "")) for k in ("artist", "album_artist", "title"))))
    r["mine_tag"] += f["mine_tag"]
    r["mine_any"] += f["mine_tag"] or f["mine_name"]
    if t.get("artist"):
        artists[t["artist"]] += 1
for k, v in rows.items():
    print(k, dict(v))
print("top artists:", artists.most_common(25))
with open(os.path.join(OUT, "inventory.json"), "w", encoding="utf-8") as fh:
    json.dump(inv, fh, indent=0)
