# Batch plan: the rest of Phase 1

Written 2026-11-01 by the plan session. Design: `BLUEPRINT.md`. Each batch is one Code session with 2-3 phone checks. Batches 3, 4, 4b and 6 get a design board meeting first (`BOARD.md`). No owner calls are outstanding, so no batch is blocked. Chat writes each batch into `NEXT.md` at review.

## Order, and why it differs from ROADMAP
- **1.9 backup moves up:** phone writes start in batch 1, so backup follows right away.
- **1.18 stamp runs early:** a free result that shapes 1.17. The final test stays in batch 6.
- **1.15 and 1.16 come before 1.21:** the card should sit on the final player, and the riskiest work surfaces early.

## Batch 1: First write
**ROADMAP:** STATUS queue 1 (Not mine in the player), 1.18 first half. Written out in `NEXT.md`.
**Phone checks:** Not mine and Undo; Mine and shuffle; stamp after a SideStore refresh.

## Batch 2: Safety and pull
**ROADMAP:** 1.9, 1.3, 1.19.
a. Nightly backup command and scheduled task: database and journal to a folder on C:, 14 copies, skipped with a warning while E: is unplugged. `/health` route and doctor report its age. MAP gets the path.
b. Pull-all command: one at a time, progress count, stop under 10 GB free on C:, rerunnable. First prove on a few files that doctor's fingerprint doesn't fail on a pull. I run the full pull; a scan follows.
c. Hidden songs list on the phone, with Restore per song.
d. Sorting prototype with fake data: bulk sweep and card, buttons plus swipe.
**Stop line:** the prototype waits if long.
**Laptop check:** a backup file appears; pull finishes with the count expected.
**Phone checks:** a former cloud song plays; Hidden restore brings a song back; prototype feel.

## Batch 3: The real player
**ROADMAP:** 1.15 (queue, remaining-time tap), 1.16, parked now-playing bar.
a. Shared player above all screens; Back no longer stops music. Controllable from every screen. Sorting borrows this player; the library queue pauses and resumes after (board refines).
b. Switch to the playlist player with a moving window from `playOrder.ts`. If it fails twice, stop and report; the single player stays.
c. Lock screen: title, seek, next, previous. Songs advance while locked.
d. Queue, remaining-time tap, now-playing bar.
**Stop line:** queue and remaining-time tap wait if long.
**Phone checks:** locked play, next and auto-advance; queue; browse the Library with the bar.

## Batch 4: Real sorting
**ROADMAP:** 1.21, built from the batch 2 prototype.
a. `/sorting/sets`: folders and repeated name patterns. Only songs with no verdict of mine from anywhere; a set with none left disappears. Set songs open inline in the list (prototype keeper).
b. Bulk sweep: contents shown first, undo for the whole set.
c. Cards: likely mine first, start about 30% in, buttons plus swipe, 5-second Undo, progress counter.
d. Mine filter; shuffle gets a choice of unsorted or Mine.
**Stop line:** name patterns wait if long; folders go first.
**Phone checks:** sweep and undo; card flow; progress survives an app restart.

## Batch 4b: Versions (manual)
**ROADMAP:** 1.23. Shape set by the board (`board/batch-4-versions.md`); storage shape is owner picks.
a. "Another version of…" action from library, player and sort, any time, with undo.
b. Versions as a second layer in sort; a song's other versions visible from it.
c. Rules the board settles: Not mine on one version, which version shuffle plays.
**Phone checks:** link two songs from the player and from the library; undo a link; the versions layer in sort.

## Batch 5: Import and copies
**ROADMAP:** 1.22, 1.7.
a. Import command for songs kept so far, rerunnable: copy to `audio/<code>/`, fingerprint checked. Audio route prefers the library copy.
b. Phone copies: AAC about 192 kbps; compressed files at or under that are copied as is.
c. `/kept` and `/songs/{id}/copy`; size report.
**Stop line:** `/kept` waits if long.
**Phone checks:** a kept copy plays from `/songs/{id}/copy` in Safari; a not-mine song stays out; sizes match the report.

## Batch 6: Offline and finish
**ROADMAP:** 1.17, 1.18 final.
a. Downloads with progress, storage limit (starts at 8 GB, adjustable), newest first.
b. Play from the phone when a copy exists.
c. Restore from the laptop after a wipe.
d. Final survival test on real kept songs.
**Stop line:** the limit setting can start fixed.
**Phone checks:** laptop asleep, screen locked, away from home; a refresh keeps songs; a wipe restores.
**Closes Phase 1** once I pass ROADMAP's "Done when".

## Still parked
Server `/status` count-only answer · A-Z jump strip · doctor's fail line naming changed files.

## Known gaps carried over from STATUS
- A song stays counted if its file later becomes not mine or vanishes (0 today). Doctor lists these.
- A kept file that goes back to cloud-only shows unsorted after a rebuild until local again; the journal keeps the verdict. Check this in batch 2 with the pull.
