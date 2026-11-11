# Status

**Phase 2 closed 2026-11-10 (2.7 wipe check passed). Phase 3 (search) and the design overhaul (O.4) are open.** Updated 2026-11-10 by Code. How we work: `WORKFLOW.md`. Build order: `BATCH-PLAN.md`. Design: `BLUEPRINT.md`. My commands: `COMMANDS.md`.
**Ship line:** 2.7 passed (real sessions done: 10 songs, 23 tags + wipe check) by 2026-11-15 (DECISIONS 2026-11-10). No new phase before it (VISION).
**In progress:** nothing. Wave 2 is built and published, waiting for review.
**Next up:** me: commit, update the phone (close and reopen the app), then `Review.` in chat.
**Current task:** Overhaul wave 2 (`NEXT.md`): built, 4 phone checks pending.

## Done
- Overhaul wave 2 built 2026-11-10 (two sessions): search as its own screen with recent searches, Library in Wall's style (tiles, marks, chips, Most played order), Home's five new rows with See all, the server that starts itself and comes back if it stops (`server_on.ps1` / `server_off.ps1`, `doctor` line). Wave 1 catch 9 fixed. Fresh-eyes review on Sonnet: 19 catches, 3 fixed, 1 proved (`board/wave2-review.md`). Details REPORT.
- Wave 1 reviewed 2026-11-10: checks 7 of 7 pass, 1 note (search opens Library until wave 2). Native tab bar dropped; wave 1 defaults kept (amber etc., DECISIONS).
- Overhaul wave 1 built 2026-11-10: new frame (drawn tab bar, mini player that grows into the player), Wall's Home, Deal's player, play data, plain labels, SF Symbols and glass with stand-ins. Review: 15 catches, 9 fixed. Board `board/wave1-frame.md`.
- Steady screen reviewed 2026-11-10: checks 3 of 3 pass. Mockup pick: Wall base, Deal's player, swipe cards for Sort (DECISIONS). Rebuild installed.
- Phase 2 closed 2026-11-10: wipe check passed with the rebuild. Ship line adjusted to real sessions + wipe check (owner, DECISIONS).
- Steady screen built 2026-11-10: freeze cause found, player sheet rebuilt as a layer in the app; hang watch in `timings`; `overhaul/TEARDOWN.md`; three mockups in `spike/mockups/`; native pieces in `overhaul/REBUILD.md`.
- Cool, quick and rated built and reviewed 2026-11-09 (6 of 6): rating (2.8), search as I type, battery fixes. Results `PHASE-2-RESULTS.md`.
- Sort finished 2026-11-09 (owner): whole catalogue sorted from the phone.
- Phase 1 closed 2026-11-07 (away test passed). Library at `E:\VaultLibrary`: 1,395 songs. ROADMAP 1.11 built, unproven.
- Phase 0 closed (`archive/SPIKE-RESULTS.md`). Design ideas in `DESIGN-NOTES.md`.

## Queue
1. Now: me: the 4 wave 2 phone checks, then `Review.`. Me: test searches toward 3.7 as tags grow.
2. Then: overhaul wave 3 (Sort as swipe cards + tagging), 4 (the rest + Live Activity spike). ROADMAP O.4.
3. My 20 acceptance searches (3.7) at ~50 tags, and revisit E (3.4, 3.5).
4. "My projects" Home row waits for ROADMAP 6.1.
5. Parked: Stretch: A-Z strip, split the 638 set. MP3 phone copies (523): fix next step if the timings blame them.

## Open questions
- Energy with the screen open reads FAIL on wave 2's code (5 min of data): look into it at the start of wave 3? (REPORT, Decisions 1)
- Old Windows job "StartVault" (server in a window, on a timer) still exists beside the new "Vault server" job: delete it? (REPORT, Decisions 2)
- Fable promo ends 2026-11-16 (owner). O.4 runs on Fable until then.
- Harness score: fails per review. Fix-up 1 of 6, polish 0 of 4 (+2 notes), code-complete 0 of 4 (+1), session polish 0 of 3 (+2), fast Next 0 of 4 (+1), play first 0 of 4 (+5 owner notes), rated 0 of 6 (+2), steady screen 0 of 3 (+0), wave 1 0 of 7 (+1).
- Does BandLab export keep the title, and what formats? (ROADMAP 5.1)
- `SAVE ME` (mine?), 26 date-only names, `Untitled...` files: display names wait for the release system (ROADMAP 6.1).

## Checks pending
- Next review: 4 checks from `NEXT.md` (wave 2) plus REPORT's 4 extras.
- Locked wake-ups after the rebuild (~30 a minute expected): a 10 min locked listen, then `timings`.
- Tonight's code has no timings yet: play a few songs, then `timings`.
