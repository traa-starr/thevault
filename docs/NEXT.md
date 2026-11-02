# NEXT: Batch 3c, Queue drag that works
Written by chat, 2026-11-01.
Log: 3b checks 1-3 passed, 4-7 failed, 8 not seen (mine). Drag feel = loose sticky bubbles, rows slide aside, drop where released (mine). Use a drag-and-drop list package (chat-default). Sheet locked while dragging; swipe-to-close only from the top grab area (chat-default). Shuffle off after drag = list order (chat-default) (logged by chat)
Queue after this: Batch 4 "Real sorting" (board notes `board/batch-4-versions.md`). Then 4b Versions.
Read: `docs/board/batch-3b.md`, `docs/REPORT.md` (3b), `app/Player.tsx`, `app/playerStore.ts`.
Session: Opus. No server, journal or database change. No board meeting: same screen, a fix.
## Parts
a. **Swap the drag.** The hand-rolled drag snaps the song back on the real phone. Replace it with a well-known drag-and-drop list package that works in the iOS build. Feel: hold 300 ms, the song lifts and follows the finger, the other rows slide aside softly to make room, it lands wherever released. Keep the 3b move logic and self-tests.
b. **No fight with the sheet.** While a song is held, the player sheet can't move. Turn on swipe-down-to-close, but only from the top grab area, never from inside the Queue list.
c. **Auto-scroll** when dragging near the top or bottom edge of the list.
Find out why the old drag failed and put one line in REPORT. Must pass typecheck, play-order self-test and iOS export.
**Stop line:** c waits if the session runs long.
## Phone check
1. Queue: hold a song in Up next, drag it two places up, release. Pass: the others slide aside, it lands there, music doesn't restart; Next plays that order, also from the lock screen.
2. Drag a song down. Pass: the sheet stays put. Then swipe down from the top grab area. Pass: the player closes.
3. Drag a long way down, past the bottom edge. Pass: the list scrolls by itself.
4. Drag a song, lock the phone, let two songs finish, open Queue. Pass: order held, right song playing.
5. Shuffle on, drag a row, tap Not mine, then Undo within 5 seconds. Pass: song back at its second, the drag still there.
