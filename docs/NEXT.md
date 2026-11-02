# NEXT: Batch 3b, player polish
Written by chat, 2026-11-01.
Log: Batch 3 passed, all 5 checks (mine). Scope = owner's three ideas plus Code's pitch "stuck-song message on the bar" (chat-default). Drag package allowed if needed (chat-default). Board seats: run as general helpers if they don't load by name (logged by chat)
Queue after this: Batch 4 "Real sorting" (board notes `board/batch-4-versions.md`; Not sure = phone only, returns only from the Not sure pile). Then 4b Versions (storage = `song_family` table, decided).
Read: `docs/board/batch-3.md` (Agreed only), `app/Player.tsx`, `app/playerStore.ts`.
Session: Opus. No server, journal or database change. Phone memory only.
## Parts
0. **Short board meeting** (flow + screen seats are enough; tester drafts checks). Brief: Mine / Not mine at the bottom of the full player, comfortable margin, Not mine under the right thumb; a small, quiet hide for both (remembered between launches); Queue drag. Notes to `docs/board/batch-3b.md`, under 30 lines. Chat-defaults if they split: hide = a small icon or text toggle near the buttons, not in a settings screen; hidden means the buttons are gone, Undo toasts still work.
a. **Buttons to the bottom + hide toggle.** Layout per the board. The hide choice survives closing the app.
b. **Queue drag to reorder.** Press and hold, moves up and down only, snaps into place, release sets the order. Up next only; the playing song can't be dragged. The new order is what next and the lock screen follow. Shuffle off/on afterwards behaves as before.
c. **Stuck-song message on the bar too** (Code's pitch). Same words as the full player.
**Stop line:** c waits if the session runs long.
## Phone check
1. Open the full player. Pass: Mine and Not mine sit at the bottom, Not mine under your right thumb, nothing cramped.
2. Hide them, close the app fully, reopen and play. Pass: still hidden; unhide brings them back.
3. Queue: hold a song in Up next, drag it two places up, release. Pass: it snaps; Next plays that order, also from the lock screen.
4. (If c was done) Nothing to force; just note if the bar ever shows the stuck message.
