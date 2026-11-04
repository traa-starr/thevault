"""Versions of one song: a family with one Main. The phone works out each change and sends the new Main of every song it
touches, with what it saw before. This side only checks and records it, so a phone that was out of date, or wrong,
can't leave a chain, a family without its Main, or a hidden song inside a family.
"""
import re

SONG_ID = re.compile(r"[0-9a-fA-F-]{36}")
MAX_SONGS = 500


def main_of(conn, song_id):
    """The song's Main, or None for a plain song."""
    row = conn.execute("SELECT main_id FROM song_family WHERE song_id=?", (song_id,)).fetchone()
    return row["main_id"] if row else None


def in_family(conn, song_id):
    return main_of(conn, song_id) is not None


def _check(conn, songs, before):
    if not isinstance(songs, dict) or not isinstance(before, dict) or not songs or len(songs) > MAX_SONGS:
        raise ValueError("A versions change needs the songs it touches.")
    if set(songs) != set(before):
        raise ValueError("A versions change needs what each song was before.")
    for sid, main in [*songs.items(), *before.items()]:
        if not SONG_ID.fullmatch(sid) or (main is not None and not (isinstance(main, str) and SONG_ID.fullmatch(main))):
            raise ValueError("A versions change names a song by something that isn't an id.")
    for sid in songs:
        if main_of(conn, sid) != before[sid]:
            raise ValueError("Versions changed since the phone looked, so nothing was saved.")
    # the families as they would be
    after = {r["song_id"]: r["main_id"] for r in conn.execute("SELECT song_id, main_id FROM song_family")}
    for sid, main in songs.items():
        if main is None:
            after.pop(sid, None)
        else:
            after[sid] = main
    touched = {m for m in [*songs.values(), *before.values()] if m} | {sid for sid in songs}
    sizes = {}
    for main in after.values():
        sizes[main] = sizes.get(main, 0) + 1
    for sid, main in after.items():
        if main not in touched and sid not in touched:
            continue
        if after.get(main) != main:
            raise ValueError("Every version must point straight at a Main.")
        if sizes[main] < 2:
            raise ValueError("A Main needs at least one other version; a lone song is a plain song.")
    for sid, main in songs.items():
        if main is None:
            continue
        row = conn.execute("SELECT value FROM song_fields WHERE song_id=? AND field='mine'", (sid,)).fetchone()
        exists = conn.execute("SELECT 1 FROM songs WHERE id=?", (sid,)).fetchone()
        if not exists:
            raise ValueError("A versions change names a song that doesn't exist.")
        if not row or row["value"] != "mine":
            raise ValueError("Only Mine songs can be versions. Restore or mark it Mine first.")


def set_family(store, data, change_id=None):
    """Records one versions change: link, Make main, Remove, or an Undo of one. False if nothing changes."""
    songs, before = data.get("songs"), data.get("before")
    _check(store.conn, songs, before)
    if all(songs[sid] == before[sid] for sid in songs):
        return False
    return store.record("family", {"songs": songs, "before": before}, change_id=change_id)


def family_counts(conn):
    """{main id: number of versions}, Main included."""
    return {r["main_id"]: r["n"] for r in conn.execute("SELECT main_id, COUNT(*) AS n FROM song_family GROUP BY main_id")}
