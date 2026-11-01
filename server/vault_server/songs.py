"""Turns scanned places into songs (duplicates), then fills in title, date and source as marked guesses.

Both steps can run any number of times: they work out what should be true and journal only the differences. Only the
database and journal change. Files are never touched; dates come through `scanner.read_date_tag`.
"""
import hashlib
import os
import re
import shutil
import uuid
from datetime import datetime

from . import scanner


# my artist names, as whole words in any capitals: `l1` must not match inside another word
ARTIST_NAME = re.compile(r"(?<![^\W_])(?:l1|l1ghtxfluv|mojo|traa)(?![^\W_])", re.IGNORECASE)


class FfprobeMissing(Exception):
    """Dates can't be read without ffprobe. Nothing was marked as having no date tag."""


def _clusters(rows, verdict, copy_of):
    """Places that are surely the same song: same hash, or a skipped copy with its kept file."""
    parent = {r["path"]: r["path"] for r in rows}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    by_key, by_place = {}, {os.path.join(r["folder"], r["name"]): r["path"] for r in rows}
    for r in rows:
        if r["file_key"].startswith("hash:"):
            parent[find(r["path"])] = find(by_key.setdefault(r["file_key"], r["path"]))
    for r in rows:
        if verdict[r["path"]] == "skip":
            kept = by_place.get(copy_of.get(scanner._location_key(r["path"], r["size"])))
            if kept:
                parent[find(r["path"])] = find(kept)
    out = {}
    for r in rows:
        out.setdefault(find(r["path"]), []).append(r)
    return list(out.values())


def _lead(places, verdict):
    """The place a song's name and date come from: the file I kept, then one on the laptop, then the first by path."""
    return min(places, key=lambda r: (verdict[r["path"]] != "keep", r["cloud_only"], r["path"]))


def link_songs(lib):
    store, conn = lib.store, lib.store.conn
    verdict = dict(scanner.verdict_by_path(lib))
    copy_of = {r["file_key"]: r["copy_of"] for r in conn.execute("SELECT file_key, copy_of FROM verdicts WHERE verdict='skip'")}
    rows = [r for r in conn.execute("SELECT * FROM sources WHERE status='present' ORDER BY path") if verdict[r["path"]] != "not_mine"]
    placed = {r["path"]: r for r in conn.execute("SELECT * FROM song_places")}
    song_age = {r["id"]: r["ts"] for r in conn.execute("SELECT id, ts FROM songs")}
    was_sure = lambda r: r["path"] in placed and placed[r["path"]]["state"] == "sure"

    # a lone hashless file may only be a likely twin; everything else is a song of its own
    clusters = _clusters(rows, verdict, copy_of)
    lone = lambda c: len(c) == 1 and not c[0]["file_key"].startswith("hash:")
    anchors = [c for c in clusters if not lone(c)]
    twins = {}
    for c in sorted(anchors, key=lambda c: c[0]["path"]):
        for r in c:
            twins.setdefault((r["name"].casefold(), r["size"]), c)
    likely = []  # (place, song's cluster)
    for c in sorted((c for c in clusters if lone(c)), key=lambda c: (not was_sure(c[0]), c[0]["path"])):
        match = twins.get((c[0]["name"].casefold(), c[0]["size"]))
        if match:
            likely.append((c[0], match))
        else:
            twins[(c[0]["name"].casefold(), c[0]["size"])] = c
            anchors.append(c)

    # each song keeps the oldest id its places already had; a new one is made only if none did
    wanted, claimed, created = {}, set(), 0
    cluster_song = {}
    for c in anchors:
        have = {placed[r["path"]]["song_id"] for r in c if was_sure(r)} - claimed
        lead = _lead(c, verdict)
        places = [(r["path"], "sure", "skip_copy" if verdict[r["path"]] == "skip" else "same_file") for r in c]
        if have:
            song_id = min(have, key=lambda s: (song_age[s], s))
            claimed.add(song_id)
            cluster_song[id(c)] = song_id
            wanted.update({p: (song_id, s, w) for p, s, w in places})
            ver = conn.execute("SELECT id, file_key FROM versions WHERE song_id=? AND is_current=1", (song_id,)).fetchone()
            if ver and ver["file_key"].startswith("src:") and lead["file_key"].startswith("hash:"):
                store.record("version_key", {"version_id": ver["id"], "file_key": lead["file_key"]})
        else:
            song_id = str(uuid.uuid4())
            store.record("song_new", {"song_id": song_id, "version_id": str(uuid.uuid4()), "file_key": lead["file_key"],
                                      "orig_name": lead["name"], "title": os.path.splitext(lead["name"])[0],
                                      "places": [{"path": p, "state": s, "why": w} for p, s, w in places]})
            created += 1
            claimed.add(song_id)
            cluster_song[id(c)] = song_id
            wanted.update({p: (song_id, s, w) for p, s, w in places})
    for r, match in likely:
        wanted[r["path"]] = (cluster_song[id(match)], "likely", "same_name_size")

    # write the differences; a song left with no places has joined the one its place moved to
    placed = {r["path"]: r for r in conn.execute("SELECT * FROM song_places")}
    still_used = {w[0] for w in wanted.values()}
    merged, moved = set(), []
    for path, (song_id, state, why) in sorted(wanted.items()):
        cur = placed.get(path)
        if cur and cur["song_id"] != song_id and cur["song_id"] not in still_used and cur["song_id"] not in merged:
            store.record("song_merge", {"from_id": cur["song_id"], "into_id": song_id})
            merged.add(cur["song_id"])
        if not cur or (cur["song_id"], cur["state"], cur["why"]) != (song_id, state, why):
            store.record("song_place", {"path": path, "song_id": song_id, "state": state, "why": why})
            moved.append(path)
    return {"songs added": created, "songs joined": len(merged), "places updated": len(moved)}


