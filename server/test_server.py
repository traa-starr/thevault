"""Self-test for the server. Uses a throwaway library in the temp folder, never the real one: python server/test_server.py"""
import builtins
import ctypes
import hashlib
import http.client
import json
import os
import subprocess
import sys
import tempfile
import threading
import time
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from vault_server import scanner, server, songs as songs_module  # noqa: E402
from vault_server.library import DB_NAME, JOURNAL_NAME, MARKER_NAME, LibraryMissing, init_library, open_library  # noqa: E402
from vault_server.store import LOCK_NAME, Busy, now, write_lock  # noqa: E402
from vault_server.tags import tags_by_song  # noqa: E402

failures = []
OFFLINE = 0x1000


def check(name, ok, detail=""):
    print(("PASS  " if ok else "FAIL  ") + name + (f"  {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(name)


def pad_journal(lib, song_id, lines=7200):
    """A journal the size of the real one, for the timing checks. Setup only: the lines are written in one go and taken
    in by the store's own catch-up (one transaction), not 7,200 separate writes (4.5 minutes a run). Every write the
    checks then time goes through the normal path."""
    entries = [{"id": str(uuid.uuid4()), "ts": now(), "kind": "song_place",
                "data": {"path": "x" * 200, "song_id": song_id, "state": "likely", "why": "timing"}} for _ in range(lines)]
    with open(lib.store.journal_path, "ab") as f:
        f.write("".join(json.dumps(e, ensure_ascii=False, sort_keys=True) + chr(10) for e in entries).encode("utf-8"))
    lib.store._catch_up()


def add_song(lib, path, data, cloud=False, state="sure", title=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    key = f"src:{path}|{len(data)}"
    st = path.stat()
    lib.store.upsert_source(str(path), key, path.parent.name, path.name, len(data), st.st_mtime, cloud, now())
    song_id = str(uuid.uuid4())
    lib.store.record("song_new", {"song_id": song_id, "version_id": str(uuid.uuid4()), "file_key": key, "orig_name": path.name,
                                  "title": title or path.stem, "places": [{"path": str(path), "state": state, "why": "same_file"}]})
    return song_id


def folder_state(root):
    """Names, sizes, times and contents of every file."""
    h = hashlib.sha256()
    for p in sorted(Path(root).rglob("*")):
        if p.is_file():
            st = p.stat()
            h.update(f"{p}|{st.st_size}|{st.st_mtime_ns}|".encode())
            h.update(p.read_bytes())
    return h.hexdigest()


def write_path(tmp):
    """POST /changes: Mine, Not mine, Undo."""
    music, root = tmp / "wmusic", tmp / "wlib"
    lib = init_library(root)
    guessed = add_song(lib, music / "guessed.mp3", b"a")
    blank = add_song(lib, music / "blank.mp3", b"b")
    merged_away = add_song(lib, music / "merged away.mp3", b"c")
    merged_into = add_song(lib, music / "merged into.mp3", b"d")
    lib.store.record("song_field", {"song_id": guessed, "field": "mine", "value": "likely mine", "origin": "guess", "basis": "title"})
    lib.close()
    music_before = folder_state(music)
    servers = server.start_servers(root, [server.LOOPBACK], 0)
    port = servers[0].server_port

    def post(body, headers=None, host=None):
        c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=30)
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        c.putrequest("POST", "/changes", skip_host=bool(host))
        if host:
            c.putheader("Host", host)
        for k, v in ({server.CLIENT_HEADER: "app", "Content-Length": str(len(data))} if headers is None else headers).items():
            c.putheader(k, v)
        c.endheaders()
        try:
            c.send(data)
            r = c.getresponse()
            reply = r.read()
        except ConnectionError:  # refused before the body was read
            return 0, {}
        finally:
            c.close()
        return r.status, json.loads(reply)

    def change(kind, song, value=None, change_id=None):
        return {"id": change_id or str(uuid.uuid4()), "kind": kind, "data": {"song_id": song, **({"value": value} if value else {})}}

    def send(*changes):
        status, reply = post({"changes": list(changes)})
        return [x["status"] for x in reply["results"]] if status == 200 else status

    def listed(path="/songs"):
        c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=10)
        c.request("GET", path)
        out = {s["id"]: s for s in json.loads(c.getresponse().read())["songs"]}
        c.close()
        return out

    journal = root / JOURNAL_NAME
    lines = lambda: journal.read_text(encoding="utf-8").count("\n")

    # the phone's list and the hidden list
    check("before any change: nothing hidden, nothing sorted", listed("/songs?hidden=1") == {} and not any(s["sorted"] for s in listed().values()))
    held = [lines()]

    # refusals: nothing reaches the journal
    good = change("mine_set", guessed, "not mine")
    data = json.dumps({"changes": [good]}).encode()
    check("missing header refused", post(data, {"Content-Length": str(len(data))})[0] == 403)
    check("unknown address name refused", post(data, host="evil.example.com")[0] == 403)
    check("no length refused", post(b"", {server.CLIENT_HEADER: "app"})[0] == 411)
    check("too much at once refused", post(b"", {server.CLIENT_HEADER: "app", "Content-Length": str(server.MAX_BODY + 1)})[0] in (0, 413))
    for bad in (b"not json", b"[]", b'{"changes": "x"}', b'{"other": []}', b"[" * 100000):
        check(f"bad body refused: {bad[:12]!r}", post(bad)[0] == 400)
    check("bad kind refused", send(change("song_merge", guessed)) == ["refused"])
    check("a tag with no tag id or second refused", send(change("tag_add", guessed)) == ["refused"])
    check("bad value refused", send(change("mine_set", guessed, "maybe")) == ["refused"])
    check("unknown song refused", send(change("mine_set", str(uuid.uuid4()), "mine")) == ["refused"])
    check("unknown song restore refused", send(change("mine_restore", str(uuid.uuid4()))) == ["refused"])
    check("bad id refused", send({"id": "../x", "kind": "mine_set", "data": {"song_id": guessed, "value": "mine"}}) == ["refused"])
    check("a change that isn't an object refused", send("x", 3, None) == ["refused"] * 3)
    check("refused changes reach no journal line", lines() == held[0])

    # not mine, repeat, undo
    opened_for_writing = []
    real_open = builtins.open

    def watching_open(file, mode="r", *a, **k):
        if set(mode) & set("wax+") and str(music) in str(file):
            opened_for_writing.append(file)
        return real_open(file, mode, *a, **k)

    builtins.open = watching_open
    try:
        check("not mine saved", send(good) == ["saved"])
        check("not mine leaves the list and joins the hidden list", guessed not in listed() and guessed in listed("/songs?hidden=1"))
        check("the hidden song is flagged sorted", listed("/songs?hidden=1")[guessed]["sorted"] is True)
        c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=10)
        c.request("GET", "/songs")
        check("the song list counts it as hidden", json.loads(c.getresponse().read())["hidden"] == len(listed("/songs?hidden=1")))
        c.close()
        n = lines()
        check("repeated id does nothing", send(good) == ["nothing to do"] and lines() == n)
        check("same call under a new id does nothing", send(change("mine_set", guessed, "not mine")) == ["nothing to do"] and lines() == n)
        undo = change("mine_restore", guessed)
        check("undo saved", send(undo) == ["saved"])
        song = listed()[guessed]
        check("undo restores the guess", song["mine"] == "likely mine" and song["sorted"] is False)
        n = lines()
        check("repeated undo does nothing", send(undo) == ["nothing to do"] and lines() == n)
        check("undo with nothing to undo does nothing", send(change("mine_restore", guessed)) == ["nothing to do"] and lines() == n)

        # restores unwind in order
        send(change("mine_set", blank, "mine"))
        check("mine shows as mine and sorted", listed()[blank]["mine"] == "mine" and listed()[blank]["sorted"] is True)
        send(change("mine_set", blank, "not mine"))
        send(change("mine_restore", blank))
        check("undoing not mine goes back to mine", listed()[blank]["mine"] == "mine" and listed()[blank]["sorted"] is True)
        send(change("mine_restore", blank))
        check("undoing mine goes back to no value", listed()[blank]["mine"] == "unknown" and listed()[blank]["sorted"] is False)

        # a batch: each change gets its own answer, in order
        check("a list gets one answer each", send(change("mine_set", blank, "mine"), change("mine_set", blank, "bad"),
                                                  change("mine_set", merged_away, "not mine")) == ["saved", "refused", "saved"])
        send(change("mine_set", guessed, "not mine"))
        check("hidden list: newest-hidden first", list(listed("/songs?hidden=1"))[:2] == [guessed, merged_away])
        send(change("mine_restore", guessed))
    finally:
        builtins.open = real_open
    check("no music file opened for writing", opened_for_writing == [], str(opened_for_writing))

    # busy: the lock is held elsewhere
    server_wait = server.write_lock
    server.write_lock = lambda path: server_wait(path, wait=0.2)
    done, entered = threading.Event(), threading.Event()

    def holder():
        with write_lock(root / LOCK_NAME):
            entered.set()
            done.wait(10)

    t = threading.Thread(target=holder)
    t.start()
    entered.wait(10)
    n = lines()
    status, reply = post({"changes": [change("mine_set", guessed, "mine")]})
    check("lock held elsewhere answers busy, writes nothing", status == 503 and "busy" in reply["error"] and lines() == n)
    done.set()
    t.join()
    server.write_lock = server_wait
    check("works again once the lock is free", send(change("mine_set", guessed, "mine")) == ["saved"])
    send(change("mine_restore", guessed))

    server.stop_servers(servers)

    # a merge carries the verdict along, and Undo still finds it
    lib = open_library(root)
    lib.store.record("song_merge", {"from_id": merged_away, "into_id": merged_into})
    check("restore follows a merged song", songs_module.restore_mine(lib.store, merged_into))
    check("restored merged song has no value", not lib.store.conn.execute(
        "SELECT 1 FROM song_fields WHERE song_id=? AND field='mine'", (merged_into,)).fetchone())
    songs_module.set_mine(lib.store, merged_into, "not mine")

    # a re-scan keeps a verdict
    real_which, real_tags = songs_module.shutil.which, songs_module.scanner.read_name_tags
    songs_module.shutil.which = lambda name: name
    songs_module.scanner.read_name_tags = lambda path: ([], True)
    try:
        songs_module.fill_mine(lib)
    finally:
        songs_module.shutil.which, songs_module.scanner.read_name_tags = real_which, real_tags
    row = lib.store.conn.execute("SELECT value, origin FROM song_fields WHERE song_id=? AND field='mine'", (merged_into,)).fetchone()
    check("a re-scan keeps a verdict", tuple(row) == ("not mine", "manual"))

    # rebuild from the journal gives the same result
    before = lib.store.snapshot()
    lib.close()
    (root / DB_NAME).unlink()
    lib = open_library(root)
    check("rebuild from journal gives the same result", lib.store.snapshot() == before)

    # the lock
    lock = root / LOCK_NAME
    with write_lock(lock):
        with write_lock(lock):
            pass  # the same thread can take it again
        outcome = []

        def other():
            try:
                with write_lock(lock, wait=0.1):
                    outcome.append("got it")
            except Busy:
                outcome.append("busy")

        t = threading.Thread(target=other)
        t.start()
        t.join()
    check("a second writer waits, then gets busy", outcome == ["busy"], str(outcome))
    with write_lock(lock, wait=0.1):
        check("the lock frees when released", True)
    lib.close()
    check("music folder unchanged by writes", folder_state(music) == music_before)

    # library gone: nothing created
    ghost = tmp / "wghost"
    ghost.mkdir()
    try:
        server.apply_changes(ghost, [])
        check("write to a missing library refused", False)
    except LibraryMissing:
        check("write to a missing library refused, creates nothing", list(ghost.iterdir()) == [])

    # how long a write takes with a journal the size of the real one
    lib = open_library(root)
    pad_journal(lib, merged_into)
    lib.close()
    start = time.perf_counter()
    results = server.apply_changes(root, [change("mine_set", blank, "not mine")])
    took = time.perf_counter() - start
    print(f"      one write with a 7,200-line journal: {took * 1000:.0f} ms")
    check("a write stays quick with a real-sized journal", results[0]["status"] == "saved" and took < 2, f"{took:.2f}s")


