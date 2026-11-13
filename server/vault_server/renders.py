"""New mixdowns: one double-click brings what's new in the render folder into the Vault (ROADMAP 5.0a).

The render folder is only ever read, like the music folders: listed (names, sizes, times), and each new file opened
read-only once to fingerprint it. Its location comes from the library's settings file, never from this code or the
repo. New songs land in Sort like any new song; the server makes phone copies by itself once they're sorted Mine.
"""
import json
import os
import time
from pathlib import Path

from . import songs
from .scanner import AUDIO, hash_file, is_cloud_only
from .store import now, write_lock

SETTINGS_NAME = "vault-settings.json"
SEEN_NAME = "render-duplicates.json"  # renders already in the Vault, never made places (they'd take over the song's name)
STEADY_SECONDS = 2  # two looks this far apart: a file still exporting changes size or time between them


class NoRenderFolder(Exception):
    """The render folder isn't set up, or isn't there. Nothing was changed."""


# --- the setting -------------------------------------------------------------------------------------------------

def read_settings(root):
    path = Path(root) / SETTINGS_NAME
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}


def save_render_folder(root, folder):
    """Writes the render folder's location into the library's settings file (in the library, never the repo)."""
    _save_setting(root, "render_folder", str(Path(folder).resolve()))


def note_click(root):
    """When Send to Vault was last clicked, for the laptop desk's count (calm part 1). The library's settings file only."""
    _save_setting(root, "last_render", now())


def _save_setting(root, key, value):
    path = Path(root) / SETTINGS_NAME
    settings = read_settings(root)
    settings[key] = value
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def render_folder(root):
    """The saved render folder (a Path), or None if it was never set up."""
    folder = read_settings(root).get("render_folder")
    return Path(folder) if folder else None


def render_line(root):
    """(level, words) for doctor: is the render folder set up and there."""
    folder = render_folder(root)
    if folder is None:
        return "WARN", "not set up. Run: python server/vault_cli.py renders-setup <library> <render folder>"
    if not folder.is_dir():
        return "WARN", f"not found at {folder}. Moved or renamed? The Send to Vault icon can't bring songs in until it's back."
    return "PASS", f"found at {folder} ({len(look(folder)[0])} audio files)."


# --- looking -----------------------------------------------------------------------------------------------------

def look(folder):
    """({path: (size, modified ns, modified)}, errors) for every audio file in the folder and its subfolders. Opens nothing."""
    found, errors = {}, []
    for d, _, names in os.walk(folder, onerror=errors.append):
        for n in names:
            path = os.path.join(d, n)
            if os.path.splitext(n)[1].lower() not in AUDIO:
                continue
            try:
                st = os.stat(path)
            except OSError as e:
                errors.append(e)
                continue
            found[path] = (st.st_size, st.st_mtime_ns, st.st_mtime, is_cloud_only(st))
    return found, errors


def _label(folder, path):
    """Where the phone says the song came from: the render folder's own name, plus any subfolder."""
    rel = os.path.relpath(os.path.dirname(path), folder)
    return folder.name if rel == "." else os.path.join(folder.name, rel)


