"""Doctor: one plain report before phone tests. Reports only, fixes nothing.

Never goes through `open_library`, which creates folders and can rebuild the database: the library is only read. The one
thing written is the fingerprint record, by a scan, in the library. Music folders are only listed, never opened.
"""
import http.client
import json
import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .backup import BACKUP_DIR, check_backup
from .importer import mine_without_phone_copy
from .library import MARKER_NAME, REPO_ROOT, LibraryMissing, LibraryRefused
from .scanner import fingerprint, scan
from .server import LOOPBACK, PORT, SERVER_LEVEL, connect_readonly, start_servers, stop_servers, tailscale_info
from .store import now

PASS, WARN, FAIL = "PASS", "WARN", "FAIL"
SCAN_OLD_DAYS = 7
RECORD_NAME = "scan-fingerprint.json"
GUARD_TEST = REPO_ROOT / ".claude" / "hooks" / "test_guard_music.py"
LIBRARY_TEST = REPO_ROOT / "server" / "test_library.py"
NOT_MINE_OR_GONE = """
    SELECT COUNT(*) FROM songs g WHERE NOT EXISTS (
        SELECT 1 FROM song_places p JOIN sources s USING (path) LEFT JOIN verdicts v ON v.file_key=s.file_key
        WHERE p.song_id=g.id AND s.status='present' AND COALESCE(v.verdict, '')<>'not_mine')"""


# --- fingerprint around a scan ----------------------------------------------------------------

def _try_fingerprint(root):
    try:
        return fingerprint(root)
    except OSError:  # a file vanished while listing: no answer, which isn't the same as a change
        return None


def fingerprinted_scan(lib, root):
    """A scan, with the music folders compared before and after. (scan result, record). A scan that stops records nothing."""
    before = _try_fingerprint(root)
    result = scan(lib, root)
    after = _try_fingerprint(root)
    record = {"before": before, "after": after, "finished": now()}
    path = lib.root / RECORD_NAME
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, path)
    return result, record


def fingerprint_line(record):
    """(level, words) for one record."""
    if not record["before"] or not record["after"]:
        return WARN, "couldn't be compared on the last scan (a file moved while listing). Scan again."
    if record["before"] != record["after"]:
        return FAIL, f"music folders CHANGED during the last scan: {record['before']} became {record['after']}."
    return PASS, f"music folders unchanged by the last scan ({record['after'].split(',')[0]})."


# --- the checks: each returns (level, words) ---------------------------------------------------

def check_tailscale(address):
    if address:
        return PASS, "connected."
    return FAIL, "not connected, so the phone can't reach the laptop. Open Tailscale and connect."


def probe(address, port):
    """How many songs a server at this address lists. None if nothing is listening; 'odd' if the answer isn't ours."""
    c = http.client.HTTPConnection(address, port, timeout=10)
    try:
        c.request("GET", "/songs")
        r = c.getresponse()
        body = r.read()
        return len(json.loads(body)["songs"]) if r.status == 200 else "odd"
    except ConnectionRefusedError:
        return None
    except (OSError, http.client.HTTPException, ValueError, KeyError, TypeError):
        return "odd"
    finally:
        c.close()


def running_level(address, port):
    """The SERVER_LEVEL of the server running there: 0 for code older than the number, None if it can't be asked."""
    c = http.client.HTTPConnection(address, port, timeout=10)
    try:
        c.request("GET", "/health")
        r = c.getresponse()
        body = r.read()
        return int(json.loads(body).get("server", 0)) if r.status == 200 else 0
    except (OSError, http.client.HTTPException, ValueError, TypeError, AttributeError):
        return None
    finally:
        c.close()


def check_server(root, address, port):
    here = probe(LOOPBACK, port)
    if here == "odd":
        return FAIL, f"something on port {port} answers, but not with the song list. Is another program using it?"
    if here is not None:
        level = running_level(LOOPBACK, port)
        if level is not None and level < SERVER_LEVEL:
            return WARN, f"running older code (version {level}, this code is {SERVER_LEVEL}). Stop it and start it again."
        if not address:
            return PASS, f"running on this laptop ({here} songs, version {SERVER_LEVEL}). Tailscale is the line above."
        there = probe(address, port)
        if there != here:
            return FAIL, "running on this laptop, not on the Tailscale address. Stop it and start it again."
        return PASS, f"running, reachable on the laptop and over Tailscale ({here} songs, version {SERVER_LEVEL})."
    return _trial_start(root)


