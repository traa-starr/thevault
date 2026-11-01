"""Self-test for the library, database and journal. Builds throwaway libraries in the system temp folder.

    python server/test_library.py
"""
import ctypes
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from vault_server import scanner, songs  # noqa: E402
from vault_server.library import (JOURNAL_NAME, DB_NAME, MARKER_NAME, LibraryMissing, LibraryRefused,  # noqa: E402
                                  init_library, open_library)

failures = []


def check(name, ok, detail=""):
    print(("PASS  " if ok else "FAIL  ") + name + (f"  {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(name)


def new_song(lib, name, file_hash):
    key, code = lib.upsert_file(name, f"C:/somewhere/{name}", 1000, 1.0, file_hash)
    ids = dict(song_id=str(uuid.uuid4()), version_id=str(uuid.uuid4()))
    lib.store.record("song_new", dict(ids, file_key=key, orig_name=name))
    return ids, key, code


def write_audio(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(text.encode())


def verdict_of(lib, path):
    return dict(scanner.verdict_by_path(lib)).get(str(path))


def scanner_checks(tmp):
    SM, FM = "Session Music", "#FREEMONEY THE MIXTAPE"
    music = tmp / "CloudRoot"
    for rel, text in {"Music/song one.mp3": "one", "Music/sub/song two.m4a": "two", "Music/notes.txt": "x",
                      "Music/shared.mp3": "same bytes", "tape/shared.mp3": "same bytes", "tape/tape song.mp3": "t",
                      "Music/someone else.mp3": "se", "tape/someone else.mp3": "se2",
                      "Music/flip.mp3": "f1", "tape/flip.mp3": "f2", "Music/spin.mp3": "spin",
                      "Music/cloud song.mp3": "cloud bytes", "Music/cloud copy.mp3": "cloud copy",
                      "Beats/beat.wav": "b", "loose.wav": "loose", f"{SM}/loose sm.mp3": "lsm",
                      f"{SM}/{FM}/mixtape.mp3": "mix", f"{SM}/Other Artist/theirs.mp3": "theirs",
                      f"{SM}/Other Artist/mine there.mp3": "minethere", f"{SM}/Third/x.mp3": "third"}.items():
        write_audio(music / rel, text)
    cloud = music / "Music" / "cloud song.mp3"
    cloud_copy = music / "Music" / "cloud copy.mp3"
    for p in (cloud, cloud_copy):
        ctypes.windll.kernel32.SetFileAttributesW(str(p), 0x1000)  # the "offline" mark cloud-only files can carry
    check("pretend cloud-only file really has the cloud mark", scanner.is_cloud_only(os.stat(cloud)))

    opened = []
    real_hash = scanner.hash_file
    scanner.hash_file = lambda p: (opened.append(str(p)), real_hash(p))[1]

    lib = init_library(tmp / "scanlib")
    first = scanner.scan(lib, music)
    rows = {r["path"]: r for r in lib.store.conn.execute("SELECT * FROM sources")}
    check("every audio file in scope is recorded, nothing else", len(rows) == 15, str(len(rows)))
    check("other artist subfolders are never recorded", not any("Other Artist" in p or "Third" in p for p in rows))
    check("subfolders left out are counted", first["artist subfolders skipped"] == 2)
    check("the mixtape subfolder and loose files are in", any(p.endswith("mixtape.mp3") for p in rows)
          and any(p.endswith("loose sm.mp3") for p in rows) and any(p.endswith("loose.wav") for p in rows))
    check("beats folder stays out", not any("beat.wav" in p for p in rows))
    check("a cloud-only file is never read", str(cloud) not in opened and str(cloud_copy) not in opened and len(opened) > 5)
    row = rows[str(cloud)]
    check("a cloud-only file gets the src key, a mark and no hash", row["file_key"].startswith("src:") and row["cloud_only"] == 1
          and lib.store.conn.execute("SELECT hash FROM files WHERE file_key=?", (row["file_key"],)).fetchone()[0] is None)
    check("a local file gets a full hash and a short code", lib.store.conn.execute(
        "SELECT f.code FROM files f JOIN sources s USING (file_key) WHERE s.name='song one.mp3'").fetchone()[0])
    check("byte-identical copies each get their own row", sum(r["name"] == "shared.mp3" for r in rows.values()) == 2)
    check("no audio is copied into the library", not any((tmp / "scanlib" / "audio").iterdir()))

    before = {t: lib.store.conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("sources", "files")}
    opened.clear()
    again = scanner.scan(lib, music)
    check("re-scan adds nothing and reads nothing it already knows", again["new files"] == 0 and opened == [] and before ==
          {t: lib.store.conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("sources", "files")})
    write_audio(music / "tape" / "new one.mp3", "new")
    check("a new file shows up on the next run", scanner.scan(lib, music)["new files"] == 1)
    (music / "tape" / "new one.mp3").unlink()
    scanner.scan(lib, music)
    check("a vanished file is marked, not removed", lib.store.conn.execute(
        "SELECT status FROM sources WHERE name='new one.mp3'").fetchone()[0] == "missing_at_source")

    sorting = {"not_mine_names": ["someone else", "spin", "nothing like this"], "keep_all_names": ["flip"],
               "group2": [{"key": "shared", "verdict": "mine", "keep": [{"folder": "tape", "name": "shared.mp3"}],
                           "skip": [{"folder": "Music", "name": "shared.mp3"}]},
                          {"key": "gone", "verdict": "mine", "keep": [{"folder": "Music", "name": "gone.mp3"}], "skip": []},
                          {"key": "mine there", "verdict": "mine", "keep": [{"folder": SM, "name": "mine there.mp3"}], "skip": []}],
               "group3": [{"key": "cloud", "verdict": "mine", "keep": [{"folder": "Music", "name": "cloud song.mp3"}],
                           "skip": [{"folder": "Music", "name": "cloud copy.mp3"}]},
                          {"key": "loose", "verdict": "not mine", "keep": [{"folder": "CloudRoot", "name": "loose.wav"}], "skip": []}]}
    (tmp / "scanlib" / "triage-decisions.json").write_text(json.dumps(sorting), encoding="utf-8")
    result = scanner.apply_sorting(lib, music)
    want = {"tape/tape song.mp3": "keep", "tape/shared.mp3": "keep", "Music/shared.mp3": "skip", "tape/someone else.mp3": "not_mine",
            "Music/someone else.mp3": "not_mine", "Music/flip.mp3": "keep", "tape/flip.mp3": "keep", "Music/spin.mp3": "not_mine",
            "Music/cloud song.mp3": "keep", "Music/cloud copy.mp3": "skip", "loose.wav": "not_mine", "Music/song one.mp3": None}
    for rel, v in want.items():
        check(f"verdict for {rel} is {v}", verdict_of(lib, music / rel) == v, str(verdict_of(lib, music / rel)))
    check("a skipped copy says which file it copies", lib.store.conn.execute(
        "SELECT copy_of FROM verdicts WHERE verdict='skip' AND copy_of LIKE '%shared.mp3'").fetchone() is not None)
    check("names matching no file are listed, not guessed", "gone.mp3" in result["names matching no file"]
          and "nothing like this" in result["names matching no file"])
    check("a keep only in an artist subfolder is listed for me, not imported",
          result["keeps only in another artist's subfolder"] == ["mine there.mp3"]
          and verdict_of(lib, music / SM / "Other Artist" / "mine there.mp3") is None)
    check("a tape file overruled by not mine is flagged", result["tape files marked not mine"] == ["someone else.mp3"])

    lines = (tmp / "scanlib" / JOURNAL_NAME).read_text(encoding="utf-8").count("\n")
    write_audio(music / "Music" / "spin.mp3", "a different song, same name")
    scanner.scan(lib, music)
    scanner.apply_sorting(lib, music)
    check("applying the sorting again adds nothing", (tmp / "scanlib" / JOURNAL_NAME).read_text(encoding="utf-8").count("\n") == lines)
    check("a future file sharing a not-mine name stays unsorted", verdict_of(lib, music / "Music" / "spin.mp3") is None)
    mine = lib.store.snapshot()
    lib.close()

    (tmp / "scanlib" / DB_NAME).unlink()
    lib = open_library(tmp / "scanlib")
    check("verdicts survive a database rebuild from the journal", lib.store.snapshot() == mine and len(mine["verdicts"]) > 5)
    scanner.scan(lib, music)
    check("after the rebuild and a re-scan each file has its verdict back", verdict_of(lib, music / "Music" / "shared.mp3") == "skip"
          and verdict_of(lib, cloud) == "keep")
    check("sorting still counts as applied after the rebuild", "note" in scanner.apply_sorting(lib, music))

    # the hash arrives: the verdict follows the file to its new key
    ctypes.windll.kernel32.SetFileAttributesW(str(cloud), 0x80)
    scanner.scan(lib, music)
    check("verdict carries over when a cloud-only file reaches the laptop", verdict_of(lib, cloud) == "keep" and lib.store.conn.execute(
        "SELECT file_key FROM sources WHERE path=?", (str(cloud),)).fetchone()[0].startswith("hash:"))
    lib.close()

    # database from before this step upgrades itself, journal intact
    conn = sqlite3.connect(tmp / "scanlib" / DB_NAME)
    conn.execute("UPDATE meta SET value='1' WHERE key='schema_version'")
    conn.commit()
    conn.close()
    lib = open_library(tmp / "scanlib")
    check("an older database is rebuilt from the journal", lib.store.conn.execute("SELECT COUNT(*) FROM verdicts").fetchone()[0] > 5)
    scanner.scan(lib, music)

    steady = scanner.fingerprint(music)
    check("fingerprint is steady when nothing changed", steady == scanner.fingerprint(music))
    write_audio(music / "tape" / "touched.mp3", "x")
    check("fingerprint changes when a file appears", steady != scanner.fingerprint(music))

    # stops
    for missing in (music / SM / FM, music / "tape"):
        moved = Path(str(missing) + " gone")
        missing.rename(moved)
        try:
            scanner.scan(lib, music)
            check(f"scan stops if {missing.name} isn't found", False)
        except scanner.ScanStopped:
            check(f"scan stops if {missing.name} isn't found", True)
        moved.rename(missing)
    check("a stopped scan marks nothing missing", lib.store.conn.execute(
        "SELECT status FROM sources WHERE name='tape song.mp3'").fetchone()[0] == "present")
    lib.close()
    scanner.hash_file = real_hash
    r = subprocess.run([sys.executable, str(HERE / "vault_cli.py"), "scan", str(tmp / "no-library-here"), str(music)],
                       capture_output=True, text=True)
    check("scan with no library says Library missing", r.returncode != 0 and "Library missing" in r.stdout)


def song_checks(tmp):
    music = tmp / "SongRoot"
    root = tmp / "songlib"
    for rel, text in {"Music/same.mp3": "same bytes", "tape/same.mp3": "same bytes",
                      "Music/kept.mp3": "kept song", "Music/kept copy.mp3": "a different render",
                      "Music/flip.mp3": "take one", "tape/flip.mp3": "take two",
                      "Music/twin.mp3": "twin one", "tape/twin.mp3": "twin two",
                      "Music/late.mp3": "late bytes", "tape/late other.mp3": "late bytes",
                      "Music/theirs.mp3": "theirs", "Session Music/#FREEMONEY THE MIXTAPE/m.mp3": "mix"}.items():
        write_audio(music / rel, text)
    tagged = music / "tape" / "tagged.mp3"
    subprocess.run(["ffmpeg", "-v", "quiet", "-f", "lavfi", "-i", "anullsrc=r=44100", "-t", "0.2",
                    "-metadata", "date=2021-03-05", str(tagged)], check=True)
    os.utime(tagged, (1700000000, 1700000000))
    cloud_twin, cloud_late = music / "tape" / "twin.mp3", music / "tape" / "late other.mp3"
    for p in (cloud_twin, cloud_late):
        ctypes.windll.kernel32.SetFileAttributesW(str(p), 0x1000)
    before = scanner.fingerprint(music)

    probed, real_read = [], scanner.read_date_tag
    scanner.read_date_tag = lambda p: (probed.append(str(p)), real_read(p))[1]

    lib = init_library(root)
    scanner.scan(lib, music)
    sorting = {"not_mine_names": ["theirs"],
               "group2": [{"key": "kept", "verdict": "mine", "keep": [{"folder": "Music", "name": "kept.mp3"}],
                           "skip": [{"folder": "Music", "name": "kept copy.mp3"}]}]}
    (root / "triage-decisions.json").write_text(json.dumps(sorting), encoding="utf-8")
    scanner.apply_sorting(lib, music)
    songs.link_songs(lib)
    songs.fill_details(lib)
    conn = lib.store.conn

    def song_of(rel):
        row = lib.store.conn.execute("SELECT song_id, state FROM song_places WHERE path=?", (str(music / rel),)).fetchone()
        return tuple(row) if row else (None, None)

    def field(rel, name):
        row = lib.store.conn.execute("SELECT value, origin, basis FROM song_fields WHERE song_id=? AND field=?",
                                     (song_of(rel)[0], name)).fetchone()
        return tuple(row) if row else None

    check("byte-identical copies in two folders are one song", song_of("Music/same.mp3")[0] == song_of("tape/same.mp3")[0] is not None
          and song_of("tape/same.mp3")[1] == "sure")
    check("a skipped copy joins its kept file's song", song_of("Music/kept copy.mp3")[0] == song_of("Music/kept.mp3")[0] is not None)
    check("same name, different content stays two songs", song_of("Music/flip.mp3")[0] != song_of("tape/flip.mp3")[0])
    check("a cloud-only twin is likely, on the other file's song",
          song_of("tape/twin.mp3") == (song_of("Music/twin.mp3")[0], "likely") and song_of("Music/twin.mp3")[1] == "sure")
    check("a cloud-only file with no twin is a song of its own, not merged",
          song_of("tape/late other.mp3")[1] == "sure" and song_of("tape/late other.mp3")[0] != song_of("Music/late.mp3")[0])
    check("not mine gets no song", song_of("Music/theirs.mp3")[0] is None)
    check("no file is copied into the library", not any((root / "audio").iterdir()))
    n_songs = conn.execute("SELECT COUNT(*) FROM songs").fetchone()[0]
    check("the song count adds up", n_songs == 9, str(n_songs))
    check("the song's name comes from the file I kept", field("Music/kept copy.mp3", "title") == ("kept", "guess", "filename"))
    check("source is FL, marked as a guess", field("Music/same.mp3", "source") == ("FL", "guess", "assumed"))
    check("date comes from the embedded tag", field("tape/tagged.mp3", "date") == ("2021-03-05", "guess", "tag"))
    check("no tag means modified time, marked", field("Music/same.mp3", "date")[2].startswith("modified"))
    check("a cloud-only file is never opened for a date", str(cloud_late) not in probed and str(cloud_twin) not in probed
          and field("tape/late other.mp3", "date")[2] == "modified")
    check("read_date_tag itself refuses a cloud-only file", real_read(cloud_late) == (None, False))

    lines = lambda: (root / JOURNAL_NAME).read_text(encoding="utf-8").count("\n")
    n = lines()
    songs.link_songs(lib)
    probed.clear()
    songs.fill_details(lib)
    check("running again changes nothing", lines() == n, f"{n} {lines()}")

    # my edits against guesses
    rec = lib.store.record
    sid = song_of("tape/tagged.mp3")[0]
    rec("song_field", dict(song_id=sid, field="title", value="My Title", origin="manual"))
    rec("song_field", dict(song_id=sid, field="date", value="2020-01-01", origin="manual"))
    probed.clear()
    songs.fill_details(lib)
    check("guesses never overwrite a manual value", field("tape/tagged.mp3", "title")[:2] == ("My Title", "manual")
          and field("tape/tagged.mp3", "date")[:2] == ("2020-01-01", "manual"))
    check("a manual date means the file isn't opened for one", str(tagged) not in probed)
    rec("song_field", dict(song_id=sid, field="title", value="a guess", origin="guess"))
    check("a guess recorded directly can't overwrite it either", field("tape/tagged.mp3", "title")[0] == "My Title"
          and conn.execute("SELECT title FROM songs WHERE id=?", (sid,)).fetchone()[0] == "My Title")

    mine = lib.store.snapshot()
    lib.close()
    (root / DB_NAME).unlink()
    lib = open_library(root)
    check("songs, places and fields survive a rebuild", lib.store.snapshot() == mine and len(mine["song_places"]) >= 10)
    scanner.scan(lib, music)
    n = lines()
    songs.link_songs(lib)
    songs.fill_details(lib)
    check("after a rebuild and re-scan, running again changes nothing", lines() == n, f"{n} {lines()}")
    conn = lib.store.conn
    check("nothing in the music folders changed", scanner.fingerprint(music) == before)

    # the cloud-only copy reaches the laptop: its hash matches another song, so it joins, and my tag goes with it
    gone, stays = song_of("tape/late other.mp3")[0], song_of("Music/late.mp3")[0]
    rec = lib.store.record
    rec("tag_add", dict(tag_id="moved", song_id=gone, text="keep this"))
    ctypes.windll.kernel32.SetFileAttributesW(str(cloud_late), 0x80)
    scanner.scan(lib, music)
    songs.link_songs(lib)
    check("a cloud-only file that reaches the laptop joins the song with the same bytes",
          song_of("tape/late other.mp3") == (stays, "sure") and conn.execute("SELECT 1 FROM songs WHERE id=?", (gone,)).fetchone() is None)
    check("a tag on the joined song moves with it", conn.execute("SELECT song_id FROM tags WHERE id='moved'").fetchone()[0] == stays)

    # the twin arrives and its bytes differ: it stops being likely and becomes its own song
    ctypes.windll.kernel32.SetFileAttributesW(str(cloud_twin), 0x80)
    scanner.scan(lib, music)
    songs.link_songs(lib)
    check("a likely twin with different bytes becomes its own sure song",
          song_of("tape/twin.mp3")[1] == "sure" and song_of("tape/twin.mp3")[0] != song_of("Music/twin.mp3")[0])
    mine = lib.store.snapshot()
    lib.close()
    (root / DB_NAME).unlink()
    lib = open_library(root)
    check("joins survive a rebuild too", lib.store.snapshot() == mine)
    lib.close()
    scanner.read_date_tag = real_read


def mine_checks(tmp):
    FM = "Session Music/#FREEMONEY THE MIXTAPE"
    music = tmp / "MineRoot"
    root = tmp / "minelib"
    for rel, text in {"Music/song l1 here.mp3": "a", "Music/l1ght.mp3": "b", "Music/bill1.mp3": "c", "Music/plain.mp3": "d",
                      "Music/kept.mp3": "e", "Music/later theirs.mp3": "f", "Music/cloud l1.mp3": "g",
                      f"{FM}/l1 mix.mp3": "h", "tape/old.mp3": "i", "Music/hand set.mp3": "j"}.items():
        write_audio(music / rel, text)
    for name in ("tagged", "cloud tagged", "wrapped tag"):
        artist = "SOMEBILL1" if name == "wrapped tag" else "MOJO"
        subprocess.run(["ffmpeg", "-v", "quiet", "-f", "lavfi", "-i", "anullsrc=r=44100", "-t", "0.2",
                        "-metadata", f"artist={artist}", str(music / "Music" / f"{name}.mp3")], check=True)
    for name in ("cloud l1", "cloud tagged"):
        ctypes.windll.kernel32.SetFileAttributesW(str(music / "Music" / f"{name}.mp3"), 0x1000)

    lib = init_library(root)
    scanner.scan(lib, music)
    (root / "triage-decisions.json").write_text(json.dumps(
        {"group2": [{"key": "kept", "verdict": "mine", "keep": [{"folder": "Music", "name": "kept.mp3"}], "skip": []}]}), encoding="utf-8")
    scanner.apply_sorting(lib, music)
    write_audio(music / "tape" / "late.mp3", "k")  # after sorting, so it has no verdict
    before = scanner.fingerprint(music)
    scanner.scan(lib, music)
    songs.link_songs(lib)
    songs.fill_details(lib)
    conn = lib.store.conn

    def status(rel):
        row = lib.store.conn.execute("""SELECT f.value, f.basis FROM song_places p JOIN song_fields f USING (song_id)
                                        WHERE p.path=? AND f.field='mine'""", (str(music / rel),)).fetchone()
        return (row["value"], row["basis"].split(":")[0]) if row else None

    opened, real_run = [], subprocess.run
    subprocess.run = lambda args, **kw: (opened.append(args[-1]), real_run(args, **kw))[1]
    hand = conn.execute("SELECT song_id FROM song_places WHERE path=?", (str(music / "Music" / "hand set.mp3"),)).fetchone()[0]
    lib.store.record("song_field", {"song_id": hand, "field": "mine", "value": "mine", "origin": "manual"})
    songs.fill_mine(lib)
    check("my keep verdict gives mine", status("Music/kept.mp3") == ("mine", "verdict"))
    check("a tape file with my verdict stays on the verdict", status("tape/old.mp3") == ("mine", "verdict"))
    check("a new file in tape is mine from the folder", status("tape/late.mp3") == ("mine", "folder"))
    check("the mixtape folder beats a name match", status(f"{FM}/l1 mix.mp3") == ("mine", "folder"))
    check("artist name as its own word in the title is likely mine", status("Music/song l1 here.mp3") == ("likely mine", "title"))
    check("l1 inside another word doesn't match", status("Music/l1ght.mp3") == status("Music/bill1.mp3") == ("unknown", "none"))
    check("artist tag on a local file is likely mine", status("Music/tagged.mp3") == ("likely mine", "tag"))
    check("a name inside a longer tag word doesn't match", status("Music/wrapped tag.mp3") == ("unknown", "none"))
    check("cloud-only file uses its title", status("Music/cloud l1.mp3") == ("likely mine", "title"))
    check("cloud-only file's tag is ignored", status("Music/cloud tagged.mp3") == ("unknown", "none"))
    check("cloud-only files are never opened", not [p for p in opened if "cloud" in Path(p).name])
    check("no song is ever guessed not mine", conn.execute("SELECT COUNT(*) FROM song_fields WHERE field='mine' AND value='not mine'").fetchone()[0] == 0)
    check("my hand-set status isn't touched", conn.execute("SELECT origin FROM song_fields WHERE song_id=? AND field='mine'", (hand,)).fetchone()[0] == "manual")

    lines = (root / JOURNAL_NAME).read_text(encoding="utf-8")
    opened.clear()
    check("a rerun writes nothing", songs.fill_mine(lib) == {"mine statuses written": 0} and (root / JOURNAL_NAME).read_text(encoding="utf-8") == lines)
    check("a rerun doesn't reopen a file it could read", opened and not [p for p in opened if "tag" in Path(p).name])  # the fake files can't be read, so they're retried

    late_key = conn.execute("SELECT file_key FROM sources WHERE path=?", (str(music / "Music" / "later theirs.mp3"),)).fetchone()[0]
    lib.store.record("verdict", {"file_key": late_key, "verdict": "not_mine"})
    songs.fill_mine(lib)
    check("my later not-mine verdict beats the guess", status("Music/later theirs.mp3") == ("not mine", "verdict"))
    counts = songs.mine_counts(lib)
    check("counts add up to every song", sum(counts.values()) == conn.execute("SELECT COUNT(*) FROM songs").fetchone()[0], str(counts))
    subprocess.run = real_run

    mine = lib.store.snapshot()
    lib.close()
    (root / DB_NAME).unlink()
    lib = open_library(root)
    check("mine statuses survive a rebuild", lib.store.snapshot() == mine)
    lib.close()
    check("mine detection leaves the music folder unchanged", scanner.fingerprint(music) == before)


def main():
    tmp = Path(tempfile.mkdtemp(prefix="vault-selftest-")).resolve()
    check("temp folder is not on E: and not under the repo", tmp.drive.upper() != "E:" and HERE.parent not in tmp.parents)

    # 1. marker missing: stop, create nothing
    empty = tmp / "no-library-here"
    empty.mkdir()
    try:
        open_library(empty)
        check("marker missing stops", False)
    except LibraryMissing as e:
        check("marker missing stops with 'Library missing'", "Library missing" in str(e))
    check("marker missing creates nothing", list(empty.iterdir()) == [])
    ghost = tmp / "never-made"
    try:
        open_library(ghost)
    except LibraryMissing:
        pass
    check("missing folder is not created", not ghost.exists())
    r = subprocess.run([sys.executable, str(HERE / "vault_cli.py"), "check", str(empty)], capture_output=True, text=True)
    check("command line says library missing and exits non-zero", r.returncode != 0 and "Library missing" in r.stdout)
    check("command line created nothing", list(empty.iterdir()) == [])
    try:
        init_library(HERE.parent / "inside-the-repo")
        check("init refuses a folder inside the repo", False)
    except LibraryRefused:
        check("init refuses a folder inside the repo", True)
    check("repo folder was not created", not (HERE.parent / "inside-the-repo").exists())

    # 2. library starts with the right pieces
    root = tmp / "lib"
    lib = init_library(root)
    check("library has marker, audio, phone, database, journal",
          all((root / n).exists() for n in (MARKER_NAME, "audio", "phone", DB_NAME, JOURNAL_NAME)))

    # 3. same code, different files: different folders
    h1 = "ab" * 31 + "cd"
    h2 = "ab" * 31 + "ce"  # differs only in the last digits, so the first 7 code letters match
    k1, code1 = lib.upsert_file("any way.mp3", "C:/x/any way.mp3", 10, 1.0, h1)
    k2, code2 = lib.upsert_file("any way.mp3", "C:/y/any way.mp3", 11, 1.0, h2)
    check("test hashes really collide on the first 7 letters (so the second code is longer)",
          code2.startswith(code1) and len(code2) > len(code1))
    check("codes are 7+ lowercase letters and digits", len(code1) >= 7 and code1.isalnum() and code1 == code1.lower())
    check("two different files with one code get different codes", code1 != code2, f"{code1} {code2}")
    check("they get different folders", lib.audio_path(code1, "any way.mp3").parent != lib.audio_path(code2, "any way.mp3").parent)
    check("folder holds the real filename", lib.audio_path(code1, "any way.mp3").name == "any way.mp3"
          and lib.audio_path(code1, "any way.mp3").parent.name == code1)
    check("same file again keeps its code", lib.upsert_file("any way.mp3", "C:/z/any way.mp3", 10, 1.0, h1)[1] == code1)
    check("path tricks in a name are flattened", lib.audio_path(code1, "..\\..\\evil.mp3").name == "evil.mp3")

    # 4. my changes, repeats, rebuild from the journal
    a, key_a, _ = new_song(lib, "song a.mp3", "11" * 32)
    b, key_b, _ = new_song(lib, "song b.mp3", "22" * 32)
    rec = lib.store.record
    tag_id = str(uuid.uuid4())
    check("tag recorded", rec("tag_add", dict(tag_id=tag_id, song_id=a["song_id"], version_id=a["version_id"], text="hook", at_sec=83.5)))
    rec("tag_add", dict(tag_id=str(uuid.uuid4()), song_id=b["song_id"], text="needs vocals"))
    rec("tag_add", dict(tag_id=str(uuid.uuid4()), song_id=a["song_id"], text="deleted later"))
    rec("verdict", dict(file_key=key_a, verdict="keep"))
    rec("verdict", dict(file_key=key_b, verdict="not_mine"))
    rec("verdict", dict(file_key=key_b, verdict="keep"))  # changed my mind: last one wins
    rec("group", dict(group_id=str(uuid.uuid4()), state="confirmed", song_ids=[a["song_id"], b["song_id"]]))
    rec("link", dict(link_id=str(uuid.uuid4()), version_id=a["version_id"], kind="flp", target="project one", state="proposed"))
    change = str(uuid.uuid4())
    rec("tag_add", dict(tag_id=str(uuid.uuid4()), song_id=a["song_id"], text="once"), change_id=change)

    lines_before = (root / JOURNAL_NAME).read_text(encoding="utf-8").count("\n")
    check("a repeated change id does nothing",
          rec("tag_add", dict(tag_id=str(uuid.uuid4()), song_id=a["song_id"], text="once"), change_id=change) is False
          and (root / JOURNAL_NAME).read_text(encoding="utf-8").count("\n") == lines_before)
    for bad in (("tag_add", dict(tag_id="t", song_id="nope", text="x")), ("verdict", dict(file_key="k", verdict="maybe")),
                ("shrug", {})):
        try:
            rec(*bad)
            check(f"bad change {bad[0]} refused", False)
        except ValueError:
            check(f"bad change {bad[0]} refused", True)
    check("refused changes did not reach the journal", (root / JOURNAL_NAME).read_text(encoding="utf-8").count("\n") == lines_before)

    # re-scan changes files only
    mine = lib.store.snapshot()
    lib.upsert_file("song a.mp3", "C:/moved/song a.mp3", 1000, 2.0, "11" * 32)
    lib.upsert_file("brand new.mp3", "C:/new/brand new.mp3", 5, 3.0, "33" * 32)
    check("re-scan leaves tags, groups, verdicts and links alone", lib.store.snapshot() == mine)
    rec("tag_remove", dict(tag_id=lib.store.conn.execute("SELECT id FROM tags WHERE text='deleted later'").fetchone()[0]))
    mine = lib.store.snapshot()
    n_tags = len(mine["tags"])
    check("snapshot has tags, verdicts, a group and a link", n_tags == 3 and len(mine["verdicts"]) == 2
          and len(mine["groups"]) == 1 and len(mine["links"]) == 1)
    lib.close()

    # delete the database, replay the journal
    (root / DB_NAME).unlink()
    lib = open_library(root)
    check("database deleted, journal replayed: every tag, verdict, group and link is back", lib.store.snapshot() == mine)
    check("a journal line seen before is still a repeat after the rebuild",
          lib.store.record("tag_add", dict(tag_id="x", song_id=a["song_id"], text="once"), change_id=change) is False)
    lib.close()

    # crash between journal and database: journal line exists, database never got it
    late = {"id": str(uuid.uuid4()), "ts": "2026-10-31T12:00:00.000000Z", "kind": "tag_add",
            "data": {"tag_id": "late", "song_id": b["song_id"], "text": "from the journal"}}
    with open(root / JOURNAL_NAME, "a", encoding="utf-8") as f:
        f.write(json.dumps(late) + "\n" + '{"id": "torn-')
    lib = open_library(root)
    check("a journal line the database missed is applied on open; a torn last line is ignored",
          lib.store.conn.execute("SELECT text FROM tags WHERE id='late'").fetchone() is not None)
    lib.close()

    scanner_checks(tmp)
    song_checks(tmp)
    mine_checks(tmp)

    print()
    print("ALL PASSED" if not failures else f"{len(failures)} FAILED: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
