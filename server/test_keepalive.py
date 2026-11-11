"""Self-test for the server that stays up (NEXT 2026-11-10 D). Throwaway folders and pretend servers only; it never
touches the real library, the real server or Windows' scheduled jobs: python server/test_keepalive.py"""
import os
import re
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from vault_server import doctor, keepalive, server  # noqa: E402
from vault_server.library import MARKER_NAME, init_library  # noqa: E402

failures = []


def check(name, ok, detail=""):
    print(("PASS  " if ok else "FAIL  ") + name + (f"  {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(name)


class Sim:
    """A pretend clock and pretend servers. It stands in for the stop switch too: every wait moves the clock on.
    `plan`: how long each server lives and its exit code, in order; when the plan runs out, the keeper is told to stop."""

    def __init__(self, plan, appear_at=None, marker=None):
        self.t = 0.0
        self.plan = list(plan)
        self.waits = []
        self.started = []
        self.stopped = False
        self.appear_at, self.marker = appear_at, marker

    def is_set(self):
        return self.stopped

    def wait(self, seconds):
        self.waits.append(seconds)
        self.t += seconds
        if self.appear_at is not None and self.t >= self.appear_at and not self.marker.exists():
            self.marker.parent.mkdir(parents=True, exist_ok=True)
            self.marker.write_text("{}", encoding="utf-8")
        return self.stopped

    def clock(self):
        return self.t

    def start(self, command, log_file):
        sim = self
        if not sim.plan:
            sim.stopped = True
            life, code = 10 ** 9, 0
        else:
            life, code = sim.plan.pop(0)
        born = sim.t

        class Child:
            pid = 1000 + len(sim.started)
            returncode = None
            terminated = False

            def poll(self):
                if self.returncode is None and sim.t >= born + life:
                    self.returncode = code
                return self.returncode

            def terminate(self):
                self.terminated = True
                self.returncode = -15

            def wait(self, timeout=None):
                return self.returncode

            def kill(self):
                self.returncode = -9

        child = Child()
        sim.started.append(child)
        return child

    def pauses(self):
        return [w for w in self.waits if w != 0.5]  # 0.5 is the keeper watching a running server


def keep(root, sim, **kw):
    return keepalive.keep_serving(root, stop=sim, command=["pretend"], start=sim.start, clock=sim.clock, **kw)


def log_of(root):
    path = Path(root) / keepalive.LOG_NAME
    return path.read_text(encoding="utf-8") if path.is_file() else ""


def model_path(tmp):
    root = tmp / "lib"
    init_library(root).close()

    # a server that ran fine, then stopped: back in 2 s, and the keeper goes on
    sim = Sim([(3600, 1), (7200, 0)])
    keep(root, sim)
    check("a server that stops is started again", len(sim.started) == 3, str(len(sim.started)))
    check("after a server that had been running fine: 2 s, every time", sim.pauses() == [2, 2], str(sim.pauses()))
    text = log_of(root)
    check("the log says when it started and why it stopped", text.count("keeper: starting the server.") == 3 and "server stopped after 60 min (exit code 1). Starting it again in 2 s." in text, text)
    check("told to stop: the running server is stopped too, and the log says so", sim.started[-1].terminated and "turned off: server stopped." in text)

    # a server that dies straight away, over and over: longer and longer waits, never a tight loop
    (root / keepalive.LOG_NAME).unlink()
    sim = Sim([(1, 1)] * 7)
    keep(root, sim)
    check("quick deaths in a row wait 2, 5, 15, 30, then 60 s each time", sim.pauses() == [2, 5, 15, 30, 60, 60, 60], str(sim.pauses()))
    check("7 crashes took minutes, not seconds", sim.t > 200, str(sim.t))
    sim = Sim([(1, 1), (1, 1), (1, 1), (3600, 1), (1, 1)])
    keep(root, sim)
    check("one good run resets the waits", sim.pauses() == [2, 5, 15, 2, 2], str(sim.pauses()))

    # the port is taken (I started a server by hand): look again every 30 s, never give up, never speed up
    (root / keepalive.LOG_NAME).unlink()
    sim = Sim([(1, keepalive.PORT_TAKEN)] * 4 + [(3600, 0)])
    keep(root, sim)
    check("a server already running: this one looks again every 30 s", sim.pauses()[:4] == [30, 30, 30, 30], str(sim.pauses()))
    check("and takes over once the other is gone", len(sim.started) == 6 and "a server already running is the usual reason" in log_of(root))

    # the library drive isn't there at log-in: nothing is started or created until it is
    ghost = tmp / "not-plugged-in" / "lib"
    sim = Sim([(3600, 0)], appear_at=10 ** 9, marker=ghost / MARKER_NAME)
    sim.wait_real = sim.wait
    limit = {"n": 0}

    def wait(seconds):
        limit["n"] += 1
        if limit["n"] >= 8:
            sim.stopped = True
        return sim.wait_real(seconds)

    sim.wait = wait
    keep(ghost, sim)
    check("no library: no server is started", sim.started == [])
    check("no library: waits grow to a minute", sim.pauses() == [2, 5, 15, 30, 60, 60, 60, 60], str(sim.pauses()))
    check("no library: nothing is created where it should be", not ghost.exists() and not ghost.parent.exists())
    late = tmp / "late" / "lib"
    sim = Sim([(3600, 0)], appear_at=50, marker=late / MARKER_NAME)
    keep(late, sim)
    check("the drive turns up: the server starts", len(sim.started) >= 1 and "the library is there now." in log_of(late), log_of(late))

    # the log can't grow for ever
    big = root / keepalive.LOG_NAME
    big.write_text("x" * 5000, encoding="utf-8")
    sim = Sim([(3600, 0)])
    keep(root, sim, log_cap=1000)
    old = root / keepalive.OLD_LOG_NAME
    check("a log past its cap becomes the one old log and a new one starts", old.is_file() and old.stat().st_size == 5000 and big.stat().st_size < 1000)
    big.write_text("y" * 6000, encoding="utf-8")
    keepalive.roll_log(big, 1000)
    check("only one old log is kept", old.stat().st_size == 6000 and not big.exists() and sorted(p.name for p in root.glob("server-log*")) == [keepalive.OLD_LOG_NAME])
    check("a small log is left alone", keepalive.roll_log(old, 10 ** 9) is False)
    check("the waits table", [keepalive.quick_wait(n) for n in (0, 1, 2, 3, 4, 5, 99)] == [2, 2, 5, 15, 30, 60, 60])


def real_path(tmp):
    """A real process as the server: killed, it is back within seconds, and the log has the line."""
    root = tmp / "real"
    init_library(root).close()
    stop = threading.Event()
    sleeper = [sys.executable, "-c", "import time; print('pretend server up', flush=True); time.sleep(300)"]
    born = []

    def start(command, log_file):
        child = keepalive.start_hidden(command, log_file)
        born.append(child.pid)
        return child

    thread = threading.Thread(target=keepalive.keep_serving, args=(root,), kwargs={"stop": stop, "command": sleeper, "start": start}, daemon=True)
    thread.start()

    def pids(least, within=20):
        end = time.monotonic() + within
        while time.monotonic() < end and len(born) < least:
            time.sleep(0.1)
        return list(born)

    first = pids(1)
    check("the keeper starts the server", len(first) == 1, log_of(root))
    killed_at = time.monotonic()
    subprocess.run(["taskkill", "/F", "/PID", str(first[0])], capture_output=True) if os.name == "nt" else os.kill(first[0], 9)
    again = pids(2)
    took = time.monotonic() - killed_at
    check("killed, the server is back within a minute (here: seconds)", len(again) == 2 and again[1] != again[0] and took < 60, f"{took:.1f} s  {log_of(root)}")
    print(f"      back {took:.1f} s after the kill")
    time.sleep(1.5)  # the second server has printed its line
    text = log_of(root)
    lines = text.splitlines()
    check("what the server prints lands in the log", text.count("pretend server up") == 2, text)
    check("the keeper's lines and the server's never write over each other: every line is whole",
          text.count("keeper: starting the server.") == 2 and any("keeper: server stopped after" in x and "Starting it again in 2 s." in x for x in lines)
          and all(x == "pretend server up" or re.match(r"\d{4}-\d\d-\d\d \d\d:\d\d:\d\d  keeper: ", x) for x in lines), text)
    check("a killed server's exit code reads as a small number", not re.search(r"exit code \d{6,}", text), text)
    stop.set()
    thread.join(20)
    check("turned off: the keeper ends", not thread.is_alive())
    alive = subprocess.run(["tasklist", "/FI", f"PID eq {again[-1]}"], capture_output=True, text=True).stdout if os.name == "nt" else ""
    check("turned off: its server is gone too", str(again[-1]) not in alive, alive)


def server_path(tmp):
    """Tailscale connecting after the server started (log-in): the phone's side starts listening without a restart."""
    root = tmp / "ts"
    init_library(root).close()
    servers = server.start_servers(root, [server.LOOPBACK], 0)
    port = servers[0].server_port
    said = []
    say = lambda *a, **k: said.append(a[0])
    check("Tailscale still off: nothing added", server.add_tailscale(servers, root, port, tailscale=lambda: (None, []), say=say) is None and len(servers) == 1)
    check("before: the second address doesn't answer", doctor.probe("127.0.0.2", port) is None)
    got = server.add_tailscale(servers, root, port, tailscale=lambda: ("127.0.0.2", ["laptop.example"]), say=say)
    check("Tailscale comes up: its address is listened on too, same port", got == "127.0.0.2" and len(servers) == 2 and doctor.probe("127.0.0.2", port) == 0, str(said))
    check("and the log line says so", any("Tailscale is connected now" in line for line in said))
    check("asked again while already listening: no crash, nothing doubled", server.add_tailscale(servers, root, port, tailscale=lambda: ("127.0.0.2", []), say=say) is None and len(servers) == 2)
    server.stop_servers(servers)
    code = (HERE / "vault_server" / "server.py").read_text(encoding="utf-8")
    check("the serve command keeps looking for Tailscale until it has it", "address = add_tailscale(servers, root, port, on_mine=copies.poke)" in code and "if address:\n                continue" in code)


def doctor_path():
    fake = lambda code: (lambda *a, **k: subprocess.CompletedProcess(a, code, b"", b""))
    check("doctor asks Windows for the job by name", doctor.task_state(fake(0)) == "on" and doctor.task_state(fake(1)) == "off")

    def boom(*a, **k):
        raise OSError("no schtasks here")

    check("Windows can't be asked: no answer, no crash", doctor.task_state(boom) is None)
    on = doctor.check_stays_up("on", True)
    check("on and answering: pass", on[0] == doctor.PASS and "comes back if it stops" in on[1])
    stuck = doctor.check_stays_up("on", False)
    check("on but the server isn't answering: a warning that names the log (the job alone proves nothing)", stuck[0] == doctor.WARN and "server-log.txt" in stuck[1])
    off = doctor.check_stays_up("off", True)
    check("off: a warning with the command to turn it on", off[0] == doctor.WARN and "server_on.ps1" in off[1])
    # the old StartVault job (wave 4, E): doctor says gone or still there, so nobody opens Task Scheduler to look
    asked = []

    def spy(cmd, **k):
        asked.append(cmd)
        return subprocess.CompletedProcess(cmd, 1, b"", b"")

    check("the old job is asked for by its own name, and only asked", doctor.task_state(spy, name=doctor.OLD_TASK) == "off" and asked == [["schtasks", "/query", "/tn", "StartVault"]])
    check("the server's own job is still asked for by its name", doctor.task_state(spy) == "off" and asked[-1][-1] == doctor.STAYS_UP_TASK)
    gone = doctor.check_old_launcher("off")
    check("StartVault gone: a pass that says gone", gone == (doctor.PASS, "gone."))
    there = doctor.check_old_launcher("on")
    check("StartVault still there: a warning with the one command that deletes it", there[0] == doctor.WARN and "still there" in there[1] and "Unregister-ScheduledTask -TaskName StartVault" in there[1] and "administrator" in there[1])
    code = (HERE / "vault_server" / "doctor.py").read_text(encoding="utf-8")
    check("doctor only asks Windows about jobs, never makes, changes or removes one", code.count('"schtasks"') == 1 and '"/query"' in code and not re.search(r'"/(delete|create|change|end|run)"', code, re.I))


def script_path():
    on = (HERE / "server_on.ps1").read_text(encoding="utf-8")
    off = (HERE / "server_off.ps1").read_text(encoding="utf-8")
    name = f"'{doctor.STAYS_UP_TASK}'"
    check("on, off and doctor mean the same job", name in on and name in off)
    for need, why in [("-AtLogOn", "starts at log-in"), ("-AllowStartIfOnBatteries", "starts on battery"), ("-DontStopIfGoingOnBatteries", "isn't stopped when unplugged"),
                      ("-ExecutionTimeLimit (New-TimeSpan -Seconds 0)", "no 3-day limit"), ("-RestartCount", "the job itself is restarted"),
                      ("-MultipleInstances IgnoreNew", "never two keepers"), ("pythonw.exe", "no window"), ("server_off.ps1", "whatever runs is stopped first"),
                      ("/health", "says on only once the server answers")]:
        check(f"on: {why}", need in on, need)
    check("off: the job is removed, the keeper stopped before the server", "Unregister-ScheduledTask" in off and 0 < off.index("keep_serving") < off.index("serve\\s"))
    check("on refuses a folder that isn't the library", MARKER_NAME in on and "Nothing was changed" in on)
    check("the keeper is run by the on script", "keep_serving.py" in on and (HERE / "keep_serving.py").is_file())
    text = on + off + (HERE / "keep_serving.py").read_text(encoding="utf-8") + (HERE / "vault_server" / "keepalive.py").read_text(encoding="utf-8")
    check("no laptop address or Tailscale name in any of it", not re.search(r"\b100\.\d+\.\d+\.\d+\b|\.ts\.net", text))


def main():
    tmp = Path(tempfile.mkdtemp(prefix="vault-keepalive-")).resolve()
    model_path(tmp)
    real_path(tmp)
    server_path(tmp)
    doctor_path()
    script_path()
    print()
    if failures:
        print(f"{len(failures)} FAILED: " + "; ".join(failures))
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
