"""The server: lists known songs and plays one by id, with seeking.

Read-only by construction: the database is opened in SQLite's read-only mode, there is no route that changes anything,
and a music file is only ever opened in `_open_audio`, after its live file attributes say it's on the laptop. Listens on
the laptop itself and its Tailscale address only.
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
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from .library import DB_NAME, MARKER_NAME, LibraryMissing, LibraryRefused
from .scanner import is_cloud_only
from .store import SCHEMA_VERSION

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


def list_songs(conn):
    """Known songs, from the database only: the list never touches the music folders."""
    rows = conn.execute("""
        SELECT g.id, g.title, COALESCE(f.value, 'unknown') AS mine,
               CASE WHEN EXISTS (SELECT 1 FROM song_places p JOIN sources s USING (path)
                                 WHERE p.song_id=g.id AND p.state='sure' AND s.status='present' AND s.cloud_only=0) THEN 'laptop'
                    WHEN EXISTS (SELECT 1 FROM song_places p JOIN sources s USING (path)
                                 WHERE p.song_id=g.id AND s.status='present') THEN 'cloud'
                    ELSE 'gone' END AS place
        FROM songs g LEFT JOIN song_fields f ON f.song_id=g.id AND f.field='mine'
        ORDER BY place='laptop' DESC, g.title COLLATE NOCASE""")
    return [{"id": r["id"], "title": r["title"], "mine": r["mine"], "where": r["place"]} for r in rows]


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


def make_handler(root, allowed_hosts):
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
                if route == "/songs":
                    conn = connect_readonly(root)
                    try:
                        return self._json(200, {"songs": list_songs(conn)})
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


def start_servers(root, addresses, port, names=()):
    """One listener per address, each on its own thread. Returns the listeners."""
    allowed = {"localhost", LOOPBACK, *addresses, *names}
    handler = make_handler(root, allowed)
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
