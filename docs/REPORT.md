# Report

**Step:** Batch 4d, Compare versions, 2026-11-04. Part 0 (board pass) done. Parts a, b, c not started. No code changed.
**In progress:** Batch 4d, part a.
## Done
- Board pass: all four seats answered. Notes in `docs/board/batch-4d-compare.md` (agreed / disagreed / owner questions / 6 phone checks).
- Read the code the build needs: `engine.ts`, `playerStore.ts`, `versionStore.ts`, `Versions.tsx`, `Player.tsx`, server `/songs`, `/audio`, `importer.py`.
## Board defaults taken (owner questions)
1. Close Compare on a version the queue doesn't hold: it plays in the queue's spot like Versions > Play (`playNow`); rest of the queue unchanged.
2. Close Compare opened from Library: the song from before comes back at its spot, paused (same pattern as Sort's `saved` / `leaveSort`).
3. Song end: back to 0:00, paused. Never advances the queue.
Also taken: flip when the dial rests (no Switch button); shorter version greyed and refused; dial bounces, no wrap; "Back to the last one" button built; lock-screen Next/Previous hidden in Compare; Make main from inside Compare parked.
## Build plan (from the board)
- **a. Player Compare.** New `compareEngine` in `engine.ts`: one `createAudioPlayer` per version, max 3 at once (sounding + dial neighbours), all running, only the sounding one has volume; flip = swap volumes. Resync silent players when over ~80 ms off. New `compareStore.ts` (memory only; level-match toggle saved to a small file like `time-left.txt`). Queue player pauses while open; its `onSound` / `onTrack` / stall watch / `finished()` must ignore Compare. Add `releaseLockScreen()` that resets the `locked` flag. Not offered during Sort. New Compare sheet (dial, "2 of 5", Playing tag, scrubber, Play, Match loudness switch, Done). Note: iOS can't open a sheet over a sheet, so use `player.closeThen` like Versions does.
- **b. From a Library group.** Same sheet, starts on Main at 0:00, paused. Hide Compare for groups under 2 playable.
- **c. Level match.** `import` gets a loudness step: `ffmpeg -af ebur128=peak=true -f null -` on the library copy; side table `loudness(song_id, hash, lufs, true_peak, ts)` through a new journal kind `loudness`, `CREATE IF NOT EXISTS`, no schema bump, added to `MINE_TABLES`. `/songs` sends `lufs`. Phone gain = `10^((quietest in family - this) / 20)`, clamped 0.1 to 1.0, unmeasured = 1.0 with "not measured". Put the new laptop command line in REPORT when built.
- Stop line unchanged: 0, a, b always; c waits if the session runs long.
## Needs the phone
Nothing yet. When built, use the 6 checks in `docs/board/batch-4d-compare.md`.
## Pitch
Make main / Remove from inside Compare (Flow seat), loudness-per-version display, blind A-B (already parked).
