"""One command for every laptop check: python .claude/scripts/verify.py
Read-only: runs tests and checks, no build, no publish, never touches music. Exit 0 only if all pass.
The checks run side by side (each in its own temp folder, on its own port), so the whole run takes under a minute."""
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PY = sys.executable
NODE = ["node", "--experimental-strip-types", "--no-warnings"]

checks = [(f"server {t.stem}", [PY, str(t)], ROOT) for t in sorted((ROOT / "server").glob("test_*.py"))]
# every app test file runs: a new *.test.mjs is picked up by itself, so a test can't be written and then never run
checks += [(f"{t.name[:-len('.test.mjs')]} test", NODE + [f"app/{t.name}"], ROOT) for t in sorted((ROOT / "app").glob("*.test.mjs"))]
checks += [
    ("typecheck (tsc)", ["npx", "--no-install", "tsc", "--noEmit"], ROOT / "app"),
    ("music guard test", [PY, ".claude/hooks/test_guard_music.py"], ROOT),
    ("check_repo", [PY, ".claude/scripts/check_repo.py"], ROOT),
    ("lessons still checked", [PY, ".claude/scripts/lessons.py"], ROOT),
]

def run(check):
    name, cmd, cwd = check
    began = time.monotonic()
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=900, shell=(cmd[0] == "npx"))
        ok, out = r.returncode == 0, (r.stdout + r.stderr).strip()
    except Exception as e:
        ok, out = False, str(e)
    return ok, out, time.monotonic() - began


began = time.monotonic()
with ThreadPoolExecutor(max_workers=len(checks)) as pool:
    results = list(pool.map(run, checks))
failed = 0
for (name, _, _), (ok, out, took) in zip(checks, results):
    print(f"{'PASS' if ok else 'FAIL'}  {name} ({took:.0f} s)")
    if not ok:
        failed += 1
        print("      " + "\n      ".join(out.splitlines()[-8:]))
print(f"\n{len(checks) - failed}/{len(checks)} passed" + ("" if not failed else f", {failed} FAILED")
      + f", in {time.monotonic() - began:.0f} s")
sys.exit(1 if failed else 0)