def tag_path(tmp):
    """POST /changes tag_add and tag_remove, GET /tags, merges, and rebuilding from the journal."""
    music, root = tmp / "tmusic", tmp / "tlib"
    lib = init_library(root)
    song = add_song(lib, music / "song.mp3", b"a")
    away = add_song(lib, music / "away.mp3", b"b")
    stays = add_song(lib, music / "stays.mp3", b"c")
    vid = lib.store.conn.execute("SELECT id FROM versions WHERE song_id=?", (song,)).fetchone()[0]
    other_vid = lib.store.conn.execute("SELECT id FROM versions WHERE song_id=?", (stays,)).fetchone()[0]
    lib.store.record("song_merge", {"from_id": away, "into_id": stays})
    # an old-style line written before made_at existed must still replay
    lib.store.record("tag_add", {"tag_id": "old-style", "song_id": song, "text": "from before", "at_sec": 3.5})
    lib.close()
    journal = root / JOURNAL_NAME
    lines = lambda: journal.read_text(encoding="utf-8").count("\n")
    servers = server.start_servers(root, [server.LOOPBACK], 0)
    port = servers[0].server_port

    def send(*changes):
        data = json.dumps({"changes": list(changes)}).encode()
        c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=30)
        c.request("POST", "/changes", data, {server.CLIENT_HEADER: "app", "Content-Length": str(len(data))})
        reply = json.loads(c.getresponse().read())
        c.close()
        return [x["status"] for x in reply["results"]]

    def tags():
        c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=10)
        c.request("GET", "/tags")
        r = c.getresponse()
        out = {t["id"]: t for t in json.loads(r.read())["tags"]} if r.status == 200 else r.status
        c.close()
        return out

    def tag(tag_id, song_id=song, text="hook here", at=102.3456, change_id=None, **more):
        return {"id": change_id or str(uuid.uuid4()), "kind": "tag_add",
                "data": {"tag_id": tag_id, "song_id": song_id, "text": text, "at_sec": at, **more}}

    def untag(tag_id, song_id=song):
        return {"id": str(uuid.uuid4()), "kind": "tag_remove", "data": {"tag_id": tag_id, "song_id": song_id}}

    try:
        check("GET /tags lists the old-style tag, made_at from its line", tags()["old-style"]["made_at"] is not None)
        first = tag("t1", text="  hook here  ", version_id=vid, made_at="2026-11-07T10:00:00.000Z")
        check("a tag is saved", send(first) == ["saved"])
        t = tags()["t1"]
        check("words trimmed, second kept to 3 decimals, version and made_at kept",
              (t["text"], t["at_sec"], t["version_id"], t["made_at"], t["song_id"]) == ("hook here", 102.346, vid, "2026-11-07T10:00:00.000Z", song))
        n = lines()
        check("a resend does nothing", send(first) == ["nothing to do"] and lines() == n)
        check("the same values under a new change id do nothing", send(tag("t1", version_id=vid, made_at="x")) == ["nothing to do"] and lines() == n)
        check("an edit is saved", send(tag("t1", text="new words", at=50, version_id=vid, made_at="2030-01-01T00:00:00.000Z")) == ["saved"])
        t = tags()["t1"]
        check("an edit keeps made_at from the first line", (t["text"], t["at_sec"], t["made_at"]) == ("new words", 50.0, "2026-11-07T10:00:00.000Z"))
        check("no version sent: the song's current version is filled in", send(tag("nov")) == ["saved"] and tags()["nov"]["version_id"] == vid)
        check("its resend under a new change id does nothing", send(tag("nov")) == ["nothing to do"])
        check("long words capped at 500", send(tag("long", text="x" * 600)) == ["saved"] and len(tags()["long"]["text"]) == 500)
        check("empty words allowed (a mark)", send(tag("mark", text="")) == ["saved"] and tags()["mark"]["text"] == "")
        check("emoji and other languages kept", send(tag("emoji", text="🔥 ここ")) == ["saved"] and tags()["emoji"]["text"] == "🔥 ここ")
        check("a new tag with no made_at gets one", tags()["mark"]["made_at"])
        n = lines()
        for name, bad in (("unknown song", tag("u", song_id=str(uuid.uuid4()))), ("no second", tag("u", at=None)),
                          ("negative second", tag("u", at=-1)), ("words not text", tag("u", text=5)),
                          ("another song's version", tag("u", version_id=other_vid)), ("no tag id", tag(None)),
                          ("second as true", tag("u", at=True))):
            check(f"refused: {name}", send(bad) == ["refused"])
        check("refused tags reach no journal line", lines() == n and "u" not in tags())
        check("a tag on a merged-away song follows the merge", send(tag("m", song_id=away)) == ["saved"] and tags()["m"]["song_id"] == stays)
        check("a delete is saved", send(untag("mark")) == ["saved"] and "mark" not in tags())
        n = lines()
        check("deleting a gone tag does nothing", send(untag("mark")) == ["nothing to do"] and lines() == n)
        check("an undo puts the old tag back", send(tag("mark", text="", made_at="anything")) == ["saved"] and "mark" in tags())
    finally:
        server.stop_servers(servers)

    lib = open_library(root)
    before = lib.store.snapshot()
    lib.close()
    (root / DB_NAME).unlink()
    lib = open_library(root)
    after = lib.store.snapshot()
    lib.close()
    check("tags rebuild from the journal row for row, old-style line included",
          after["tags"] == before["tags"] and len(before["tags"]) == 7, str(len(before["tags"])))
    # the tags command (2.7): every tag under its song, the second to 3 decimals, a filter by title
    lib = open_library(root)
    listed = tags_by_song(lib.store.conn)
    only = tags_by_song(lib.store.conn, "no such title")
    lib.close()
    check("tags command lists every tag per song", listed[-1] == "7 tags on 2 songs." and any(l.strip().startswith("0:03.500  from before") for l in listed),
          " | ".join(listed[-3:]))
    check("tags command filter by title", only == ["No tags on a title with 'no such title'."], str(only))


