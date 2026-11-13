"""The laptop desk's screenshots (calm part 1): a made-up library of 815 hidden songs in a temp folder, served on this
laptop only, then tools/shots/desk.mjs draws the page. Never the real library: python server/desk_shots.py"""
import shutil
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from vault_server import server  # noqa: E402
from vault_server.library import init_library  # noqa: E402
from vault_server.songs import set_mine  # noqa: E402
from vault_server.store import now  # noqa: E402

FOLDERS = ["Other Artist A", "Other Artist B", "Beat Pack", "Loose"]
WORDS = ["velvet", "harbor", "neon", "quarry", "lantern", "drift", "saffron", "meadow"]


def main():
    tmp = Path(tempfile.mkdtemp(prefix="vault-deskshots-")).resolve()
    music, root = tmp / "music", tmp / "lib"
    lib = init_library(root)
    for i in range(815):
        path = music / FOLDERS[i % 4] / f"{WORDS[i % 8]} {WORDS[(i * 3) % 8]} {i}.mp3"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"made-up")
        key = f"src:{path}|7"
        lib.store.upsert_source(str(path), key, path.parent.name, path.name, 7, path.stat().st_mtime, i % 10 == 3, now())
        song = str(uuid.uuid4())
        lib.store.record("song_new", {"song_id": song, "version_id": str(uuid.uuid4()), "file_key": key, "orig_name": path.name,
                                      "title": path.stem, "places": [{"path": str(path), "state": "sure", "why": "same_file"}]})
        set_mine(lib.store, song, "not mine")
    lib.close()
    servers = server.start_servers(root, [server.LOOPBACK], 0)
    try:
        p = subprocess.run(["node", str(HERE.parent / "tools" / "shots" / "desk.mjs"), f"http://127.0.0.1:{servers[0].server_port}/desk"],
                           cwd=HERE.parent / "tools" / "shots")
    finally:
        server.stop_servers(servers)
        shutil.rmtree(tmp, ignore_errors=True)
    return p.returncode


if __name__ == "__main__":
    sys.exit(main())
