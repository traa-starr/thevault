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
    python server/vault_cli.py ratings <library folder>                      every Favorite and Archived song (to compare with the phone); read-only
    python server/vault_cli.py status <library folder>                       the counts /status gives the phone: songs, Mine, phone copies, ratings, plays; read-only
    python server/vault_cli.py plays <library folder>                        the play log: totals, most played, the latest plays; read-only
    python server/vault_cli.py timings <library folder>                      the phone's search and Next timings (typical, slow end); read-only
    python server/vault_cli.py search-data <library folder>                  every tag with its song title as JSON (for tools/search/accept.mjs); read-only
    python server/vault_cli.py renders <library folder> [--pause]            bring new mixdowns from the render folder into Sort (the desktop icon runs this)
    python server/vault_cli.py renders-setup <library folder> <render folder> save where the render folder is (in the library) and make the desktop icon
    python server/vault_cli.py desk <library folder>                         open the laptop desk in the browser (the Vault Desk icon runs this)
    python server/vault_cli.py desk-icon <library folder>                    make the Vault Desk desktop icon
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
from vault_server.lengths import length_counts  # noqa: E402
from vault_server.renders import NoRenderFolder, bring_in, make_icon, note_click, render_folder, save_render_folder, words  # noqa: E402
from vault_server.doctor import probe, running_level  # noqa: E402
from vault_server.server import LOOPBACK, PORT, SERVER_LEVEL  # noqa: E402

ICON = 103  # which built-in Windows picture the desktop icon shows (imageres.dll): the music note
DESK_ICON = 109  # the Vault Desk icon's picture (imageres.dll): a monitor
DESK_ICON_NAME = "Vault Desk.lnk"


def print_result(result):
    for k, v in result.items():
        print(f"{k}: {v}")


def run_renders(folder, pause=False):
    """The desktop icon's job: what's new in the render folder goes into Sort. The window stays until a key is pressed."""
    try:
        lib = open_library(folder)
        try:
            where = render_folder(lib.root)
            if where is None:
                raise NoRenderFolder("The render folder isn't set up yet. Run renders-setup once. Nothing was changed.")
            print(f"Looking in {where} ...")
            out = bring_in(lib, where)
            note_click(lib.root)  # the laptop desk's "Last render click"
        finally:
            lib.close()
        print(words(out))
        code = 0
        if out["new"] or out["updated"] or out["moved"]:
            try:  # song lengths for the cards, and phone copies of anything already Mine; the server does it too
                run_autocopy_once(Path(folder).resolve(), log=lambda *a, **k: None, wait=5)
            except Busy:
                pass  # the server is making copies right now, and will reach these
            except Exception as e:  # the songs are in; only the extras didn't happen
                print(f"(Song lengths and phone copies didn't run now: {e}. The server makes them by itself.)")
    except (NoRenderFolder, LibraryMissing) as e:
        print(e)
        code = 2
    except (Busy, FfprobeMissing) as e:
        print(f"Stopped: {e} Nothing new was lost: click again in a minute.")
        code = 2
    except Exception as e:  # the window must say something, never just vanish
        print(f"Something went wrong, nothing in the render folder was touched: {e!r}")
        code = 2
    if pause:
        import msvcrt
        print()
        print("Press any key to close.")
        msvcrt.getwch()
        return 0  # already paused: the icon's own "pause on failure" is for crashes before this point
    return code


def setup_renders(folder, where):
    """Saves the render folder in the library's settings file, makes the folder if it isn't there, makes the icon."""
    lib = open_library(folder)
    lib.close()
    where = Path(where).resolve()
    where.mkdir(parents=True, exist_ok=True)  # the folder itself only; nothing is ever written inside it
    save_render_folder(lib.root, where)
    print(f"Render folder saved in the library: {where}")
    print(f"Desktop icon: {make_icon(lib.root, Path(__file__).resolve().parent.parent, sys.executable, ICON)}")
    return 0


