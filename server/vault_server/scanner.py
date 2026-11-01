"""Read-only scanner. Records what's in the music folders; never writes there and never opens a cloud-only file.

The music root comes in as an argument, never written here. Opening a cloud-only file makes Windows download it, so
`is_cloud_only` is checked from file attributes first and `hash_file` and `read_date_tag` are the only places a music
file is ever opened.
"""
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

from .library import SORTING_NAME
from .store import now

AUDIO = {".wav", ".mp3", ".m4a", ".flac", ".aif", ".aiff"}
CLOUD_ATTRS = 0x400000 | 0x1000 | 0x40000  # recall-on-data-access, offline, recall-on-open
SESSION, MIXTAPE = "Session Music", "#FREEMONEY THE MIXTAPE"
SORTING_DONE = "sorting-file-applied"
RANK = {"skip": 1, "keep": 2, "not_mine": 3}  # not mine wins a conflict


class ScanStopped(Exception):
    """A folder that must exist isn't there. Nothing was recorded."""


def is_cloud_only(st):
    return bool(getattr(st, "st_file_attributes", 0) & CLOUD_ATTRS)


def hash_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(1024 * 1024):
            h.update(chunk)
    return h.hexdigest()


def read_date_tag(path):
    """(date or None, whether the file could be read). Refuses a cloud-only file; ffprobe only reads."""
    if is_cloud_only(os.stat(path)):
        return None, False
    try:
        p = subprocess.run(["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", str(path)],
                           capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60)
    except subprocess.TimeoutExpired:
        return None, False
    if p.returncode != 0:
        return None, False
    tags = {k.lower(): v for k, v in (json.loads(p.stdout or "{}").get("format", {}).get("tags") or {}).items()}
    for name in ("date", "tdrc", "tyer", "year", "creation_time"):
        m = re.match(r"((?!0000)\d{4})(-\d{2}(-\d{2})?)?", str(tags.get(name, "")).strip())
        if m:
            return m.group(0), True
    return None, True


def _require(parent, name):
    """Exact name on disk, capitals included."""
    if not Path(parent).is_dir() or name not in os.listdir(parent) or not (Path(parent) / name).is_dir():
        raise ScanStopped(f"Folder {name!r} not found in {parent}.")
    return Path(parent) / name


def _files_in(folder, errors):
    for d, _, names in os.walk(folder, onerror=errors.append):
        for n in names:
            yield Path(d) / n


def _plan(root):
    """(file paths, count of artist subfolders left out). Stops before anything is recorded."""
    root = Path(root)
    music, tape, session = _require(root, "Music"), _require(root, "tape"), _require(root, SESSION)
    mixtape = _require(session, MIXTAPE)
    errors, paths = [], []
    for folder in (music, tape, mixtape):
        paths += _files_in(folder, errors)
    for folder in (root, session):
        paths += [Path(e.path) for e in os.scandir(folder) if e.is_file()]
    others = [e.path for e in os.scandir(session) if e.is_dir() and e.name != MIXTAPE]
    return [p for p in paths if p.suffix.lower() in AUDIO], others, errors


def _folder_label(root, path):
    """Same labels as the sorting file: 'Music', 'Session Music\\sub', and the root's own name for loose files."""
    rel = os.path.relpath(path.parent, root)
    return Path(root).name if rel == "." else rel


def _location_key(path, size):
    return f"src:{path}|{size}"


def scan(lib, root):
    root = Path(root).resolve()
    paths, others, errors = _plan(root)
    store, conn = lib.store, lib.store.conn
    stamp, new, per_folder, cloud_count, failed = now(), 0, {}, 0, []
    for path in paths:
        try:
            st = os.stat(path)
            cloud = is_cloud_only(st)
            prev = conn.execute("SELECT * FROM sources WHERE path=?", (str(path),)).fetchone()
            full_hash = None
            if prev and prev["size"] == st.st_size and prev["mtime"] == st.st_mtime and prev["file_key"].startswith("hash:"):
                full_hash = prev["file_key"][len("hash:"):]  # already known: no need to read it again
            elif not cloud:
                full_hash = hash_file(path)
        except OSError as e:
            failed.append(f"{path.name}: {e.__class__.__name__}")
            continue
        key, _ = lib.upsert_file(path.name, str(path), st.st_size, st.st_mtime, full_hash)
        folder = _folder_label(root, path)
        store.upsert_source(str(path), key, folder, path.name, st.st_size, st.st_mtime, cloud, stamp)
        new += prev is None
        cloud_count += cloud
        top = folder.split(os.sep)[0]
        per_folder[top] = per_folder.get(top, 0) + 1
        if full_hash:
            _carry_verdict(store, _location_key(path, st.st_size), key)
    if not failed and not errors:  # a partial look can't say a file is gone
        store.mark_missing(stamp)
    return {"files per folder": per_folder, "artist subfolders skipped": len(others), "cloud-only": cloud_count,
            "new files": new, "could not read": failed + [str(e) for e in errors]}


def _carry_verdict(store, old_key, new_key):
    """A cloud-only file just got its hash, so its key changed. Its verdict goes with it; skips stay on the location."""
    conn = store.conn
    old = conn.execute("SELECT verdict FROM verdicts WHERE file_key=?", (old_key,)).fetchone()
    if not old or old["verdict"] == "skip":
        return
    cur = conn.execute("SELECT verdict FROM verdicts WHERE file_key=?", (new_key,)).fetchone()
    if not cur or RANK[old["verdict"]] > RANK[cur["verdict"]]:
        store.record("verdict", {"file_key": new_key, "verdict": old["verdict"]})


