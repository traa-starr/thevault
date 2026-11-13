"""Moved files stay the same song (calm part 1, 2026-11-12, goal E; groundwork for organizing the music folders, ROADMAP 5.0b).
Made-up files in a temp folder shaped like the music folders, never the real ones: python server/test_moved.py

Three moves, then a scan the way `scan` runs it (scan, link songs, details, mine): a file renamed, a file moved into a
subfolder, a file moved to another scanned folder. Each keeps its song id, so its Mine verdict, tags, rating, versions
and phone copy (all kept by song id) stay with it. No song is made twice; the old places read as gone.
"""
import shutil
import sys
import tempfile
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from vault_server import scanner  # noqa: E402
from vault_server.family import main_of, set_family  # noqa: E402
from vault_server.importer import kept  # noqa: E402
from vault_server.library import init_library, open_library  # noqa: E402
from vault_server.songs import fill_details, fill_mine, link_songs, set_mine, set_rating  # noqa: E402
from vault_server.tags import add_tag  # noqa: E402

failures = []


def check(name, ok, detail=""):
    print(("PASS  " if ok else "FAIL  ") + name + (f"  {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(name)


def full_scan(lib, music):
    """What `scan` does for songs: record the files, link them into songs, fill title/date, fill the Mine guess."""
    scanner.scan(lib, music)
    link_songs(lib)
    fill_details(lib)
    fill_mine(lib)


def song_at(conn, path):
    row = conn.execute("SELECT song_id FROM song_places WHERE path=? AND state='sure'", (str(path),)).fetchone()
    return row["song_id"] if row else None


def main():
    tmp = Path(tempfile.mkdtemp(prefix="vault-movedtest-")).resolve()
    music, root = tmp / "music", tmp / "lib"
    folders = {"Music": music / "Music", "tape": music / "tape", "mixtape": music / scanner.SESSION / scanner.MIXTAPE}
    for f in folders.values():
        f.mkdir(parents=True)
    files = {name: folders["Music"] / f"{name}.mp3" for name in ("alpha", "bravo", "charlie", "delta")}
    for i, (name, path) in enumerate(files.items()):
        path.write_bytes(f"made-up audio {name} ".encode() * (200 + i))

    lib = init_library(root)
    full_scan(lib, music)
    conn = lib.store.conn
    ids = {name: song_at(conn, path) for name, path in files.items()}
    check("first scan: four songs, one each", len(set(ids.values())) == 4 and all(ids.values()), str(ids))
    a, b, c, d = (ids[n] for n in ("alpha", "bravo", "charlie", "delta"))
    for one in ids.values():
        set_mine(lib.store, one, "mine")
    set_rating(lib.store, a, "fire")
    add_tag(lib.store, {"tag_id": "t1", "song_id": b, "text": "hook comes in", "at_sec": 12.5})
    set_family(lib.store, {"song_id": a, "songs": {a: a, d: a}, "before": {a: None, d: None}})
    (root / "phone" / "code-c").mkdir(parents=True)
    (root / "phone" / "code-c" / "charlie.m4a").write_bytes(b"made-up phone copy")
    lib.store.record("imported", {"song_id": c, "hash": "made-up", "code": "code-c", "name": "charlie.mp3", "size": 1,
                                  "src_path": str(files["charlie"]), "src_size": files["charlie"].stat().st_size,
                                  "src_mtime": files["charlie"].stat().st_mtime})
    songs_before = conn.execute("SELECT COUNT(*) FROM songs").fetchone()[0]
    lib.close()

    # the three moves (my hands in File Explorer, here in a temp folder)
    renamed = folders["Music"] / "alpha (final).mp3"
    files["alpha"].rename(renamed)
    sub = folders["Music"] / "Old takes" / "bravo.mp3"
    sub.parent.mkdir()
    files["bravo"].rename(sub)
    other = folders["tape"] / "charlie.mp3"
    files["charlie"].rename(other)

    lib = open_library(root)
    full_scan(lib, music)
    conn = lib.store.conn
    mine_of = lambda sid: conn.execute("SELECT value, origin FROM song_fields WHERE song_id=? AND field='mine'", (sid,)).fetchone()
    for case, path, sid in (("renamed", renamed, a), ("moved to a subfolder", sub, b), ("moved to another scanned folder", other, c)):
        now_sid = song_at(conn, path)
        check(f"{case}: the same song", now_sid == sid, f"{now_sid} != {sid}")
        m = mine_of(sid)
        check(f"{case}: still Mine, my own call", m is not None and m["value"] == "mine" and m["origin"] == "manual", str(dict(m) if m else None))
        present = conn.execute("""SELECT COUNT(*) FROM song_places p JOIN sources s USING (path)
                                  WHERE p.song_id=? AND s.status='present'""", (sid,)).fetchone()[0]
        check(f"{case}: plays from its new place (one present place)", present == 1, str(present))
    check("no song was made twice", conn.execute("SELECT COUNT(*) FROM songs").fetchone()[0] == songs_before)
    gone = [conn.execute("SELECT status FROM sources WHERE path=?", (str(files[n]),)).fetchone()["status"] for n in ("alpha", "bravo", "charlie")]
    check("the old places read as gone, not present", all(s != "present" for s in gone), str(gone))
    check("renamed: rating kept", conn.execute("SELECT value FROM song_ratings WHERE song_id=?", (a,)).fetchone()["value"] == "fire")
    check("renamed: versions kept (still Main of its group)", main_of(conn, a) == a and main_of(conn, d) == a)
    check("moved to a subfolder: tag kept", conn.execute("SELECT song_id FROM tags WHERE id='t1'").fetchone()["song_id"] == b)
    copies = {s["song_id"] for s in kept(conn, root)} if kept(conn, root) and "song_id" in kept(conn, root)[0] else {s.get("id") for s in kept(conn, root)}
    check("moved to another scanned folder: phone copy kept", c in copies and conn.execute("SELECT code FROM imported WHERE song_id=?", (c,)).fetchone()["code"] == "code-c", str(copies))
    check("the song that didn't move is untouched", song_at(conn, files["delta"]) == d)
    lib.close()

    # once more with nothing moved: nothing changes
    lib = open_library(root)
    before = lib.store.conn.execute("SELECT COUNT(*) FROM song_places").fetchone()[0]
    full_scan(lib, music)
    check("a second scan with nothing moved changes nothing", lib.store.conn.execute("SELECT COUNT(*) FROM song_places").fetchone()[0] == before)
    lib.close()

    shutil.rmtree(tmp, ignore_errors=True)
    print()
    if failures:
        print(f"{len(failures)} FAILED: {failures}")
        return 1
    print("ALL PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
