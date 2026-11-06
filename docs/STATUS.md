# Status

**Phase 1.** Updated 2026-11-06 by Code. How we work: `WORKFLOW.md`. Build order: `BATCH-PLAN.md`. Design: `BLUEPRINT.md`. My commands: `COMMANDS.md`.

**In progress:** nothing.
**Next up:** me: new build, phone checks, then `Review.`
**Current task:** `NEXT.md` "Batch 6.1, Downloads and offline play".

## Done
- Phase 0 closed: `DECISIONS.md`, `SPIKE-RESULTS.md`. Plan approved 2026-11-01.
- ROADMAP verified: 1.1-1.10, 1.12-1.16, 1.19-1.23. 1.11 built, unproven. Library at `E:\VaultLibrary`, 1,395 songs, 314 Mine, all imported with phone copies.
- Batches 1 to 5 and 4d phone-verified (4d on 2026-11-06; level match dropped, my call).
- Batch 6.1 built 2026-11-06 (downloads, offline play); board notes `board/batch-6-offline.md`. Phone checks open.

## Queue
1. Batch 6.2: restore after a wipe, final survival test (closes Phase 1).
2. Parked (Code's pitches): split the 638-song folder set; server `/status` count-only answer; A-Z jump strip; doctor's fail line names changed files; Hidden count on the Hidden link; light vibration when a queue song lifts; song length stored at scan time; doctor warns on Mine songs without copies.

## Open questions
- Board seats didn't load by name in batch 3; meetings run them as general helpers.
- Does SideStore keep app data across re-signs? Kept across a refresh; final test in batch 6. Plan if not: restore from the laptop.
- Does BandLab export keep the title, and what formats? (ROADMAP 5.1)
- `SAVE ME` stays in for now: not sure it's mine.
- Chat-defaults, say if wrong: the 8 same-render copies keep the `Music` copy; `Session Music` loose files stay in the scan.
- 26 date-only names and the `Untitled...` files wait for later.
- Mine 315 in the dry run, 314 now: probably one verdict changed since. Doctor should show nothing odd.

## Checks pending (Batch 6.1, new build first)
1. Laptop on: open the app, tap Open library. Pass: the grey line under the title reads "Saving to phone: N of 314" and
   N counts up; the newest Mine songs show "On this phone" first. When done: "On this phone: 314 of 314 Mine songs · 830 MB of 8 GB".
2. Mid-download, swipe the app away, reopen, open Library. Pass: N carries on near where it was, not from 0. Play a
   song that says "On this phone": it plays to its real end.
3. Laptop asleep (or Wi-Fi and Tailscale off), open the app, open Library. Pass: within about 10 s the list shows with
   "Laptop not reachable: songs on this phone still play".
4. Same, play an "On this phone" song, lock the screen, skip to the next on the lock screen. Pass: plays, controls work.
5. Same, tap a song that isn't on the phone. Pass: "Not on this phone, and the laptop isn't reachable" at once, no hang.
6. Same, Compare on a group whose versions are all on the phone. Pass: flips work; no level change beyond the real one.