def verdict_by_path(lib):
    """(path, verdict or None) for every file present. A skip belongs to one location; the rest follow the file's key."""
    conn = lib.store.conn
    verdicts = {r["file_key"]: r["verdict"] for r in conn.execute("SELECT file_key, verdict FROM verdicts")}
    out = []
    for r in conn.execute("SELECT path, file_key, size FROM sources WHERE status='present'"):
        loc = verdicts.get(_location_key(r["path"], r["size"]))
        out.append((r["path"], "skip" if loc == "skip" else verdicts.get(r["file_key"])))
    return out


def source_verdicts(lib):
    pairs = verdict_by_path(lib)
    count = lambda v: sum(x == v for _, x in pairs)
    return {"files": len(pairs), "keep": count("keep"), "not mine": count("not_mine"), "skip (copy)": count("skip"),
            "unsorted": count(None)}


def apply_sorting(lib, root):
    """My sorting file becomes per-file verdicts, through the journal, once. Names only ever apply to the files found
    that first time: run again later, they would catch a future song of mine that happens to share a name."""
    root = Path(root).resolve()
    if SORTING_DONE in lib.store.known_ids:
        return {"verdicts added": 0, "note": "Sorting file was already applied; new files stay unsorted."}
    sorting = json.loads((lib.root / SORTING_NAME).read_text(encoding="utf-8"))
    store = lib.store
    rows = store.conn.execute("SELECT * FROM sources WHERE status='present'").fetchall()
    by_place = {(r["folder"], r["name"]): r for r in rows}
    stem = lambda name: os.path.splitext(name)[0].strip().lower()
    wanted, unmatched, keep_misses = {}, [], []

    def want(row, verdict, copy_of=None):
        if row["path"] not in wanted or RANK[verdict] > RANK[wanted[row["path"]][0]]:
            wanted[row["path"]] = (verdict, copy_of)

    for r in rows:
        if r["folder"].split(os.sep)[0] == "tape":
            want(r, "keep")
    for group in ("group2", "group3"):
        for e in sorting.get(group, []):
            mine = e["verdict"] == "mine"
            kept = e["keep"][0] if e["keep"] else None
            for item, verdict in [(i, "keep" if mine else "not_mine") for i in e["keep"]] + \
                                 [(i, "skip" if mine else "not_mine") for i in e["skip"]]:
                row = by_place.get((item["folder"], item["name"]))
                if row is None:
                    unmatched.append(item["name"])
                    if verdict == "keep":
                        keep_misses.append(item["name"])
                else:
                    copy_of = os.path.join(kept["folder"], kept["name"]) if verdict == "skip" and kept else None
                    want(row, verdict, copy_of)
    not_mine = set(sorting.get("not_mine_names", []))
    found = {stem(r["name"]) for r in rows}
    for r in rows:
        if stem(r["name"]) in not_mine:
            want(r, "not_mine")
    unmatched += sorted(not_mine - found)
    keep_all = set(sorting.get("keep_all_names", []))
    for r in rows:
        if stem(r["name"]) in keep_all:
            wanted[r["path"]] = ("keep", None)
    unmatched += sorted(keep_all - found)

    # byte-identical copies share a key, so the strongest call for that key wins; a skip stays on its own location
    targets = {}
    for r in rows:
        if r["path"] in wanted and wanted[r["path"]][0] != "skip":
            verdict = wanted[r["path"]][0]
            if r["file_key"] not in targets or RANK[verdict] > RANK[targets[r["file_key"]][0]]:
                targets[r["file_key"]] = (verdict, None)
    for r in rows:
        if r["path"] in wanted and wanted[r["path"]][0] == "skip" and targets.get(r["file_key"], ("",))[0] != "not_mine":
            targets.setdefault(_location_key(r["path"], r["size"]), wanted[r["path"]])

    added = 0
    for key, (verdict, copy_of) in targets.items():
        if store.conn.execute("SELECT 1 FROM verdicts WHERE file_key=?", (key,)).fetchone():
            continue  # a later change of mine must not be undone by re-running this
        data = {"file_key": key, "verdict": verdict}
        if copy_of:
            data["copy_of"] = copy_of
        store.record("verdict", data)
        added += 1

    store.record("sorting_applied", {}, change_id=SORTING_DONE)  # last, so a crash part-way just fills the gaps next run
    _, others, errors = _plan(root)
    excluded = {p.name for folder in others for p in _files_in(folder, errors)}
    verdicts = dict(verdict_by_path(lib))
    return {"verdicts added": added,
            "names matching no file": sorted(set(unmatched)),
            "keeps only in another artist's subfolder": sorted(set(keep_misses) & excluded),
            "tape files marked not mine": sorted(r["name"] for r in rows if r["folder"].split(os.sep)[0] == "tape"
                                                 and verdicts.get(r["path"]) == "not_mine")}


def fingerprint(root):
    """One line summing every file's path, size and modified time under `root`. Listing only: opens nothing."""
    h, count = hashlib.sha256(), 0
    for path in sorted(str(p) for p in _files_in(root, [])):
        st = os.stat(path)
        h.update(f"{path}|{st.st_size}|{st.st_mtime_ns}\n".encode("utf-8", "surrogateescape"))
        count += 1
    return f"{count} files, listing {h.hexdigest()[:16]}"
