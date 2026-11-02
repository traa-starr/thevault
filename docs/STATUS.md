# Status

**Phase 1 started.** Updated 2026-11-02 by chat. How we work: `WORKFLOW.md`. Build order: `BATCH-PLAN.md`. Design: `BLUEPRINT.md`. My commands: `COMMANDS.md`.

**In progress:** nothing.
**Next up:** Code: `/next` (Batch 3d).
**Current task:** `NEXT.md` "Batch 3d, Queue and player feel".

## Done
- Phase 0 closed: details in `DECISIONS.md` and `SPIKE-RESULTS.md`.
- ROADMAP 1.1 accepted: library at `E:\VaultLibrary`. 1.11 built (Xcode log on failed build), unproven.
- ROADMAP 1.2, 1.4, 1.5, 1.6 accepted: 1,395 songs; mine 68 + 5, likely 115, unknown 1,207.
- ROADMAP 1.8, 1.10, 1.12, 1.13, 1.14 phone-verified: playable count, doctor, app installed, prototype player, library list.
- ROADMAP 1.20 + 1.15 core phone-verified: streaming, seek, real next/previous, shuffle.
- Plan approved 2026-11-01: blueprint, batch plan, sizing rule.
- Batch 1 phone-verified 2026-11-01: Mine / Not mine / Undo, outbox retry, shuffle skips Mine, survival stamp kept across a refresh.
- Batch 2 verified 2026-11-01: nightly backup, full pull, Hidden Restore, sorting prototype. Closes 1.3, 1.9, 1.19.
- Board set up and met twice 2026-11-01: batch 3, then batches 4 and 4b.
- Batch 3 phone-verified 2026-11-01: shared player, bar, playlist player, lock screen, queue, time tap. Closes 1.15, 1.16.
- Batch 3b phone 2026-11-01: buttons at the bottom, hide toggle, toast placement passed. Queue drag fixed in 3c, phone-verified 2026-11-02 (all 5 checks).

## Queue
0. Batch 3d: Queue and player feel (in NEXT).
1. Batch 4: Real sorting (brief ready: `queued/NEXT-batch-4.md`).
2. Batch 4b: Versions, manual (ROADMAP 1.23).
3. Batch 5: Import and copies.
4. Batch 6: Offline and finish.
5. Parked (Code's pitches): server `/status` count-only answer; A-Z jump strip; doctor's fail line names changed files; Hidden count on the Hidden link; light vibration when a queue song lifts.

## Open questions
- Board seats didn't load by name in batch 3's session, though the files are there. Meetings can keep running them as general helpers.
- Does SideStore keep app data across re-signs? Kept across a refresh in batch 1; final test in batch 6. Plan if not: restore from the laptop.
- Does BandLab export keep the title, and what formats? (ROADMAP 5.1)
- `SAVE ME` stays in for now: not sure it's mine.
- `ANY WAY new limit.wav` is the newest version but wav only: needs a compressed render (ROADMAP 1.7).
- The 8 same-render copies keep the `Music` copy (chat-default): say if wrong.
- `Session Music` top-level loose files kept in the scan (chat-default): say if they should go.
- 26 date-only names and the `Untitled...` files wait for later.
## Checks pending
- None. Still watching: does the bar ever say "Skipped..."?
