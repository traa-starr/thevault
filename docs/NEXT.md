# NEXT: Batch 3, the real player
Written by chat, 2026-11-01.
Log: Board notes for batches 3/4/4b reviewed. Chat-defaults: leaving Sort restores the library song at its spot, paused; app reopens stopped; Pause only (no Stop); tapping a Library song during Sort replaces the saved library spot; a sort song loops at its end; lock-screen next in Sort moves to the next card with no verdict; remaining-time choice remembered between launches (logged by chat)
Queue after this: Batch 4 "Real sorting" (board notes `board/batch-4-versions.md`; needs Not sure answer, default (a)). Then 4b, which needs my storage pick first.
Read: `docs/board/batch-3.md` (all of it: Agreed, Must handle, phone checks), `BATCH-PLAN.md` (batch 3), `BLUEPRINT.md` (App), `app/App.tsx`, `app/Library.tsx`, `app/playOrder.ts`.
Session: Opus. No server, journal or database change. Player state is phone memory only.
## Parts
0. Say in REPORT whether the four board seats loaded by name this session (yes/no). Nothing to fix if not.
a. **Shared player + bar** (ROADMAP 1.15). One player above every screen behind a small set of commands; Back never stops music; now-playing bar on Home, Library, Hidden, Sort (board Agreed 1-3, 7, 12, 13). Queue holds song ids, not positions; a list refresh never restarts it (Agreed 8). Sort borrows the player per Agreed 4 and the Log above. Undo returns to the song and second saved at the tap (Agreed 5-6). Build on the single player first so this survives step b failing.
b. **Playlist player** with a moving window from `playOrder.ts`. Test Undo-to-spot and seek on it first. Fails twice: stop, report, keep the single player.
c. **Lock screen and locked play** (ROADMAP 1.16): title, seek, previous, next, play/pause; songs advance while locked; bad songs skipped, several in a row stop with a message (Must handle).
d. **Queue view + remaining-time tap** (Agreed 9).
**Stop line:** d waits if the session runs long.
## Phone check
1. Play a song, Back to Home, reopen Library. Pass: music never stops, bar shows the same song, its Pause works.
2. Lock the phone near a song's end. Pass: next song starts by itself, title shows, lock-screen next and previous work.
3. At about 1:30 tap Not mine, then Undo within 5 seconds. Pass: same song at about 1:30. Repeat with the laptop off. Pass: a plain message, song stays Not mine.
4. Enter Sort from a playing library song, sort one card, leave. Pass: the library song is back at its spot, paused.
5. (If d was done) Open the queue from the full player, tap a song in Up next; tap the time. Pass: it jumps; time flips `3:41` / `-2:10`.
