"""Song lengths (play first, 2026-11-08, NEXT C): measured on the laptop and sent with the phone's song list, so the
player shows a song's real length the moment it starts, never "–:––" while the phone loads it.

Like scan results, a length is a measurement, not a choice: it never goes in the journal, and a song without one is
measured on the next run (delete the database and they all come back). Runs with the server's phone copies (autocopy:
when the server starts and after Mine marks) and with the `copies` command, so nobody runs anything new.

Music stays read-only: ffprobe only reads. The file measured is the one the phone plays: the library's copy if the import
made one, else an original that is on disk right now. A cloud-only original is never read (reading downloads it); it
gets its length once it's local or imported. On the phone the length is for showing only: the short-song rule still
waits for the phone's own length, so a wrong number here can't make a song start past its end.
"""
import shutil
import subprocess
from datetime import datetime, timezone

from .store import write_lock

BACKGROUND = getattr(subprocess, "BELOW_NORMAL_PRIORITY_CLASS", 0)
BATCH = 50  # rows written per lock: the server's own writes never wait long


def measure(path):
    """Seconds, or None if ffprobe can't read it. Opens the file read-only."""
    try:
        p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                           capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60,
                           creationflags=BACKGROUND)
        seconds = float((p.stdout or "").strip().splitlines()[0])
    except (OSError, subprocess.TimeoutExpired, ValueError, IndexError):
        return None
    return round(seconds, 1) if seconds > 0 else None


def missing(conn):
    """Songs with no length row yet."""
    return [r["id"] for r in conn.execute(
        "SELECT g.id FROM songs g LEFT JOIN song_lengths l ON l.song_id=g.id WHERE l.song_id IS NULL ORDER BY g.id")]


def fill_lengths(lib, stop=None, probe=measure):
    """Measures every song without a length. Returns {'measured', 'failed', 'not on this laptop'}. `stop`: an Event
    checked between songs. Without ffprobe nothing is measured and nothing is recorded."""
    from .server import find_playable, library_copy, song_places  # the server imports autocopy, which imports this

    counts = {"measured": 0, "failed": 0, "not on this laptop": 0}
    if probe is measure and not shutil.which("ffprobe"):
        return counts
    conn = lib.store.conn
    rows = []

    def save():
        if rows:
            with write_lock(lib.store.lock_path):
                conn.executemany("INSERT OR REPLACE INTO song_lengths VALUES (?, ?, ?, ?)", rows)
                conn.commit()
            rows.clear()

    for song_id in missing(conn):
        if stop is not None and stop.is_set():
            break
        path = library_copy(lib.root, conn, song_id) or find_playable(song_places(conn, song_id))[0]
        if path is None:  # cloud-only or gone: tried again next run, never downloaded
            counts["not on this laptop"] += 1
            continue
        seconds = probe(path)
        counts["measured" if seconds else "failed"] += 1
        rows.append((song_id, seconds, "probe" if seconds else "failed", datetime.now(timezone.utc).isoformat(timespec="seconds")))
        if len(rows) >= BATCH:
            save()
    save()
    return counts


def length_counts(conn):
    """(songs, with a length) for the doctor and the `copies` line."""
    songs = conn.execute("SELECT COUNT(*) FROM songs").fetchone()[0]
    known = conn.execute("SELECT COUNT(*) FROM song_lengths l JOIN songs g ON g.id=l.song_id WHERE l.seconds IS NOT NULL").fetchone()[0]
    return songs, known