def _put_guess(store, song_id, field, value, basis, current):
    cur = current.get(field)
    if cur and cur["origin"] == "manual":
        return 0
    if cur and (cur["value"], cur["basis"]) == (value, basis):
        return 0
    store.record("song_field", {"song_id": song_id, "field": field, "value": value, "origin": "guess", "basis": basis})
    return 1


def _date_guess(path, st, cur):
    """(date, basis). A date read from a tag stays. A file known to have no tag isn't opened again until it changes."""
    if cur and cur["basis"] == "tag":
        return cur["value"], "tag"
    modified = datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d")
    if scanner.is_cloud_only(st):
        return modified, "modified"
    if cur and cur["basis"] == "modified_no_tag" and cur["value"] == modified:
        return modified, "modified_no_tag"
    date, could_read = scanner.read_date_tag(path)
    if date:
        return date, "tag"
    return modified, "modified_no_tag" if could_read else "modified"


def fill_details(lib):
    if not shutil.which("ffprobe"):
        raise FfprobeMissing("ffprobe not found, so dates can't be read. Nothing changed.")
    store, conn = lib.store, lib.store.conn
    verdict = dict(scanner.verdict_by_path(lib))
    by_song = {}
    for r in conn.execute("""SELECT s.* , p.song_id FROM song_places p JOIN sources s USING (path)
                             WHERE p.state='sure' AND s.status='present'"""):
        if r["path"] in verdict:
            by_song.setdefault(r["song_id"], []).append(r)
    written = 0
    for song_id, places in by_song.items():
        lead = _lead(places, verdict)
        current = {r["field"]: r for r in conn.execute("SELECT * FROM song_fields WHERE song_id=?", (song_id,))}
        written += _put_guess(store, song_id, "title", os.path.splitext(lead["name"])[0], "filename", current)
        written += _put_guess(store, song_id, "source", "FL", "assumed", current)
        cur = current.get("date")
        if cur and cur["origin"] == "manual":
            continue
        try:
            st = os.stat(lead["path"])
            date, basis = _date_guess(lead["path"], st, cur)
        except OSError:
            continue  # gone since the scan: the next scan will say so
        written += _put_guess(store, song_id, "date", date, basis, current)
    return {"details written": written}


