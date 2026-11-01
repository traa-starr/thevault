"""Self-test for the library, database and journal. Builds throwaway libraries in the system temp folder.

    python server/test_library.py
"""
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

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
    import json
    with open(root / JOURNAL_NAME, "a", encoding="utf-8") as f:
        f.write(json.dumps(late) + "\n" + '{"id": "torn-')
    lib = open_library(root)
    check("a journal line the database missed is applied on open; a torn last line is ignored",
          lib.store.conn.execute("SELECT text FROM tags WHERE id='late'").fetchone() is not None)
    lib.close()

    print()
    print("ALL PASSED" if not failures else f"{len(failures)} FAILED: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
