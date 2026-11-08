"""Tags: a short typed line pinned to a second of a song (BLUEPRINT "Phase 2: tagging").

Whole-tag lines: an add or an edit writes the full tag under its `tag_id` with `tag_add` (latest line wins, `made_at`
kept from the first line); a delete writes `tag_remove`. Every change goes through `Store.record`, so the journal comes first.
"""
import math

from .store import now

MAX_TEXT = 500


def _clean(data):
    """The tag's fields as they'll be written, or raises ValueError."""
    text = data.get("text", "")
    if not isinstance(text, str):
        raise ValueError("A tag's words must be text.")
    at = data.get("at_sec")
    if isinstance(at, bool) or not isinstance(at, (int, float)) or not math.isfinite(at) or at < 0:
        raise ValueError("A tag needs a second that's 0 or more.")
    vid = data.get("version_id")
    if vid is not None and not isinstance(vid, str):
        raise ValueError("A tag's version must be an id.")
    made = data.get("made_at")
    if made is not None and not isinstance(made, str):
        raise ValueError("A tag's made_at must be a time.")
    return text.strip()[:MAX_TEXT], round(float(at), 3), vid, made


def add_tag(store, data, change_id=None):
    """A new tag or a whole-tag edit. A tag for a merged-away song follows it to the song that stayed. False when
    nothing changes (same values, or this change was already recorded)."""
    tag_id = data.get("tag_id")
    if not isinstance(tag_id, str) or not 0 < len(tag_id) <= 64:
        raise ValueError("A tag needs a tag id.")
    text, at, vid, made = _clean(data)
    song_id = store.survivor(data["song_id"])
    if not song_id:
        raise ValueError("Tag is for a song that doesn't exist.")
    cur = store.conn.execute("SELECT * FROM tags WHERE id=?", (tag_id,)).fetchone()
    if not vid:  # the phone doesn't know versions: the one kept, else the song's current one, is what was playing
        vid = cur["version_id"] if cur and cur["song_id"] == song_id else None
        row = vid or store.conn.execute("SELECT id FROM versions WHERE song_id=? ORDER BY is_current DESC, ts DESC LIMIT 1",
                                        (song_id,)).fetchone()
        vid = vid or (row["id"] if row else None)
    if cur:
        made = cur["ts"]  # set once, kept on edits
        if (cur["song_id"], cur["version_id"], cur["text"], cur["at_sec"]) == (song_id, vid, text, at):
            return False
    line = {"tag_id": tag_id, "song_id": song_id, "version_id": vid, "text": text, "at_sec": at, "made_at": made or now()}
    return store.record("tag_add", line, change_id=change_id)


def remove_tag(store, data, change_id=None):
    """Delete a tag. False if it's already gone."""
    tag_id = data.get("tag_id")
    cur = store.conn.execute("SELECT song_id FROM tags WHERE id=?", (tag_id,)).fetchone() if isinstance(tag_id, str) else None
    if not cur:
        return False
    return store.record("tag_remove", {"tag_id": tag_id, "song_id": cur["song_id"]}, change_id=change_id)


def _clock(at):
    """102.3456 -> "1:42.346": the second to 3 decimals, as stored."""
    whole = int(at)
    return f"{whole // 60}:{whole % 60:02d}.{round((at - whole) * 1000):03d}"


def tags_by_song(conn, words=""):
    """Every live tag grouped by song title, for comparing with the phone (2.7). `words`: only titles containing them."""
    rows = conn.execute("SELECT t.*, s.title FROM tags t JOIN songs s ON s.id = t.song_id ORDER BY s.title COLLATE NOCASE, t.song_id, t.at_sec, t.ts").fetchall()
    want = words.strip().lower()
    out, last = [], None
    for r in rows:
        if want and want not in r["title"].lower():
            continue
        if r["song_id"] != last:
            last = r["song_id"]
            out.append(f"{r['title']}  ({r['song_id']})")
        out.append(f"  {_clock(r['at_sec']):>10}  {r['text'] or '(no words yet)'}")
    songs = len({line for line in out if not line.startswith("  ")})
    out.append(f"{len(out) - songs} tags on {songs} songs." if out else "No tags" + (f" on a title with '{words}'." if want else " yet."))
    return out


def all_tags(conn):
    """Every live tag, for GET /tags. Ordered by song, then second."""
    return [{"id": r["id"], "song_id": r["song_id"], "version_id": r["version_id"], "text": r["text"],
             "at_sec": r["at_sec"], "made_at": r["ts"]}
            for r in conn.execute("SELECT * FROM tags ORDER BY song_id, at_sec, id")]
