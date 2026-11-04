"""The server: lists known songs, plays one by id with seeking, lays out what Sort shows, and takes my choices from the phone.

Music is read-only by construction: a music file is only ever opened in `_open_audio`, in read mode, after its live file
attributes say it's on the laptop. Every read route uses the database in SQLite's read-only mode. `POST /changes` is the
one route that changes anything, and it writes only to the journal and database, through `apply_changes`. Listens on the
laptop itself and its Tailscale address only.
"""
import ipaddress
import json
import os
import re
import shutil
import socketserver
import sqlite3
import stat
import subprocess
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from .backup import BACKUP_DIR, last_backup_age
from .family import in_family, set_family
from .library import DB_NAME, MARKER_NAME, LibraryMissing, LibraryRefused, open_library
from .scanner import is_cloud_only
from .songs import restore_mine, set_mine
from .store import LOCK_NAME, SCHEMA_VERSION, Busy, write_lock

PORT = 8787
LOOPBACK = "127.0.0.1"
TAILSCALE_RANGE = ipaddress.ip_network((0x64400000, 10))  # the block Tailscale hands out addresses from
TAILSCALE_EXE = r"C:\Program Files\Tailscale\tailscale.exe"
CHUNK = 64 * 1024
SONG_ID = re.compile(r"[0-9a-fA-F-]{36}")
AUDIO_ROUTE = re.compile(r"/songs/([^/]*)/audio")
MEDIA_TYPES = {".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav", ".flac": "audio/flac",
               ".aif": "audio/aiff", ".aiff": "audio/aiff"}
NOT_ON_LAPTOP = "not on laptop yet"
CLIENT_HEADER = "X-Vault-Client"  # a web page can't send this to another site without the server's say-so, which it never gives
MAX_BODY = 1024 * 1024
MINE_VALUES = ("mine", "not mine")
MIN_FOLDER_SET = 2
MIN_NAME_SET = 3  # two titles alike happen by chance
NAME_TAIL = re.compile(r"(?:[\s_.\-]*(?:\(\d+\)|v?\d+|copy))+$", re.IGNORECASE)
LIKELY_FIRST = {"mine": 0, "likely mine": 1}

