"""Library commands. Run from the repo root:

    python server/vault_cli.py init <library folder>          start a new library (the only command that creates one)
    python server/vault_cli.py check <library folder>         say plainly whether the library is there
    python server/vault_cli.py import-sorting <library folder> <triage-decisions.json>
    python server/vault_cli.py scan <library folder> <music root>            record what's there, read-only
    python server/vault_cli.py apply-sorting <library folder> <music root>   turn my sorting file into per-file verdicts (once)
    python server/vault_cli.py songs <library folder>                        link duplicates into songs, fill title, date, source, mine
    python server/vault_cli.py import <library folder>                       copy every Mine song into the library, then make phone copies; rerun any time
    python server/vault_cli.py copies <library folder>                       catch up phone copies now (the server also does it by itself); adds only, prints the count
    python server/vault_cli.py mains <library folder>                        version groups I never picked a Main for get their newest as Main
    python server/vault_cli.py fingerprint <music root>                      one line that changes if the music folders change
    python server/vault_cli.py serve <library folder>                        play songs by id, on the laptop and Tailscale only (Ctrl+C stops)
    python server/vault_cli.py doctor <library folder>                       one plain report before phone tests; fixes nothing
    python server/vault_cli.py backup <library folder> [backup folder]       copy the database and journal to C:\\VaultBackup, keep 14
    python server/vault_cli.py publish <library folder>                      send the app's newest code to the phone over the air (no GitHub build)
    python server/vault_cli.py pull-cloud <library folder> <music root> [n]  make cloud-only songs download, one at a time (only the first n if given); rerun any time
    python server/vault_cli.py tags <library folder> [title words]          every tag per song, second to 3 decimals (to compare with the phone); read-only
    python server/vault_cli.py timings <library folder>                      the phone's search and Next timings (typical, slow end); read-only
    python server/vault_cli.py search-data <library folder>                  every tag with its song title as JSON (for tools/search/accept.mjs); read-only
"""
import shutil
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from vault_server.autocopy import copy_lock, run_once as run_autocopy_once  # noqa: E402

COPY_WAIT = 1800  # the server's own copy run may be mid-way: wait for it (it says so) rather than copy the same files
from vault_server.backup import run_backup  # noqa: E402
from vault_server.doctor import FAIL, fingerprint_line, fingerprinted_scan, run_doctor  # noqa: E402
from vault_server.family import newest_mains  # noqa: E402
from vault_server.importer import ToolMissing, import_mine, make_phone_copies, mine_without_phone_copy, size_report  # noqa: E402
from vault_server.library import (MARKER_NAME, SORTING_NAME, LibraryMissing, LibraryRefused,  # noqa: E402
                                  init_library, open_library)
from vault_server.pull import run_pull  # noqa: E402
from vault_server.scanner import ScanStopped, apply_sorting, fingerprint, source_verdicts  # noqa: E402
from vault_server.server import run as run_server  # noqa: E402
from vault_server.songs import FfprobeMissing, fill_details, fill_mine, link_songs, mine_counts, song_counts  # noqa: E402
from vault_server.store import Busy  # noqa: E402
from vault_server.tags import tags_by_song  # noqa: E402
from vault_server.updates import publish  # noqa: E402
from vault_server.timings import timings_report  # noqa: E402


def print_result(result):
    for k, v in result.items():
        print(f"{k}: {v}")


