"""Self-test for the render folder and the desktop icon (ROADMAP 5.0a). Fake library, fake music and fake mixdowns in the
temp folder, never the real ones: python server/test_renders.py"""
import contextlib
import hashlib
import io
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import vault_cli  # noqa: E402
from vault_server import renders, scanner, server  # noqa: E402
from vault_server.library import init_library, open_library  # noqa: E402
from vault_server.store import write_lock  # noqa: E402

failures = []


def check(name, ok, detail=""):
    print(("PASS  " if ok else "FAIL  ") + name + (f"  {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(name)


def make_audio(path, freq, seconds=2):
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-y", "-f", "lavfi", "-i", f"sine=frequency={freq}:duration={seconds}",
                    str(path)], check=True)


def folder_state(root):
    """Names, sizes, modified times and bytes of everything in a folder."""
    h = hashlib.sha256()
    for p in sorted(Path(root).rglob("*")):
        st = p.stat()
        h.update(f"{p}|{st.st_size}|{st.st_mtime_ns}|{st.st_ctime_ns}|".encode())
        if p.is_file():
            h.update(p.read_bytes())
    return h.hexdigest()


def bring(root, mixes, sleep=lambda s: None):
    lib = open_library(root)
    try:
        return renders.bring_in(lib, mixes, wait=0, sleep=sleep)
    finally:
        lib.close()


def titles(root, view):
    lib = open_library(root)
    try:
        if view == "sort":
            return sorted(s["title"] for s in server.sorting_view(lib.store.conn)["songs"])
        return {s["title"]: s for s in server.list_songs(lib.store.conn)}
    finally:
        lib.close()


def present(root, path):
    lib = open_library(root)
    try:
        return lib.store.conn.execute("SELECT status FROM sources WHERE path=?", (str(path),)).fetchone()["status"] == "present"
    finally:
        lib.close()