PAGE = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Vault</title>
<style>
body { font: 16px -apple-system, system-ui, sans-serif; margin: 0; background: #111; color: #eee; }
header { position: sticky; top: 0; background: #222; padding: 12px; }
audio { width: 100%; }
#now { margin: 0 0 8px; min-height: 1.3em; }
button { display: block; width: 100%; padding: 14px 12px; text-align: left; font: inherit; color: inherit;
         background: none; border: 0; border-bottom: 1px solid #333; }
small { display: block; color: #999; margin-top: 2px; }
</style></head>
<body>
<header><p id="now">Loading songs...</p><audio id="player" controls preload="none"></audio></header>
<main id="songs"></main>
<script>
const now = document.getElementById("now"), player = document.getElementById("player");
player.addEventListener("error", () => { if (player.getAttribute("src")) now.textContent = "Couldn't play that one."; });
function play(song) {
  const url = "/songs/" + song.id + "/audio";
  now.textContent = song.title;
  if (song.where === "laptop") { player.src = url; player.play().catch(() => {}); return; }
  // the list can be behind the disk: ask the server, which never opens a cloud-only file
  fetch(url, {method: "HEAD"}).then(r => {
    if (r.ok) { player.src = url; now.textContent = song.title + " (press play)"; }
    else { player.pause(); player.removeAttribute("src"); now.textContent = song.title + ": " +
           (song.where === "cloud" ? "not on laptop yet" : "file not found"); }
  });
}
fetch("/songs").then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.error); })).then(d => {
  now.textContent = d.songs.length + " songs. Tap one.";
  const list = document.getElementById("songs");
  for (const song of d.songs) {
    const b = document.createElement("button"), s = document.createElement("small");
    b.textContent = song.title;
    s.textContent = song.mine + (song.where === "laptop" ? "" : song.where === "cloud" ? " · not on laptop yet" : " · file not found");
    b.append(s);
    b.onclick = () => play(song);
    list.append(b);
  }
}).catch(e => { now.textContent = e.message; });
</script>
</body></html>
"""


def connect_readonly(root):
    """The database, unable to write. Unlike `open_library` this creates nothing, even if the library is gone or old."""
    root = Path(root)
    if not (root / MARKER_NAME).is_file():
        raise LibraryMissing(f"Library missing: no {MARKER_NAME} in {root}. Nothing was created.")
    conn = sqlite3.connect(f"{(root.resolve() / DB_NAME).as_uri()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT value FROM meta WHERE key='schema_version'").fetchone()
    if not row or int(row["value"]) != SCHEMA_VERSION:
        conn.close()
        raise LibraryRefused("The database is from another version of the app. Run the check command, then scan, first.")
    return conn


PLACE_SQL = """CASE WHEN EXISTS (SELECT 1 FROM song_places p JOIN sources s USING (path)
                             WHERE p.song_id=g.id AND p.state='sure' AND s.status='present' AND s.cloud_only=0) THEN 'laptop'
                WHEN EXISTS (SELECT 1 FROM song_places p JOIN sources s USING (path)
                             WHERE p.song_id=g.id AND s.status='present') THEN 'cloud'
                ELSE 'gone' END"""


FOLDER_SQL = """(SELECT s.folder FROM song_places p JOIN sources s USING (path)
                WHERE p.song_id=g.id AND p.state='sure' AND s.status='present' ORDER BY s.cloud_only, s.path LIMIT 1)"""


def show_folder(folder):
    return " / ".join((folder or "").split(os.sep)) or "Loose files"


def list_songs(conn, hidden=False):
    """Known songs, from the database only: the list never touches the music folders. Not-mine songs are listed only
    when `hidden` is asked for, and then on their own. `main` is the song's Main if it is one of several versions."""
    rows = conn.execute(f"""
        SELECT g.id, g.title, COALESCE(f.value, 'unknown') AS mine, d.value AS date, COALESCE(f.origin = 'manual', 0) AS sorted,
               {PLACE_SQL} AS place, {FOLDER_SQL} AS folder, m.main_id AS main
        FROM songs g LEFT JOIN song_fields f ON f.song_id=g.id AND f.field='mine'
        LEFT JOIN song_fields d ON d.song_id=g.id AND d.field='date'
        LEFT JOIN song_family m ON m.song_id=g.id
        WHERE COALESCE(f.value, 'unknown') {'=' if hidden else '!='} 'not mine'
        ORDER BY place='laptop' DESC, g.title COLLATE NOCASE""")
    return [{"id": r["id"], "title": r["title"], "mine": r["mine"], "where": r["place"], "date": r["date"],
             "sorted": bool(r["sorted"]), "folder": show_folder(r["folder"]), "main": r["main"]} for r in rows]


def name_stem(title):
    """What a run of takes shares: 'Mmmm-002', 'Mmmm 3' and 'Mmmm (1) copy' all give 'Mmmm'. '' if no letters are left."""
    stem = NAME_TAIL.sub("", title).strip(" _.-")
    return stem if re.search(r"[^\W\d_]", stem) else ""


def sorting_view(conn):
    """What Sort needs: songs nobody has judged yet, likely mine first, and sets of them to sweep, folders first, then
    repeated name patterns. Judged means my call, from the phone or from the Phase 0 triage."""
    rows = conn.execute(f"""
        SELECT g.id, g.title, COALESCE(f.value, 'unknown') AS mine, d.value AS date, {PLACE_SQL} AS place,
               {FOLDER_SQL} AS folder
        FROM songs g LEFT JOIN song_fields f ON f.song_id=g.id AND f.field='mine'
        LEFT JOIN song_fields d ON d.song_id=g.id AND d.field='date'
        WHERE f.song_id IS NULL OR (f.origin != 'manual' AND COALESCE(f.basis, '') != 'verdict' AND f.value != 'not mine')""")
    songs = sorted(({"id": r["id"], "title": r["title"], "mine": r["mine"], "where": r["place"], "date": r["date"],
                     "folder": show_folder(r["folder"]), "sorted": False} for r in rows),
                   key=lambda s: (LIKELY_FIRST.get(s["mine"], len(LIKELY_FIRST)), s["folder"].casefold(), s["title"].casefold()))
    by_folder, by_name, names = {}, {}, {}
    for s in songs:
        by_folder.setdefault(s["folder"], []).append(s["id"])
        stem = name_stem(s["title"])
        if stem:
            by_name.setdefault(stem.casefold(), []).append(s["id"])
            names.setdefault(stem.casefold(), stem)
    biggest_first = lambda groups, least: sorted(((k, v) for k, v in groups.items() if len(v) >= least),
                                                 key=lambda kv: (-len(kv[1]), kv[0].casefold()))
    sets = [{"id": f"folder:{k}", "kind": "folder", "name": k, "songs": v} for k, v in biggest_first(by_folder, MIN_FOLDER_SET)]
    same = {frozenset(x["songs"]) for x in sets}
    sets += [{"id": f"name:{k}", "kind": "name", "name": f"{names[k]}…", "songs": v}
             for k, v in biggest_first(by_name, MIN_NAME_SET) if frozenset(v) not in same]
    return {"total": conn.execute("SELECT COUNT(*) FROM songs").fetchone()[0], "songs": songs, "sets": sets}