def sorting_path(tmp):
    """GET /sorting: unjudged songs, likely mine first, folder and name sets. Then a big sweep and its Undo."""
    music, root = tmp / "smusic", tmp / "slib"
    lib = init_library(root)
    takes = [add_song(lib, music / "Takes" / f"Mmmm-00{n}.mp3", b"t%d" % n) for n in range(1, 4)]
    loose = [add_song(lib, music / "Loose" / name, name.encode()) for name in ("Mmmm 4.mp3", "Mmmm (2) copy.mp3", "10.12.mp3")]
    likely = add_song(lib, music / "Loose" / "zz likely.mp3", b"likely")
    phone_call = add_song(lib, music / "Loose" / "judged on phone.mp3", b"phone")
    triage_call = add_song(lib, music / "Loose" / "judged in triage.mp3", b"triage")
    lone = add_song(lib, music / "Alone" / "only one.mp3", b"one")
    lib.store.record("song_field", {"song_id": likely, "field": "mine", "value": "likely mine", "origin": "guess", "basis": "title"})
    lib.store.record("song_field", {"song_id": triage_call, "field": "mine", "value": "mine", "origin": "guess", "basis": "verdict"})
    songs_module.set_mine(lib.store, phone_call, "not mine")
    lib.close()

    conn = server.connect_readonly(root)
    view = server.sorting_view(conn)
    conn.close()
    ids = [s["id"] for s in view["songs"]]
    sets = {s["name"]: s["songs"] for s in view["sets"]}
    check("sort leaves out songs I judged, on the phone or in triage", phone_call not in ids and triage_call not in ids and len(ids) == 8)
    check("sort counts every song for progress", view["total"] == 10)
    check("likely mine comes first", ids[0] == likely)
    check("folder sets: 2 or more songs, biggest first", list(sets)[:2] == ["Loose", "Takes"] and "Alone" not in sets
          and sets["Takes"] == takes, list(sets))
    check("a name set gathers takes across folders", sorted(sets.get("Mmmm…", [])) == sorted(takes + loose[:2]), list(sets))
    check("a date-only name makes no name set", not any(n.startswith("10") for n in sets))
    check("names strip numbers and copies", [server.name_stem(x) for x in ("Mmmm-002", "Mmmm 3", "Mmmm (1) copy", "Beat v2", "10.12")]
          == ["Mmmm", "Mmmm", "Mmmm", "Beat", ""])

    # a big sweep and its Undo, with a journal the size of the real one
    lib = open_library(root)
    pad_journal(lib, lone)
    many = [add_song(lib, music / "Big" / f"song {n}.mp3", b"big%d" % n) for n in range(300)]
    lib.close()
    change = lambda kind, song, value=None: {"id": str(uuid.uuid4()), "kind": kind, "data": {"song_id": song, **({"value": value} if value else {})}}
    start = time.perf_counter()
    swept = server.apply_changes(root, [change("mine_set", s, "mine") for s in many])
    sweep_took = time.perf_counter() - start
    start = time.perf_counter()
    undone = server.apply_changes(root, [change("mine_restore", s) for s in many])
    undo_took = time.perf_counter() - start
    print(f"      sweep of 300 songs: {sweep_took * 1000:.0f} ms, its Undo: {undo_took * 1000:.0f} ms")
    conn = server.connect_readonly(root)
    back = {s["id"] for s in server.sorting_view(conn)["songs"]}
    conn.close()
    check("a sweep saves every song", all(r["status"] == "saved" for r in swept))
    check("its Undo puts every one back, and only those", all(r["status"] == "saved" for r in undone) and set(many) <= back
          and phone_call not in back)
    check("a 300-song Undo stays quick with a real-sized journal", undo_took < 10, f"{undo_took:.1f}s")


def phone_backup_path(tmp):
    """POST and GET /phone-backup: one file in the library folder, replaced whole, never in the journal."""
    root = tmp / "blib"
    init_library(root).close()
    journal_before = (root / JOURNAL_NAME).read_bytes()
    servers = server.start_servers(root, [server.LOOPBACK], 0)
    port = servers[0].server_port

    def call(method, body=None, headers=None):
        c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=10)
        data = body if isinstance(body, bytes) or body is None else json.dumps(body).encode()
        c.putrequest(method, "/phone-backup")
        hdrs = {server.CLIENT_HEADER: "app"} if headers is None else headers
        if data is not None:
            hdrs = {**hdrs, "Content-Length": str(len(data))}
        for k, v in hdrs.items():
            c.putheader(k, v)
        c.endheaders()
        if data is not None:
            c.send(data)
        r = c.getresponse()
        out = json.loads(r.read())
        c.close()
        return r.status, out

    check("backup: none yet reads as nothing", call("GET") == (200, {"backup": None}))
    first = {"stamp": "2026-11-01 10:00", "notSure": ["a"], "outbox": [{"id": "x"}]}
    status, reply = call("POST", first)
    check("backup: saved, with the laptop's time", status == 200 and reply["saved_at"])
    status, reply = call("GET")
    check("backup: reads back what was sent", status == 200 and reply["backup"]["notSure"] == ["a"] and reply["backup"]["saved_at"])
    call("POST", {**first, "notSure": []})
    check("backup: a new one replaces the old whole", call("GET")[1]["backup"]["notSure"] == [])
    check("backup: refused without the app header", call("POST", first, headers={})[0] == 403)
    for bad in (b"not json", b"[]", json.dumps({"notSure": []}).encode(), json.dumps({"stamp": ""}).encode()):
        check(f"backup: bad body refused: {bad[:14]!r}", call("POST", bad)[0] == 400)
    check("backup: a refused one leaves the last good one", call("GET")[1]["backup"]["stamp"] == first["stamp"])
    check("backup: the journal never sees it", (root / JOURNAL_NAME).read_bytes() == journal_before)
    check("backup: no temp files left", sorted(p.name for p in root.glob("phone-backup*")) == ["phone-backup.json"])
    server.stop_servers(servers)


