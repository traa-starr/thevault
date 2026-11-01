# NEXT: Build upkeep + storage options
Written by chat, 2026-10-31.
Log: Phase 0 close accepted (chat). 1.11 and the 1.1 options memo go in one session; no database built before I choose (chat-default). (logged by chat)
Queue after this: I pick a storage option in chat at `Review.`, then ROADMAP 1.1 is built from it (library folder + database; Code brings the exact tables for my OK only if the choice leaves it open). Then 1.2 scanner.
Read: `ROADMAP.md` (Phase 1), `DECISIONS.md` (Phase 0 summary + G2 rows), `MAP.md`, `ARCHITECTURE-OPTIONS.md` (Laptop section), `SPIKE-RESULTS.md` (D1-D3 only), `.github/` workflow for the iOS build.

## Parts
a. **ROADMAP 1.11.** On any failed iOS build, upload the full Xcode log as a run artifact. No other workflow changes. Read the workflow back to check it; do not force a failure. Say in REPORT that it is unproven until a build fails.
b. **ROADMAP 1.1, options only.** Write `docs/STORAGE-OPTIONS.md`: how songs, files, versions, tags, groups and links are stored in the library at `E:\VaultLibrary`. 2-3 options, including one I did not think to ask about; say what a senior engineer would pick and why. Cover: what a "song" is vs a "file" vs a "version"; how a re-scan finds new files without losing my tags; how one song with many versions (FL bounces, BandLab) hangs together; what survives if the database is lost and restored from the C: backup; what the unplugged-E: case does. End with a short Approve sheet. No app or server code, no folders created.
c. Repo check. Update STATUS and ROADMAP (tick 1.11 as built, not phone-verified).

**Stop line:** if b runs long, finish a and write b's options as a short table; the full memo waits for the next session.

## Phone check
None (docs and workflow step). My check: `Review.` in chat, where I pick a storage option.