def main(argv):
    for stream in (sys.stdout, sys.stderr):  # a song name with an emoji mustn't stop a command halfway
        stream.reconfigure(errors="replace")
    if len(argv) < 3 or argv[1] not in ("init", "check", "import-sorting", "scan", "apply-sorting", "songs", "mains", "import", "fingerprint", "serve", "doctor",
                                        "backup", "pull-cloud", "publish", "tags", "copies", "timings", "search-data"):
        print(__doc__)
        return 1
    cmd, folder = argv[1], argv[2]
    if cmd in ("scan", "apply-sorting", "pull-cloud") and len(argv) < 4:
        print(__doc__)
        return 1
    try:
        if cmd == "backup":
            ok, words = run_backup(folder, *argv[3:4])
            print(words)
            return 0 if ok else 2
        if cmd == "pull-cloud":
            if len(argv) > 4 and not argv[4].isdecimal():
                print(__doc__)
                return 1
            return run_pull(folder, argv[3], int(argv[4]) if len(argv) > 4 else None)
        if cmd == "publish":
            if not (Path(folder) / MARKER_NAME).is_file():
                print(f"No library at {folder}.")
                return 2
            ok, words = publish(folder)
            print(words)
            return 0 if ok else 2
        if cmd == "fingerprint":
            print(fingerprint(folder))
            return 0
        if cmd == "serve":
            return run_server(folder)
        if cmd == "doctor":
            return run_doctor(folder)
        if cmd == "init":
            lib = init_library(folder)
            print(f"Library ready at {lib.root} (marker {MARKER_NAME}).")
        elif cmd == "check":
            lib = open_library(folder)
            n = {t: lib.store.conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("files", "songs", "tags")}
            print(f"Library found at {lib.root}: {n['files']} files, {n['songs']} songs, {n['tags']} tags.")
            print(f"Scanned: {source_verdicts(lib)}")
            print(f"Songs: {song_counts(lib)}")
            print(f"Mine: {mine_counts(lib)}")
        elif cmd == "tags":
            lib = open_library(folder)
            print("\n".join(tags_by_song(lib.store.conn, " ".join(argv[3:]))))
        elif cmd == "songs":
            lib = open_library(folder)
            print_result(link_songs(lib))
            print_result(fill_details(lib))
            print_result(fill_mine(lib))
            print(f"Songs: {song_counts(lib)}")
            print(f"Mine: {mine_counts(lib)}")
        elif cmd == "import":
            lib = open_library(folder)
            with copy_lock(lib.root, wait=COPY_WAIT):  # waits for the server's own copy run to finish
                print("Import (library copies of Mine songs):")
                print_result(import_mine(lib))
                print("Phone copies:")
                print_result(make_phone_copies(lib))
            print(size_report(lib))
        elif cmd == "search-data":
            # every live tag with its song's title, as JSON, for the search acceptance runner (tools/search/accept.mjs)
            from vault_server.server import list_songs
            from vault_server.tags import all_tags
            lib = open_library(folder)
            titles = {s["id"]: s["title"] for s in list_songs(lib.store.conn)}
            tags = [{**t, "title": titles.get(t["song_id"], "")} for t in all_tags(lib.store.conn)]
            print(json.dumps({"tags": tags}, ensure_ascii=False))
            return 0
        elif cmd == "timings":
            # the phone's own search and Next timings (it sends them when it goes to the background); reads one small file
            open_library(folder).close()  # stops here if the marker is missing
            print("\n".join(timings_report(Path(folder).resolve())))
            return 0
        elif cmd == "copies":
            # the same add-only run the server makes by itself; safe while the server runs (one writer at a time)
            open_library(folder).close()  # stops here if the marker is missing
            library, phone = run_autocopy_once(Path(folder).resolve(), log=lambda *a, **k: None, wait=COPY_WAIT)
            print(f"phone copies made now: {phone} ({library} songs copied into the library first)")
            conn = open_library(folder)
            left = len(mine_without_phone_copy(conn.store.conn, conn.root))
            conn.close()
            print(f"Mine songs still without a phone copy: {left}" + (" (cloud-only or missing files: run doctor)" if left else ""))
            return 0
        elif cmd == "mains":
            lib = open_library(folder)
            print_result(newest_mains(lib))
        elif cmd == "scan":
            lib = open_library(folder)
            result, record = fingerprinted_scan(lib, argv[3])
            print_result(result)
            level, words = fingerprint_line(record)
            print(f"{level}  Music fingerprint: {words}")
            lib.close()
            return 2 if level == FAIL else 0
        elif cmd == "apply-sorting":
            lib = open_library(folder)
            print_result(apply_sorting(lib, argv[3]))
            print(f"Scanned: {source_verdicts(lib)}")
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
    except (FfprobeMissing, ToolMissing, Busy) as e:
        print(f"Stopped: {e}")
        return 2
    except ScanStopped as e:
        print(f"Stopped: {e}")
        return 2
    except LibraryMissing as e:
        print(e)
        return 2
    except LibraryRefused as e:
        print(f"Refused: {e}")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
