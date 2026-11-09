# Status

**Phase 2 (tagging): last item is mine (2.7); Phase 3 (search, on the phone) builds alongside.** Updated 2026-11-08 by chat. How we work: `WORKFLOW.md`. Build order: `BATCH-PLAN.md`. Design: `BLUEPRINT.md`. My commands: `COMMANDS.md`.
**Ship line:** 2.7 passed (50 songs tagged in real sessions + wipe check) by 2026-11-15. No new phase before it (VISION).
**In progress:** nothing.
**Next up:** me: commit and push, new Code session, `/next`. Alongside: real tagging sessions + wipe check (2.7).
**Current task:** Play first, info after: every Next as fast as Sort cards (`NEXT.md`).

## Done
- Fast Next reviewed 2026-11-08: checks 4 of 4 pass, 1 note: phone session Next ~800 ms vs Sort 91 ms; play first, info after (owner). Search 8 ms on the phone. E waits for more tags. Results `PHASE-2-RESULTS.md`.
- Fast Next, centred player, search built 2026-11-08: session Next via the loaded queue (model 300 ms vs 1,100), Play centred everywhere, search in Library (3.1-3.3, 3.6), phone timings + `timings`, acceptance runner. E waits for the owner. Board `board/phase-3-search.md`. Details REPORT.
- Session polish reviewed 2026-11-08: checks 3 of 3 pass; notes: 3-5 s silent hold on session Next, Sort-card player not centred. Search: A, on the phone. Results `PHASE-2-RESULTS.md`.
- Session polish built 2026-11-08: clean starts (0:15 / 0:30 at load), session centred and kept after a kill, server makes phone copies by itself (308 made on the real library, 0 Mine left without), doctor line, quiet hang-ups, `SEARCH-OPTIONS.md` measured. Details REPORT.
- Phase 2 code-complete reviewed 2026-11-08: checks 4 of 4 pass, 2.2/2.4/2.5 ticked. Bug note: a beat from 0:00 on each session Next. Session starts at 15 s, Sort at 30 s. Results `PHASE-2-RESULTS.md`.
- Phase 2 code-complete built 2026-11-08: Tag tap and drag fixes, change tags, tagging session, Library Shuffle cycle, restore test + `tags` command, screenshot tool (`tools/shots/`). Board `board/phase-2-complete.md`. Fresh-eyes review caught 7 (REPORT).
- Player polish reviewed 2026-11-08: checks 4 of 4 pass. Found: Tag won't reopen after an icon cancel; drag snaps to ticks. Both go in the next step. Results `PHASE-2-RESULTS.md`.
- Phase 2 plan session 2026-11-07: board met (`board/phase-2-tagging.md`), 8 calls answered (DECISIONS), mockup `spike/mockups/tagging-card.html`, BLUEPRINT Phase 2 section, BATCH-PLAN Phase 2 (3 batches).
- `/verify` built and reviewed 2026-11-07: one command, 11 checks, 11/11 PASS, about 6 min.
- Phase 1 closed 2026-11-07 (away test passed). Library at `E:\VaultLibrary`: 1,395 songs. ROADMAP 1.11 built, unproven.
- Phase 0 closed (`archive/SPIKE-RESULTS.md`). Design ideas in `DESIGN-NOTES.md`.

## Queue
1. Now: Code: play first, info after, on every play path (`NEXT.md`). Me: real tagging sessions + wipe check (2.7).
2. Then: my 20 acceptance searches (3.7) at ~50 tags, and revisit E (3.4, 3.5); Phase 2 closes when I pass 2.7, and chat folds its DECISIONS rows into `decisions/phase-2.md` (short summary left in DECISIONS).
3. Parked: Keychain note so a reinstall keeps the laptop address (native); lock-screen search Shortcut (needs a URL scheme, full rebuild). In NEXT: Hidden count, `/verify` under 1 min, doctor names files, `/status` count; Stretch: A-Z strip, split the 638 set.

## Open questions
- Harness score: fails per review. Fix-up 1 of 6, polish 0 of 4 (+2 notes), code-complete 0 of 4 (+1), session polish 0 of 3 (+2), fast Next 0 of 4 (+1). Improving; notes now get LESSONS lines too.
- Does BandLab export keep the title, and what formats? (ROADMAP 5.1)
- `SAVE ME` (mine?), 26 date-only names, `Untitled...` files: display names wait for the release system (ROADMAP 6.1).

## Checks pending
- None. Next step's checks come at `Review.`
