**Step:** /verify, 2026-11-07.

**Verified by running:** `python .claude/scripts/verify.py`: 11/11 PASS (6 server tests incl. doctor, playOrder, compareEngine, tsc, guard test, check_repo). `check_repo.py` PASS.

**Needs the phone:** None.

**Changed:** `CLAUDE.md`, `docs/COMMANDS.md`, `docs/DECISIONS.md`, `docs/NEXT.md`, `docs/STATUS.md`, new `.claude/scripts/verify.py`, new `.claude/skills/verify/SKILL.md`.

**Differed from NEXT.md:** NEXT written by Code from the queue (fast-lane pass). All `server/test_*.py` run, not just server+doctor (backup, import, library, updates too). Per-check limit 15 min.

**Not done:** nothing.

**Decisions needed:** none.

**Proposed next step:** Opus plan session for Phase 2 tagging (`PLAN-SESSION.md`), needs chat.

**Pitch:** `test_server.py` takes 5.5 min, almost all in the 7,200-line journal timing step (one disk sync per line); build that journal in one go so `/verify` runs in under a minute.
