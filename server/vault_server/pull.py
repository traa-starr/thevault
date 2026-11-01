"""Pull cloud-only songs: read each one so iCloud downloads it to its usual place on C:. Nothing is written anywhere.

Same list of files as a scan. One at a time, a progress line each, stops under 10 GB free on C: and on Ctrl+C. Files that
already came down are skipped, so it is safe to stop and rerun. A scan afterwards records the fingerprints.
"""
import os
import shutil
from pathlib import Path

from .library import MARKER_NAME, LibraryMissing
from .scanner import _plan, is_cloud_only

MIN_FREE = 10 * 1024 ** 3
GB = 1024 ** 3


def read_whole(path):
    """The one place a pull opens a music file: read mode, every byte read and thrown away so the download completes."""
    with open(path, "rb") as f:
        while f.read(1024 * 1024):
            pass


def disk_free(path):
    return shutil.disk_usage(path).free


def run_pull(library, root, first=None, hydrate=read_whole, cloud=lambda p: is_cloud_only(os.stat(p)), free=disk_free,
             min_free=MIN_FREE, say=print):
    """0 if everything asked for came down, 2 if it stopped early or something failed."""
    if not (Path(library) / MARKER_NAME).is_file():
        raise LibraryMissing(f"Library missing: no {MARKER_NAME} in {library}. Nothing was done.")
    paths, _, errors = _plan(Path(root).resolve())
    todo, failed = [], [f"{e}" for e in errors]
    for p in paths:
        try:
            if cloud(p):
                todo.append((p, os.stat(p).st_size))
        except OSError as e:
            failed.append(f"{p.name}: {e.__class__.__name__}")
    todo.sort(key=lambda t: str(t[0]))
    if first:
        todo = todo[:first]
    total = len(todo)
    say(f"{total} cloud-only files, {sum(s for _, s in todo) / GB:.2f} GB to come down. {free(root) / GB:.1f} GB free on this drive; "
        f"stops under {min_free / GB:.0f} GB. Ctrl+C stops it any time; run it again to carry on.")
    done = 0
    try:
        for i, (path, size) in enumerate(todo, 1):
            left = free(root)
            if left - size < min_free:
                say(f"Stopped at {done} of {total}: only {left / GB:.1f} GB free, and the next file needs {size / GB:.2f} GB. Free some space and rerun.")
                return 2
            try:
                hydrate(path)
                still = cloud(path)
            except OSError as e:
                failed.append(f"{path.name}: {e.__class__.__name__}")
                say(f"[{i}/{total}] {path.name}: couldn't be read ({e.__class__.__name__})")
                continue
            if still:
                failed.append(f"{path.name}: still cloud-only after reading")
                say(f"[{i}/{total}] {path.name}: read, but still marked cloud-only")
                continue
            done += 1
            say(f"[{i}/{total}] {path.name} ({size / 1e6:.1f} MB), {free(root) / GB:.1f} GB free")
    except KeyboardInterrupt:
        say(f"Stopped by you at {done} of {total}. Run it again to carry on.")
        return 2
    say(f"Pulled {done} of {total}." + (f" {len(failed)} problems:" if failed else " Now run the scan, then doctor."))
    for f in failed:
        say(f"  {f}")
    return 2 if failed or done < total else 0
