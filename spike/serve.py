"""D4/D5 throwaway server. Plays a fixed list of songs from inventory.json; binds to localhost only.

python spike/serve.py --flp <one .flp to open> [--count 8]
Then, once: tailscale serve --bg 8787   (private HTTPS for your devices only)
Only listed ids can be read; only the one --flp can be opened. No path ever comes from the phone.
"""
import argparse, json, mimetypes, os, re, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("--flp", required=True)
ap.add_argument("--count", type=int, default=8)
ap.add_argument("--port", type=int, default=8787)
a = ap.parse_args()
inv = json.load(open(os.path.join(HERE, "output", "inventory.json"), encoding="utf-8"))
local = [f for f in inv["files"] if not f["cloud"] and f["ext"] in (".mp3", ".m4a", ".wav")]
SONGS = sorted(local, key=lambda f: -f["mtime"])[: a.count]
mimetypes.add_type("audio/mp4", ".m4a")
PAGE = """<!doctype html><meta name=viewport content="width=device-width,initial-scale=1">
<title>Vault spike</title><body style="font:16px system-ui;margin:20px"><h3>Vault spike</h3>%s
<p><button onclick="fetch('/open-flp',{method:'POST'}).then(r=>r.text()).then(alert)">Open test project in FL Studio</button>"""
open_lock = threading.Lock()


class H(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(self.command, self.path, self.headers.get("Range", ""), args[1] if len(args) > 1 else "")

    def send_body(self, code, body, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_POST(self):
        if self.path == "/open-flp":
            with open_lock:
                os.startfile(a.flp)  # opens with its default app, FL Studio; nothing from the request is used
            return self.send_body(200, b"Sent to the laptop", "text/plain")
        self.send_body(404, b"no", "text/plain")

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if self.path == "/":
            rows = "".join(f"<p>{os.path.basename(s['path'])}<br><audio controls preload=none src='/a/{i}' style='width:100%'></audio>"
                           for i, s in enumerate(SONGS))
            return self.send_body(200, (PAGE % rows).encode(), "text/html; charset=utf-8")
        if self.path == "/api/songs":
            rows = [dict(id=i, title=os.path.splitext(os.path.basename(s["path"]))[0], url=f"/a/{i}") for i, s in enumerate(SONGS)]
            return self.send_body(200, json.dumps(rows).encode(), "application/json")
        m = re.fullmatch(r"/a/(\d+)", self.path)
        if not m or int(m.group(1)) >= len(SONGS):
            return self.send_body(404, b"no", "text/plain")
        path = SONGS[int(m.group(1))]["path"]
        size = os.path.getsize(path)
        start, end, code = 0, size - 1, 200
        r = re.fullmatch(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
        if r and (r.group(1) or r.group(2)):
            if r.group(1):
                start = int(r.group(1))
                end = min(int(r.group(2)), size - 1) if r.group(2) else size - 1
            else:
                start = max(size - int(r.group(2)), 0)
            code = 206
            if start > end:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.end_headers()
                return
        self.send_response(code)
        self.send_header("Content-Type", mimetypes.guess_type(path)[0] or "application/octet-stream")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        if code == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        if self.command == "HEAD":
            return
        with open(path, "rb") as f:
            f.seek(start)
            left = end - start + 1
            try:
                while left:
                    chunk = f.read(min(65536, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass  # the player seeks by dropping connections


print(f"{len(SONGS)} songs on http://127.0.0.1:{a.port}")
ThreadingHTTPServer(("127.0.0.1", a.port), H).serve_forever()
