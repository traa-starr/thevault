# Report

**Step:** Batch 4d, Compare versions, 2026-11-05. Parts 0, a, b done. Part c (level match) not started.
## Verified by running
- `npx tsc --noEmit` in `app/`: no errors. `node --test playOrder.test.mjs`: passes, 0 skipped.
- `python .claude/scripts/check_repo.py`: clean. Not run on the phone yet.
## Needs the phone (after the build installs)
1. Full player, a grouped song at about 1:00: tap Compare, swipe the dial to another version. Pass: carries on within about 1 s of the same second, no restart.
2. Flip 8 times fast, then let it play 10 s. Pass: on the version the dial shows, one version heard, time counting.
3. Library, Versions chip on a group of 3+, then Compare (top right). Then a group of 2. Pass: Main at 0:00 paused, one row per swipe, Main marked, a fling stops at the end.
4. Lock the phone mid-Compare. Pass: lock screen names the version, Pause and Play work, no Next/Previous.
5. Close Compare (Done) from the full player after flipping. Pass: that version keeps playing at that second; Up next unchanged.
6. Close Compare opened from Library. Pass: the song from before is back in the bar at its spot, paused.
(Level-match check waits for part c.)
## Changed
New: `app/compareEngine.ts`, `app/compareStore.ts`, `app/Compare.tsx`. Modified: `app/App.tsx`, `app/Player.tsx`, `app/Versions.tsx`, `app/engine.ts` (`releaseLockScreen`), `app/playerStore.ts` (`comparing`, `startCompare`, `endCompare`, `isSorting`), `app/versionStore.ts` (`songInfo`).
## Differed from NEXT.md
- Library entry: a Compare button in the Versions view (opened by the Versions chip), not on the row itself; long-press on a row is select mode. Compare from a Versions view opened from the player also starts Library-style (Main, 0:00).
- A row that can't play (cloud only, missing, laptop off) is stepped over by the dial. One still being checked can be dialled to; it shows Loading until it plays or the check fails.
- Version length shows once that version has loaded (lengths aren't stored yet).
## Not done
- Part c, level match: stop line, session long. Gains are already wired in the engine (`setGains`), so c is the laptop measurement, `/songs` sending it, and the toggle.
## Decisions needed
- None new. Board defaults from part 0 are in force (see DECISIONS "Batch 4d build").
## Proposed next step
Phone checks 1-6, then `/next` for part c.
## Pitch
Store each song's length at scan time: the dial could grey a too-short version before it loads.
