# Report

**Step:** Batch 3b, player polish, 2026-11-01. Parts 0, a, b and c built. None of it has run on a phone yet.

## Verified by running
- Play-order self-test: ALL PASSED, with 8 new move tests. Typecheck: no errors. iOS bundle export: succeeded. Repo check: clean.
- Not tested by running: layout, drag, lock screen. Read from React Native's source: swipe-to-close is off, and a drag takes the touch before the row lets go.
- **Board seats loaded by name: no.** Ran as general helpers, as NEXT allowed.
## Needs the phone
Install the new build first.
1. Open the full player. Pass: Mine and Not mine sit at the bottom, Not mine under your right thumb, nothing cramped.
2. Tap Hide buttons, close the app fully, reopen and play. Pass: still hidden; Show buttons brings them back. While hidden, nothing else on the page moves.
3. Tap Not mine, then Undo. Pass: the toast sits above the buttons, never on them.
4. Queue: hold a song in Up next, drag it two places up, release. Pass: it snaps, music doesn't restart; Next plays that order, also from the lock screen.
5. Drag a song, lock the phone, let two songs finish, open Queue. Pass: the dragged order still holds, right song playing.
6. Shuffle on, drag a row, tap Not mine, then Undo within 5 seconds. Pass: song back at its second, the drag still there.
7. Drag a long way down in Queue, past the bottom edge. Pass: the list scrolls by itself, the sheet doesn't move or fight you.
8. Nothing to force: note if the bar ever shows the stuck message.
## Changed
- `app/Player.tsx`, `app/playerStore.ts`, `app/playOrder.ts`, `app/playOrder.test.mjs`.
- `docs/board/batch-3b.md` (new), `docs/REPORT.md`, `docs/STATUS.md`, `docs/DECISIONS.md`.
## Differed from NEXT.md
- No drag package added: React Native's built-in touch handling does it, so no new moving part in the build. If check 7 feels bad, that's the first thing to swap.
- Board splits: "Hide buttons" / "Show buttons" on the left, since "Hide" by Not mine reads as hiding the song. Back and Queue stay in the middle. Hold is 300 ms.
- Board extras: Not mine ignores a second tap for half a second; links went up to 44 tall; Undo keeps a drag made during its 5 seconds; drag is off in Sort, whose order is thrown away.
- The bar shows the same line as the full player, so "Skipped..." and "Played every song" appear there too.
- No vibration on lift: it needs a new package. The row lifting is the cue.
## Not done
Nothing in NEXT left out.
## Decisions needed
- Shuffle off after a drag goes back to list order and forgets the drag. Recommend keeping it. Default: stays.
## Proposed next step
Batch 4, Real sorting, once these checks pass.
## Pitch
Swipe the player sheet down to close: code comments say it works, but React Native has it off by default. One setting, and it matches what the board agreed.
