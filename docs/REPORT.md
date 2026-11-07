# Report

**Step:** Docs-only task from chat before Batch 6.4: when the design board meets, 2026-11-06.

**Verified by running:** `python .claude/scripts/check_repo.py`: clean.

**Needs the phone:** None (docs only).

**Changed:** docs/BOARD.md, docs/CHAT-INSTRUCTIONS.md, docs/DECISIONS.md, docs/NEXT.md, docs/WORKFLOW.md.

**The test** (BOARD.md "When it meets"; a yes to any means a meeting, unsure counts as yes):
1. Adds a screen, or a new way between screens.
2. Changes what you see or hear after a tap (timing, motion, things moving, what plays), incl. fixes for something you flagged as feeling wrong.
3. Changes a journal, outbox or manual-choice rule. Always no: laptop-only, wording, bug fixes that only restore agreed behavior.

**6.4 call:** board. Line 2 says yes: it changes how Compare feels after a tap and fixes the jump and slow flips you flagged.
NEXT.md got part 0b (four seats on jump, readiness, flip speed; notes in `docs/board/batch-6-4-compare.md`; stop for your
answers before part a), plus the Log and Session lines. Parts a onward untouched.

**Differed from NEXT.md:** none. Sharpened chat's test: line 2 says "what I see or hear" instead of "feels in the hand"
(checkable from a NEXT.md), and added "unsure counts as yes" and "fixes that restore agreed behavior" to close gray areas.
Batch list in BOARD.md kept as one "Met so far" line of history.

**Not done:** nothing. Board seats not run (as asked).

**Decisions needed:** none. Logged one DECISIONS row (Code, reversible).

**Proposed next step:** new Code session, `/next`: part 0, part 0b, then stop for your board answers.

**Pitch:** have `/review` print the board test's answer for the next batch in one line, so chat and Code can't drift.