def main():
    if not (shutil.which("ffmpeg") and shutil.which("ffprobe")):
        print("ffmpeg not found: can't run this test.")
        return 1
    tmp = Path(tempfile.mkdtemp(prefix="vault-mixtest-")).resolve()
    root, music, mixes = tmp / "lib", tmp / "music", tmp / "mixdowns"
    init_library(root).close()

    # a song already in the Vault, from a fake music folder laid out like the real one
    for d in ("Music", "tape", "Session Music/#FREEMONEY THE MIXTAPE"):
        (music / d).mkdir(parents=True)
    make_audio(music / "Music" / "Old Song.wav", 300)
    lib = open_library(root)
    scanner.scan(lib, music)
    from vault_server import songs
    songs.link_songs(lib)
    lib.close()

    # the setting lives in the library, never the repo
    renders.save_render_folder(root, mixes)
    check("the render folder is saved in the library's settings file", renders.render_folder(root) == mixes
          and (root / renders.SETTINGS_NAME).is_file() and not (HERE.parent / renders.SETTINGS_NAME).exists())
    try:
        bring(root, mixes)
        check("a missing render folder stops plainly", False)
    except renders.NoRenderFolder as e:
        check("a missing render folder stops plainly, nothing made", "not found" in str(e) and not mixes.exists())

    # three new mixdowns, one copy of a song already in the Vault, one project file that isn't audio
    for name, freq in (("Mix One.wav", 400), ("Mix Two.wav", 500), ("Mix Three.mp3", 600)):
        make_audio(mixes / name, freq)
    shutil.copy2(music / "Music" / "Old Song.wav", mixes / "Old Song (render).wav")
    (mixes / "Mix One.flp").write_bytes(b"not audio")
    before = folder_state(mixes)
    out = bring(root, mixes)
    check("three new songs counted", sorted(out["new"]) == ["Mix One.wav", "Mix Three.mp3", "Mix Two.wav"], str(out))
    check("a copy of a song already in the Vault says so, not a new song", out["already"] == ["Old Song (render).wav"], str(out))
    check("the window says the count", renders.words(out).splitlines()[0] == "3 new songs, in Sort on your phone.", renders.words(out))
    check("a project file isn't taken", not any("flp" in n for v in out.values() for n in v))
    check("the new songs are in Sort", {"Mix One", "Mix Two", "Mix Three"} <= set(titles(root, "sort")), str(titles(root, "sort")))
    listed = titles(root, "list")
    today = datetime.now().strftime("%Y-%m-%d")
    check("the new songs have today's date, so they top Recently added",
          all(listed[t]["date"] == today for t in ("Mix One", "Mix Two", "Mix Three")), str({t: listed[t]["date"] for t in ("Mix One", "Mix Two")}))
    check("they show the render folder's name as where they came from", listed["Mix One"]["folder"] == "mixdowns", listed["Mix One"]["folder"])
    check("the duplicate joined the old song: no new song", "Old Song (render)" not in listed and "Old Song" in listed)
    check("the render folder is untouched (names, sizes, times, bytes)", folder_state(mixes) == before)

    # same files again
    out = bring(root, mixes)
    check("same files again: Nothing new", renders.words(out) == "Nothing new.", renders.words(out))
    check("still untouched after a second look", folder_state(mixes) == before)

    # a file still exporting: its size changes between the two looks
    growing = mixes / "Mix Four.wav"
    make_audio(growing, 700)
    grow = lambda s: growing.open("ab").write(b"\0" * 4096)
    out = bring(root, mixes, sleep=grow)
    check("a growing file waits for the next click", out["waiting"] == ["Mix Four.wav"] and not out["new"], str(out))
    check("the window says it's still exporting", "still exporting" in renders.words(out) and "Mix Four.wav" in renders.words(out))
    check("a waiting file isn't in Sort yet", "Mix Four" not in titles(root, "sort"))
    out = bring(root, mixes)
    check("once it stops growing, the next click takes it", out["new"] == ["Mix Four.wav"], str(out))

    # two byte-identical new renders in one click: one song
    make_audio(mixes / "Mix Five.wav", 800)
    shutil.copy2(mixes / "Mix Five.wav", mixes / "Mix Five copy.wav")
    out = bring(root, mixes)
    check("two identical new renders make one new song", len(out["new"]) == 1 and len(out["already"]) == 1, str(out))

    # re-exported over the same name: the same song, updated
    count = len(titles(root, "list"))
    make_audio(mixes / "Mix Two.wav", 550, seconds=3)
    out = bring(root, mixes)
    check("a re-export over the same name is an update, not a new song", out["updated"] == ["Mix Two.wav"] and not out["new"]
          and len(titles(root, "list")) == count, str(out))

    # a music scan never marks the render folder's songs gone
    lib = open_library(root)
    scanner.scan(lib, music)
    lib.close()
    check("a music scan leaves the render folder's songs present", present(root, mixes / "Mix One.wav"))
    check("the music scan still sees its own song", present(root, music / "Music" / "Old Song.wav"))

    # a render I delete: its place is marked gone, nothing removed
    (mixes / "Mix Three.mp3").unlink()
    out = bring(root, mixes)
    check("a deleted render is marked gone, not a new anything", renders.words(out) == "Nothing new." and not present(root, mixes / "Mix Three.mp3"))

    # catch 2: renamed, or moved into a subfolder: the same song, not gone
    def song_id(title):
        return titles(root, "list")[title]["id"]
    one, count = song_id("Mix One"), len(titles(root, "list"))
    (mixes / "Mix One.wav").rename(mixes / "Mix One final.wav")
    out = bring(root, mixes)
    listed = titles(root, "list")
    check("a renamed render stays the same song, under its new name", out["moved"] == ["Mix One final.wav"]
          and listed.get("Mix One final", {}).get("id") == one and len(listed) == count and present(root, mixes / "Mix One final.wav"), str(out))
    check("the window says renamed", "renamed or moved, kept as the same song" in renders.words(out))
    (mixes / "done").mkdir()
    (mixes / "Mix One final.wav").rename(mixes / "done" / "Mix One final.wav")
    out = bring(root, mixes)
    check("a render moved into a subfolder stays the same song", out["moved"] == ["Mix One final.wav"]
          and titles(root, "list")["Mix One final"]["id"] == one and titles(root, "list")["Mix One final"]["folder"] == "mixdowns / done", str(out))
    check("once moved: Nothing new", renders.words(bring(root, mixes)) == "Nothing new.")

    # catch 7: same bytes, only a new time: nothing to say
    st = (mixes / "Mix Two.wav").stat()
    import os
    os.utime(mixes / "Mix Two.wav", ns=(st.st_atime_ns, st.st_mtime_ns + 10**9))
    check("a touched render (same bytes) says Nothing new", renders.words(bring(root, mixes)) == "Nothing new.")

    # catch 3: a click cut off after recording a file, before linking it, is finished by the next click
    make_audio(mixes / "Mix Cut.wav", 1100)
    lib = open_library(root)
    path, st = mixes / "Mix Cut.wav", (mixes / "Mix Cut.wav").stat()
    key, _ = lib.upsert_file(path.name, str(path), st.st_size, st.st_mtime, scanner.hash_file(path))
    lib.store.upsert_source(str(path), key, "mixdowns", path.name, st.st_size, st.st_mtime, False, "2026-01-01T00:00:00.000000Z")
    lib.close()
    bring(root, mixes)
    check("a cut-off click is finished by the next one: the song reaches Sort", "Mix Cut" in titles(root, "sort"))

    # a copy of a song I hid (Not mine) is already in the Vault, not a new song
    make_audio(tmp / "hidden.wav", 1200)
    lib = open_library(root)
    lib.store.record("verdict", {"file_key": f"hash:{scanner.hash_file(tmp / 'hidden.wav')}", "verdict": "not_mine"})
    lib.close()
    shutil.copy2(tmp / "hidden.wav", mixes / "Someone Else.wav")
    out = bring(root, mixes)
    check("a copy of a hidden song says already in the Vault", out["already"] == ["Someone Else.wav"] and not out["new"], str(out))

    # the server's write in progress: the click waits its turn
    make_audio(mixes / "Mix Six.wav", 900)
    lib = open_library(root)
    held, release = threading.Event(), threading.Event()

    def holder():
        with write_lock(lib.store.lock_path):
            held.set()
            release.wait(5)

    th = threading.Thread(target=holder)
    th.start()
    held.wait(5)
    threading.Timer(0.5, release.set).start()
    t0 = time.monotonic()
    out = renders.bring_in(lib, mixes, wait=0, sleep=lambda s: None)
    waited = time.monotonic() - t0
    th.join()
    lib.close()
    check("a click during another write waits, then works", out["new"] == ["Mix Six.wav"] and waited >= 0.4, f"{out} {waited:.2f}s")

    # the whole command, as the icon runs it (real two-second look)
    make_audio(mixes / "Mix Seven.wav", 1000)
    before = folder_state(mixes)
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        code = vault_cli.main(["vault_cli.py", "renders", str(root)])
    said = buf.getvalue()
    check("the icon's command says 1 new song", code == 0 and "1 new song, in Sort on your phone." in said, said)
    with contextlib.redirect_stdout(buf := io.StringIO()):
        vault_cli.main(["vault_cli.py", "renders", str(root)])
    check("double-click again: Nothing new", "Nothing new." in buf.getvalue(), buf.getvalue())
    check("the render folder is untouched by the command", folder_state(mixes) == before)
    # catch 5: the copy step failing still shows the count
    make_audio(mixes / "Mix Eight.wav", 1300)
    real = vault_cli.run_autocopy_once
    vault_cli.run_autocopy_once = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("no ffmpeg"))
    with contextlib.redirect_stdout(buf := io.StringIO()):
        code = vault_cli.main(["vault_cli.py", "renders", str(root)])
    vault_cli.run_autocopy_once = real
    check("a failed copy step still shows the count (catch 5)", code == 0 and "1 new song, in Sort" in buf.getvalue()
          and "didn't run now" in buf.getvalue(), buf.getvalue())
    renders.save_render_folder(root, tmp / "gone")
    with contextlib.redirect_stdout(buf := io.StringIO()):
        code = vault_cli.main(["vault_cli.py", "renders", str(root)])
    check("render folder gone: the window says so", code == 2 and "not found" in buf.getvalue(), buf.getvalue())

    # the desktop icon: runs the command in a window that waits for a key, with a Python that has a window
    seen = {}

    def fake_run(args, env, **kw):
        seen.update(env)
        return subprocess.CompletedProcess(args, 0, stdout="C:\\Desk\\Send to Vault.lnk\n", stderr="")

    made = renders.make_icon(root, HERE.parent, r"C:\Py\pythonw.exe", run=fake_run)
    check("the icon runs renders with --pause on this library, with a Python that has a window",
          f'renders "{root}" --pause' in seen["VAULT_ARGS"] and r'"C:\Py\python.exe" ' in seen["VAULT_ARGS"]
          and made.endswith("Send to Vault.lnk"), str(seen.get("VAULT_ARGS")))
    check("a crash before the window's own pause still waits for a key (catch 4)",
          seen["VAULT_PY"].lower().endswith("cmd.exe") and seen["VAULT_ARGS"].startswith('/c "') and seen["VAULT_ARGS"].endswith(' || pause"'))

    shutil.rmtree(tmp, ignore_errors=True)
    print()
    print("ALL PASSED" if not failures else f"{len(failures)} FAILED: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(errors="replace")
    sys.exit(main())
