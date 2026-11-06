"""Self-test for the import and phone copies (ROADMAP 1.22, 1.7). Throwaway library and music in the temp folder, never the
real ones: python server/test_import.py"""
import hashlib
import http.client
import json
import shutil
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from vault_server import importer, server, songs as songs_module  # noqa: E402
from vault_server.library import DB_NAME, init_library, open_library  # noqa: E402
from vault_server.store import now  # noqa: E402

failures = []


def check(name, ok, detail=""):
    print(("PASS  " if ok else "FAIL  ") + name + (f"  {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(name)


def make_audio(path, args, source="sine=frequency=440:duration=3"):
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-f", "lavfi", "-i", source, *args, str(path)], check=True)


def add_song(lib, path, hashed=True):
    data = path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    key = f"hash:{digest}" if hashed else f"src:{path}|{len(data)}"
    lib.store.upsert_source(str(path), key, path.parent.name, path.name, len(data), path.stat().st_mtime, False, now())
    song_id = str(uuid.uuid4())
    lib.store.record("song_new", {"song_id": song_id, "version_id": str(uuid.uuid4()), "file_key": key, "orig_name": path.name,
                                  "title": path.stem, "places": [{"path": str(path), "state": "sure", "why": "same_file"}]})
    return song_id


def folder_state(root):
    h = hashlib.sha256()
    for p in sorted(Path(root).rglob("*")):
        if p.is_file():
            st = p.stat()
            h.update(f"{p}|{st.st_size}|{st.st_mtime_ns}|".encode())
            h.update(p.read_bytes())
    return h.hexdigest()


def main():
    if not (shutil.which("ffmpeg") and shutil.which("ffprobe")):
        print("ffmpeg not found: can't run this test.")
        return 1
    tmp = Path(tempfile.mkdtemp(prefix="vault-importtest-")).resolve()
    music, root = tmp / "music", tmp / "lib"
    make_audio(music / "master 🤓.wav", ["-ac", "2"], "anoisesrc=duration=3:amplitude=0.3")  # noise: a pure tone compresses below 192
    make_audio(music / "small.mp3", ["-b:a", "128k"])
    make_audio(music / "big.mp3", ["-b:a", "320k"])
    make_audio(music / "unsorted.mp3", ["-b:a", "128k"])
    make_audio(music / "hidden.mp3", ["-b:a", "96k"])
    lib = init_library(root)
    wav = add_song(lib, music / "master 🤓.wav", hashed=False)
    small, big = add_song(lib, music / "small.mp3"), add_song(lib, music / "big.mp3")
    unsorted, hidden = add_song(lib, music / "unsorted.mp3"), add_song(lib, music / "hidden.mp3")
    for sid in (wav, small, big):
        songs_module.set_mine(lib.store, sid, "mine")
    songs_module.set_mine(lib.store, hidden, "not mine")
    music_before = folder_state(music)

    quiet = lambda *_: None
    first = importer.import_mine(lib, quiet)
    check("import copies the 3 Mine songs only", first["copied now"] == 3 and first["Mine songs"] == 3, str(first))
    rows = {r["song_id"]: r for r in lib.store.conn.execute("SELECT * FROM imported")}
    check("not mine and unsorted stay out", set(rows) == {wav, small, big})
    copy = lib.audio_path(rows[small]["code"], rows[small]["name"])
    check("the copy is byte for byte the original, in audio/<code>/<real name>",
          copy.read_bytes() == (music / "small.mp3").read_bytes() and copy.parent.parent == root / "audio" and copy.name == "small.mp3")
    check("the copy's fingerprint is recorded", rows[small]["hash"] == hashlib.sha256(copy.read_bytes()).hexdigest())
    again = importer.import_mine(lib, quiet)
    check("a second run copies nothing new", again["copied now"] == 0 and again["already in"] == 3, str(again))
    copy.unlink()
    check("a copy that went missing is made again", importer.import_mine(lib, quiet)["copied now"] == 1 and copy.is_file())

    made = importer.make_phone_copies(lib, quiet)
    check("phone copies: wav and 320 kbps get AAC, the 128 kbps mp3 is copied as is",
          made["made now (AAC 192 kbps)"] == 2 and made["copied as is (already small)"] == 1, str(made))
    wav_copy = importer.phone_copy(root, rows[wav]["code"])
    codec, kbps = importer._probe(wav_copy)
    check("the wav's phone copy is AAC near 192 kbps, named after the song", wav_copy.suffix == ".m4a" and codec == "aac"
          and kbps and 150 < kbps <= 200 and wav_copy.stem == "master 🤓", f"{codec} {kbps}")
    check("phone copies: a second run makes nothing", importer.make_phone_copies(lib, quiet)["already there"] == 3)
    report = importer.size_report(lib)
    check("the size report counts the songs", report.startswith("Phone copies: 3 songs"), report)
    check("the music folder is unchanged", folder_state(music) == music_before)
    lib.close()

    servers = server.start_servers(root, [server.LOOPBACK], 0)
    port = servers[0].server_port

    def get(path, headers=None):
        c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=10)
        c.request("GET", path, headers=headers or {})
        r = c.getresponse()
        body = r.read()
        c.close()
        return r.status, body, r

    status, body, r = get(f"/songs/{wav}/copy", {"Range": "bytes=10-19"})
    check("/songs/{id}/copy seeks", status == 206 and body == wav_copy.read_bytes()[10:20] and r.getheader("Content-Type") == "audio/mp4")
    status, body, _ = get(f"/songs/{small}/audio")
    check("/audio plays the library copy", status == 200 and body == copy.read_bytes())
    check("no phone copy for an unsorted song", get(f"/songs/{unsorted}/copy")[0] == 404)
    status, body, _ = get("/kept")
    data = json.loads(body)
    check("/kept lists the 3 with their sizes", {s["id"] for s in data["songs"]} == {wav, small, big}
          and data["total_bytes"] == sum(s["size"] for s in data["songs"]))
    check("/kept stamps each copy and lists no copy-less Mine song", data["no_copy"] == []
          and all(s["stamp"] == f'{s["size"]}-{s["stamp"].split("-")[1]}' for s in data["songs"]))
    server.stop_servers(servers)

    lib = open_library(root)
    songs_module.set_mine(lib.store, big, "not mine")
    out = importer.import_mine(lib, quiet)
    check("a song no longer Mine is taken out of the library, copies too", out["taken out (no longer Mine)"] == 1
          and not (root / "audio" / rows[big]["code"]).exists() and not (root / "phone" / rows[big]["code"]).exists(), str(out))
    before = lib.store.snapshot()
    lib.close()
    (root / DB_NAME).unlink()
    lib = open_library(root)
    check("imports rebuild from the journal", lib.store.snapshot() == before and len(before["imported"]) == 2)
    lib.close()
    check("the music folder is still unchanged", folder_state(music) == music_before)
    shutil.rmtree(tmp, ignore_errors=True)
    print()
    print("ALL PASSED" if not failures else f"{len(failures)} FAILED: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(errors="replace")
    sys.exit(main())