def rating_path(tmp):
    """POST /changes rating_set (2.8): fire / shelved / none, latest wins, in /songs and /status, merges, a rebuild from
    the journal, and the ratings command."""
    from vault_server.songs import ratings_report
    music, root = tmp / "rmusic", tmp / "rlib"
    lib = init_library(root)
    a = add_song(lib, music / "a.mp3", b"a", title="Alpha")
    b = add_song(lib, music / "b.mp3", b"b", title="Beta")
    away = add_song(lib, music / "away.mp3", b"c")
    stays = add_song(lib, music / "stays.mp3", b"d", title="Stays")
    rated_away = add_song(lib, music / "rated-away.mp3", b"e")
    keeps = add_song(lib, music / "keeps.mp3", b"f", title="Keeps")
    lib.close()
    journal = root / JOURNAL_NAME
    lines = lambda: journal.read_text(encoding="utf-8").count("\n")
    servers = server.start_servers(root, [server.LOOPBACK], 0)
    port = servers[0].server_port

    def send(*changes):
        data = json.dumps({"changes": list(changes)}).encode()
        c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=30)
        c.request("POST", "/changes", data, {server.CLIENT_HEADER: "app", "Content-Length": str(len(data))})
        reply = json.loads(c.getresponse().read())
        c.close()
        return [x["status"] for x in reply["results"]]

    def get(path):
        c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=10)
        c.request("GET", path)
        out = json.loads(c.getresponse().read())
        c.close()
        return out

    rating = lambda song: {s["id"]: s["rating"] for s in get("/songs")["songs"]}.get(song, "gone")
    rate = lambda song, value, change_id=None: {"id": change_id or str(uuid.uuid4()), "kind": "rating_set", "data": {"song_id": song, "value": value}}
    try:
        check("rating: unrated songs list as null", rating(a) is None)
        first = rate(a, "fire")
        check("rating: Fire is saved and listed", send(first) == ["saved"] and rating(a) == "fire")
        n = lines()
        check("rating: a resend does nothing", send(first) == ["nothing to do"] and lines() == n)
        check("rating: the same rating under a new id does nothing", send(rate(a, "fire")) == ["nothing to do"] and lines() == n)
        check("rating: the latest wins", send(rate(a, "shelved")) == ["saved"] and rating(a) == "shelved")
        # offline: Shelve then Undo arrive together, in order (tester, board 2026-11-09)
        check("rating: shelve then undo in one send ends unrated", send(rate(b, "shelved"), rate(b, "none")) == ["saved", "saved"] and rating(b) is None)
        check("rating: none on an unrated song does nothing", send(rate(b, "none")) == ["nothing to do"])
        n = lines()
        for name, bad in (("unknown song", rate(str(uuid.uuid4()), "fire")), ("a made-up value", rate(a, "five stars")), ("no value", rate(a, None))):
            check(f"rating refused: {name}", send(bad) == ["refused"])
        check("rating: refused ones reach no journal line", lines() == n)
        check("rating: Not mine then Mine again keeps it", send({"id": str(uuid.uuid4()), "kind": "mine_set", "data": {"song_id": a, "value": "not mine"}},
                                                                {"id": str(uuid.uuid4()), "kind": "mine_set", "data": {"song_id": a, "value": "mine"}}) == ["saved", "saved"]
              and rating(a) == "shelved")
        send(rate(rated_away, "fire"), rate(keeps, "shelved"), rate(b, "fire"))
        st = get("/status")
        check("rating: /status counts them", (st["fire"], st["shelved"]) == (2, 2), str(st))
        check("rating: a rating never asks for phone copies", not server.asks_mine([rate(a, "fire")]))
    finally:
        server.stop_servers(servers)
    lib = open_library(root)
    lib.store.record("song_merge", {"from_id": rated_away, "into_id": stays})  # unrated survivor takes the joining song's
    lib.store.record("song_merge", {"from_id": away, "into_id": keeps})  # a rated survivor keeps its own
    row = lambda song: (lib.store.conn.execute("SELECT value FROM song_ratings WHERE song_id=?", (song,)).fetchone() or [None])[0]
    check("rating: a merge hands an unrated survivor the rating", row(stays) == "fire" and row(rated_away) is None)
    check("rating: a rated survivor keeps its own", row(keeps) == "shelved")
    check("rating: a rating for a merged-away song follows the merge", songs_module.set_rating(lib.store, rated_away, "shelved") and row(stays) == "shelved")
    report = ratings_report(lib.store.conn)
    before = lib.store.snapshot()
    lib.close()
    check("ratings command lists them in plain words", report[0].startswith("Favorite Beta") and report[-1] == "1 Favorite, 3 Archived.", " | ".join(report))
    (root / DB_NAME).unlink()
    lib = open_library(root)
    after = lib.store.snapshot()
    lib.close()
    check("ratings rebuild from the journal row for row", after["song_ratings"] == before["song_ratings"] and len(before["song_ratings"]) == 4,
          str(before["song_ratings"]))


