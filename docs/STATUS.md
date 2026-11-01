# Status

**Phase 1 started.** Updated 2026-11-01 by Code. How we work: `WORKFLOW.md`. Build order: `BATCH-PLAN.md`. Design: `BLUEPRINT.md`.

**In progress:** nothing. Batch 2 parts a-d are built.
**Next up:** me: laptop checks, phone checks, then Review.
**Current task:** `NEXT.md` "Batch 2: Safety and pull".

## Done
- Phase 0 closed: details in `DECISIONS.md` and `SPIKE-RESULTS.md`.
- ROADMAP 1.1 accepted: library at `E:\VaultLibrary`. 1.11 built (Xcode log on failed build), unproven.
- ROADMAP 1.2, 1.4, 1.5, 1.6 accepted: 1,395 songs; mine 68 + 5, likely 115, unknown 1,207.
- ROADMAP 1.8, 1.10, 1.12, 1.13 phone-verified: playable count, doctor, app installed, prototype player.
- ROADMAP 1.14 phone-verified: library list.
- ROADMAP 1.20 + 1.15 core phone-verified: streaming, seek, real next/previous, shuffle.
- Plan approved 2026-11-01: blueprint, batch plan, sizing rule.
- Batch 1 phone-verified 2026-11-01: Mine / Not mine / Undo, outbox retry, shuffle skips Mine, survival stamp kept across a refresh.
- Batch 2 built 2026-11-01, unproven on phone: backup + `/health` + doctor line, `pull-cloud` (4-file proof passed, 909 cloud-only left), Hidden screen, sorting prototype.

## Queue
1. Batch 3: The real player, plus Undo returns to the spot in the song (Code's pitch).
2. Batch 4: Real sorting.
3. Batch 5: Import and copies.
4. Batch 6: Offline and finish.
5. Parked: server `/status` count-only answer (Code's pitch).
6. Parked: A-Z jump strip on the library list (Code's pitch).
7. Parked: doctor's fail line names the files that changed during a scan (Code's pitch).

## Open questions
- Does SideStore keep app data across re-signs? Kept across a refresh in batch 1; final test in batch 6. Plan if not: restore from the laptop.
- Does BandLab export keep the title, and what formats? (ROADMAP 5.1)
- `SAVE ME` stays in for now: not sure it's mine.
- `ANY WAY new limit.wav` is the newest version but wav only: needs a compressed render (ROADMAP 1.7).
- The 8 same-render copies keep the `Music` copy (chat-default): say if wrong.
- `Session Music` top-level loose files kept in the scan (chat-default): say if they should go.
- 26 date-only names and the `Untitled...` files wait for later.

## Checks pending
- Batch 2: register the nightly task (`powershell -File server\schedule_backup.ps1`), run the full pull, then the 3 phone checks in `NEXT.md`.
