"""D1 inventory. Metadata only by default; --sample N reads tags on the N newest files (downloads cloud-only ones).

python spike/inventory.py --root <folder> [--root <folder>] [--flat <folder>] [--sample 50]
--flat scans only the top level of a folder.
"""
import argparse, collections, json, os, re, stat, subprocess, time

AUDIO = {".wav", ".mp3", ".m4a", ".flac", ".aif", ".aiff"}
MINE = re.compile(r"(?<![a-z0-9])(l1|l1ghtxfluv|mojo|traa)(?![a-z0-9])", re.I)
CLOUD = 0x400000 | 0x1000 | 0x40000  # recall-on-data-access, offline, recall-on-open
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")


def walk(root, flat):
    if flat:
        for e in os.scandir(root):
            if e.is_file():
                yield e.path
        return
    for d, _, names in os.walk(root):
        for n in names:
            yield os.path.join(d, n)


def tags(path):
    p = subprocess.run(["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", path],
                       capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120)
    return (json.loads(p.stdout or "{}").get("format") or {}).get("tags") or {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", action="append", default=[])
    ap.add_argument("--flat", action="append", default=[])
    ap.add_argument("--sample", type=int, default=0)
    a = ap.parse_args()
    files = []
    for root, flat in [(r, False) for r in a.root] + [(r, True) for r in a.flat]:
        for path in walk(root, flat):
            ext = os.path.splitext(path)[1].lower()
            if ext not in AUDIO:
                continue
            st = os.stat(path)
            files.append(dict(path=path, root=root, ext=ext, size=st.st_size, mtime=st.st_mtime, ctime=st.st_ctime,
                              cloud=bool(st.st_file_attributes & CLOUD), mine_name=bool(MINE.search(path))))
    for root in a.root + a.flat:
        fs = [f for f in files if f["root"] == root]
        print(f"\n{os.path.basename(root) or root}: {len(fs)} files, {sum(f['size'] for f in fs)/1e9:.2f} GB, "
              f"{sum(f['cloud'] for f in fs)} cloud-only, {sum(f['mine_name'] for f in fs)} with my name in the path")
        print("  formats:", dict(collections.Counter(f["ext"] for f in fs)))
        print("  by year:", dict(sorted(collections.Counter(time.localtime(f["mtime"]).tm_year for f in fs).items())))
    newest = sorted(files, key=lambda f: -f["mtime"])[:a.sample]
    if a.sample:
        need = sum(f["size"] for f in newest if f["cloud"])
        print(f"\nsample {len(newest)}: will download {need/1e6:.0f} MB of cloud-only files")
        fails = 0
        for f in newest:
            try:
                t = {k.lower(): v for k, v in tags(f["path"]).items()}
                f["tags"] = t
                f["mine_tag"] = bool(MINE.search(" ".join(str(t.get(k, "")) for k in ("artist", "album_artist", "title"))))
            except Exception as exc:
                fails += 1
                f["tag_error"] = repr(exc)
        print(f"  tag read failures: {fails}; any tags: {sum(bool(f.get('tags')) for f in newest)}; "
              f"my name in tags: {sum(bool(f.get('mine_tag')) for f in newest)}; "
              f"tag-only (name not in path): {sum(bool(f.get('mine_tag')) and not f['mine_name'] for f in newest)}")
        print("  artist tags seen:", collections.Counter(f.get("tags", {}).get("artist", "(none)") for f in newest).most_common(12))
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "inventory.json"), "w", encoding="utf-8") as fh:
        json.dump(dict(files=files, sample=[f["path"] for f in newest]), fh, indent=0)
    print(f"\ntotal {len(files)} files; wrote spike/output/inventory.json")


if __name__ == "__main__":
    main()