def _mine_guess(places, verdict, title, cur):
    """(status, reason), first match wins: my verdict, my folders, name in the title, name in a local file's tag.
    A local file already checked isn't opened again until it changes."""
    verdicts = {verdict[r["path"]] for r in places}
    if "not_mine" in verdicts:
        return "not mine", "verdict"  # only ever my own call
    if verdicts & {"keep", "skip"}:  # a skip is a copy of a file I called mine
        return "mine", "verdict"
    for r in places:
        parts = r["folder"].split(os.sep)
        if parts[0] == "tape" or parts[:2] == [scanner.SESSION, scanner.MIXTAPE]:
            return "mine", "folder"
    if ARTIST_NAME.search(title):
        return "likely mine", "title"
    local = sorted((r for r in places if not r["cloud_only"]), key=lambda r: r["path"])
    seen = hashlib.sha256("".join(f"{r['path']}|{r['size']}|{r['mtime']}\n" for r in local).encode("utf-8", "surrogateescape")).hexdigest()[:16]
    if cur and cur["basis"] in (f"tag:{seen}", f"none:{seen}"):
        return cur["value"], cur["basis"]
    all_read = True
    for r in local:
        try:
            values, could_read = scanner.read_name_tags(r["path"])
        except OSError:
            values, could_read = [], False  # gone since the scan: the next scan will say so
        if any(ARTIST_NAME.search(v) for v in values):
            return "likely mine", f"tag:{seen}"
        all_read = all_read and could_read
    return "unknown", f"none:{seen}" if all_read else "none"


def fill_mine(lib):
    if not shutil.which("ffprobe"):
        raise FfprobeMissing("ffprobe not found, so tags can't be read. Nothing changed.")
    store, conn = lib.store, lib.store.conn
    verdict = dict(scanner.verdict_by_path(lib))
    by_song = {}
    for r in conn.execute("""SELECT s.*, p.song_id FROM song_places p JOIN sources s USING (path)
                             WHERE p.state='sure' AND s.status='present'"""):
        by_song.setdefault(r["song_id"], []).append(r)
    written = 0
    for song_id, places in by_song.items():
        current = {r["field"]: r for r in conn.execute("SELECT * FROM song_fields WHERE song_id=?", (song_id,))}
        cur = current.get("mine")
        if cur and cur["origin"] == "manual":
            continue
        title = conn.execute("SELECT title FROM songs WHERE id=?", (song_id,)).fetchone()["title"]
        value, basis = _mine_guess(places, verdict, title, cur)
        written += _put_guess(store, song_id, "mine", value, basis, current)
    return {"mine statuses written": written}


def set_mine(store, song_id, value, change_id=None):
    """My call on a song. The line also holds the earlier value, so Undo can put it back. The same call twice does nothing."""
    cur = store.conn.execute("SELECT value, origin, basis FROM song_fields WHERE song_id=? AND field='mine'", (song_id,)).fetchone()
    if cur and cur["origin"] == "manual" and cur["value"] == value:
        return False
    return store.record("song_field", {"song_id": song_id, "field": "mine", "value": value, "origin": "manual",
                                       "before": dict(cur) if cur else None}, change_id=change_id)


def restore_mine(store, song_id, change_id=None):
    """Undo my last call on a song: a new line puts the earlier value back, guess or manual. Nothing is erased."""
    cur = store.conn.execute("SELECT origin FROM song_fields WHERE song_id=? AND field='mine'", (song_id,)).fetchone()
    line = store.manual_mine_line(song_id) if cur and cur["origin"] == "manual" else None
    if not line or "before" not in line:
        return False
    before = line["before"] or {"value": None}
    return store.record("song_field_restore", {"song_id": song_id, "field": "mine", **before}, change_id=change_id)


def mine_counts(lib):
    rows = lib.store.conn.execute("SELECT value, origin, basis FROM song_fields WHERE field='mine'").fetchall()
    count = lambda value, basis=None: sum(r["value"] == value and basis in (None, r["basis"]) for r in rows)
    out = {"mine (my verdict)": count("mine", "verdict") + sum(r["value"] == "mine" and r["origin"] == "manual" for r in rows),
           "mine (folder)": count("mine", "folder"), "likely mine": count("likely mine"), "unknown": count("unknown")}
    if count("not mine"):
        out["not mine (my verdict)"] = count("not mine")
    return out


def song_counts(lib):
    one = lambda sql: lib.store.conn.execute(sql).fetchone()[0]
    return {"songs": one("SELECT COUNT(*) FROM songs"),
            "songs in more than one place": one("""SELECT COUNT(*) FROM (SELECT song_id FROM song_places p JOIN sources s USING (path)
                                                   WHERE s.status='present' GROUP BY song_id HAVING COUNT(*) > 1)"""),
            "likely links": one("SELECT COUNT(*) FROM song_places WHERE state='likely'"),
            "dates from tag": one("SELECT COUNT(*) FROM song_fields WHERE field='date' AND origin='guess' AND basis='tag'"),
            "dates from modified time": one("SELECT COUNT(*) FROM song_fields WHERE field='date' AND origin='guess' AND basis LIKE 'modified%'")}