def health(root, backup_dir=BACKUP_DIR):
    """What the phone's warning needs: is the library there, and how old are the last backup and scan (hours, or None)."""
    age = last_backup_age(backup_dir)
    out = {"library": (Path(root) / MARKER_NAME).is_file(), "backup_hours": None if age is None else round(age.total_seconds() / 3600, 1),
           "scan_hours": None}
    if out["library"]:
        try:
            conn = connect_readonly(root)
            try:
                latest = conn.execute("SELECT MAX(last_seen) FROM sources").fetchone()[0]
            finally:
                conn.close()
        except (LibraryMissing, LibraryRefused, sqlite3.Error):
            return out
        if latest:
            when = datetime.strptime(latest, "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=timezone.utc)
            out["scan_hours"] = round((datetime.now(timezone.utc) - when).total_seconds() / 3600, 1)
    return out


def apply_one(store, change):
    """'saved', 'nothing to do', or raises ValueError. Only allow-listed kinds get through."""
    if not isinstance(change, dict) or not SONG_ID.fullmatch(str(change.get("id"))):
        raise ValueError("A change needs an id.")
    data = change.get("data")
    if not isinstance(data, dict) or not SONG_ID.fullmatch(str(data.get("song_id"))):
        raise ValueError("A change needs a song id.")
    if change.get("kind") == "mine_set":
        if data.get("value") not in MINE_VALUES:
            raise ValueError(f"mine_set value must be one of {MINE_VALUES}.")
        if data["value"] != "mine" and in_family(store.conn, data["song_id"]):
            raise ValueError("That song is one of several versions: take it out of Versions first.")
        done = set_mine(store, data["song_id"], data["value"], change["id"])
    elif change.get("kind") == "mine_restore":
        if not store.conn.execute("SELECT 1 FROM songs WHERE id=?", (data["song_id"],)).fetchone():
            raise ValueError("mine_restore is for a song that doesn't exist.")
        if in_family(store.conn, data["song_id"]):
            raise ValueError("That song is one of several versions: take it out of Versions first.")
        done = restore_mine(store, data["song_id"], change["id"])
    elif change.get("kind") == "family_set":
        done = set_family(store, data, change["id"])
    else:
        raise ValueError("That kind of change isn't allowed.")
    return "saved" if done else "nothing to do"


def apply_changes(root, changes):
    """One result per change, in order. A fresh Store each time, so it sees what laptop commands did. Raises Busy if
    the lock can't be had, with nothing written. The first check stops a missing or old library before anything is created."""
    root = Path(root)
    connect_readonly(root).close()
    results = []
    with write_lock(root / LOCK_NAME):
        lib = open_library(root)
        try:
            for change in changes:
                wanted = change.get("id") if isinstance(change, dict) else None
                try:
                    results.append({"id": wanted, "status": apply_one(lib.store, change)})
                except ValueError as e:
                    results.append({"id": wanted, "status": "refused", "why": str(e)})
        finally:
            lib.close()
    return results


def song_places(conn, song_id):
    """Places surely holding this song: its current version first. Never a 'likely' place, which may be another file."""
    return [r["path"] for r in conn.execute("""
        SELECT s.path FROM song_places p JOIN sources s USING (path)
        LEFT JOIN versions v ON v.song_id=p.song_id AND v.is_current=1 AND v.file_key=s.file_key
        WHERE p.song_id=? AND p.state='sure' AND s.status='present'
        ORDER BY v.id IS NULL, s.cloud_only, s.path""", (song_id,))]


def find_playable(paths):
    """(path, size, 'cloud' seen). The file attributes are read live, because the scan can be out of date. Opens nothing."""
    cloud = False
    for path in paths:
        try:
            st = os.stat(path)
        except OSError:
            continue
        if is_cloud_only(st):
            cloud = True
        elif stat.S_ISREG(st.st_mode):
            return path, st.st_size, cloud
    return None, 0, cloud


def parse_range(header, size):
    """(start, end) inclusive; None for the whole file; 'bad' if it asks for bytes the file doesn't have.
    Anything that isn't one plain byte range is ignored, as HTTP allows, and gets the whole file."""
    m = re.fullmatch(r"bytes=(\d*)-(\d*)", (header or "").strip())
    if not m or (not m[1] and not m[2]):
        return None
    if not m[1]:  # the last N bytes
        count = int(m[2])
        return (max(size - count, 0), size - 1) if count and size else "bad"
    start = int(m[1])
    if m[2] and int(m[2]) < start:
        return None
    if start >= size:
        return "bad"
    return start, min(int(m[2]), size - 1) if m[2] else size - 1


def _open_audio(path):
    """The one place the server opens a music file."""
    return open(path, "rb")


def make_handler(root, allowed_hosts, backup_dir=BACKUP_DIR):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"
        server_version = "Vault"
        sys_version = ""

        def log_message(self, *args):
            pass

        def _send(self, status, body, content_type):
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)

        def _json(self, status, data):
            self._send(status, json.dumps(data, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8")

        def _error(self, status, message):
            self._json(status, {"error": message})

        def _handle(self):
            # a web page in a browser can't reach this by pointing a made-up name at the laptop
            host = self.headers.get("Host", "").rsplit(":", 1)[0].lower().rstrip(".")
            if host not in allowed_hosts:
                return self._error(403, "Unknown address.")
            route = self.path.split("?", 1)[0]
            try:
                if route == "/":
                    return self._send(200, PAGE.encode("utf-8"), "text/html; charset=utf-8")
                if route == "/health":
                    return self._json(200, health(root, backup_dir))
                if route == "/sorting":
                    conn = connect_readonly(root)
                    try:
                        return self._json(200, sorting_view(conn))
                    finally:
                        conn.close()
                if route == "/songs":
                    hidden = parse_qs(urlsplit(self.path).query).get("hidden") == ["1"]
                    conn = connect_readonly(root)
                    try:
                        return self._json(200, {"songs": list_songs(conn, hidden)})
                    finally:
                        conn.close()
                m = AUDIO_ROUTE.fullmatch(route)
                if m and SONG_ID.fullmatch(m[1]):
                    return self._audio(m[1])
                if route.startswith("/songs/"):
                    return self._error(400, "Songs are played by id only.")
                return self._error(404, "Nothing here.")
            except (LibraryMissing, LibraryRefused) as e:
                return self._error(503, str(e))
            except sqlite3.Error:
                return self._error(503, "The library database can't be read right now.")

        def _audio(self, song_id):
            conn = connect_readonly(root)
            try:
                if not conn.execute("SELECT 1 FROM songs WHERE id=?", (song_id,)).fetchone():
                    return self._error(404, "No song with that id.")
                paths = song_places(conn, song_id)
            finally:
                conn.close()
            path, size, cloud = find_playable(paths)
            if path is None:
                return self._error(409, NOT_ON_LAPTOP) if cloud else self._error(404, "That song's file isn't there now.")
            wanted = parse_range(self.headers.get("Range"), size)
            if wanted == "bad":
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            start, end = wanted or (0, size - 1)
            self.send_response(206 if wanted else 200)
            self.send_header("Content-Type", MEDIA_TYPES.get(os.path.splitext(path)[1].lower(), "application/octet-stream"))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(end - start + 1))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            if wanted:
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.end_headers()
            if self.command == "HEAD":
                return
            with _open_audio(path) as f:
                f.seek(start)
                left = end - start + 1
                while left > 0:
                    chunk = f.read(min(CHUNK, left))
                    if not chunk:
                        self.close_connection = True  # the file shrank: the promised length can't be met
                        return
                    self.wfile.write(chunk)
                    left -= len(chunk)

        def _changes(self):
            # checked in this order so nothing is read or opened for a request that won't be accepted
            host = self.headers.get("Host", "").rsplit(":", 1)[0].lower().rstrip(".")
            if host not in allowed_hosts:
                return self._error(403, "Unknown address.")
            if self.path != "/changes":
                return self._error(404, "Nothing here.")
            if not self.headers.get(CLIENT_HEADER):
                return self._error(403, "Changes come from the app.")
            length = self.headers.get("Content-Length", "")
            if not length.isdecimal():
                return self._error(411, "Say how long the changes are.")
            if int(length) > MAX_BODY:
                return self._error(413, "Too many changes at once.")
            try:
                changes = json.loads(self.rfile.read(int(length)))["changes"]
            except (ValueError, KeyError, TypeError, RecursionError):
                return self._error(400, "That isn't a list of changes.")
            if not isinstance(changes, list):
                return self._error(400, "That isn't a list of changes.")
            try:
                return self._json(200, {"results": apply_changes(root, changes)})
            except Busy as e:
                return self._error(503, f"busy: {e}")
            except (LibraryMissing, LibraryRefused, ValueError) as e:  # ValueError: the journal is damaged
                return self._error(503, str(e))
            except sqlite3.Error:
                return self._error(503, "The library database can't be written right now.")

        def do_POST(self):
            self.close_connection = True  # a refused request's body is left unread, so this connection can't be reused
            try:
                self._changes()
            except OSError:  # the phone hung up, or the library drive went away
                pass

        def do_GET(self):
            try:
                self._handle()
            except OSError:  # the player hung up (normal when seeking) or the file went away mid-song
                self.close_connection = True

        do_HEAD = do_GET

    return Handler


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = False  # on Windows it would let a second copy share the port silently

    def server_bind(self):
        socketserver.TCPServer.server_bind(self)  # the standard one looks up the address's name, which can stall
        self.server_name, self.server_port = self.server_address[:2]


def tailscale_info(run=subprocess.run):
    """(address, names) of this laptop on Tailscale, or (None, []) if it isn't connected."""
    exe = shutil.which("tailscale") or TAILSCALE_EXE
    try:
        p = run([exe, "status", "--json"], capture_output=True, text=True, encoding="utf-8", timeout=10)
        me = json.loads(p.stdout)["Self"]
        if p.returncode != 0 or not me.get("Online"):
            return None, []
    except (OSError, subprocess.SubprocessError, ValueError, KeyError, TypeError):
        return None, []
    for text in me.get("TailscaleIPs") or []:
        try:
            ip = ipaddress.ip_address(text)
        except ValueError:
            continue
        if ip.version == 4 and ip in TAILSCALE_RANGE:
            name = (me.get("DNSName") or "").rstrip(".").lower()
            return text, [name, name.split(".")[0]] if name else []
    return None, []


def start_servers(root, addresses, port, names=(), backup_dir=BACKUP_DIR):
    """One listener per address, each on its own thread. Returns the listeners."""
    allowed = {"localhost", LOOPBACK, *addresses, *names}
    handler = make_handler(root, allowed, backup_dir)
    servers = []
    try:
        for address in addresses:
            servers.append(Server((address, port), handler))
    except OSError:
        for s in servers:
            s.server_close()
        raise
    for s in servers:
        threading.Thread(target=s.serve_forever, daemon=True).start()
    return servers


def stop_servers(servers):
    for s in servers:
        s.shutdown()
        s.server_close()


def run(root, port=PORT):
    """The serve command: runs until Ctrl+C."""
    connect_readonly(root).close()  # stop now, not on the first request, if the library isn't there
    open_library(root).close()  # adds any new table (versions) before the read-only routes look for it
    address, names = tailscale_info()
    try:
        servers = start_servers(root, [LOOPBACK] + ([address] if address else []), port, names)
    except OSError:
        print(f"Stopped: port {port} is already in use. Is the server already running?")
        return 2
    print(f"On this laptop: http://{LOOPBACK}:{port}/")
    if address:
        print(f"On the phone (Safari, Tailscale on): http://{names[0] if names else address}:{port}/")
        if names:
            print(f"If that doesn't open, use: http://{address}:{port}/")
    else:
        print("Tailscale isn't connected, so the phone can't reach this. Laptop only for now.")
    print("Ctrl+C stops it.", flush=True)
    stop = threading.Event()
    try:
        while not stop.wait(0.5):  # short waits, or Ctrl+C isn't noticed on Windows
            pass
    except KeyboardInterrupt:
        pass
    stop_servers(servers)
    print("Stopped.")
    return 0
