"""Phone copies on their own (DECISIONS 2026-11-08, "Auto phone copies"): the server catches the library up by itself,
once when it starts and again soon after the phone marks a song Mine, so songs sorted on the phone play from Library
without running `import`.

One background thread, one run at a time. A run only adds: every Mine song without a library copy gets one (originals
opened read-only, cloud-only files skipped, never downloaded), then every library copy without a phone copy gets one,
ffmpeg below normal priority. Taking out copies of songs no longer Mine stays with the `import` command. Stopping the
server mid-copy leaves only .part files, which the next run clears or redoes.
"""
import threading
from pathlib import Path
import time

from .importer import ToolMissing, import_mine, make_phone_copies
from .library import open_library
from .store import Busy, write_lock

COPY_LOCK = "copies.lock"  # one copy run at a time: the server's own, the copies command, or import

AFTER_MINE_SECONDS = 20  # a sort session marks songs in bursts: wait for a quiet moment, then copy them all in one run
RETRY_SECONDS = 300  # the lock was busy or something failed: try again later, never in a tight loop


def copy_lock(root, wait=0):
    """Held for a whole copy run, so two runs never copy or replace the same file at once. Raises Busy if another holds it."""
    return write_lock(Path(root) / COPY_LOCK, wait=wait)


def run_once(root, stop=None, log=print, wait=0):
    """One catch-up run. Returns (library copies made, phone copies made). Busy if another copy run is going."""
    with copy_lock(root, wait):
        return _run(root, stop, log)


def _say(log, text):
    try:
        log(text, flush=True)
    except TypeError:  # a log that takes no flush
        log(text)


def _run(root, stop, log):
    lib = open_library(root)
    try:
        quiet = lambda *_: None
        added = import_mine(lib, quiet, drop=False, stop=stop)
        made = make_phone_copies(lib, quiet, background=True, stop=stop)
    finally:
        lib.close()
    phone = made["made now (AAC 192 kbps)"] + made["copied as is (already small)"]
    if added["copied now"] or phone or made["failed"]:
        failed = f", {made['failed']} failed (run import to see why)" if made["failed"] else ""
        _say(log, f"Phone copies: {phone} made now, {added['copied now']} songs copied into the library{failed}.")
    return added["copied now"], phone


class AutoCopy:
    """`poke()` after a Mine mark; the run starts once the marks go quiet for `delay` seconds."""

    def __init__(self, root, delay=AFTER_MINE_SECONDS, log=print):
        self.root, self.delay, self.log = root, delay, log
        self.stopping = threading.Event()
        self._wake = threading.Event()
        self._due = float('inf')
        self._lock = threading.Lock()
        self.runs = 0  # finished runs, for tests
        self.idle = threading.Event()  # set while nothing is waiting or running, for tests
        self.idle.set()
        self._thread = threading.Thread(target=self._loop, name="phone copies", daemon=True)

    def start(self, now=True):
        self._thread.start()
        if now:
            self.poke(0)
        return self

    def poke(self, delay=None):
        with self._lock:
            due = time.monotonic() + (self.delay if delay is None else delay)
            # a retry later never pushes back a run already due sooner (a Mine mark waits 20 s, not 5 min)
            self._due = min(self._due, due) if self._wake.is_set() else due
            self.idle.clear()
            self._wake.set()

    def stop(self, wait=5):
        """Stops after the song in hand (its .part is cleared or redone next time). Waits up to `wait` seconds."""
        self.stopping.set()
        self._wake.set()
        if self._thread.is_alive():
            self._thread.join(wait)

    def _loop(self):
        tool_said = False
        while not self.stopping.is_set():
            self._wake.wait()
            with self._lock:
                wait = self._due - time.monotonic()
            if wait > 0:  # another mark came in: wait for the quiet moment
                self.stopping.wait(min(wait, 1.0))
                continue
            with self._lock:
                self._wake.clear()
            try:
                run_once(self.root, self.stopping, self.log)
            except ToolMissing as e:
                if not tool_said:
                    _say(self.log, f"Phone copies: {e}")
                    tool_said = True
            except Busy:
                self.poke(RETRY_SECONDS)
            except Exception as e:  # never take the server down: say it in one line and try later
                _say(self.log, f"Phone copies stopped: {e.__class__.__name__}: {e}. Trying again in {RETRY_SECONDS // 60} min.")
                self.poke(RETRY_SECONDS)
            self.runs += 1
            with self._lock:
                if not self._wake.is_set():
                    self.idle.set()