def plays_path(tmp):
    """POST /changes play_add (overhaul wave 1): one line per play, a longer line for the same play, counts and last
    heard in /songs and /status, a wrong phone clock, 50 plays made offline, merges, a rebuild, the plays command."""
    from vault_server.songs import plays_report
    music, root = tmp / "pmusic", tmp / "plib"
    lib = init_library(root)
    a = add_song(lib, music / "a.mp3", b"a", title="Alpha")
    b = add_song(lib, music / "b.mp3", b"b", title="Beta")
    away = add_song(lib, music / "away.mp3", b"c")
    stays = add_song(lib, music / "stays.mp3", b"d", title="Stays")
    lib.close()
    journal = root / JOURNAL_NAME
    lines = lambda: journal.read_text(encoding="utf-8").count("\n")
    servers = server.start_servers(root, [server.LOOPBACK], 0)
    port = servers[0].server_port

    def send(*changes):
        data = json.dumps({"changes": list(changes)}).encode()
        c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=30)
        c.request("POST", "/changes", data, {server.CLIENT_HEADER: "app", "Content-Length": str(len(data))})
        reply = json.loads(c.getresponse().read())
        c.close()
        return [x["status"] for x in reply["results"]]

    def get(path):
        c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=10)
        c.request("GET", path)
        out = json.loads(c.getresponse().read())
        c.close()
        return out

    row = lambda song: next(((s["plays"], s["last_heard"]) for s in get("/songs")["songs"] if s["id"] == song), "gone")
    play = lambda song, at, seconds=30, play_id=None, **more: {"id": str(uuid.uuid4()), "kind": "play_add", "data": {
        "play_id": play_id or str(uuid.uuid4()), "song_id": song, "started_at": at, "seconds": seconds, "source": "phone", **more}}
    try:
        check("plays: a song never played lists 0 and no last heard", row(a) == (0, None), str(row(a)))
        first = play(a, "2026-11-01T10:00:00.000Z")
        check("plays: a play is saved and counted", send(first) == ["saved"] and row(a) == (1, "2026-11-01T10:00:00.000000Z"), str(row(a)))
        n = lines()
        check("plays: a resend of the same line does nothing", send(first) == ["nothing to do"] and lines() == n and row(a)[0] == 1)
        pid = first["data"]["play_id"]
        check("plays: the same play, left later, is one play made longer", send(play(a, "2026-11-01T10:00:00.000Z", 201.4, pid)) == ["saved"] and row(a)[0] == 1)
        check("plays: a shorter line for the same play does nothing", send(play(a, "2026-11-01T10:00:00.000Z", 30, pid)) == ["nothing to do"])
        check("plays: a second listen is a second play", send(play(a, "2026-11-02T09:00:00.000Z")) == ["saved"] and row(a) == (2, "2026-11-02T09:00:00.000000Z"), str(row(a)))
        check("plays: last heard is the latest start, not the latest to arrive", send(play(a, "2026-10-20T09:00:00.000Z")) == ["saved"]
              and row(a) == (3, "2026-11-02T09:00:00.000000Z"), str(row(a)))
        # a phone clock a year ahead: the play counts, and last heard is never later than when the laptop got it
        send(play(b, "2099-01-01T00:00:00.000Z"))
        check("plays: a start time in the future becomes now", row(b)[0] == 1 and row(b)[1] < "2090", str(row(b)))
        check("plays: a start time with an offset is kept as the same moment", send(play(b, "2026-11-03T12:00:00+02:00")) == ["saved"])
        n = lines()
        for name, bad in (("unknown song", play(str(uuid.uuid4()), "2026-11-01T10:00:00Z")), ("no start time", play(a, None)),
                          ("a start time that isn't one", play(a, "yesterday")), ("no time zone", play(a, "2026-11-01T10:00:00")),
                          ("seconds that aren't a number", play(a, "2026-11-01T10:00:00Z", "30")), ("negative seconds", play(a, "2026-11-01T10:00:00Z", -1)),
                          ("a made-up source", play(a, "2026-11-01T10:00:00Z", source="radio")), ("no play id", play(a, "2026-11-01T10:00:00Z", play_id="x"))):
            check(f"play refused: {name}", send(bad) == ["refused"])
        check("plays: refused ones reach no journal line", lines() == n)
        # laptop off for days: 50 plays arrive in one send, and the whole send again (the answer was lost)
        many = [play(stays, f"2026-11-04T{10 + i // 60:02d}:{i % 60:02d}:00.000Z") for i in range(50)]
        check("plays: 50 made offline all count", send(*many) == ["saved"] * 50 and row(stays)[0] == 50, str(row(stays)))
        check("plays: the same 50 sent again count nothing", send(*many) == ["nothing to do"] * 50 and row(stays)[0] == 50)
        send(play(away, "2026-11-05T10:00:00.000Z"))
        st = get("/status")
        check("plays: /status counts plays and songs played", (st["plays"], st["played"]) == (56, 4) and "2026-11-05" <= st["last_play"] < "2090", str(st))
        check("plays: a play never asks for phone copies", not server.asks_mine([first]))
    finally:
        server.stop_servers(servers)
    lib = open_library(root)
    lib.store.record("song_merge", {"from_id": away, "into_id": stays})
    count = lambda song: lib.store.conn.execute("SELECT COUNT(*) FROM plays WHERE song_id=?", (song,)).fetchone()[0]
    check("plays: a merge hands the survivor the plays", count(stays) == 51 and count(away) == 0)
    check("plays: a play for a merged-away song follows the merge",
          songs_module.add_play(lib.store, {"play_id": str(uuid.uuid4()), "song_id": away, "started_at": "2026-11-06T10:00:00Z", "seconds": 40}) and count(stays) == 52)
    report = plays_report(lib.store.conn)
    before = lib.store.snapshot()
    lib.close()
    check("plays command: totals, most played first, latest plays", report[0] == "57 plays of 3 songs." and "Stays" in report[3] and "  52  " in report[3]
          and any("Latest plays" in line for line in report), " | ".join(report[:5]))
    (root / DB_NAME).unlink()
    lib = open_library(root)
    after = lib.store.snapshot()
    lib.close()
    check("plays rebuild from the journal row for row", after["plays"] == before["plays"] and len(before["plays"]) == 57, str(len(before["plays"])))


def timings_path(tmp):
    """POST /timings: the phone's numbers in their own file, never the journal; the timings command reads them."""
    from vault_server.timings import TIMINGS_NAME, timings_report
    root = tmp / "tlib"
    init_library(root).close()
    journal_before = (root / JOURNAL_NAME).read_bytes()
    check("timings: none yet says so", "No timings" in timings_report(root)[0])
    servers = server.start_servers(root, [server.LOOPBACK], 0)
    port = servers[0].server_port

    def post(body, headers=None):
        c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=10)
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        c.putrequest("POST", "/timings")
        for k, v in {**({server.CLIENT_HEADER: "app"} if headers is None else headers), "Content-Length": str(len(data))}.items():
            c.putheader(k, v)
        c.endheaders()
        c.send(data)
        r = c.getresponse()
        out = json.loads(r.read())
        c.close()
        return r.status, out

    report = {"version": "test", "samples": [
        {"kind": "search", "ms": 9.4, "tags": 27000}, {"kind": "search", "ms": 31, "tags": 27000},
        {"kind": "next", "ms": 420, "path": "session"}, {"kind": "next", "ms": 1300, "path": "session"},
        {"kind": "next", "ms": 250, "path": "sort"},
        {"kind": "search", "ms": 5, "tags": 3, "text": "my secret lyric"},  # kept, but its text never is
        {"kind": "next", "ms": 5, "path": "elsewhere"}, {"kind": "x"}, "junk", {"kind": "search", "ms": True, "tags": 1},
    ]}
    check("timings: a fake phone report is taken", post(report) == (200, {"kept": 6}))
    saved = (root / TIMINGS_NAME).read_text(encoding="utf-8")
    check("timings: numbers only, never text", "secret" not in saved and saved.count(chr(10)) == 6)
    check("timings: refused without the app header", post(report, headers={})[0] == 403)
    for bad in (b"not json", b"[]", json.dumps({"samples": "x"}).encode()):
        check(f"timings: bad body refused: {bad[:12]!r}", post(bad)[0] == 400)
    lines = timings_report(root)
    print("      " + (chr(10) + "      ").join(lines))
    check("timings: command prints search typical and slow end", lines[0].startswith("Search: typical") and "27,000 tags" in lines[0] or "3 tags" in lines[0])
    check("timings: command prints Next per path, with how many went over 1 s",
          any(line.strip().startswith("session:") and "over 1 s: 1" in line for line in lines)
          and any("sort:" in line for line in lines))
    check("timings: too few samples aren't judged", any("session:" in line and "not enough yet" in line for line in lines))
    (root / TIMINGS_NAME).write_text(saved + "broken line" + chr(10), encoding="utf-8")
    check("timings: a broken line is skipped", len(timings_report(root)) == len(lines))
    # play first (2026-11-08): every path by name, its stages and source; judged against Sort, newest app code only
    staged = lambda path, ms, **more: {"kind": "next", "ms": ms, "path": path, "load": 5, "seek": 40, "start": 10, "reseek": False,
                                       "src": "phone", "ext": "mp3", **more}
    newer = {"version": "newer", "samples": [staged("sort", 90) for _ in range(5)]
             + [staged("session", 150) for _ in range(5)] + [staged("previous", 700, src="stream", ext="") for _ in range(5)]
             + [staged("lockscreen", 100), staged("search", 120), staged("restore", 130), staged("library", 50),
                staged("session", 120, ext="../x", src="disk", title="secret")]}
    check("timings: every path's samples are taken", post(newer) == (200, {"kept": 20}))
    lines = timings_report(root)
    print("      " + (chr(10) + "      ").join(lines))
    text = chr(10).join(lines)
    check("timings: only the newest app code is judged", "app code newer (20 of 23 samples" in text)
    check("timings: PASS within 2x Sort", any("session:" in l and l.endswith("PASS") for l in lines))
    check("timings: FAIL over 2x Sort, said why", any("previous:" in l and "FAIL (typical over 2x Sort's 90 ms)" in l for l in lines))
    check("timings: every path named", all(f"  {p}:" in text for p in ("session", "sort", "library", "previous", "lockscreen", "search", "restore")))
    check("timings: stages shown", "load 5, seek 40, start 10, app 95 ms; second seek 0 of 6" in text)
    check("timings: by source, file type kept, a bad one dropped", "phone mp3 150 ms (5)" in text and "stream 700 ms (5)" in text
          and "../x" not in (root / TIMINGS_NAME).read_text(encoding="utf-8") and "disk" not in text)
    check("timings: still never text", "secret" not in (root / TIMINGS_NAME).read_text(encoding="utf-8"))
    # energy (2026-11-09): per minute of playing, open and locked apart, judged against ceilings; the phone's copy count
    energy = lambda where, **more: {"kind": "energy", "where": where, "ms": 300000, "reports": 600, "redraws": 5, "net": 1,
                                    "writes": 5, "phone": 2, "stream": 0, **more}
    cool = {"version": "newer", "copies": {"stored": 670, "wanted": 671},
            "samples": [energy("locked"), energy("open", redraws=600), energy("locked", redraws=True), energy("attic"),
                        energy("locked", title="secret", ms=500)]}
    check("energy: samples taken, bad ones dropped", post(cool) == (200, {"kept": 2}))
    text = chr(10).join(timings_report(root))
    print("      " + text.replace(chr(10), chr(10) + "      "))
    check("energy: locked judged per minute, PASS under the ceilings",
          "locked (5 min): wake-ups 120, redraws 1.0, network calls 0.2, file writes 1.0. PASS" in text, text)
    check("energy: open PASS with the seek bar's redraws", "open (5 min): wake-ups 120, redraws 120.0" in text and text.count("PASS") >= 2)
    check("energy: plays by source", "Plays: 4 from the phone's copy, 0 streamed" in text)
    hot = {"version": "newer", "samples": [energy("locked", redraws=600, net=600)]}
    post(hot)
    text = chr(10).join(timings_report(root))
    check("energy: FAIL names what went over", "FAIL (redraws over 6, net over 2)" in text, text)
    check("phone count: kept and printed", "Mine songs on the phone: 670 of 671" in text and server.read_phone_count(root)["stored"] == 670)
    post({"version": "newer", "samples": [], "copies": {"stored": "x", "wanted": 1}})
    check("phone count: a bad one changes nothing", server.read_phone_count(root)["stored"] == 670)
    # the hang watch (2026-11-09): screen stalls over 2 s, with fixed words for the screen and tap, and the time watched
    check("hang watch: nothing yet says so", "Hang watch: nothing yet" in text)
    stall = lambda **more: {"kind": "stall", "ms": 3400, "screen": "Library+player", "tap": "pause", "gone": False, **more}
    quiet = {"version": "newer", "samples": [{"kind": "watch", "ms": 600000, "stalls": 0}, {"kind": "watch", "ms": 600000, "stalls": True}]}
    check("hang watch: a watch line is taken, a bad one dropped", post(quiet) == (200, {"kept": 1}))
    text = chr(10).join(timings_report(root))
    check("hang watch: 10 quiet minutes PASS", "watched 10 min on screen. PASS (quiet)" in text, text)
    stuck = {"version": "newer", "samples": [stall(), stall(ms=5200), stall(ms=0, gone=True, screen="Library", tap="open player"),
                                             stall(screen="My Song <Title>"), stall(tap=7), stall(gone="yes")]}
    check("hang watch: stalls taken, anything that isn't fixed words dropped", post(stuck) == (200, {"kept": 3}))
    text = chr(10).join(timings_report(root))
    print("      " + text.replace(chr(10), chr(10) + "      "))
    check("hang watch: FAIL counts the stalls", "FAIL (3 stalls)" in text, text)
    check("hang watch: a stall names its length, screen and tap", 'stuck 5.2 s at worst: Library+player after "pause" (2 times)' in text, text)
    check("hang watch: a screen that never came back is named", 'never came back (frozen, or closed within a second of the tap): Library after "open player" (1 time)' in text, text)
    check("hang watch: never a title", "My Song" not in (root / TIMINGS_NAME).read_text(encoding="utf-8"))
    check("timings: the journal never sees them", (root / JOURNAL_NAME).read_bytes() == journal_before)
    server.stop_servers(servers)


