# NEXT: /verify
Written by Code from the STATUS queue (fast-lane OK), 2026-11-07.
Read: this file only.
## Parts
a. **Script + skill.** `.claude/scripts/verify.py` runs server tests (`server/test_*.py`), doctor test, playOrder and compareEngine tests, `tsc --noEmit`, guard test, `check_repo.py`; one PASS/FAIL line each and a total. Read-only. `.claude/skills/verify/SKILL.md` runs it.
b. **Pointers.** `COMMANDS.md` line; `CLAUDE.md` Commands points to it.
## Phone check
None. Check: run it once, all PASS.
