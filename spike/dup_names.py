"""Duplicate-names report. Names, sizes and dates only: never opens a file, so cloud-only files are not downloaded.

python spike/dup_names.py --root <folder> [--root <folder>] [--flat <folder>]
--flat lists only the top level of a folder (loose files). Writes spike/output/duplicate-names.md and names.json.
"""
import argparse, collections, json, os, re, time

AUDIO = {".wav", ".mp3", ".m4a", ".flac", ".aif", ".aiff"}
# a name that is only a date: 2025-03-14, 20250314, 3-14-25, 14.03.2025, optionally with a time after it
DATE_ONLY = re.compile(r"^\d{4}[-_. ]\d{1,2}[-_. ]\d{1,2}([-_. T]+\d{1,2}[-_.:]?\d{2}([-_.:]?\d{2})?)?$"
                       r"|^\d{8}([-_ ]\d{4,6})?$"
                       r"|^\d{1,2}[-_. ]\d{1,2}[-_. ]\d{2,4}([-_. ]+\d{1,2}[-_.:]?\d{2}([-_.:]?\d{2})?)?$")
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


def fmt_size(n):
    return f"{n/1e6:.1f} MB" if n >= 1e6 else f"{n/1e3:.0f} KB"


def line(f):
    day = time.strftime("%Y-%m-%d", time.localtime(f["mtime"]))
    return f"  - `{f['folder']}` / {f['name']}: {fmt_size(f['size'])}, {day}"


def classify(group):
    """1 same name + ending, different size; 2 same name + ending + size; 3 only the ending differs."""
    by_ext = collections.defaultdict(list)
    for f in group:
        by_ext[f["ext"]].append(f)
    pairs = [fs for fs in by_ext.values() if len(fs) > 1]
    if any(len({f["size"] for f in fs}) > 1 for fs in pairs):
        return 1
    if pairs:
        return 2
    return 3


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", action="append", default=[])
    ap.add_argument("--flat", action="append", default=[])
    a = ap.parse_args()
    files = []
    for root, flat in [(r, False) for r in a.root] + [(r, True) for r in a.flat]:
        for path in walk(root, flat):
            stem, ext = os.path.splitext(os.path.basename(path))
            if ext.lower() not in AUDIO:
                continue
            st = os.stat(path)  # metadata only
            rel = os.path.relpath(os.path.dirname(path), os.path.dirname(root.rstrip("\\/")) or root)
            files.append(dict(folder=rel, name=os.path.basename(path), stem=stem, ext=ext.lower(),
                              size=st.st_size, mtime=st.st_mtime))
    groups = collections.defaultdict(list)
    for f in files:
        groups[f["stem"].strip().lower()].append(f)
    dups = {k: v for k, v in groups.items() if len(v) > 1}
    cats = {1: [], 2: [], 3: []}
    for k, v in sorted(dups.items()):
        cats[classify(v)].append((k, sorted(v, key=lambda f: (f["folder"], f["ext"]))))
    dates = sorted((f for f in files if DATE_ONLY.match(f["stem"].strip())), key=lambda f: (f["folder"], f["name"]))

    titles = {1: "1. Same name, different size (likely different audio)",
              2: "2. Same name and size (likely one file copied)",
              3: "3. Same name, different ending (a bounce and its compressed copy)"}
    md = ["# Duplicate names report", "",
          "Names match ignoring capital letters and file ending. Names, sizes and dates only; no file was opened.", "",
          f"- Audio files scanned: {len(files)}",
          f"- Names used more than once: {len(dups)}"]
    for n in (1, 2, 3):
        md.append(f"  - Group {n}: {len(cats[n])} names, {sum(len(v) for _, v in cats[n])} files")
    md.append(f"- Names that are only a date: {len(dates)} files")
    md.append("")
    for n in (1, 2, 3):
        md += [f"## {titles[n]}", ""]
        if not cats[n]:
            md += ["None.", ""]
        for k, v in cats[n]:
            md.append(f"**{v[0]['stem']}** ({len(v)} files)")
            md += [line(f) for f in v]
            md.append("")
    md += ["## Names that are only a date", ""]
    md += [line(f) for f in dates] or ["None."]
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "duplicate-names.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(md) + "\n")
    with open(os.path.join(OUT, "names.json"), "w", encoding="utf-8") as fh:
        json.dump(files, fh)
    print(f"files {len(files)}; duplicate names {len(dups)} "
          f"(g1 {len(cats[1])}, g2 {len(cats[2])}, g3 {len(cats[3])}); date-only {len(dates)}")
    print("wrote spike/output/duplicate-names.md")


if __name__ == "__main__":
    main()
