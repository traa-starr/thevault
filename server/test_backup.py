"""Self-test for backup, /health and pull-cloud. Throwaway folders in the temp folder only: python server/test_backup.py"""
import http.client
import json
import shutil
import sqlite3
import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from vault_server import backup, pull, server  # noqa: E402
from vault_server.library import DB_NAME, JOURNAL_NAME, MARKER_NAME, LibraryMissing, init_library  # noqa: E402
from vault_server.scanner import fingerprint  # noqa: E402

failures = []


def check(name, ok, detail=""):
    print(("PASS  " if ok else "FAIL  ") + name + (f"  {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(name)


def get_json(port, path):
    c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=10)
    c.request("GET", path)
    r = c.getresponse()
    body = json.loads(r.read())
    c.close()
    return r.status, body


def main():
    tmp = Path(tempfile.mkdtemp(prefix="vault-backuptest-")).resolve()
    root, dest = tmp / "lib", tmp / "backups"
    lib = init_library(root)
    lib.store.record("song_new", {"song_id": "11111111-1111-1111-1111-111111111111", "version_id": "v1", "file_key": "k1", "orig_name": "a.mp3",
                                  "places": []})
    lib.close()

    # backup
    start = datetime(2026, 11, 1, 3, 0, 0)
    ok, words = backup.run_backup(root, dest, when=start)
    folder = dest / "20261101-030000"
    check("a backup copies the database and the journal", ok and (folder / DB_NAME).is_file() and (folder / JOURNAL_NAME).is_file(), words)
    check("the journal copy is the same bytes", (folder / JOURNAL_NAME).read_bytes() == (root / JOURNAL_NAME).read_bytes())
    copy = sqlite3.connect(folder / DB_NAME)
    check("the database copy opens and holds the song", copy.execute("SELECT COUNT(*) FROM songs").fetchone()[0] == 1)
    copy.close()
    check("no half-made folder is left", not list(dest.glob("*.partial")))
    ok, words = backup.run_backup(root, dest, when=start)
    check("the same second twice does nothing", not ok and "already exists" in words)
    check("the library is untouched by a backup", sorted(p.name for p in root.iterdir()) == sorted(
        [MARKER_NAME, DB_NAME, JOURNAL_NAME, "audio", "phone", "write.lock"]), str(sorted(p.name for p in root.iterdir())))

    # 14 kept, the oldest go, strangers stay
    (dest / "my-own-notes").mkdir()
    (dest / "readme.txt").write_text("keep me")
    for day in range(1, 20):
        backup.run_backup(root, dest, when=start + timedelta(days=day))
    copies = backup.list_copies(dest)
    check("only 14 copies are kept", len(copies) == 14, str(len(copies)))
    check("the newest are the ones kept", copies[-1].name == "20261120-030000" and copies[0].name == "20261107-030000", f"{copies[0].name} {copies[-1].name}")
    check("other things in the folder are never deleted", (dest / "my-own-notes").is_dir() and (dest / "readme.txt").is_file())

    # age and warnings
    age = backup.last_backup_age(dest, today=datetime(2026, 11, 20, 9, 0, 0))
    check("age is read from the newest copy", age == timedelta(hours=6))
    check("a recent copy passes", backup.check_backup(dest, datetime(2026, 11, 20, 9, 0, 0))[0] == "PASS")
    check("a missed night warns", backup.check_backup(dest, datetime(2026, 11, 22, 3, 0, 0))[0] == "WARN")
    check("no copies warns", backup.check_backup(tmp / "nowhere")[0] == "WARN")
    check("age in words", backup.age_words(timedelta(hours=5)) == "5 hours old" and backup.age_words(timedelta(days=4)) == "4 days old"
          and backup.age_words(None) == "no backup yet")

    # unplugged drive: a skip, not a crash, and nothing made
    gone = tmp / "unplugged"
    ok, words = backup.run_backup(gone, tmp / "never-backups")
    check("a missing library is a plain skip", not ok and "Skipped" in words and "unplugged" in words, words)
    check("a skip creates nothing", not gone.exists() and not (tmp / "never-backups").exists())

    # /health
    servers = server.start_servers(root, [server.LOOPBACK], 0, backup_dir=dest)
    port = servers[0].server_port
    status, body = get_json(port, "/health")
    check("health reports the library and backup age", status == 200 and body["library"] is True and body["backup_hours"] is not None, str(body))
    check("health has no scan age before a scan", body["scan_hours"] is None, str(body))
    server.stop_servers(servers)
    servers = server.start_servers(root, [server.LOOPBACK], 0, backup_dir=tmp / "no-backups-here")
    status, body = get_json(servers[0].server_port, "/health")
    check("health with no backup says so", status == 200 and body["backup_hours"] is None, str(body))
    server.stop_servers(servers)
    (root / MARKER_NAME).rename(root / "away")
    servers = server.start_servers(root, [server.LOOPBACK], 0, backup_dir=dest)
    status, body = get_json(servers[0].server_port, "/health")
    check("health with the library away still answers", status == 200 and body["library"] is False, str(body))
    server.stop_servers(servers)
    (root / "away").rename(root / MARKER_NAME)

    # pull-cloud, with fakes for the cloud and the disk
    music = tmp / "music"
    for folder_name in ("Music", "tape", "Session Music/#FREEMONEY THE MIXTAPE"):
        (music / folder_name).mkdir(parents=True)
    names = [music / "Music" / f"{n}.mp3" for n in "abcde"]
    for i, p in enumerate(names):
        p.write_bytes(b"x" * (100 + i))
    (music / "Music" / "notes.txt").write_text("not audio")
    before = fingerprint(music)
    cloud = {names[0], names[1], names[2], names[3]}  # e is already on the laptop
    opened, lines = [], []

    def hydrate(path):
        opened.append(path)
        cloud.discard(path)

    def run(**kw):
        lines.clear()
        kw.setdefault("hydrate", hydrate)
        kw.setdefault("cloud", lambda p: p in cloud)
        kw.setdefault("free", lambda p: 50 * pull.GB)
        return pull.run_pull(root, music, say=lines.append, **kw)

    code = run(first=2)
    check("a pull of the first two reads two and finishes", code == 0 and "Pulled 2 of 2" in lines[-1], f"{code} {lines[-1]}")
    check("only two were opened, in name order", opened == names[:2], str(opened))
    check("it said the count up front", lines[0].startswith("2 cloud-only files"), lines[0])
    code = run()
    check("a rerun carries on with the rest and finishes", code == 0 and opened == names[:4], f"{code} {opened}")
    check("the finish line says to scan", "Pulled 2 of 2" in lines[-1] and "scan" in lines[-1], lines[-1])
    code = run()
    check("a third run has nothing to do", code == 0 and len(opened) == 4 and "0 cloud-only" in lines[0], lines[0])
    check("the pull never changed the music folder", fingerprint(music) == before)

    # stops under the space limit
    cloud.update(names[:4])
    opened.clear()
    room = [20 * pull.GB]
    code = run(free=lambda p: room[0])
    check("plenty of space pulls all four", code == 0 and len(opened) == 4)
    cloud.update(names[:4])
    opened.clear()
    code = run(free=lambda p: 10 * pull.GB + 50)
    check("under the limit it stops before reading", code == 2 and opened == [] and "Stopped at 0 of 4" in lines[-1], lines[-1])

    # a file that fails, one that stays cloud-only, and Ctrl+C
    cloud.update(names[:4])

    def flaky(path):
        if path == names[1]:
            raise PermissionError()
        if path == names[2]:
            return  # reads fine but never comes down
        hydrate(path)

    code = run(hydrate=flaky)
    check("failures are listed and don't stop the rest", code == 2 and names[0] not in cloud and names[3] not in cloud
          and any("b.mp3" in x and "PermissionError" in x for x in lines) and any("c.mp3" in x and "still cloud-only" in x for x in lines), str(lines))
    cloud.update(names[:4])

    def stop_after_one(path):
        hydrate(path)
        raise KeyboardInterrupt

    code = run(hydrate=stop_after_one)
    check("Ctrl+C stops cleanly and says how to carry on", code == 2 and "Run it again" in lines[-1], lines[-1])

    # wrong library
    try:
        pull.run_pull(tmp / "no-library", music, say=lines.append)
        refused = False
    except LibraryMissing:
        refused = True
    check("a missing library stops the pull", refused)

    # a real read of a real file, in read mode only
    real = music / "Music" / "e.mp3"
    pull.read_whole(real)
    check("a real read leaves the file as it was", real.read_bytes() == b"x" * 104 and fingerprint(music) == before)

    shutil.rmtree(tmp, ignore_errors=True)
    print()
    print("ALL PASSED" if not failures else f"{len(failures)} FAILED: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