def lengths_path(tmp):
    """Song lengths (NEXT C): measured from the file the phone plays, never a cloud-only one, never journaled, sent in
    the song list; a failed one isn't retried every run."""
    from vault_server.lengths import fill_lengths, length_counts
    music, root = tmp / "lmusic", tmp / "llib"
    lib = init_library(root)
    here = add_song(lib, music / "here.mp3", b"a" * 100)
    cloud = add_song(lib, music / "cloud.mp3", b"never read", cloud=True)
    broken = add_song(lib, music / "broken.mp3", b"not audio")
    likely = add_song(lib, music / "likely.mp3", b"maybe another file", state="likely")
    lib.close()
    ok = ctypes.windll.kernel32.SetFileAttributesW(str(music / "cloud.mp3"), OFFLINE)
    check("lengths: test can mark a file cloud-only", ok)
    journal_before = (root / JOURNAL_NAME).read_bytes()
    probed = []
    fake = lambda path: (probed.append(Path(path).name), None if "broken" in str(path) else 183.4)[1]
    lib = open_library(root)
    counts = fill_lengths(lib, probe=fake)
    check("lengths: measured, unreadable and not-here counted", counts == {"measured": 1, "failed": 1, "not on this laptop": 2}, counts)
    check("lengths: a cloud-only or 'likely' file is never read", sorted(probed) == ["broken.mp3", "here.mp3"], probed)
    probed.clear()
    again = fill_lengths(lib, probe=fake)
    check("lengths: a second run measures nothing again (failed is remembered)", probed == [] and again["measured"] == 0, again)
    check("lengths: counts for the doctor", length_counts(lib.store.conn) == (4, 1))
    lib.close()
    check("lengths: the journal never sees them", (root / JOURNAL_NAME).read_bytes() == journal_before)
    conn = server.connect_readonly(root)
    listed = {song["id"]: song.get("length") for song in server.list_songs(conn)}
    sorting = {song["id"]: song.get("length") for song in server.sorting_view(conn)["songs"]}
    conn.close()
    check("lengths: the song list carries them (none where unknown)", listed == {here: 183.4, cloud: None, broken: None, likely: None}, listed)
    check("lengths: so does Sort's list", sorting.get(here) == 183.4, sorting)


def family_path(tmp):
    """Versions: link, Make main, Remove, Undo, and every refusal. The laptop is the guard against a phone that's wrong."""
    music, root = tmp / "fmusic", tmp / "flib"
    lib = init_library(root)
    a, b, c, d, hidden = (add_song(lib, music / f"{n}.mp3", n.encode()) for n in ("a", "b", "c", "d", "hidden"))
    loose = add_song(lib, music / "unsorted.mp3", b"unsorted")
    for sid in (a, b, c, d):
        songs_module.set_mine(lib.store, sid, "mine")
    songs_module.set_mine(lib.store, hidden, "not mine")
    lib.close()
    fam = lambda songs, before: {"id": str(uuid.uuid4()), "kind": "family_set", "data": {"song_id": next(iter(songs)), "songs": songs, "before": before}}
    send = lambda *cs: [r["status"] for r in server.apply_changes(root, list(cs))]
    def mains():
        conn = server.connect_readonly(root)
        try:
            return {s["id"]: s["main"] for s in server.list_songs(conn)}
        finally:
            conn.close()

    link = fam({b: a, a: a}, {b: None, a: None})
    check("link B to A saves", send(link) == ["saved"])
    check("the list shows both pointing at A", mains()[a] == a and mains()[b] == a and mains()[c] is None)
    check("the same link again does nothing", send(fam({b: a, a: a}, {b: a, a: a})) == ["nothing to do"])
    check("a stale before is refused", send(fam({c: a}, {c: b})) == ["refused"])
    check("a chain is refused", send(fam({c: b}, {c: None})) == ["refused"])
    check("a lone Main is refused", send(fam({c: c}, {c: None})) == ["refused"])
    check("a hidden song can't be a version", send(fam({hidden: a}, {hidden: None})) == ["refused"])
    check("an unsorted song can't be a version", send(fam({loose: a}, {loose: None})) == ["refused"])
    mine_then_link = [{"id": str(uuid.uuid4()), "kind": "mine_set", "data": {"song_id": loose, "value": "mine"}}, fam({loose: a}, {loose: None})]
    check("Mine and linked, in that order, saves", send(*mine_then_link) == ["saved", "saved"])
    check("Not mine on a version is refused", send({"id": str(uuid.uuid4()), "kind": "mine_set", "data": {"song_id": b, "value": "not mine"}}) == ["refused"])
    check("Undo of Mine on a version is refused", send({"id": str(uuid.uuid4()), "kind": "mine_restore", "data": {"song_id": loose}}) == ["refused"])
    check("Make main moves every version at once", send(fam({a: b, b: b, loose: b}, {a: a, b: a, loose: a})) == ["saved"]
          and mains()[a] == b and mains()[loose] == b)
    check("a half Make main (chain left behind) is refused", send(fam({a: a}, {a: b})) == ["refused"])
    check("Remove a version", send(fam({loose: None}, {loose: b})) == ["saved"] and mains()[loose] is None)
    check("then Not mine on it works", send({"id": str(uuid.uuid4()), "kind": "mine_set", "data": {"song_id": loose, "value": "not mine"}}) == ["saved"])
    link_c = fam({c: b}, {c: None})
    check("a third version joins", send(link_c) == ["saved"])
    undo = fam(link_c["data"]["before"], link_c["data"]["songs"])
    check("its Undo takes it back out", send(undo) == ["saved"] and mains()[c] is None and mains()[b] == b)
    check("removing down to one song needs the Main cleared too", send(fam({a: None}, {a: b})) == ["refused"]
          and send(fam({a: None, b: None}, {a: b, b: b})) == ["saved"] and mains()[b] is None)
    check("bad ids refused", send(fam({"../x": a}, {"../x": None})) == ["refused"])
    lib = open_library(root)
    before = lib.store.snapshot()
    lib.close()
    (root / DB_NAME).unlink()
    lib = open_library(root)
    check("versions rebuild from the journal", lib.store.snapshot() == before and before["song_family"] == [])
    lib.close()


