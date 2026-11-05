"""Versions of one song: a family with one Main. The phone works out each change and sends the new Main of every song it
touches, with what it saw before. This side only checks and records it, so a phone that was out of date, or wrong,
can't leave a chain, a family without its Main, or a hidden song inside a family.
"""
import re
import uuid

from .songs import restore_mine, set_mine

SONG_ID = re.compile(r"[0-9a-fA-F-]{36}")
MAX_SONGS = 500


def main_of(conn, song_id):
    """The song's Main, or None for a plain song."""
    row = conn.execute("SELECT main_id FROM song_family WHERE song_id=?", (song_id,)).fetchone()
    return row["main_id"] if row else None


def in_family(conn, song_id):
    return main_of(conn, song_id) is not None


def picked(conn, song_id):
    return conn.execute("SELECT 1 FROM family_pick WHERE main_id=?", (song_id,)).fetchone() is not None


def _ids(value, what):
    if not isinstance(value, list) or len(value) > MAX_SONGS or not all(isinstance(s, str) and SONG_ID.fullmatch(s) for s in value):
        raise ValueError(f"A versions change's {what} must be a list of song ids.")
    return value


def _check_picks(conn, picks, picks_before, after):
    if not isinstance(picks, dict) or not isinstance(picks_before, dict) or set(picks) != set(picks_before) or len(picks) > MAX_SONGS:
        raise ValueError("A Main pick needs what it was before.")
    for sid in picks:
        if not SONG_ID.fullmatch(sid) or not isinstance(picks[sid], bool) or not isinstance(picks_before[sid], bool):
            raise ValueError("A Main pick names a song by something that isn't an id.")
        if picked(conn, sid) != picks_before[sid]:
            raise ValueError("Versions changed since the phone looked, so nothing was saved.")
        if picks[sid] and after.get(sid) != sid:
            raise ValueError("Only a Main can be picked as Main.")


def _check(conn, songs, before, mined=()):
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
        if (not row or row["value"] != "mine") and sid not in mined:
            raise ValueError("Only Mine songs can be versions. Restore or mark it Mine first.")
    return after


def set_family(store, data, change_id=None):
    """Records one versions change: link, group, Make main, Remove, or an Undo of one. False if nothing changes.
    `mine`: songs marked Mine in the same go, before the family. `restore_mine`: songs whose Mine goes back to what it
    was, after the family (an Undo). Everything is checked before anything is written, so it's all or nothing."""
    change_id = change_id or str(uuid.uuid4())
    if change_id in store.known_ids:
        return False  # sent twice (the answer got lost): the first one counted
    songs, before = data.get("songs"), data.get("before")
    mined = _ids(data.get("mine", []), "Mine list")
    restored = _ids(data.get("restore_mine", []), "restore list")
    after = _check(store.conn, songs, before, set(mined))
    picks, picks_before = data.get("picked", {}), data.get("picked_before", {})
    _check_picks(store.conn, picks, picks_before, after)
    for sid in [*mined, *restored]:
        if not store.conn.execute("SELECT 1 FROM songs WHERE id=?", (sid,)).fetchone():
            raise ValueError("A versions change names a song that doesn't exist.")
    if any(sid in after for sid in restored):
        raise ValueError("That song is one of several versions: take it out of Versions first.")
    done = False
    for n, sid in enumerate(mined):  # their own lines, so each Undo finds them; ids made from the change's id
        done = set_mine(store, sid, "mine", str(uuid.uuid5(uuid.UUID(change_id), f"mine{n}"))) or done
    entry = {"songs": songs, "before": before}
    if any(picks[sid] != picks_before[sid] for sid in picks):
        entry.update(picked=picks, picked_before=picks_before)
    if any(songs[sid] != before[sid] for sid in songs) or "picked" in entry:
        done = store.record("family", entry, change_id=change_id) or done
    for n, sid in enumerate(restored):
        done = restore_mine(store, sid, str(uuid.uuid5(uuid.UUID(change_id), f"restore{n}"))) or done
    return done


def family_counts(conn):
    """{main id: number of versions}, Main included."""
    return {r["main_id"]: r["n"] for r in conn.execute("SELECT main_id, COUNT(*) AS n FROM song_family GROUP BY main_id")}


def _hand_picks(store):
    """Mains I picked with Make main before picks were stored (Batch 4b-4c): a journal line that moves a whole family from
    one Main to another of its songs. Its exact reverse, right after, was an Undo and cancels it."""
    picks, last = set(), None
    for entry in store._read_journal():
        if entry["kind"] != "family" or "picked" in entry["data"]:
            continue
        songs, before = entry["data"]["songs"], entry["data"]["before"]
        olds, news = set(before.values()), set(songs.values())
        if len(olds) == 1 and len(news) == 1 and None not in olds | news and olds != news and next(iter(news)) in songs:
            if last and last == (before, songs):
                picks.discard(next(iter(olds)))
                last = None
            else:
                picks.add(next(iter(news)))
                last = (songs, before)
    return picks


def newest_mains(lib):
    """Each version group I never picked a Main for gets its newest version as Main, by the date Library's Newest sort
    uses (a tie keeps the Main it has). A group I picked by hand keeps it, and its pick is stored. Rerunnable."""
    store, conn = lib.store, lib.store.conn
    old_picks = _hand_picks(store)
    date = {r["song_id"]: r["value"] for r in conn.execute("SELECT song_id, value FROM song_fields WHERE field='date'")}
    families = {}
    for r in conn.execute("SELECT song_id, main_id FROM song_family ORDER BY song_id"):
        families.setdefault(r["main_id"], []).append(r["song_id"])
    out = {"version groups": len(families), "kept (picked by hand)": 0, "Main changed to newest": 0, "already newest": 0}
    for main, members in sorted(families.items()):
        if picked(conn, main):
            out["kept (picked by hand)"] += 1
            continue
        if main in old_picks:
            set_family(store, {"songs": {main: main}, "before": {main: main}, "picked": {main: True}, "picked_before": {main: False}})
            out["kept (picked by hand)"] += 1
            continue
        best = max(members, key=lambda sid: (date.get(sid) or "", sid == main))
        if best == main:
            out["already newest"] += 1
            continue
        set_family(store, {"songs": {sid: best for sid in members}, "before": {sid: main for sid in members}})
        out["Main changed to newest"] += 1
    return out