def bring_in(lib, folder, wait=STEADY_SECONDS, sleep=time.sleep):
    """Brings what's new in `folder` into the database. Returns what it saw, by kind, as lists of file names:
    new, updated (re-exported over the same name), moved (renamed or moved inside the folder: same song), already
    (same fingerprint as a song in the Vault, or one I hid), waiting (still
    exporting), cloud (cloud-only, not opened), unreadable."""
    folder = Path(folder).resolve()
    if not folder.is_dir():
        raise NoRenderFolder(f"Render folder not found: {folder}. Nothing was changed.")
    first, _ = look(folder)
    sleep(wait)
    second, errors = look(folder)
    out = {k: [] for k in ("new", "updated", "moved", "already", "waiting", "cloud", "unreadable")}
    conn = lib.store.conn
    known = {r["path"]: r for r in conn.execute("SELECT path, size, mtime, status, file_key FROM sources")}
    seen_path = lib.root / SEEN_NAME
    seen = json.loads(seen_path.read_text(encoding="utf-8")) if seen_path.is_file() else {}
    todo = []
    for path, (size, ns, mtime, cloud) in sorted(second.items()):
        name = os.path.basename(path)
        if first.get(path, (None, None))[:2] != (size, ns):
            out["waiting"].append(name)
            continue
        was = known.get(path)
        if was and was["status"] == "present" and was["size"] == size and was["mtime"] == mtime:
            continue  # seen before, unchanged: not new
        if seen.get(path) == [size, ns]:
            continue  # a duplicate already reported
        if cloud:
            out["cloud"].append(name)
            continue
        try:
            digest = hash_file(path)  # the one place a render is opened: read-only
        except OSError:
            out["unreadable"].append(name)
            continue
        todo.append((path, name, size, ns, mtime, digest, was))

    stamp, hashes = now(), set()
    # places in the render folder that aren't there any more (none if the look had errors: a partial look can't say)
    gone = set() if errors else {p for p, r in known.items() if r["status"] == "present" and _inside(folder, p) and p not in second}
    with write_lock(lib.store.lock_path):  # one writer at a time: the server's own writes wait their turn
        for path, name, size, ns, mtime, digest, was in todo:
            key = f"hash:{digest}"
            record = lambda: lib.store.upsert_source(path, lib.upsert_file(name, path, size, mtime, digest)[0],
                                                     _label(folder, path), name, size, mtime, False, stamp)
            if was and was["status"] == "present" and was["file_key"] == key:
                record()  # same bytes, only a new time: nothing to say
                continue
            twins = [(r["path"], r["song_id"]) for r in conn.execute(
                """SELECT s.path, p.song_id FROM sources s JOIN song_places p USING (path)
                   WHERE s.file_key=? AND s.path<>? AND s.status='present' ORDER BY s.path""", (key, path))]
            live = [t for t in twins if t[0] not in gone]
            hidden = conn.execute("SELECT 1 FROM verdicts WHERE file_key=? AND verdict='not_mine'", (key,)).fetchone()
            if live or hidden or digest in hashes:
                out["already"].append(name)  # remembered, not made a place: the song keeps its own file and name
                seen[path] = [size, ns]
                continue
            hashes.add(digest)
            record()
            if twins:  # renamed or moved inside the render folder: the new place joins the same song
                lib.store.record("song_place", {"path": path, "song_id": twins[0][1], "state": "sure", "why": "same_file"})
                out["moved"].append(name)
            else:
                out["updated" if was else "new"].append(name)
        lib.store.mark_paths_missing(sorted(gone))
        seen = {p: v for p, v in seen.items() if p in second}  # a duplicate I deleted is forgotten
        tmp = seen_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(seen, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        os.replace(tmp, seen_path)
        unlinked = [r["path"] for r in conn.execute("""SELECT s.path FROM sources s LEFT JOIN song_places p USING (path)
                    LEFT JOIN verdicts v ON v.file_key=s.file_key AND v.verdict='not_mine'
                    WHERE p.path IS NULL AND v.file_key IS NULL AND s.status='present'""") if _inside(folder, r["path"])]
        if todo or gone or unlinked:  # the songs command's steps: link into songs, then title, date, mine guesses.
            # `unlinked`: a click cut off between recording a file and linking it is finished by the next one
            songs.link_songs(lib)
            songs.fill_details(lib)
            songs.fill_mine(lib)
    return out


def _inside(folder, path):
    return os.path.normcase(path).startswith(os.path.normcase(str(folder)) + os.sep)


ICON_NAME = "Send to Vault.lnk"
ICON_PICTURE = r"%SystemRoot%\System32\imageres.dll,{}"
MAKE_ICON = r"""
$desk = [Environment]::GetFolderPath('Desktop')
$link = Join-Path $desk $env:VAULT_ICON_NAME
$s = (New-Object -ComObject WScript.Shell).CreateShortcut($link)
$s.TargetPath = $env:VAULT_PY
$s.Arguments = $env:VAULT_ARGS
$s.WorkingDirectory = $env:VAULT_CWD
$s.IconLocation = $env:VAULT_PICTURE
$s.Description = $env:VAULT_DESC
$s.Save()
Write-Output $link
"""


def make_icon(root, repo, python, picture=0, run=None, name=ICON_NAME, job="renders", tail=" --pause",
              about="Bring new mixdowns into the Vault"):
    """A Vault desktop icon. By default Send to Vault: double-click runs `renders` in a small window that waits for a
    key. `name`, `job` (the vault_cli command), `tail` and `about` make another (Vault Desk). Returns the icon's path."""
    import subprocess
    run = run or subprocess.run
    python = Path(python)
    if python.name.lower() == "pythonw.exe":  # the window needs the Python that has one
        python = python.with_name("python.exe")
    # through cmd, so a crash before the window's own pause (a broken Python, a missing file) still waits for a key
    command = f'"{python}" "{Path(repo) / "server" / "vault_cli.py"}" {job} "{Path(root).resolve()}"{tail}'
    env = {**os.environ, "VAULT_ICON_NAME": name, "VAULT_DESC": about, "VAULT_PY": os.path.expandvars("%ComSpec%"), "VAULT_CWD": str(repo),
           "VAULT_ARGS": f'/c "{command} || pause"',
           "VAULT_PICTURE": ICON_PICTURE.format(picture)}
    p = run(["powershell", "-NoProfile", "-Command", MAKE_ICON], env=env, capture_output=True, text=True)
    if p.returncode != 0:
        raise OSError(f"the desktop icon couldn't be made: {p.stderr.strip()}")
    return p.stdout.strip()


def words(out):
    """The window's message, plain."""
    lines = []
    new = len(out["new"])
    if new:
        lines.append(f"{new} new song{'s' if new != 1 else ''}, in Sort on your phone.")
    if out["updated"]:
        lines.append(f"{len(out['updated'])} re-exported, updated in the Vault: {', '.join(out['updated'])}")
    if out["moved"]:
        lines.append(f"{len(out['moved'])} renamed or moved, kept as the same song: {', '.join(out['moved'])}")
    if out["already"]:
        lines.append(f"{len(out['already'])} already in the Vault: {', '.join(out['already'])}")
    if out["waiting"]:
        lines.append(f"{len(out['waiting'])} still exporting, so left for the next click: {', '.join(out['waiting'])}")
    if out["cloud"]:
        lines.append(f"{len(out['cloud'])} only in the cloud, not opened: {', '.join(out['cloud'])}")
    if out["unreadable"]:
        lines.append(f"{len(out['unreadable'])} couldn't be read (open in another app?): {', '.join(out['unreadable'])}")
    return "\n".join(lines) or "Nothing new."
