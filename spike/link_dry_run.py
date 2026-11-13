"""Dry run of song linking on a COPY of the library's database (calm part 1): proves a code change to link_songs
changes nothing for songs as they stand. Copies the marker, database and journal to a temp folder; touches no music
folder and never writes in the real library. Run: python spike/link_dry_run.py <library folder>"""
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "server"))

from vault_server.library import DB_NAME, JOURNAL_NAME, MARKER_NAME, open_library  # noqa: E402
from vault_server.songs import link_songs  # noqa: E402


def main(library):
    tmp = Path(tempfile.mkdtemp(prefix="vault-linkdry-"))
    try:
        for name in (MARKER_NAME, DB_NAME, JOURNAL_NAME):
            shutil.copy2(Path(library) / name, tmp / name)
        lib = open_library(tmp)
        try:
            print(link_songs(lib))
        finally:
            lib.close()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main(sys.argv[1])
