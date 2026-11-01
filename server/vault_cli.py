"""Library commands. Run from the repo root:

    python server/vault_cli.py init <library folder>          start a new library (the only command that creates one)
    python server/vault_cli.py check <library folder>         say plainly whether the library is there
    python server/vault_cli.py import-sorting <library folder> <triage-decisions.json>
"""
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from vault_server.library import (MARKER_NAME, SORTING_NAME, LibraryMissing, LibraryRefused,  # noqa: E402
                                  init_library, open_library)


def main(argv):
    if len(argv) < 3 or argv[1] not in ("init", "check", "import-sorting"):
        print(__doc__)
        return 1
    cmd, folder = argv[1], argv[2]
    try:
        if cmd == "init":
            lib = init_library(folder)
            print(f"Library ready at {lib.root} (marker {MARKER_NAME}).")
        elif cmd == "check":
            lib = open_library(folder)
            n = {t: lib.store.conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("files", "songs", "tags")}
            print(f"Library found at {lib.root}: {n['files']} files, {n['songs']} songs, {n['tags']} tags.")
        else:
            if len(argv) < 4:
                print(__doc__)
                return 1
            lib = open_library(folder)  # stops here if the marker is missing
            src, dest = Path(argv[3]), lib.root / SORTING_NAME
            if dest.exists() and dest.read_bytes() != src.read_bytes():
                print(f"{dest} already exists and is different. Not overwriting.")
                return 2
            if not dest.exists():
                shutil.copyfile(src, dest)
            print(f"Sorting file is in the library: {dest} ({dest.stat().st_size} bytes).")
        lib.close()
    except LibraryMissing as e:
        print(e)
        return 2
    except LibraryRefused as e:
        print(f"Refused: {e}")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
