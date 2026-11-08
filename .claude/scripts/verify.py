"""One command for every laptop check: python .claude/scripts/verify.py
Read-only: runs tests and checks, no build, no publish, never touches music. Exit 0 only if all pass."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PY = sys.executable
NODE = ["node", "--experimental-strip-types", "--no-warnings"]

checks = [(f"server {t.stem}", [PY, str(t)], ROOT) for t in sorted((ROOT / "server").glob("test_*.py"))]
checks += [
    ("playOrder test", NODE + ["app/playOrder.test.mjs"], ROOT),
    ("compareEngine test", NODE + ["app/compareEngine.test.mjs"], ROOT),
    ("typecheck (tsc)", ["npx", "--no-install", "tsc", "--noEmit"], ROOT / "app"),
    ("music guard test", [PY, ".claude/hooks/test_guard_music.py"], ROOT),
    ("check_repo", [PY, ".claude/scripts/check_repo.py"], ROOT),
]

failed = 0
for name, cmd, cwd in checks:
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=900, shell=(cmd[0] == "npx"))
        ok, out = r.returncode == 0, (r.stdout + r.stderr).strip()
    except Exception as e:
        ok, out = False, str(e)
    print(f"{'PASS' if ok else 'FAIL'}  {name}")
    if not ok:
        failed += 1
        print("      " + "\n      ".join(out.splitlines()[-8:]))
print(f"\n{len(checks) - failed}/{len(checks)} passed" + ("" if not failed else f", {failed} FAILED"))
sys.exit(1 if failed else 0)
