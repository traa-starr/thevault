"""D2: propose bounce -> .flp matches by time and name. Reads inventory.json.

python spike/match_flp.py --projects <FL projects folder>
Name matches are the only ground truth here, so they measure how well time alone does.
"""
import argparse, bisect, collections, json, os, re, statistics as st

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
MIN = 60
HOUR = 3600


def norm(s):
    s = re.sub(r"\.[^.]+$", "", s.lower())
    s = re.sub(r"[\s_\-()\[\]]+", " ", s).strip()
    return re.sub(r"(?: v?\d+| master| mix| final| bounce)+$", "", s).strip()


ap = argparse.ArgumentParser()
ap.add_argument("--projects", required=True)
a = ap.parse_args()

main, backup = [], []
for d, _, names in os.walk(a.projects):
    for n in names:
        if n.lower().endswith(".flp"):
            p = os.path.join(d, n)
            rec = dict(path=p, stem=norm(n), folder=norm(os.path.basename(d) + ".x"), mtime=os.path.getmtime(p), ctime=os.path.getctime(p))
            (backup if "backup" in p.lower().split(os.sep) else main).append(rec)
main.sort(key=lambda r: r["mtime"])
backup.sort(key=lambda r: r["mtime"])
times = [r["mtime"] for r in main]
btimes = [r["mtime"] for r in backup]
print(f"flp: {len(main)} projects, {len(backup)} in Backup")
print("flp by year:", dict(sorted(collections.Counter(__import__('time').localtime(t).tm_year for t in times).items())))
print("generic names (project/untitled):", sum(bool(re.match(r"(project|untitled|new project)\b", r["stem"])) for r in main))

inv = json.load(open(os.path.join(OUT, "inventory.json"), encoding="utf-8"))
bounces = [f for f in inv["files"] if os.path.basename(f["root"]).lower() != "session music" or f.get("mine_tag") or f["mine_name"]]
by_stem = collections.defaultdict(list)
for r in main:
    by_stem[r["stem"]].append(r)
    if r["folder"] != r["stem"]:
        by_stem[r["folder"]].append(r)


def near(t, ts, recs):
    i = bisect.bisect_left(ts, t)
    c = [recs[j] for j in (i - 1, i) if 0 <= j < len(recs)]
    return min(c, key=lambda r: abs(r["mtime"] - t)) if c else None


deltas, named, rank1, named_d, tiers, rows = [], 0, 0, [], collections.Counter(), []
crowd = []
for b in bounces:
    t = b["mtime"]
    n = near(t, times, main)
    d = abs(n["mtime"] - t) if n else 1e12
    nb = near(t, btimes, backup)
    db = abs(nb["mtime"] - t) if nb else 1e12
    cand = bisect.bisect_right(times, t + HOUR) - bisect.bisect_left(times, t - HOUR)
    crowd.append(cand)
    deltas.append(d)
    nm = by_stem.get(norm(os.path.basename(b["path"])), [])
    if nm:
        named += 1
        best = min(nm, key=lambda r: abs(r["mtime"] - t))
        gap = abs(best["mtime"] - t)
        named_d.append(gap)
        rank1 += bool(n and n["path"] == best["path"])
    if nm and min(abs(r["mtime"] - t) for r in nm) < 7 * 24 * HOUR:
        tier = "high: name + within a week"
    elif nm:
        tier = "medium: name only, far in time"
    elif d < 15 * MIN and cand == 1:
        tier = "medium: one project within 15 min"
    elif d < HOUR:
        tier = "low: time only, within 1h"
    elif min(d, db) < 24 * HOUR:
        tier = "very low: within 24h"
    else:
        tier = "none"
    tiers[tier] += 1
    rows.append(dict(bounce=b["path"], tier=tier, nearest=n and n["path"], delta_min=round(d / 60, 1), name_matches=[r["path"] for r in nm][:3]))

N = len(bounces)
print(f"\nbounces considered: {N}")
for lim, lab in ((5 * MIN, "5 min"), (15 * MIN, "15 min"), (HOUR, "1 h"), (6 * HOUR, "6 h"), (24 * HOUR, "24 h")):
    print(f"  nearest project within {lab}: {sum(d < lim for d in deltas)} ({100*sum(d < lim for d in deltas)//max(N,1)}%)")
print(f"  median gap: {st.median(deltas)/3600:.1f} h; of those within 1h, median candidates in the +/-1h window: "
      f"{st.median([c for c in crowd if c] or [0])}")
print(f"name match: {named} ({100*named//max(N,1)}%)")
if named:
    print(f"  time alone picks the same project: {rank1} ({100*rank1//named}%); median gap for named: {st.median(named_d)/3600:.1f} h")
print("tiers:", dict(tiers.most_common()))


def batches(ts, label):
    c = collections.Counter(int(t // MIN) for t in ts)
    hit = sum(v for v in c.values() if v >= 5)
    print(f"timestamp trust, {label}: {hit}/{len(ts)} share a minute with 5+ others (bulk copy sign); top {c.most_common(3)}")


batches([b["mtime"] for b in bounces], "bounce modified")
batches([b["ctime"] for b in bounces], "bounce created")
batches(times, "flp modified")
batches([r["ctime"] for r in main], "flp created")
print("bounces created after modified by >1 day (sync/copy sign):", sum(b["ctime"] - b["mtime"] > 24 * HOUR for b in bounces))
with open(os.path.join(OUT, "matches.json"), "w", encoding="utf-8") as fh:
    json.dump(rows, fh, indent=0)
