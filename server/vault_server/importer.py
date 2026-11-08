"""Import (ROADMAP 1.22) and phone copies (1.7). Both run any number of times and only do what's missing.

Import: every Mine song gets one copy of its file in the library's own `audio/<code>/<real filename>`. The copy is
checked by fingerprint (sha256): the bytes written must hash the same as the bytes read, and the same as the scan's
fingerprint when the scan had one. Not mine and unsorted songs never get a copy; a copy whose song stopped being Mine
is taken out again (only the library's copy: the original is never touched). Originals are only ever opened in
`_open_original`, read-only, after their live file attributes say they're on the laptop, so a cloud-only file is never
downloaded by this.

Phone copies: `phone/<code>/<name>.m4a`, AAC about 192 kbps, made from the library copy, never from the original. A file
already compressed (mp3 or AAC) at or under that rate is copied as it is.
"""
import hashlib
import json
import os
import shutil
import subprocess
import time
import uuid
from pathlib import Path

from .scanner import is_cloud_only

PHONE_KBPS = 192
AS_IS_KBPS = 200  # a 192 kbps file reads as 192-196 depending on the encoder
AS_IS_CODECS = {"mp3", "aac"}
CHUNK = 1024 * 1024
PART = ".part"
STALE_PART_SECONDS = 3600  # an import part this old was left by a run that was stopped; a younger one may be another run's
# the server's own background copies run below normal priority, so playback and the phone's requests come first
BACKGROUND = getattr(subprocess, "BELOW_NORMAL_PRIORITY_CLASS", 0)


class ToolMissing(Exception):
    """ffmpeg or ffprobe isn't installed, so phone copies can't be made. Nothing was changed."""


def _open_original(path):
    """The one place the import opens one of my music files."""
    return open(path, "rb")


def mine_ids(conn):
    return [r["song_id"] for r in conn.execute("SELECT song_id FROM song_fields WHERE field='mine' AND value='mine' ORDER BY song_id")]


def _source(conn, song_id):
    """(path, stat, scan fingerprint or None) of the file to import: the song's current version first, then any sure
    place on the laptop. (None, 'cloud' or 'gone', None) if none can be read now. Reads file attributes only."""
    rows = conn.execute("""
        SELECT s.path, s.file_key, v.id IS NOT NULL AS current FROM song_places p JOIN sources s USING (path)
        LEFT JOIN versions v ON v.song_id=p.song_id AND v.is_current=1 AND v.file_key=s.file_key
        WHERE p.song_id=? AND p.state='sure' AND s.status='present'
        ORDER BY v.id IS NULL, s.cloud_only, s.path""", (song_id,)).fetchall()
    cloud = False
    for r in rows:
        try:
            st = os.stat(r["path"])
        except OSError:
            continue
        if is_cloud_only(st):
            cloud = True
            continue
        if Path(r["path"]).is_file():
            known = r["file_key"][5:] if r["file_key"].startswith("hash:") else None
            return r["path"], st, known
    return None, "cloud" if cloud else "gone", None


def _inside(root, path):
    """Only ever removes things inside the library's own audio and phone folders."""
    path = Path(path).resolve()
    return any(Path(root, sub).resolve() in path.parents for sub in ("audio", "phone"))


def _remove_copy(root, sub, code):
    folder = Path(root, sub, code)
    if folder.is_dir() and _inside(root, folder / "x"):
        shutil.rmtree(folder)


def _copy_checked(src, dest_part):
    """Copies while hashing, then reads the copy back. (hash, size) if both match, else raises."""
    h = hashlib.sha256()
    size = 0
    with _open_original(src) as f, open(dest_part, "xb") as out:
        while chunk := f.read(CHUNK):
            h.update(chunk)
            out.write(chunk)
            size += len(chunk)
        out.flush()
        os.fsync(out.fileno())
    back = hashlib.sha256()
    with open(dest_part, "rb") as f:
        while chunk := f.read(CHUNK):
            back.update(chunk)
    if back.hexdigest() != h.hexdigest():
        raise OSError("The copy doesn't match what was read.")
    return h.hexdigest(), size


def _clear_stale(parts):
    """Parts left by a run that was stopped mid-copy (the server closed, the laptop slept). Never a finished copy, and
    never a young part: that may be another run still writing it."""
    for part in parts:
        try:
            if time.time() - part.stat().st_mtime > STALE_PART_SECONDS:
                part.unlink()
        except OSError:
            pass


def _clear_stale_parts(root):
    _clear_stale(Path(root, "audio").glob(f"incoming-*{PART}"))


