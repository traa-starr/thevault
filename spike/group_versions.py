"""D3: suggest version groups by name rule, then compare audio fingerprints on a small sample. Suggest only.

Sample = up to --n files from name groups + newest files. Downloads cloud-only sample files when read.
"""
import argparse, collections, itertools, json, os, re, subprocess, struct

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
TRAIL = re.compile(r"^(.*?)[\s_\-]*(?:\(|v)?(\d{1,2})\)?$", re.I)


def clean(path):
    s = re.sub(r"\.[^.]+$", "", os.path.basename(path))
    return re.sub(r"\s+", " ", re.sub(r"[_]+", " ", s)).strip().lower()


def fingerprint(path):
    p = subprocess.run(["ffmpeg", "-v", "quiet", "-t", "120", "-i", path, "-f", "chromaprint", "-fp_format", "raw", "-"],
                       capture_output=True, timeout=240)
    return list(struct.unpack(f"<{len(p.stdout)//4}I", p.stdout[:len(p.stdout) // 4 * 4]))


def similarity(a, b, max_shift=120):
    """Share of matching fingerprint bits at the best alignment. Unrelated audio sits near 0.5."""
    best = 0.0
    for s in range(-max_shift, max_shift + 1, 2):
        pairs = list(zip(a[max(s, 0):], b[max(-s, 0):]))
        if len(pairs) < 40:
            continue
        best = max(best, 1 - sum(bin(x ^ y).count("1") for x, y in pairs) / (32 * len(pairs)))
    return best


ap = argparse.ArgumentParser()
ap.add_argument("--n", type=int, default=50)
a = ap.parse_args()
inv = json.load(open(os.path.join(OUT, "inventory.json"), encoding="utf-8"))
files = [f for f in inv["files"] if os.path.basename(f["root"]).lower() != "session music" or f.get("mine_tag") or f["mine_name"]]
names = collections.Counter(clean(f["path"]) for f in files)
bases = collections.defaultdict(list)
for f in files:
    c = clean(f["path"])
    m = TRAIL.match(c)
    if m and m.group(1):
        bases[m.group(1).strip()].append(f)
groups = {}
for base, members in bases.items():
    # the rule: strip the number only when another file shares the base
    extra = [f for f in files if clean(f["path"]) == base]
    if len(members) + len(extra) >= 2:
        groups[base] = members + extra
same = {k: [f for f in files if clean(f["path"]) == k] for k, v in names.items() if v > 1}
kept = sum(1 for f in files if TRAIL.match(clean(f["path"])) and TRAIL.match(clean(f["path"])).group(1).strip() not in groups)
print(f"files {len(files)}; number-suffix groups {len(groups)} covering {sum(len(v) for v in groups.values())}; "
      f"identical-name sets {len(same)}; numbered but left alone {kept}")
print("largest:", [(k, len(v)) for k, v in sorted(groups.items(), key=lambda kv: -len(kv[1]))[:10]])

picked, seen = [], set()
for base, members in sorted(groups.items(), key=lambda kv: -len(kv[1])):
    for f in members[:4]:
        if f["path"] not in seen and len(picked) < a.n * 3 // 5:
            picked.append(f)
            seen.add(f["path"])
for f in sorted(files, key=lambda f: -f["mtime"]):
    if len(picked) >= a.n:
        break
    if f["path"] not in seen:
        picked.append(f)
        seen.add(f["path"])
print(f"fingerprint sample {len(picked)}; download needed {sum(f['size'] for f in picked if f['cloud'])/1e6:.0f} MB")
fps = {}
for f in picked:
    try:
        fp = fingerprint(f["path"])
        if fp:
            fps[f["path"]] = fp
    except Exception as exc:
        print("  skip:", os.path.basename(f["path"]), repr(exc)[:80])
print(f"fingerprinted {len(fps)}")
base_of = {f["path"]: b for b, ms in groups.items() for f in ms}
same_sc, diff_sc, rows = [], [], []
for x, y in itertools.combinations(fps, 2):
    sc = similarity(fps[x], fps[y])
    named = base_of.get(x) is not None and base_of.get(x) == base_of.get(y)
    (same_sc if named else diff_sc).append(sc)
    rows.append(dict(a=x, b=y, score=round(sc, 3), same_name_group=named))
rows.sort(key=lambda r: -r["score"])


def show(lab, v):
    v = sorted(v)
    if v:
        print(f"{lab}: n={len(v)} min={v[0]:.2f} median={v[len(v)//2]:.2f} max={v[-1]:.2f}")


show("same name group", same_sc)
show("different name", diff_sc)
for t in (0.6, 0.65, 0.7, 0.8):
    print(f"  score>={t}: same-name {sum(s >= t for s in same_sc)}/{len(same_sc)}, different-name {sum(s >= t for s in diff_sc)}/{len(diff_sc)}")
print("top different-name pairs (versions the name rule misses, or false alarms):")
for r in [r for r in rows if not r["same_name_group"]][:8]:
    print(f"  {r['score']}  {os.path.basename(r['a'])} <> {os.path.basename(r['b'])}")
print("lowest same-name pairs (name rule may be wrong):")
for r in [r for r in rows if r["same_name_group"]][-6:]:
    print(f"  {r['score']}  {os.path.basename(r['a'])} <> {os.path.basename(r['b'])}")
with open(os.path.join(OUT, "fingerprints.json"), "w", encoding="utf-8") as fh:
    json.dump(rows, fh, indent=0)
