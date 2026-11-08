# NEXT: Phase 1 close: fold DECISIONS
Written by chat, 2026-11-07.
Log: 6.7 phone 3/3 pass; away test pass, Phase 1 closed (mine); leftover names wait for tagging (chat-default); fold moves Phase 0-1 rows to an archive file (chat). See rows "Batch 6.7 phone" and "Phase 1 close" at the end of `DECISIONS.md` (logged by chat)
Queue after this: `/verify` (fast-lane OK, below). Then the Opus plan session for Phase 2 tagging (`PLAN-SESSION.md`, board inside, no "Plan mode" label; board tries a clickable HTML mockup of new screens before Code builds).
Read: this file, `DECISIONS.md` (once, to summarise), `ROADMAP.md` Phase 1 only.
Session: cheaper model (Sonnet), docs only, no build, no publish.
## Parts
a. **Archive.** Move every row from the Phase 0 and Phase 1 tables in `DECISIONS.md`, word for word, to new `docs/decisions/phase-0-1.md` (short header: what it is, where the summaries live). Nothing deleted or reworded.
b. **Summaries.** `DECISIONS.md` keeps its header, the Phase 0 summary as is, and a new "Phase 1 summary (closed 2026-11-07)" in the same style: 10-15 bullets of what still binds (rules, product calls, Compare and lock-screen behaviour, over-the-air updates, build 22 as last full build, board rules, leftover names). Then one link line to the archive and an empty table for rows from here on, with the same columns. Target under 8 KB.
c. **Pointers.** Anything that cites "DECISIONS" for an old row still finds it: add one line to `CLAUDE.md`'s pointer line and `docs/MAP.md` naming the archive. Check `check_repo.py` passes.
**Stop line:** a and b first; c can be one line each.
## Phone check
None. Chat checks at `Review.`: archive row count equals the rows removed, DECISIONS under 8 KB.

## Queued: /verify (fast-lane OK)
One command runs everything that can be checked on the laptop: server tests, doctor test, playOrder and compareEngine tests, `tsc --noEmit`, guard test, `check_repo.py`; prints one PASS/FAIL line per item and a final total. Read-only: no publish, no build, no music touched. Add as `.claude/skills/verify` plus a script; `COMMANDS.md` gets its line; `CLAUDE.md` Commands points to it. Later NEXTs can use it with `/goal`. Check: chat runs it at review; you run the COMMANDS line once and see all PASS.
