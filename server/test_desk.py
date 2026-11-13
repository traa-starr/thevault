"""Self-test for the laptop desk (calm part 1, 2026-11-12, goal C). A throwaway library in the temp folder, never the
real one, made-up song names: python server/test_desk.py

Proves: the page loads on this laptop and nowhere else, its counts are right, it lists the hidden songs, a restore it
sends lands in the journal exactly like the phone's (same route, kind, header; manual choice rules), a second restore of
the same song changes nothing, and neither the page nor its counts carry a laptop address, drive letter or song path.
Also the Vault Desk icon's command (opens the page only when the server answers) and the render click note.
"""
import http.client
import json
import re
import shutil
import sys
import tempfile
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "server"))

import vault_cli  # noqa: E402
from vault_server import renders, server  # noqa: E402
from vault_server.desk import DESK  # noqa: E402
from vault_server.library import JOURNAL_NAME, init_library, open_library  # noqa: E402
from vault_server.songs import set_mine  # noqa: E402
from vault_server.store import now  # noqa: E402

failures = []


def check(name, ok, detail=""):
    print(("PASS  " if ok else "FAIL  ") + name + (f"  {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(name)


def add_song(lib, path, title):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"made-up audio " + title.encode())
    key = f"src:{path}|{path.stat().st_size}"
    lib.store.upsert_source(str(path), key, path.parent.name, path.name, path.stat().st_size, path.stat().st_mtime, False, now())
    song_id = str(uuid.uuid4())
    lib.store.record("song_new", {"song_id": song_id, "version_id": str(uuid.uuid4()), "file_key": key, "orig_name": path.name,
                                  "title": title, "places": [{"path": str(path), "state": "sure", "why": "same_file"}]})
    return song_id


def main():
    tmp = Path(tempfile.mkdtemp(prefix="vault-desktest-")).resolve()
    music, root = tmp / "music", tmp / "lib"
    lib = init_library(root)
    hidden = [add_song(lib, music / "Other Artist" / f"velvet harbor {i}.mp3", f"velvet harbor {i}") for i in range(3)]
    mine = add_song(lib, music / "neon quarry.mp3", "neon quarry")
    loose = add_song(lib, music / "lantern drift.mp3", "lantern drift")  # never judged: unsorted
    for one in hidden:
        set_mine(lib.store, one, "not mine")
    set_mine(lib.store, mine, "mine")
    lib.close()

    servers = server.start_servers(root, [server.LOOPBACK], 0, names=["made-up-laptop"])
    port = servers[0].server_port

    def ask(path, method="GET", headers=None, host=None, body=None):
        c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=10)
        c.putrequest(method, path, skip_host=bool(host))
        if host:
            c.putheader("Host", host)
        for k, v in (headers or {}).items():
            c.putheader(k, v)
        if body is not None:
            c.putheader("Content-Length", str(len(body)))
        c.endheaders(body)
        r = c.getresponse()
        data = r.read()
        c.close()
        return r, data

    try:
        # the page and its counts, on this laptop
        r, page = ask("/desk")
        check("the desk page loads on this laptop", r.status == 200 and b"<title>Vault Desk</title>" in page, str(r.status))
        csp = r.getheader("Content-Security-Policy") or ""
        check("review catch 8: the page may ask only this server and can't be framed by another page",
              "default-src 'self'" in csp and "frame-ancestors 'none'" in csp and r.getheader("X-Frame-Options") == "DENY", csp)
        check("review catch 3: back to the window keeps rows in place and In Library, never mid-restore",
              b"loadSongs(true)" in page and b"if (again && inFlight) return;" in page
              and b"songs.filter((song) => now.has(song.id) || restored.has(song.id))" in page)
        check("review catch 7: the desk's search finds a song with no folder by its chip's words",
              b"folderOf(song).toLowerCase().includes(words)" in page)
        r2, page2 = ask("/desk", host="localhost")
        check("...as localhost too", r2.status == 200)
        r, body = ask("/desk-status")
        st = json.loads(body)
        check("desk counts: mine 1, hidden 3, unsorted 1, tags 0, a last scan, no render click yet",
              r.status == 200 and st["mine"] == 1 and st["hidden"] == 3 and st["unsorted"] == 1 and st["tags"] == 0
              and st["last_scan"] and st["last_render"] is None, str(st))

        # nowhere else: a request by the laptop's Tailscale name (as the phone would) gets nothing
        r, _ = ask("/desk", host="made-up-laptop")
        check("by the laptop's network name (the phone, over Tailscale) the desk isn't there", r.status == 404, str(r.status))
        r, _ = ask("/desk-status", host="made-up-laptop")
        check("...nor its counts", r.status == 404)
        check("only the laptop itself: connection and address both 127.0.0.1 or localhost",
              server.on_desk("127.0.0.1", "127.0.0.1") and server.on_desk("127.0.0.1", "localhost")
              and not server.on_desk("192.0.2.10", "127.0.0.1") and not server.on_desk("127.0.0.1", "made-up-laptop"))

        # nothing that points off the laptop or at a file
        everything = page + page2 + body
        check("page and counts carry no drive letter, no backslash path, no laptop name, no temp folder",
              not re.search(rb"[A-Za-z]:\\\\|[A-Za-z]:/", everything) and b"made-up-laptop" not in everything
              and str(tmp).encode() not in everything and str(music).encode() not in everything, "")
        check("every link in the page is relative, nothing loaded from outside",
              not re.search(rb"https?://", page) and b'fetch("desk-status")' in page and b'fetch("songs?hidden=1")' in page
              and b'fetch("changes"' in page and b"<script src" not in page and b"<link" not in page)
        r, body = ask("/songs?hidden=1")
        listed = json.loads(body)["songs"]
        check("the list the desk shows: the 3 hidden songs, by folder name only (no path)",
              sorted(s["id"] for s in listed) == sorted(hidden) and all(s["folder"] == "Other Artist" for s in listed)
              and str(music).encode() not in body, str(listed))
        check("titles go in as plain text, never as HTML", b"textContent = song.title" in page and b"innerHTML" not in page)

        # a restore from the desk: the phone's own change
        check("the desk sends the phone's change: POST changes, mine_restore, X-Vault-Client, a fresh id each time",
              b'kind: "mine_restore"' in page and b'"X-Vault-Client": "desk"' in page and b"id: changeId()" in page)
        check("a row leaves only after the laptop says it's saved; a refusal shows its reason",
              page.index(b"if (!why) {") < page.index(b"restored.add(song.id)") and b'"Not restored: " + why' in page)
        journal = root / JOURNAL_NAME
        lines_before = len(journal.read_text(encoding="utf-8").splitlines())
        change_id = str(uuid.uuid4())
        restore = json.dumps({"changes": [{"id": change_id, "kind": "mine_restore", "data": {"song_id": hidden[0]}}]}).encode()
        r, body = ask("/changes", "POST", {"Content-Type": "application/json", "X-Vault-Client": "desk"}, body=restore)
        check("a desk restore is saved", r.status == 200 and json.loads(body)["results"][0]["status"] == "saved", body.decode())
        new = [json.loads(x) for x in journal.read_text(encoding="utf-8").splitlines()[lines_before:]]
        check("...as one journal line, the same kind the phone's restore makes", len(new) == 1 and new[0].get("kind") == "song_field_restore"
              and new[0].get("id") == change_id, str(new))
        r, body = ask("/songs?hidden=1")
        check("...and the song has left Hidden", hidden[0] not in [s["id"] for s in json.loads(body)["songs"]])
        r, body = ask("/songs")
        back = {s["id"]: s for s in json.loads(body)["songs"]}
        check("...and is in the song list (Library) again", hidden[0] in back)
        check("the counts follow", json.loads(ask("/desk-status")[1])["hidden"] == 2)
        again = json.dumps({"changes": [{"id": str(uuid.uuid4()), "kind": "mine_restore", "data": {"song_id": hidden[0]}}]}).encode()
        r, body = ask("/changes", "POST", {"Content-Type": "application/json", "X-Vault-Client": "desk"}, body=again)
        check("a second restore (a desk left open) changes nothing", json.loads(body)["results"][0]["status"] == "nothing to do", body.decode())

        # the phone hides it again: the desk lists it on its next look (the latest manual choice wins)
        hide = json.dumps({"changes": [{"id": str(uuid.uuid4()), "kind": "mine_set", "data": {"song_id": hidden[0], "value": "not mine"}}]}).encode()
        r, body = ask("/changes", "POST", {"Content-Type": "application/json", "X-Vault-Client": "app"}, body=hide)
        r, body = ask("/songs?hidden=1")
        check("hidden again from the phone: back in the desk's list", hidden[0] in [s["id"] for s in json.loads(body)["songs"]])

        # a web page elsewhere can't send a restore
        r, _ = ask("/changes", "POST", {"Content-Type": "text/plain"}, body=restore)
        check("a restore without the app's header (another web page) is refused", r.status == 403, str(r.status))
        r, _ = ask("/changes", "POST", {"Content-Type": "application/json", "X-Vault-Client": "desk"}, host="evil.example", body=restore)
        check("...and so is one by a made-up address", r.status == 403, str(r.status))
        r, _ = ask("/changes", "OPTIONS")
        check("no cross-site permission is ever given", r.getheader("Access-Control-Allow-Origin") is None)
        lines_now = len(journal.read_text(encoding="utf-8").splitlines())
        ask("/desk")
        ask("/desk-status")
        check("opening the desk writes nothing", len(journal.read_text(encoding="utf-8").splitlines()) == lines_now)
    finally:
        server.stop_servers(servers)

    # the render click note, for "Last render click"
    renders.note_click(root)
    lib = open_library(root)
    try:
        st = server.desk_status(lib.store.conn, root)
    finally:
        lib.close()
    check("a Send to Vault click is noted in the library's own settings file", st["last_render"] and "last_render" in renders.read_settings(root), str(st))

    # the Vault Desk icon's command
    opened = []
    check("desk icon: no server answering says so and opens nothing",
          vault_cli.open_desk(root, ask=lambda a, p: None, browse=opened.append) == 2 and not opened)
    check("desk icon: no library says so and opens nothing",
          vault_cli.open_desk(tmp / "nowhere", ask=lambda a, p: 3, browse=opened.append) == 2 and not opened)
    real_level = vault_cli.running_level
    vault_cli.running_level = lambda a, p: server.SERVER_LEVEL - 1
    check("desk icon: a server running older code says restart it and opens nothing",
          vault_cli.open_desk(root, ask=lambda a, p: 3, browse=opened.append) == 2 and not opened)
    vault_cli.running_level = lambda a, p: server.SERVER_LEVEL
    code = vault_cli.open_desk(root, ask=lambda a, p: 3, browse=opened.append)
    vault_cli.running_level = real_level
    check("desk icon: server up opens the desk on this laptop's own address", code == 0 and opened == [f"http://127.0.0.1:{server.PORT}/desk"], str(opened))
    seen = {}

    def fake_run(cmd, env=None, **kw):
        seen.update(env)
        import subprocess
        return subprocess.CompletedProcess(cmd, 0, env["VAULT_ICON_NAME"], "")
    made = renders.make_icon(root, HERE.parent, r"C:\Py\pythonw.exe", 109, run=fake_run, name="Vault Desk.lnk", job="desk", tail="", about="Open the Vault Desk in the browser")
    check("the Vault Desk icon runs the desk command through cmd (a failure waits for a key)",
          made == "Vault Desk.lnk" and f'desk "{root}" || pause"' in seen["VAULT_ARGS"] and seen["VAULT_DESC"].startswith("Open the Vault Desk")
          and "imageres.dll,109" in seen["VAULT_PICTURE"], str(seen.get("VAULT_ARGS")))

    shutil.rmtree(tmp, ignore_errors=True)
    print()
    if failures:
        print(f"{len(failures)} FAILED: {failures}")
        return 1
    print("ALL PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