def _trial_start(root):
    """Nothing running: prove it could, on a spare port on the laptop only. Always stopped again."""
    try:
        servers = start_servers(root, [LOOPBACK], 0)
    except OSError as e:
        return FAIL, f"not running, and a test start failed ({e.__class__.__name__})."
    try:
        n = probe(LOOPBACK, servers[0].server_port)
    finally:
        stop_servers(servers)
    if n is None or n == "odd":
        return FAIL, "not running, and a test start couldn't list songs."
    return WARN, f"isn't running. Start it for phone tests. A test start worked ({n} songs) and was stopped."


def run_test(script, runner=subprocess.run):
    """(level, words) for one of our self-tests. Its folders are throwaway ones."""
    try:
        p = runner([sys.executable, str(script)], capture_output=True, cwd=REPO_ROOT, timeout=300)
    except (OSError, subprocess.SubprocessError) as e:
        return FAIL, f"couldn't run ({e.__class__.__name__})."
    return (PASS, "passes.") if p.returncode == 0 else (FAIL, f"FAILED. Run: python {Path(script).relative_to(REPO_ROOT)}")


def check_scan_age(conn, today=None):
    latest = conn.execute("SELECT MAX(last_seen) FROM sources").fetchone()[0]
    if not latest:
        return WARN, "no scan yet."
    when = datetime.strptime(latest, "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=timezone.utc)
    age = (today or datetime.now(timezone.utc)) - when
    if age > timedelta(days=SCAN_OLD_DAYS):
        return WARN, f"{age.days} days old (warns past {SCAN_OLD_DAYS}), so \"on laptop\" labels may be behind. Run scan."
    return PASS, f"{age.days} days old."


def check_no_place(conn):
    n = conn.execute(NOT_MINE_OR_GONE).fetchone()[0]
    if n:
        return WARN, f"{n} songs have no present place (all gone or now not mine)."
    return PASS, "0 songs without a present place."


def check_fingerprint(root, conn):
    path = Path(root) / RECORD_NAME
    if not path.is_file():
        return WARN, "no record yet. The next scan makes one."
    try:
        record = json.loads(path.read_text(encoding="utf-8"))
        level, words = fingerprint_line(record)
        finished = record["finished"]
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        return WARN, "the record can't be read. The next scan replaces it."
    latest = conn.execute("SELECT MAX(last_seen) FROM sources").fetchone()[0]
    if level != FAIL and latest and latest > finished:
        return WARN, "the newest scan didn't finish, so it wasn't compared. Scan again."
    return level, words


def check_phone_copies(conn, root):
    """Mine songs the phone can't keep yet: no phone copy on the laptop. The server makes them by itself while it runs."""
    missing = len(mine_without_phone_copy(conn, root))
    if missing:
        return WARN, (f"{missing} Mine songs have no phone copy yet. Start the server (it makes them in the background) or run "
                      "copies. Still there after that: their files are cloud-only or missing.")
    return PASS, "every Mine song has a phone copy."


def run_doctor(root, port=PORT, tailscale=tailscale_info, runner=subprocess.run, guard=GUARD_TEST, library_test=LIBRARY_TEST, say=print,
               backup_dir=BACKUP_DIR):
    """Prints a line per check and one overall line. Returns the exit code: 2 if anything failed."""
    levels = []

    def line(name, result):
        levels.append(result[0])
        say(f"{result[0]}  {name}: {result[1]}")

    address, _ = tailscale()
    line("Tailscale", check_tailscale(address))
    line("Music guard test", run_test(guard, runner))
    line("Library self-test", run_test(library_test, runner))
    line("Backup", check_backup(backup_dir))
    if not (Path(root) / MARKER_NAME).is_file():
        line("Library marker", (FAIL, f"no {MARKER_NAME} in {root}. Wrong drive letter, or the drive is unplugged? Nothing was created."))
        say("SKIP  Server, scan age, songs and fingerprint need the library.")
    else:
        line("Library marker", (PASS, "found."))
        line("Server", check_server(root, address, port))
        try:
            conn = connect_readonly(root)
            try:
                line("Scan age", check_scan_age(conn))
                line("Songs", check_no_place(conn))
                line("Music fingerprint", check_fingerprint(root, conn))
                line("Phone copies", check_phone_copies(conn, root))
            finally:
                conn.close()
        except (LibraryMissing, LibraryRefused, sqlite3.Error) as e:
            line("Database", (FAIL, f"can't be read: {e}"))
    fails, warns = levels.count(FAIL), levels.count(WARN)
    if fails:
        say(f"Overall: FAIL. {fails} to fix before phone tests, {warns} warnings.")
        return 2
    say(f"Overall: PASS with {warns} warnings. Read them before phone tests." if warns else "Overall: PASS. OK for phone tests.")
    return 0
