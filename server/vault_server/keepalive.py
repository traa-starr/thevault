"""Keeps the server running (NEXT 2026-11-10 D): starts it, and starts it again whenever it stops.

Windows runs this at log-in with no window (server/server_on.ps1 sets that up; server_off.ps1 removes it). It writes
what happens to server-log.txt in the library folder: when the server started, when and why it stopped.

Care taken:
  - a server that dies straight away (the library drive not plugged in yet, a broken update) is retried with longer
    and longer waits, never in a tight loop;
  - a server already running (started by hand) is left alone: this one waits and tries again later;
  - the log can't grow for ever: past LOG_CAP it becomes server-log.old.txt and a new one starts.
"""
import os
import subprocess
import sys
import threading
import time
from datetime import datetime
from pathlib import Path

from .library import MARKER_NAME

LOG_NAME = "server-log.txt"
OLD_LOG_NAME = "server-log.old.txt"
LOG_CAP = 1_000_000  # bytes; with the old one kept, the two never pass about 2 MB
RESTART_WAIT = 2  # seconds before starting again after a server that had been running fine
QUICK = 20  # a server that stops sooner than this never really started
QUICK_WAITS = (2, 5, 15, 30, 60)  # ...so each try in a row waits longer; the last one repeats
BUSY_WAIT = 30  # the port is taken (a server started by hand): look again this often
PORT_TAKEN = 2  # the serve command's exit code for "couldn't start" (port in use, no library)
CLI = Path(__file__).resolve().parents[1] / "vault_cli.py"


def quick_wait(fails):
    """How long to wait before try number `fails` + 1 after `fails` quick deaths in a row."""
    return QUICK_WAITS[min(max(fails, 1), len(QUICK_WAITS)) - 1]


def roll_log(path, cap=LOG_CAP):
    """Past the cap, the log becomes the one old log (replacing the last) so a new one starts. True if it rolled."""
    path = Path(path)
    try:
        if path.stat().st_size <= cap:
            return False
        os.replace(path, path.with_name(OLD_LOG_NAME))
        return True
    except OSError:  # no log yet, or it's open elsewhere: carry on with it as it is
        return False


def python_exe():
    """The Python that can print: this runs under pythonw (no window), whose own output goes nowhere."""
    exe = Path(sys.executable)
    plain = exe.with_name("python.exe")
    return str(plain if exe.name.lower() == "pythonw.exe" and plain.is_file() else exe)


def serve_command(root):
    return [python_exe(), str(CLI), "serve", str(root)]


def start_hidden(command, log_file):
    """The server as a child with no window, everything it prints going to the log."""
    env = {**os.environ, "PYTHONUNBUFFERED": "1", "PYTHONIOENCODING": "utf-8"}
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    return subprocess.Popen(command, stdout=log_file, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, env=env, creationflags=flags)


def keep_serving(root, stop=None, command=None, start=start_hidden, clock=time.monotonic, now=datetime.now, log_cap=LOG_CAP):
    """Runs until `stop` is set: the server up, and up again each time it stops. `stop` waits double as the sleeps."""
    root = Path(root)
    stop = stop or threading.Event()
    command = command or serve_command(root)
    log_path = root / LOG_NAME
    fails = 0
    waiting_for_library = False

    def say(words):
        try:
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(f"{now():%Y-%m-%d %H:%M:%S}  keeper: {words}\n")
        except OSError:  # the library drive went away: nothing to write to, the loop below waits for it
            pass

    while not stop.is_set():
        if not (root / MARKER_NAME).is_file():
            # the drive isn't there (yet): nothing is created, nothing is started
            fails += 1
            if not waiting_for_library:
                waiting_for_library = True
                say(f"no library at {root} (drive not ready?). Waiting for it.")
            stop.wait(quick_wait(fails))
            continue
        if waiting_for_library:
            waiting_for_library = False
            fails = 0
            say("the library is there now.")
        roll_log(log_path, log_cap)
        # Said before the server starts, and nothing more until it has stopped: the server writes to the same file from
        # where the file ended when it started, so a line added meanwhile would be written over by its next one.
        say("starting the server.")
        try:
            with open(log_path, "a", encoding="utf-8") as log_file:
                child = start(command, log_file)
        except OSError as e:
            fails += 1
            say(f"couldn't start the server ({e.__class__.__name__}). Trying again in {quick_wait(fails)} s.")
            stop.wait(quick_wait(fails))
            continue
        began = clock()
        while child.poll() is None and not stop.wait(0.5):
            pass
        if stop.is_set():
            if child.poll() is None:
                child.terminate()
                try:
                    child.wait(10)
                except subprocess.TimeoutExpired:
                    child.kill()
            say("turned off: server stopped.")
            break
        code, ran = child.returncode, clock() - began
        if code is not None and code >= 2 ** 31:  # Windows shows a killed process's -1 as 4294967295
            code -= 2 ** 32
        if code == PORT_TAKEN and ran < QUICK:
            # most likely a server I started by hand has the port: leave it be, take over when it's gone
            fails = 0
            wait = BUSY_WAIT
            say(f"the server couldn't start (its own lines above say why; a server already running is the usual reason). Looking again in {wait} s.")
        elif ran < QUICK:
            fails += 1
            wait = quick_wait(fails)
            say(f"server stopped after {ran:.0f} s (exit code {code}), {fails} in a row. Starting it again in {wait} s.")
        else:
            fails = 0
            wait = RESTART_WAIT
            say(f"server stopped after {ran / 60:.0f} min (exit code {code}). Starting it again in {wait} s.")
        stop.wait(wait)
    return 0
