# Report

**Step:** Batch 3c, Queue drag that works, 2026-11-02. Parts a, b and c built. None of it has run on a phone yet.

## Verified by running
- Typecheck: no errors. Play-order self-test: ALL PASSED. iOS bundle export: succeeded. Expo version check: up to date. Repo check: clean.
- Read from source: Expo's build adds the animation compile step by itself, so no extra config file is needed.
- **Not proven:** the export only packs the JavaScript. The new packages include phone-side code, so the first real proof is the GitHub Actions build.
- Not tested by running: the drag, the grab area, auto-scroll.
## Why the old drag failed
Most likely iOS's own sheet pull-down took the finger and cancelled the touch, so the code dropped the song back in place. That fits "snaps back" and "pulls the sheet", but it comes from reading the code, not from a test on the phone.
## Needs the phone
Run the build and install it first.
1. Queue: hold a song in Up next, drag it two places up, release. Pass: the others slide aside, it lands there, music doesn't restart; Next plays that order, also from the lock screen.
2. Drag a song down. Pass: the sheet stays put. Then swipe down from the top grab area. Pass: the player closes.
3. Drag a long way down, past the bottom edge. Pass: the list scrolls by itself.
4. Drag a song, lock the phone, let two songs finish, open Queue. Pass: order held, right song playing.
5. Shuffle on, drag a row, tap Not mine, then Undo within 5 seconds. Pass: song back at its second, the drag still there.
## Changed
- `app/Player.tsx`, `app/package.json`, `app/package-lock.json`.
- `docs/REPORT.md`, `docs/STATUS.md`, `docs/DECISIONS.md`.
## Differed from NEXT.md
- The player is no longer a real iOS sheet. iOS can't limit its pull-down to one area, so it's now a look-alike with its own grab area. Same size and rounded top; the screen behind no longer dims.
- Package: `react-native-reorderable-list`, not the better-known `react-native-draggable-flatlist`, whose last release is older and predates these versions. It needs `react-native-gesture-handler`, `react-native-reanimated` and `react-native-worklets`, at Expo's pinned versions.
- Swiping the grab area closes the player from Queue too, as check 2 asks. Back in Queue still goes to the full player.
- The lifted row is 75% see-through and slightly bigger: the package's default look. Auto-scroll speed is also its default, and it may feel fast.
## Not done
Nothing in NEXT left out.
## Decisions needed
None.
## Proposed next step
Batch 4, Real sorting, once these checks pass.
## Pitch
A light vibration when a song lifts: it tells your thumb the hold worked without looking. Needs one small package.
