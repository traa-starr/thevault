"""Self-test for doctor. Uses a throwaway library in the temp folder, never the real one: python server/test_doctor.py"""
import json
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from vault_server import backup, doctor, server  # noqa: E402
from vault_server.library import DB_NAME, MARKER_NAME, init_library  # noqa: E402
from vault_server.scanner import fingerprint  # noqa: E402
from vault_server.songs import set_mine as songs_set_mine  # noqa: E402
from vault_server.store import now  # noqa: E402

failures = []


def check(name, ok, detail=""):
    print(("PASS  " if ok else "FAIL  ") + name + (f"  {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(name)


def fake_run(code):
    return lambda *a, **k: subprocess.CompletedProcess(a, code, b"", b"")


def free_port():
    s = server.start_servers(tempfile.gettempdir(), [server.LOOPBACK], 0)
    port = s[0].server_port
    server.stop_servers(s)
    return port


def run(root, **kw):
    out = []
    kw.setdefault("port", free_port())
    kw.setdefault("tailscale", lambda: (server.LOOPBACK, []))
    kw.setdefault("runner", fake_run(0))
    kw.setdefault("backup_dir", Path(root).parent / "backups")
    code = doctor.run_doctor(root, say=out.append, **kw)
    return code, out


def line(out, name):
    return next((x for x in out if x[6:].startswith(name)), "")


def make_music(root):
    for folder in ("Music", "tape", "Session Music/#FREEMONEY THE MIXTAPE"):
        (root / folder).mkdir(parents=True)
    (root / "Music" / "a.mp3").write_bytes(b"audio a")
    (root / "tape" / "b.mp3").write_bytes(b"audio b")


def main():
    tmp = Path(tempfile.mkdtemp(prefix="vault-doctortest-")).resolve()
    music, root = tmp / "music", tmp / "lib"
    make_music(music)
    lib = init_library(root)
    lib.store.record("song_new", {"song_id": "11111111-1111-1111-1111-111111111111", "version_id": "v1", "file_key": "k1", "orig_name": "a.mp3",
                                  "places": [{"path": str(music / "Music" / "a.mp3"), "state": "sure", "why": "same_file"}]})

    # fingerprint around a scan
    before = fingerprint(music)
    _, record = doctor.fingerprinted_scan(lib, music)
    check("a clean scan records no change", record["before"] == record["after"] == before)
    check("a clean scan leaves the music folder as it was", fingerprint(music) == before)
    check("the record is in the library, not the music folder", (root / doctor.RECORD_NAME).is_file() and not (music / doctor.RECORD_NAME).exists())
    real_scan = doctor.scan
    doctor.scan = lambda l, r: (real_scan(l, r), (Path(r) / "Music" / "new.mp3").write_bytes(b"sneaky"))[0]
    _, changed = doctor.fingerprinted_scan(lib, music)
    doctor.scan = real_scan
    check("a change during a scan is seen", changed["before"] != changed["after"])
    check("that counts as a fail", doctor.fingerprint_line(changed)[0] == doctor.FAIL)
    code, out = run(root)
    check("doctor reports it, overall fail", code == 2 and line(out, "Music fingerprint").startswith("FAIL") and out[-1].startswith("Overall: FAIL"), str(out))
    (music / "Music" / "new.mp3").unlink()
    good = doctor.fingerprinted_scan(lib, music)[1]
    check("no answer from the listing is a warning, not a change", doctor.fingerprint_line({"before": None, "after": "x", "finished": ""})[0] == doctor.WARN)
    stopped = False
    try:
        doctor.fingerprinted_scan(lib, tmp / "never-made")
    except doctor.scan.__globals__["ScanStopped"]:
        stopped = True
    check("a scan that stops leaves the record alone", stopped and json.loads((root / doctor.RECORD_NAME).read_text())["finished"] == good["finished"])
    lib.close()

    # everything fine
    check("no backup yet is a warning", line(run(root)[1], "Backup").startswith("WARN"))
    backup.run_backup(root, tmp / "backups")
    state = fingerprint(root)
    servers = server.start_servers(root, [server.LOOPBACK], 0)
    code, out = run(root, port=servers[0].server_port)
    check("all good: every line passes", code == 0 and all(x.startswith("PASS") for x in out[:-1]) and out[-1].startswith("Overall: PASS"), str(out))
    check("all eight checks plus the fingerprint and phone copies are there", len(out) == 11, str(out))
    check("the server line shows the running version", f"version {server.SERVER_LEVEL}" in line(out, "Server"), str(out))
    doctor.SERVER_LEVEL = server.SERVER_LEVEL + 1  # this code is newer than what's running
    code, out = run(root, port=servers[0].server_port)
    doctor.SERVER_LEVEL = server.SERVER_LEVEL
    check("a server running older code is a warning: restart it", line(out, "Server").startswith("WARN") and "Stop it and start it again" in line(out, "Server"), str(out))

    # the Tailscale address isn't being listened on
    code, out = run(root, port=servers[0].server_port, tailscale=lambda: ("127.0.0.2", []))
    check("server not on the Tailscale address fails", code == 2 and line(out, "Server").startswith("FAIL"), str(out))
    server.stop_servers(servers)

    # each check failing
    code, out = run(root, tailscale=lambda: (None, []))
    check("Tailscale down fails", code == 2 and line(out, "Tailscale").startswith("FAIL"), str(out))
    runner = lambda cmd, **k: subprocess.CompletedProcess(cmd, 1 if "guard" in cmd[1] else 0, b"", b"")
    code, out = run(root, runner=runner)
    check("guard test failing fails", code == 2 and line(out, "Music guard").startswith("FAIL") and line(out, "Library self").startswith("PASS"), str(out))
    runner = lambda cmd, **k: subprocess.CompletedProcess(cmd, 1 if "test_library" in cmd[1] else 0, b"", b"")
    code, out = run(root, runner=runner)
    check("library test failing fails", code == 2 and line(out, "Library self").startswith("FAIL") and line(out, "Music guard").startswith("PASS"), str(out))

    def no_exe(*a, **k):
        raise OSError()
    code, out = run(root, runner=no_exe)
    check("a test that can't run fails", code == 2 and line(out, "Music guard").startswith("FAIL"), str(out))

    # server not running: says so, test start stopped afterwards
    started = []
    real_start = doctor.start_servers
    doctor.start_servers = lambda *a, **k: (lambda s: (started.extend(s), s)[1])(real_start(*a, **k))
    code, out = run(root)
    doctor.start_servers = real_start
    check("server off is a warning that says so", code == 0 and line(out, "Server").startswith("WARN") and "isn't running" in line(out, "Server"), str(out))
    check("the overall line mentions the warning", "warnings" in out[-1], out[-1])
    check("doctor's test server was started", len(started) == 1)
    check("doctor's test server is stopped", doctor.probe(server.LOOPBACK, started[0].server_port) is None)

    # something else on the port
    import http.server
    other = http.server.ThreadingHTTPServer((server.LOOPBACK, 0), http.server.BaseHTTPRequestHandler)
    import threading
    threading.Thread(target=other.serve_forever, daemon=True).start()
    code, out = run(root, port=other.server_port)
    other.shutdown()
    other.server_close()
    check("another program on the port fails", code == 2 and line(out, "Server").startswith("FAIL"), str(out))

    # scan age
    conn = server.connect_readonly(root)
    check("a fresh scan passes", doctor.check_scan_age(conn)[0] == doctor.PASS)
    later = datetime.now(timezone.utc) + timedelta(days=doctor.SCAN_OLD_DAYS + 1)
    check("an old scan warns", doctor.check_scan_age(conn, later)[0] == doctor.WARN)
    conn.close()

    # Mine songs without a phone copy (the server makes them; doctor says how many are still missing)
    lib = init_library(root)
    sid = lib.store.conn.execute("SELECT id FROM songs LIMIT 1").fetchone()[0]
    songs_set_mine(lib.store, sid, "mine")
    check("a Mine song with no phone copy warns", doctor.check_phone_copies(lib.store.conn, root)[0] == doctor.WARN
          and doctor.check_phone_copies(lib.store.conn, root)[1].startswith("1 Mine songs have no phone copy yet"))
    code, out = run(root)
    check("that shows as a warning line in the report", line(out, "Phone copies").startswith("WARN") and code == 0, str(out))
    songs_set_mine(lib.store, sid, "not mine")
    check("no Mine songs left without one: pass", doctor.check_phone_copies(lib.store.conn, root)[0] == doctor.PASS)
    lib.close()

    # songs with no present place
    lib = init_library(root)
    check("a song with a place passes", doctor.check_no_place(lib.store.conn)[0] == doctor.PASS)
    key = lib.store.conn.execute("SELECT file_key FROM sources WHERE path=?", (str(music / "Music" / "a.mp3"),)).fetchone()[0]
    lib.store.record("verdict", {"file_key": key, "verdict": "not_mine"})
    check("a song now not mine is counted", doctor.check_no_place(lib.store.conn) == (doctor.WARN, "1 songs have no present place (all gone or now not mine)."))
    code, out = run(root)
    check("that shows as a warning in the report", line(out, "Songs").startswith("WARN"), str(out))
    lib.store.conn.execute("DELETE FROM verdicts")
    lib.store.conn.execute("UPDATE sources SET status='missing_at_source'")
    lib.store.conn.commit()
    check("a song with its file gone is counted", doctor.check_no_place(lib.store.conn)[0] == doctor.WARN)
    lib.store.conn.execute("UPDATE sources SET status='present'")

    # fingerprint record states
    lib.store.conn.execute("UPDATE sources SET last_seen=?", (now(),))
    lib.store.conn.commit()
    check("a scan newer than the record warns", doctor.check_fingerprint(root, lib.store.conn)[0] == doctor.WARN)
    (root / doctor.RECORD_NAME).write_text("not json", encoding="utf-8")
    check("a damaged record warns", doctor.check_fingerprint(root, lib.store.conn)[0] == doctor.WARN)
    (root / doctor.RECORD_NAME).unlink()
    check("no record warns", doctor.check_fingerprint(root, lib.store.conn)[0] == doctor.WARN)
    lib.close()

    # doctor writes nothing
    state = fingerprint(root)
    db_bytes = (root / DB_NAME).read_bytes()
    code, out = run(root)
    check("doctor adds or changes nothing in the library", fingerprint(root) == state and (root / DB_NAME).read_bytes() == db_bytes)

    # library gone
    ghost = tmp / "never-made"
    code, out = run(ghost)
    check("missing library fails, creates nothing", code == 2 and line(out, "Library marker").startswith("FAIL") and not ghost.exists(), str(out))
    (root / MARKER_NAME).rename(root / "marker-away")
    code, out = run(root)
    check("missing marker fails, creates nothing", code == 2 and not (root / MARKER_NAME).exists(), str(out))
    (root / "marker-away").rename(root / MARKER_NAME)

    # database unreadable
    (root / DB_NAME).write_bytes(b"not a database")
    code, out = run(root)
    check("a broken database fails plainly", code == 2 and any("FAIL" in x for x in out), str(out))
    shutil.rmtree(tmp, ignore_errors=True)

    print()
    print("ALL PASSED" if not failures else f"{len(failures)} FAILED: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
