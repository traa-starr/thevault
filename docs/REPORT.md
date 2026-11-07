# Report

**Step:** Batch 6.4, Compare feels instant and stays in the player. Parts 0 and 0b, 2026-11-07.

**Verified by running:** `python .claude/scripts/check_repo.py`: clean. Board notes 59 lines (under 60).

**Needs the phone:** None (no code yet).

**Changed:** .claude/agents/logic-architect.md, docs/STATUS.md, docs/board/batch-6-4-compare.md (new), docs/REPORT.md.

**Done:** part 0, description line replaced exactly, nothing else in the file touched. Part 0b, four seats ran side by side,
notes in `docs/board/batch-6-4-compare.md` (Agreed, Disagreed with chair's leans, 3 owner questions, tests, 6 phone checks).

**Headline from the board:** the slowness is a 3-player window that rebuilds a streamed player on every dial rest, then a
seek and a settle wait, not what made 6.3 stable. Fix: muted players that keep playing in line, about 6 at once, and the
dial shows when they're aligned. Code measures before building (part a).

**Differed from NEXT.md:** phone checks grew from 4 to 6 (tester added pause-then-flip and lock screen).
The tester's "undim when the server returns" conflicts with logic's "source fixed at open"; chair's lean is in the notes.

**Not done:** parts a-c, because NEXT says to stop for your answers first. Nothing logged in DECISIONS: the board advises and chat logs its calls.

**Decisions needed (owner questions, defaults):**
1. Only the playing version is ready at 3 s: open with the rest dimmed, or don't open? Default: open, dimmed.
2. Use phone copies when every version is on the phone, even with the laptop on? Default: yes.
3. Light haptic on every flip? Default: yes.
Plus chat settles the Disagreed list (button label, "2 of 4" note, undo after Done).

**Proposed next step:** chat logs your answers and the board's calls, updates NEXT, then a Code `/next` runs parts a-c.

**Pitch:** give `compareEngine.test.mjs` a fake-player clock so every timing test (flip storms, late loads) runs in under a second.
