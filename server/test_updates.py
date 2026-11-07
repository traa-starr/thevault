"""Self-test for over-the-air updates. Uses a throwaway library and a fake export, never the real ones:
python server/test_updates.py"""
import base64
import hashlib
import http.client
import json
import subprocess
import sys
import tempfile
from email.parser import BytesParser
from email.policy import default
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from vault_server import server, updates  # noqa: E402
from vault_server.library import init_library  # noqa: E402

failures = []
BUNDLE = b"var app = 'hello';"


def check(name, ok, detail=""):
    print(("PASS  " if ok else "FAIL  ") + name + (f"  {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(name)


def fake_app(folder, runtime="1"):
    folder.mkdir(parents=True)
    (folder / "app.json").write_text(json.dumps({"expo": {"runtimeVersion": runtime}}), encoding="utf-8")
    return folder


def fake_export(bundle=BUNDLE, ok=True):
    """Stands in for `npx expo export`: writes what it writes, into --output-dir."""
    def run(cmd, cwd=None):
        out = Path(cmd[cmd.index("--output-dir") + 1])
        if ok:
            js = f"_expo/static/js/ios/index-{hashlib.md5(bundle).hexdigest()}.hbc"
            (out / "_expo/static/js/ios").mkdir(parents=True)
            (out / js).write_bytes(bundle)
            (out / "assets").mkdir()
            (out / "assets/f00d").write_bytes(b"PNGDATA")
            meta = {"version": 0, "bundler": "metro", "fileMetadata": {"ios": {
                "bundle": js, "assets": [{"path": "assets/f00d", "ext": "png"}]}}}
            (out / "metadata.json").write_text(json.dumps(meta), encoding="utf-8")
        return subprocess.CompletedProcess(cmd, 0 if ok else 1)
    return run


def get(port, path, headers):
    c = http.client.HTTPConnection(server.LOOPBACK, port, timeout=10)
    c.request("GET", path, headers={"Host": f"localhost:{port}", **headers})
    r = c.getresponse()
    body = r.read()
    c.close()
    return r, body


with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    root = tmp / "lib"
    init_library(root).close()
    before = {p.name for p in root.iterdir()}
    app = fake_app(tmp / "app")

    ok, words = updates.publish(root, app, run=fake_export(ok=False))
    check("a failed build publishes nothing", not ok and updates.latest(root) == (None, None), words)

    ok, words = updates.publish(root, app, run=fake_export())
    name, manifest = updates.latest(root)
    check("publish writes a manifest", ok and manifest is not None, words)
    check("manifest carries the runtime version", manifest and manifest["runtimeVersion"] == "1")
    want = base64.urlsafe_b64encode(hashlib.sha256(BUNDLE).digest()).rstrip(b"=").decode()
    check("bundle hash is base64url sha256", manifest and manifest["launchAsset"]["hash"] == want)
    check("asset gets its content type", manifest and manifest["assets"][0]["contentType"] == "image/png")
    check("nothing written outside the updates folder", {p.name for p in root.iterdir()} - before == {updates.UPDATES_DIR})

    servers = server.start_servers(root, [server.LOOPBACK], 0)
    port = servers[0].server_address[1]
    try:
        ios = {"expo-platform": "ios", "expo-runtime-version": "1", "expo-protocol-version": "1"}
        r, body = get(port, "/update", ios)
        check("update answers 200 multipart", r.status == 200 and r.getheader("Content-Type", "").startswith("multipart/mixed"))
        check("protocol headers", r.getheader("expo-protocol-version") == "1" and r.getheader("expo-sfv-version") == "0")
        msg = BytesParser(policy=default).parsebytes(
            f"Content-Type: {r.getheader('Content-Type')}\r\n\r\n".encode() + body)
        parts = {p.get_param("name", header="content-disposition"): p.get_content() for p in msg.iter_parts()}
        sent = json.loads(parts.get("manifest", "{}"))
        launch = sent.get("launchAsset", {})
        check("manifest part has a full launch url", launch.get("url", "").startswith(f"http://localhost:{port}/update-files/"))
        check("no laptop path leaks into the manifest", "path" not in launch)

        r2, got = get(port, launch["url"].split(str(port), 1)[1], {})
        check("bundle downloads intact", r2.status == 200 and got == BUNDLE)
        r3, _ = get(port, f"/update-files/{name}/../../{updates.LATEST}", {})
        check("a path outside the update is refused", r3.status == 404)
        r4, _ = get(port, f"/update-files/{name}/manifest.json", {})
        check("manifest file itself isn't served raw", r4.status == 404)
        r5, _ = get(port, "/update", {**ios, "expo-runtime-version": "2"})
        check("another runtime gets no update (204)", r5.status == 204)
        r6, _ = get(port, "/update", {**ios, "expo-platform": "android"})
        check("android refused", r6.status == 400)
    finally:
        server.stop_servers(servers)

    for i in range(updates.KEEP + 2):
        (root / updates.UPDATES_DIR / f"2000010{i}-000000").mkdir()
    updates.publish(root, app, run=fake_export(bundle=b"var app = 'two';"))
    kept = [d for d in (root / updates.UPDATES_DIR).iterdir() if d.is_dir()]
    check(f"keeps the last {updates.KEEP}", len(kept) == updates.KEEP)
    n2, m2 = updates.latest(root)
    check("new code, new id", m2 and manifest and m2["id"] != manifest["id"])

print("ALL PASS" if not failures else f"{len(failures)} FAILED")
sys.exit(1 if failures else 0)
