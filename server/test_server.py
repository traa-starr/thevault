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
    check("a tag kind isn't allowed yet", send(change("tag_add", guessed)) == ["refused"])
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
    server.stop_servers(s)

    # starting up
    ghost = tmp / "never-made"
    try:
        server.connect_readonly(ghost)
        check("missing library stops the server", False)
    except LibraryMissing:
        check("missing library stops the server, creates nothing", not ghost.exists())
    write_path(tmp)
    print()
    print("ALL PASSED" if not failures else f"{len(failures)} FAILED: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