def family_pick_path(tmp):
    """Batch 5 part 0: Mine and group as one change, all or nothing; Main picks stored; the mains command."""
    from vault_server import family
    music, root = tmp / "pmusic", tmp / "plib"
    lib = init_library(root)
    old, new, newer, other, x, y = (add_song(lib, music / f"{n}.mp3", n.encode()) for n in ("old", "new", "newer", "other", "x", "y"))
    for sid, day in ((old, "2023-01-01"), (new, "2024-01-01"), (newer, "2025-01-01"), (x, "2023"), (y, "2024")):
        lib.store.record("song_field", {"song_id": sid, "field": "date", "value": day, "origin": "guess", "basis": "tag"})
    for sid in (old, new, x, y):
        songs_module.set_mine(lib.store, sid, "mine")
    lib.close()
    send = lambda *cs: server.apply_changes(root, list(cs))
    def fam(songs, before, **extra):
        return {"id": str(uuid.uuid4()), "kind": "family_set", "data": {"song_id": next(iter(songs)), "songs": songs, "before": before, **extra}}
    def look():
        conn = server.connect_readonly(root)
        try:
            return {s["id"]: s for s in server.list_songs(conn)}
        finally:
            conn.close()

    # other isn't Mine: a group carrying its Mine saves both; a refused family saves neither
    bad = fam({other: other, x: x}, {other: None, x: None}, mine=[other])  # a lone pair pointing at themselves: refused
    r = send(bad)
    check("a refused group leaves its Mine unsaved too", r[0]["status"] == "refused" and look()[other]["mine"] != "mine")
    group = fam({other: new, new: new}, {other: None, new: None}, mine=[other])
    check("Mine + group save as one change", [x["status"] for x in send(group)] == ["saved"]
          and look()[other]["mine"] == "mine" and look()[other]["main"] == new)
    check("the same change sent twice is taken once", [x["status"] for x in send(group)] == ["nothing to do"])
    undo = fam({other: None, new: None}, {other: new, new: new}, restore_mine=[other])
    check("its Undo takes the family and the Mine back together", [x["status"] for x in send(undo)] == ["saved"]
          and look()[other]["main"] is None and look()[other]["mine"] != "mine")
    pair = fam({old: new, new: new}, {old: None, new: None})
    send(pair)
    pick = fam({old: old, new: old}, {old: new, new: new}, picked={old: True}, picked_before={old: False})
    check("Make main stores the pick", [x["status"] for x in send(pick)] == ["saved"] and look()[old]["picked"] and look()[old]["main"] == old)
    check("a pick on a song that isn't Main is refused",
          send(fam({new: old}, {new: old}, picked={new: True}, picked_before={new: False}))[0]["status"] == "refused")
    check("a stale pick is refused",
          send(fam({old: old}, {old: old}, picked={old: True}, picked_before={old: False}))[0]["status"] == "refused")
    # groups made before picks were stored: x+y never picked; old+new picked above
    send(fam({x: x, y: x}, {x: None, y: None}))
    lib = open_library(root)
    out = family.newest_mains(lib)
    again = family.newest_mains(lib)
    lib.close()
    check("mains: the never-picked group gets its newest, the picked one stays",
          out["Main changed to newest"] == 1 and out["kept (picked by hand)"] == 1 and look()[x]["main"] == y and look()[new]["main"] == old, str(out))
    check("mains: a second run changes nothing", again["Main changed to newest"] == 0, str(again))
    lib = open_library(root)
    before = lib.store.snapshot()
    lib.close()
    (root / DB_NAME).unlink()
    lib = open_library(root)
    check("picks rebuild from the journal", lib.store.snapshot() == before and before["family_pick"] != [])
    lib.close()


def hand_pick_history_path(tmp):
    """Make main from before picks were stored is found in the journal; one that was undone isn't."""
    from vault_server import family
    music, root = tmp / "hmusic", tmp / "hlib"
    lib = init_library(root)
    a, b, c, d = (add_song(lib, music / f"{n}.mp3", n.encode()) for n in ("a", "b", "c", "d"))
    for sid, day in ((a, "2023"), (b, "2024"), (c, "2023"), (d, "2024")):
        lib.store.record("song_field", {"song_id": sid, "field": "date", "value": day, "origin": "guess", "basis": "tag"})
        songs_module.set_mine(lib.store, sid, "mine")
    rec = lambda s, bf: lib.store.record("family", {"songs": s, "before": bf})
    rec({a: b, b: b}, {a: None, b: None})
    rec({a: a, b: a}, {a: b, b: b})  # Make main on the older one, kept
    rec({c: d, d: d}, {c: None, d: None})
    rec({c: c, d: c}, {c: d, d: d})  # Make main...
    rec({c: d, d: d}, {c: c, d: c})  # ...and its Undo
    out = family.newest_mains(lib)
    main = lambda sid: lib.store.conn.execute("SELECT main_id FROM song_family WHERE song_id=?", (sid,)).fetchone()[0]
    check("an old Make main is kept as a pick; an undone one isn't", main(a) == a and main(c) == d
          and out["kept (picked by hand)"] == 1 and out["already newest"] == 1, str(out))
    lib.close()


def date_year_path():
    """A year-only tag takes the file's day when it's the same year; another year means a later copy, so the year wins."""
    check("same year: the exact day", songs_module._with_year("2024", "2024-05-03") == ("2024-05-03", "tag_year"))
    check("another year: the tag's year", songs_module._with_year("2024", "2026-09-17") == ("2024", "tag"))