def import_mine(lib, log=print, drop=True, stop=None):
    """Copies every Mine song that has no good copy yet. Returns the counts. `drop=False` (the server's background run)
    only adds: taking out copies of songs no longer Mine stays with the import command. `stop`: an Event checked between songs."""
    store, conn, root = lib.store, lib.store.conn, lib.root
    out = {"Mine songs": 0, "copied now": 0, "already in": 0, "waiting (cloud only, run pull-cloud)": 0, "file missing": 0,
           "fingerprint mismatch (not copied)": 0, "taken out (no longer Mine)": 0}
    _clear_stale_parts(root)
    mine = mine_ids(conn)
    out["Mine songs"] = len(mine)
    have = {r["song_id"]: r for r in conn.execute("SELECT * FROM imported")}
    for song_id in sorted(set(have) - set(mine)) if drop else []:
        row = have[song_id]
        store.record("imported", {"song_id": song_id, "dropped": True})
        if not conn.execute("SELECT 1 FROM imported WHERE code=?", (row["code"],)).fetchone():
            _remove_copy(root, "audio", row["code"])
            _remove_copy(root, "phone", row["code"])
        out["taken out (no longer Mine)"] += 1
    for n, song_id in enumerate(mine, 1):
        if stop and stop.is_set():
            break
        path, st, known = _source(conn, song_id)
        if path is None:
            out["waiting (cloud only, run pull-cloud)" if st == "cloud" else "file missing"] += 1
            continue
        row = have.get(song_id)
        if row and (row["src_path"], row["src_size"], row["src_mtime"]) == (path, st.st_size, st.st_mtime):
            copy = lib.audio_path(row["code"], row["name"])
            if copy.is_file() and copy.stat().st_size == row["size"]:
                out["already in"] += 1
                continue
        part = root / "audio" / f"incoming-{uuid.uuid4()}{PART}"
        try:
            digest, size = _copy_checked(path, part)
            if size != st.st_size or (known and digest != known.lower()):
                out["fingerprint mismatch (not copied)"] += 1
                log(f"  not copied, its fingerprint changed since the scan: {os.path.basename(path)}")
                continue
            code = lib.assign_code(digest)
            dest = lib.audio_path(code, os.path.basename(path))
            dest.parent.mkdir(exist_ok=True)
            os.replace(part, dest)
        finally:
            if part.exists():
                part.unlink()
        store.record("imported", {"song_id": song_id, "hash": digest, "code": code, "name": dest.name, "size": size,
                                  "src_path": path, "src_size": st.st_size, "src_mtime": st.st_mtime})
        if row and row["code"] != code and not conn.execute("SELECT 1 FROM imported WHERE code=?", (row["code"],)).fetchone():
            _remove_copy(root, "audio", row["code"])  # the song's file changed: the old copy goes
            _remove_copy(root, "phone", row["code"])
        out["copied now"] += 1
        log(f"  [{n}/{len(mine)}] {dest.name}")
    return out


def phone_copy(root, code):
    """The finished phone copy for this code, or None."""
    folder = Path(root, "phone", code)
    if not folder.is_dir():
        return None
    done = [p for p in folder.iterdir() if p.is_file() and not p.name.endswith(PART)]
    return done[0] if done else None


def _probe(path):
    """(codec, kbps or None) of the first audio stream."""
    p = subprocess.run(["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", "-show_format", "-select_streams", "a:0",
                        str(path)], capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60)
    info = json.loads(p.stdout or "{}")
    stream = (info.get("streams") or [{}])[0]
    rate = stream.get("bit_rate") or info.get("format", {}).get("bit_rate")
    return stream.get("codec_name"), int(rate) / 1000 if rate and str(rate).isdecimal() else None


