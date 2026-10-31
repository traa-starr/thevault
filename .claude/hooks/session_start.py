"""SessionStart hook: tells each new session where the project stands, for a few lines of tokens. Read-only."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def first_line(rel):
    path = ROOT / rel
    if not path.exists():
        return "(missing)"
    lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    return next((l for l in lines if l.strip()), "(empty)")


def status_line(prefix):
    path = ROOT / "docs/STATUS.md"
    if not path.exists():
        return ""
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if line.startswith(prefix):
            return line
    return ""


def uncommitted():
    try:
        out = subprocess.run(["git", "status", "--short"], cwd=ROOT, capture_output=True, text=True, timeout=10)
        return len(out.stdout.splitlines())
    except (OSError, subprocess.SubprocessError):
        return "unknown"


print(f"NEXT.md: {first_line('docs/NEXT.md')}")
report_step = next(
    (l for l in (ROOT / "docs/REPORT.md").read_text(encoding="utf-8", errors="ignore").splitlines() if l.startswith("**Step")),
    "(no step)",
) if (ROOT / "docs/REPORT.md").exists() else "(missing)"
print(f"REPORT.md: {report_step}")
print(status_line("**In progress:**") or "In progress: nothing")
print(f"Uncommitted files: {uncommitted()}")
print("Workflow: docs/WORKFLOW.md. Commands: /next, /wrap, /review, /where.")
