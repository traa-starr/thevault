"""Self-test for the server. Uses a throwaway library in the temp folder, never the real one: python server/test_server.py"""
import builtins
import ctypes
import hashlib
import http.client
import json
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
    for _ in range(7200):
        lib.store.record("song_place", {"path": "x" * 200, "song_id": merged_into, "state": "likely", "why": "timing"})
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
    for _ in range(7200):
        lib.store.record("song_place", {"path": "x" * 200, "song_id": lone, "state": "likely", "why": "timing"})
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
    sorting_path(tmp)
    family_path(tmp)
    phone_backup_path(tmp)
    family_pick_path(tmp)
    hand_pick_history_path(tmp)
    date_year_path()
    print()
    print("ALL PASSED" if not failures else f"{len(failures)} FAILED: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
