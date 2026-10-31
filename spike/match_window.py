"""D2b: match results only for bounces newer than the oldest project on disk."""
import argparse, bisect, json, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
ap = argparse.ArgumentParser()
ap.add_argument("--projects", required=True)
a = ap.parse_args()
main, backup = [], []
for d, _, names in os.walk(a.projects):
    for n in names:
        if n.lower().endswith(".flp"):
            p = os.path.join(d, n)
            (backup if "backup" in p.lower().split(os.sep) else main).append(os.path.getmtime(p))
main.sort(); backup.sort()
every = sorted(main + backup)
inv = json.load(open(os.path.join(OUT, "inventory.json"), encoding="utf-8"))
b = [f for f in inv["files"] if os.path.basename(f["root"]).lower() != "session music" or f.get("mine_tag") or f["mine_name"]]
start = every[0]
inw = [f for f in b if f["mtime"] >= start]
print(f"bounces in project-era: {len(inw)} of {len(b)}; older with no possible project: {len(b)-len(inw)}")


def gap(t, ts):
    i = bisect.bisect_left(ts, t)
    return min(abs(ts[j] - t) for j in (i - 1, i) if 0 <= j < len(ts))


for lab, ts in (("saved projects only", main), ("projects + autosaves", every)):
    g = [gap(f["mtime"], ts) for f in inw]
    print(lab, {m: f"{100*sum(x < m*60 for x in g)//len(g)}%" for m in (5, 15, 60, 360, 1440)})