def make_phone_copies(lib, log=print, background=False, stop=None):
    """A phone copy for every imported song that has none. Returns the counts. `background`: ffmpeg runs below normal
    priority (the server's own runs). `stop`: an Event checked between songs. A run stopped mid-song leaves only a .part
    file, never a broken copy under the real name, and the next run starts that song again."""
    if not (shutil.which("ffmpeg") and shutil.which("ffprobe")):
        raise ToolMissing("ffmpeg or ffprobe not found, so phone copies can't be made. Nothing changed.")
    conn, root = lib.store.conn, lib.root
    out = {"made now (AAC 192 kbps)": 0, "copied as is (already small)": 0, "already there": 0, "failed": 0}
    rows = conn.execute("""SELECT i.*, g.title FROM imported i JOIN songs g ON g.id=i.song_id ORDER BY g.title COLLATE NOCASE""").fetchall()
    for n, r in enumerate(rows, 1):
        if stop and stop.is_set():
            break
        if phone_copy(root, r["code"]):
            out["already there"] += 1
            continue
        src = lib.audio_path(r["code"], r["name"])
        codec, kbps = _probe(src)
        as_is = codec in AS_IS_CODECS and kbps is not None and kbps <= AS_IS_KBPS
        name = r["name"] if as_is else f"{os.path.splitext(r['name'])[0]}.m4a"
        dest = lib.phone_path(r["code"], name)
        dest.parent.mkdir(exist_ok=True)
        # its own name per run: the server's background run and the copies command can overlap, and neither may delete
        # the other's file mid-write. Parts left by a stopped run are cleared once they're old.
        part = dest.with_name(f"{dest.name}.{uuid.uuid4().hex[:8]}{PART}")
        _clear_stale(dest.parent.glob(f"*{PART}"))
        try:
            if as_is:
                shutil.copyfile(src, part)
            else:
                p = subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-i", str(src), "-map", "0:a:0", "-vn", "-c:a", "aac",
                                    "-b:a", f"{PHONE_KBPS}k", "-movflags", "+faststart", "-f", "mp4", str(part)],
                                   capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=600,
                                   creationflags=BACKGROUND if background else 0)
                if p.returncode != 0 or not part.is_file() or part.stat().st_size == 0:
                    raise OSError((p.stderr or "ffmpeg made nothing").strip().splitlines()[-1])
            os.replace(part, dest)
        except (OSError, subprocess.SubprocessError) as e:
            out["failed"] += 1
            log(f"  failed: {r['title']}: {e}")
            if part.exists():
                part.unlink()
            continue
        out["copied as is (already small)" if as_is else "made now (AAC 192 kbps)"] += 1
        log(f"  [{n}/{len(rows)}] {dest.name}")
    return out


def size_report(lib, biggest=10):
    """Song count, total MB and the biggest phone copies, from the files on disk."""
    rows = lib.store.conn.execute("SELECT i.code, g.title FROM imported i JOIN songs g ON g.id=i.song_id").fetchall()
    sizes = []
    for r in rows:
        copy = phone_copy(lib.root, r["code"])
        if copy:
            sizes.append((copy.stat().st_size, r["title"]))
    sizes.sort(reverse=True)
    total = sum(s for s, _ in sizes)
    lines = [f"Phone copies: {len(sizes)} songs, {total / 1e6:,.1f} MB in all"
             + (f", {total / 1e6 / len(sizes):.1f} MB each on average" if sizes else "")]
    lines += [f"  {s / 1e6:6.1f} MB  {title}" for s, title in sizes[:biggest]]
    return "\n".join(lines)


def kept(conn, root):
    """What /kept answers: every Mine song with a phone copy, and the copy's size."""
    out = []
    for r in conn.execute("""SELECT i.song_id, i.code, g.title, d.value AS date, m.main_id AS main FROM imported i
                             JOIN songs g ON g.id=i.song_id
                             JOIN song_fields f ON f.song_id=i.song_id AND f.field='mine' AND f.value='mine'
                             LEFT JOIN song_fields d ON d.song_id=i.song_id AND d.field='date'
                             LEFT JOIN song_family m ON m.song_id=i.song_id
                             ORDER BY d.value IS NULL, d.value DESC, g.title COLLATE NOCASE"""):
        copy = phone_copy(root, r["code"])
        if copy:
            st = copy.stat()
            # the phone keeps this next to its copy: a rebuilt copy has a new stamp, so the phone fetches it again
            out.append({"id": r["song_id"], "title": r["title"], "date": r["date"], "main": r["main"], "size": st.st_size,
                        "type": copy.suffix.lstrip(".").lower(), "stamp": f"{st.st_size}-{st.st_mtime_ns}"})
    return out


def mine_without_phone_copy(conn, root):
    """Mine songs with no finished phone copy on the laptop: what the phone can't keep yet. Reads the folders only."""
    copies = {r["song_id"]: r["code"] for r in conn.execute("SELECT song_id, code FROM imported")}
    return [song_id for song_id in mine_ids(conn) if not (copies.get(song_id) and phone_copy(root, copies[song_id]))]


def mine_without_copy(conn, root, listed):
    """Mine songs missing from /kept (no phone copy yet), so the phone never takes one for a song no longer Mine."""
    have = {s["id"] for s in listed}
    return [r["song_id"] for r in conn.execute("SELECT song_id FROM song_fields WHERE field='mine' AND value='mine'")
            if r["song_id"] not in have]
