"""Every lesson stays tied to the check that keeps it true: python .claude/scripts/lessons.py
Reads docs/LESSONS.md. The last cell of each row ("Kept true by") names test files, screenshots (`shots:<name>`), or
says `plan` / `phone check` when only a person or a plan line can check it. A named test or screenshot that no longer
exists is a FAIL: a lesson quietly losing its check is how a miss reaches the phone twice. Read-only."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
rows = [line for line in (ROOT / "docs/LESSONS.md").read_text(encoding="utf-8").splitlines()
        if line.startswith("| 20")]
fixtures = (ROOT / "tools/shots/fixtures.mjs").read_text(encoding="utf-8")
bad, tested, soft = [], 0, 0
for row in rows:
    cells = [c.strip() for c in row.strip("|").split("|")]
    what = cells[1][:60]
    if len(cells) < 4 or not cells[3]:
        bad.append(f"no 'Kept true by' cell: {what}")
        continue
    names = re.findall(r"`([^`]+)`", cells[3])
    if not names:
        soft += 1
        continue
    tested += 1
    for name in names:
        if name.startswith("shots:"):
            if f"name: '{name[6:]}" not in fixtures:
                bad.append(f"screenshot {name[6:]} is gone: {what}")
        elif not (ROOT / name).exists():
            bad.append(f"{name} is gone: {what}")
print(f"{len(rows)} lessons: {tested} kept true by a test or screenshot, {soft} by a plan line or a phone check only")
for line in bad:
    print("FAIL  " + line)
sys.exit(1 if bad else 0)