def desk_url(port=PORT):
    return f"http://{LOOPBACK}:{port}/desk"


def open_desk(folder, ask=probe, browse=None):
    """The Vault Desk icon's job: the desk page in the browser if the server answers on this laptop; if not, why, in
    words (the icon's window then waits for a key). Opens nothing else and changes nothing."""
    import webbrowser
    browse = browse or webbrowser.open
    if not (Path(folder) / MARKER_NAME).is_file():
        print(f"The Vault library isn't at {folder} (is the E: drive plugged in?). Nothing was opened.")
        return 2
    answer = ask(LOOPBACK, PORT)
    if answer in (None, "odd"):
        print("The Vault server isn't answering on this laptop, so the desk can't open.")
        print("It starts by itself at log-in. To start it now: powershell -File server\\server_on.ps1 (or log out and in).")
        return 2
    level = running_level(LOOPBACK, PORT)
    if level is not None and level < SERVER_LEVEL:
        print("The Vault server is running older code that has no desk yet. Restart it once:")
        print("powershell -File server\\server_off.ps1, then powershell -File server\\server_on.ps1 (or restart the laptop).")
        return 2
    browse(desk_url())
    return 0


def setup_desk(folder):
    lib = open_library(folder)
    lib.close()
    print(f"Desktop icon: {make_icon(lib.root, Path(__file__).resolve().parent.parent, sys.executable, DESK_ICON, name=DESK_ICON_NAME, job='desk', tail='', about='Open the Vault Desk in the browser')}")
    return 0


def main(argv):
    for stream in (sys.stdout, sys.stderr):  # a song name with an emoji mustn't stop a command halfway
        if hasattr(stream, "reconfigure"):  # a test's captured output has none
            stream.reconfigure(errors="replace")
    if len(argv) < 3 or argv[1] not in ("init", "check", "import-sorting", "scan", "apply-sorting", "songs", "mains", "import", "fingerprint", "serve", "doctor",
                                        "backup", "pull-cloud", "publish", "tags", "copies", "timings", "search-data", "ratings", "status", "plays", "renders", "renders-setup", "desk", "desk-icon"):
        print(__doc__)
        return 1
    cmd, folder = argv[1], argv[2]
    if cmd in ("scan", "apply-sorting", "pull-cloud", "renders-setup") and len(argv) < 4:
        print(__doc__)
        return 1
    if cmd == "renders":
        return run_renders(folder, pause="--pause" in argv[3:])
    if cmd == "renders-setup":
        return setup_renders(folder, argv[3])
    if cmd == "desk":
        return open_desk(folder)
    if cmd == "desk-icon":
        return setup_desk(folder)
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
        elif cmd == "ratings":
            from vault_server.songs import ratings_report
            lib = open_library(folder)
            print("\n".join(ratings_report(lib.store.conn)))
        elif cmd == "status":
            from vault_server.server import status_counts
            lib = open_library(folder)
            s = status_counts(lib.store.conn, lib.root)
            phone = s["on_phone"]
            print(f"Songs listed: {s['songs']:,}")
            print(f"Mine: {s['mine']:,}, with a phone copy made: {s['copies']:,}")
            print(f"On the phone: {phone['stored']:,} of {phone['wanted']:,} (said at {phone['at']})" if phone else "On the phone: the phone hasn't said yet")
            print(f"Ratings: {s['fire']:,} Favorite, {s['shelved']:,} Archived")
            print(f"Plays: {s['plays']:,} of {s['played']:,} songs" + (f", last at {s['last_play'][:16].replace('T', ' ')} UTC" if s["last_play"] else ""))
        elif cmd == "plays":
            from vault_server.songs import plays_report
            lib = open_library(folder)
            print("\n".join(plays_report(lib.store.conn)))
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
            lib = open_library(folder)
            songs, known = length_counts(lib.store.conn)
            lib.close()
            print(f"Song lengths known: {known:,} of {songs:,}" + (" (the rest are cloud-only, missing or unreadable)" if known < songs else ""))
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