def main():
    tmp = Path(tempfile.mkdtemp(prefix="vault-servertest-")).resolve()
    music, root = tmp / "music", tmp / "lib"
    lib = init_library(root)
    audio = bytes(range(256)) * 400  # 102,400 bytes, each position recognisable
    local = add_song(lib, music / "local.mp3", audio, title="Local <b>song</b>")
    cloud = add_song(lib, music / "cloud.mp3", b"should never be read", cloud=True)
    stale = add_song(lib, music / "went back to cloud.mp3", b"should never be read either")  # database still says local
    gone = add_song(lib, music / "gone.wav", b"x")
    likely = add_song(lib, music / "likely.mp3", b"maybe another file", state="likely")
    lib.store.record("song_field", {"song_id": local, "field": "mine", "value": "likely mine", "origin": "guess", "basis": "title"})
    lib.store.record("song_field", {"song_id": local, "field": "date", "value": "2024-05-01", "origin": "guess", "basis": "tag"})
    lib.close()
    (music / "gone.wav").unlink()
    for name in ("cloud.mp3", "went back to cloud.mp3"):
        ok = ctypes.windll.kernel32.SetFileAttributesW(str(music / name), OFFLINE)
        check(f"test can mark {name} as cloud-only", ok and scanner.is_cloud_only((music / name).stat()))

    opened = []
    real_open = server._open_audio
    server._open_audio = lambda p: (opened.append(p), real_open(p))[1]
    before = (folder_state(music), folder_state(root))

    servers = server.start_servers(root, [server.LOOPBACK], 0)
    port = servers[0].server_port

    def ask(path, method="GET", headers=None, host=None):
        c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=10)
        c.putrequest(method, path, skip_host=bool(host))
        if host:
            c.putheader("Host", host)
        for k, v in (headers or {}).items():
            c.putheader(k, v)
        c.endheaders()
        r = c.getresponse()
        body = r.read()
        c.close()
        return r, body

    # the list
    r, body = ask("/songs")
    songs = {s["id"]: s for s in json.loads(body)["songs"]}
    check("list has every known song", r.status == 200 and len(songs) == 5)
    check("list shows id, title, mine status", songs[local]["title"] == "Local <b>song</b>" and songs[local]["mine"] == "likely mine"
          and songs[cloud]["mine"] == "unknown")
    check("list says local or cloud-only", songs[local]["where"] == "laptop" and songs[cloud]["where"] == "cloud")
    check("list gives the date, or nothing if unknown", songs[local]["date"] == "2024-05-01" and songs[cloud]["date"] is None)
    check("the list says how many are hidden", json.loads(ask("/songs")[1])["hidden"] == 0)
    r, body = ask("/status")
    st = json.loads(body)
    check("/status: the count is the list's, with Mine, copies, ratings and the phone's own count", r.status == 200 and st["songs"] == len(songs)
          and set(st) == {"songs", "mine", "copies", "fire", "shelved", "plays", "played", "last_play", "on_phone"} and st["on_phone"] is None, str(st))
    r, body = ask("/")
    check("the page opens and shows titles as plain text", r.status == 200 and b"textContent = song.title" in body and b"innerHTML" not in body)

    # playing and seeking
    url = f"/songs/{local}/audio"
    r, body = ask(url)
    check("a local song plays whole", r.status == 200 and body == audio and r.getheader("Content-Type") == "audio/mpeg"
          and r.getheader("Accept-Ranges") == "bytes")
    r, body = ask(url, "HEAD")
    check("HEAD gives the size and no audio", r.status == 200 and r.getheader("Content-Length") == str(len(audio)) and body == b"")
    for header, start, end in (("bytes=1000-1999", 1000, 1999), ("bytes=0-1", 0, 1), ("bytes=102000-", 102000, 102399),
                               ("bytes=-100", 102300, 102399), ("bytes=102000-999999", 102000, 102399)):
        r, body = ask(url, headers={"Range": header})
        check(f"seeking: {header} returns the right part", r.status == 206 and body == audio[start:end + 1]
              and r.getheader("Content-Range") == f"bytes {start}-{end}/{len(audio)}")
    r, body = ask(url, headers={"Range": "bytes=999999-"})
    check("seeking past the end is refused", r.status == 416 and r.getheader("Content-Range") == f"bytes */{len(audio)}")

    # refusals
    opened.clear()
    r, _ = ask(f"/songs/{uuid.uuid4()}/audio")
    check("unknown id refused", r.status == 404)
    for bad in ("/songs/C:/Windows/win.ini/audio", "/songs/..%2F..%2Fsecret/audio", "/songs/C%3A%5CWindows%5Cwin.ini/audio",
                "/songs/../../../Windows/win.ini", f"/songs/{music / 'local.mp3'}/audio", "/songs/1' OR '1'='1/audio",
                f"/{music / 'local.mp3'}"):
        r, _ = ask(bad.replace(" ", "%20"))
        check(f"a path in place of an id refused: {bad[:32]}", r.status in (400, 404))
    for name, song in (("cloud-only", cloud), ("cloud-only since the scan", stale)):
        r, body = ask(f"/songs/{song}/audio")
        check(f"{name} says not on laptop yet", r.status == 409 and json.loads(body)["error"] == "not on laptop yet")
    r, _ = ask(f"/songs/{likely}/audio")
    check("a place only guessed to be the song isn't played", r.status == 404)
    r, _ = ask(f"/songs/{gone}/audio")
    check("a vanished file is refused", r.status == 404)
    check("none of those opened a music file", opened == [], str(opened))
    r, _ = ask(url, "POST", {server.CLIENT_HEADER: "app", "Content-Length": "0"})
    check("POST anywhere but /changes refused", r.status == 404)
    for method in ("PUT", "DELETE", "PATCH", "OPTIONS"):
        r, _ = ask(url, method)
        check(f"{method} refused", r.status == 501)
    r, _ = ask("/songs", host="evil.example.com")
    check("an unknown address name is refused", r.status == 403)

    # library goes away: nothing recreated
    (root / MARKER_NAME).rename(root / "marker-away")
    r, body = ask("/songs")
    check("library missing answers plainly", r.status == 503 and "Library missing" in json.loads(body)["error"])
    (root / "marker-away").rename(root / MARKER_NAME)
    server.stop_servers(servers)

    check("music folder unchanged", folder_state(music) == before[0])
    check("library folder unchanged, nothing written", folder_state(root) == before[1])

    # only the laptop and Tailscale
    def fake(self_info, code=0):
        return lambda *a, **k: subprocess.CompletedProcess(a, code, json.dumps({"Self": self_info}), "")
    fake_ip = str(server.TAILSCALE_RANGE[0x10203])
    addr, names = server.tailscale_info(fake({"Online": True, "TailscaleIPs": [fake_ip, "fd7a::1"], "DNSName": "Box.example.test."}))
    check("Tailscale address and name found", addr == fake_ip and names == ["box.example.test", "box"])
    check("a home-network address is never used", server.tailscale_info(fake({"Online": True, "TailscaleIPs": ["192.168.1.5"]}))[0] is None)
    check("Tailscale offline means laptop only", server.tailscale_info(fake({"Online": False, "TailscaleIPs": [fake_ip]}))[0] is None)
    check("Tailscale not installed means laptop only", server.tailscale_info(lambda *a, **k: (_ for _ in ()).throw(OSError()))[0] is None)
    s = server.start_servers(root, [server.LOOPBACK], 0)
    check("listens on the given address, not every address", s[0].server_address[0] == server.LOOPBACK)
    import contextlib, io
    for error, quiet in ((ConnectionResetError(10054, "reset"), True), (ConnectionAbortedError(), True), (BrokenPipeError(), True),
                         (ValueError("a real bug"), False)):
        said = io.StringIO()
        with contextlib.redirect_stderr(said):
            try:
                raise error
            except Exception:
                s[0].handle_error(None, (server.LOOPBACK, 1))
        check(f"{type(error).__name__}: {'no traceback (the phone hung up)' if quiet else 'still prints its traceback'}",
              (said.getvalue() == "") == quiet, said.getvalue()[:200])
    server.stop_servers(s)

    # starting up
    ghost = tmp / "never-made"
    try:
        server.connect_readonly(ghost)
        check("missing library stops the server", False)
    except LibraryMissing:
        check("missing library stops the server, creates nothing", not ghost.exists())
    write_path(tmp)
    tag_path(tmp)
    rating_path(tmp)
    plays_path(tmp)
    sorting_path(tmp)
    family_path(tmp)
    phone_backup_path(tmp)
    timings_path(tmp)
    lengths_path(tmp)
    family_pick_path(tmp)
    hand_pick_history_path(tmp)
    date_year_path()
    print()
    print("ALL PASSED" if not failures else f"{len(failures)} FAILED: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
