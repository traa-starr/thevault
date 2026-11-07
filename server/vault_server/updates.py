"""Over-the-air app updates, served from the laptop (DECISIONS 2026-11-07: expo-updates, self-hosted, no cloud account).

`publish` builds the app's code (the JavaScript, no native parts) with `npx expo export` into the library folder's own
`updates` folder and writes the manifest the phone asks for. The server answers `GET /update` with the newest one for the
phone's runtime version (Expo Updates protocol v1), and `GET /update-files/<name>/<path>` with its files. Writes only
inside `<library>/updates`. Keeps the last KEEP updates.
"""
import base64
import hashlib
import json
import mimetypes
import re
import shutil
import subprocess
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

UPDATES_DIR = "updates"
LATEST = "latest.txt"
MANIFEST = "manifest.json"
KEEP = 5
NAME = re.compile(r"\d{8}-\d{6}")
APP_DIR = Path(__file__).resolve().parents[2] / "app"


def _b64url_sha256(data):
    return base64.urlsafe_b64encode(hashlib.sha256(data).digest()).rstrip(b"=").decode("ascii")


def runtime_version(app_dir=APP_DIR):
    """The app's runtime version from app.json: a build only takes updates made for the same one."""
    return str(json.loads((Path(app_dir) / "app.json").read_text(encoding="utf-8"))["expo"]["runtimeVersion"])


def make_manifest(folder, runtime, created_at):
    """The manifest for an exported update in `folder`. Asset urls are paths; the server adds the address."""
    meta = json.loads((folder / "metadata.json").read_text(encoding="utf-8"))["fileMetadata"]["ios"]

    def asset(rel, ext, launch):
        data = (folder / rel).read_bytes()
        return {"hash": _b64url_sha256(data), "key": hashlib.md5(data).hexdigest(),
                "fileExtension": ".bundle" if launch else f".{ext}",
                "contentType": "application/javascript" if launch else (mimetypes.guess_type(f"x.{ext}")[0] or "application/octet-stream"),
                "path": rel.replace("\\", "/")}

    # the id follows the content, so publishing the same code twice offers nothing new
    meta_bytes = (folder / "metadata.json").read_bytes()
    return {"id": str(uuid.UUID(bytes=hashlib.sha256(meta_bytes).digest()[:16], version=4)),
            "createdAt": created_at, "runtimeVersion": runtime,
            "launchAsset": asset(meta["bundle"], "bundle", True),
            "assets": [asset(a["path"], a["ext"], False) for a in meta.get("assets", [])],
            "metadata": {}, "extra": {}}


def publish(root, app_dir=APP_DIR, run=subprocess.run):
    """Export the app's code and make it the update the phone gets next. Returns (ok, words)."""
    base = Path(root) / UPDATES_DIR
    base.mkdir(exist_ok=True)
    now = datetime.now(timezone.utc)
    stamp = now
    while (base / stamp.strftime("%Y%m%d-%H%M%S")).exists():  # two publishes in one second
        stamp += timedelta(seconds=1)
    name = stamp.strftime("%Y%m%d-%H%M%S")
    out = base / name
    npx = shutil.which("npx") or "npx"
    p = run([npx, "expo", "export", "--platform", "ios", "--output-dir", str(out)], cwd=str(app_dir))
    if p.returncode != 0 or not (out / "metadata.json").is_file():
        shutil.rmtree(out, ignore_errors=True)
        return False, "Stopped: the app code didn't build. Nothing was published; the phone keeps what it has."
    runtime = runtime_version(app_dir)
    manifest = make_manifest(out, runtime, now.isoformat(timespec="milliseconds").replace("+00:00", "Z"))
    (out / MANIFEST).write_text(json.dumps(manifest), encoding="utf-8")
    (base / LATEST).write_text(name, encoding="utf-8")
    for old in sorted(d for d in base.iterdir() if d.is_dir() and NAME.fullmatch(d.name))[:-KEEP]:
        shutil.rmtree(old, ignore_errors=True)
    return True, (f"Published update {name} (runtime {runtime}). With the server running, close and reopen the app "
                  "on the phone: it loads the new code by itself.")


def latest(root):
    """(name, manifest) of the newest update, or (None, None)."""
    base = Path(root) / UPDATES_DIR
    try:
        name = (base / LATEST).read_text(encoding="utf-8").strip()
        if not NAME.fullmatch(name):
            return None, None
        return name, json.loads((base / name / MANIFEST).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None, None


def update_answer(root, platform, runtime, origin):
    """What GET /update returns: (status, headers, body). An update as multipart/mixed, or 204 for none."""
    common = {"expo-protocol-version": "1", "expo-sfv-version": "0", "Cache-Control": "private, max-age=0"}
    if platform != "ios":
        return 400, {**common, "Content-Type": "application/json"}, b'{"error": "iOS only."}'
    name, manifest = latest(root)
    if not manifest or manifest.get("runtimeVersion") != runtime:
        return 204, common, b""

    def url(a):
        out = {k: v for k, v in a.items() if k != "path"}
        out["url"] = f"{origin}/update-files/{name}/{a['path']}"
        return out

    body_manifest = {**manifest, "launchAsset": url(manifest["launchAsset"]), "assets": [url(a) for a in manifest["assets"]]}
    boundary = f"vault-{uuid.uuid4().hex}"
    part = json.dumps(body_manifest).encode("utf-8")
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"manifest\"\r\n"
            f"Content-Type: application/json; charset=utf-8\r\n\r\n").encode("ascii") + part + f"\r\n--{boundary}--\r\n".encode("ascii")
    return 200, {**common, "Content-Type": f"multipart/mixed; boundary={boundary}"}, body


def update_file(root, name, rel):
    """The path of one file of a published update, or None. Never leaves that update's folder."""
    if not NAME.fullmatch(name) or not rel or "\\" in rel:
        return None
    folder = (Path(root) / UPDATES_DIR / name).resolve()
    path = (folder / rel).resolve()
    if folder not in path.parents or path.name in (MANIFEST,) or not path.is_file():
        return None
    return path
