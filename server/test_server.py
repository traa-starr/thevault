"""Self-test for the server. Uses a throwaway library in the temp folder, never the real one: python server/test_server.py"""
import ctypes
import hashlib
import http.client
import json
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from vault_server import scanner, server  # noqa: E402
from vault_server.library import MARKER_NAME, LibraryMissing, init_library  # noqa: E402
from vault_server.store import now  # noqa: E402

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
    for method in ("POST", "PUT", "DELETE", "PATCH"):
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
    print()
    print("ALL PASSED" if not failures else f"{len(failures)} FAILED: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
