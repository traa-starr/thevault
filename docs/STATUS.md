# Status

**Phase 1 closed 2026-11-07; Phase 2 setup.** Updated 2026-11-07 by Code. How we work: `WORKFLOW.md`. Build order: `BATCH-PLAN.md`. Design: `BLUEPRINT.md`. My commands: `COMMANDS.md`.
**In progress:** nothing.
**Next up:** me: commit, then `Review.` in chat (or `/next pass` for `/verify`).
**Current task:** fold done; `/verify` next.

## Done
- DECISIONS folded 2026-11-07: Phase 0-1 rows in `decisions/phase-0-1.md`, DECISIONS 4.2 KB.
- Phase 1 closed 2026-11-07: away test passed (laptop asleep, off Wi-Fi, lock screen first press, reconnects). Leftover names wait for tagging.
- Batch 6.7 phone-verified 2026-11-07 (update 20261108-014050): 3 of 3 pass. Compare lock-screen play works first press, Compare word right-aligned, lock-screen log shows presses.
- Phase 0 closed (`SPIKE-RESULTS.md`). ROADMAP verified: 1.1-1.10, 1.12-1.17, 1.19-1.23. 1.11 built, unproven. Library at `E:\VaultLibrary`, 1,395 songs, 314 Mine, all imported with phone copies.
- Batch 6.6 phone-checked 2026-11-07 (update 20261108-005832): checks 1-4 pass, normal lock screen fixed. Compare lock-screen play still needs two presses and the closed Compare word sits mid-row: Batch 6.7 (DECISIONS).
- Batch 6.5 phone-checked 2026-11-07 on build 22: over-the-air updates work (check 0), Done word, eye rule, queue ticks pass. Wheel steps one at a time, Compare row replaces the player's buttons, lock screen needs two presses: Batch 6.6, over the air (DECISIONS). Build 22 is the last full build for now.
- Prompt audit 2026-11-06: board seats run only when called; see DECISIONS.
- Board test 2026-11-06: one yes/no test in `BOARD.md` "When it meets". 6.5 skipped it (DECISIONS).
- 6.4 board met 2026-11-07: notes `board/batch-6-4-compare.md`; answers and calls in DECISIONS.
- Batches 1-5, 4d and 6.1 phone-verified (6.1: 829 MB of 8 GB saved). 6.2 phone-checked 2026-11-06: 6 of 7 passed, closes 1.18 (survival); check 3 (Compare audio) failed, fixed in 6.3. Batch 6.3 phone-verified 2026-11-06 (4 of 4): Compare stable, Hidden newest first, laptop line. Flips got slow (up to ~5 s) and the screen jumps: Batch 6.4. Board notes `board/batch-6-2-restore.md`, design ideas `DESIGN-NOTES.md`.

## Queue
1. Next (fast-lane OK): `/verify` skill, one command runs server tests, doctor test, playOrder and compareEngine tests, guard test and check_repo, prints one pass/fail; CLAUDE.md points to it; later NEXTs can use it with `/goal` (mine, 2026-11-06).
2. Then the Opus plan session for Phase 2 tagging (board inside, no "Plan mode" label); board tries a clickable HTML mockup of new screens before Code builds.
3. Parked (Code's pitches): split the 638-song folder set; server `/status` count-only answer; A-Z jump strip; doctor's fail line names changed files; Hidden count on the Hidden link; song length stored at scan time; doctor warns on Mine songs without copies; Keychain note so a reinstall keeps the laptop address; server stops printing harmless "connection reset" tracebacks when the phone drops a connection (chat, 2026-11-06).

## Open questions
- Does BandLab export keep the title, and what formats? (ROADMAP 5.1)
- Waiting for later: `SAVE ME` (mine?), 26 date-only names, `Untitled...` files. Same-render copies keep `Music`; Mine 314.

## Checks pending
None (fold is docs only).
