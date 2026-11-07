# NEXT: Batch 6.3, Compare audio fix, Hidden order, out-of-date warning
Written by chat, 2026-11-06.
Log: 6.2 checks 1, 2, 4, 5, 6, 7 passed, closes 1.18 (mine). Check 6 first failed because the laptop server ran pre-6.2 code: no backup saved, app silent (mine). Check 3 failed: Compare audio bugs below (mine). Hidden list newest-hidden first (mine). Out-of-date server and failed-backup warnings (chat-default) (logged by chat)
Queue after this: Phase 1 "Done when" with me (away from home, screen locked, laptop asleep). Then `/verify`, then the Phase 2 plan session.
Read: this file, `board/batch-6-2-restore.md` (dial part), last 3 rows of `DECISIONS.md`. Code of `Compare.tsx`, `compareStore.ts`, `compareEngine.ts`, `playerStore.ts`, `Player.tsx`, `Hidden.tsx`, `phoneBackup.ts`, `Notices.tsx`, `server/vault_server/server.py` as needed.
Session: Opus, medium effort. No board (no new screens).
## Parts
a. **Compare and the player share one sound.** What I hit on the phone: (1) tapping Compare reloads the song already playing and seeks back to the same second, a gap or a pause (on a new group it pauses outright); it should keep playing untouched, and only a flip to another version loads anything. (2) After Done, sometimes silence: needs pause/unpause, or nothing plays from any screen until a force-close (seen after lock then unlock, also without locking). (3) Sometimes two versions seem to play at once; swiping away and back fixes it. (4) While paused, a "skip" error and a new song started on its own. Find the shared cause (likely two players or a stale one left alive). Outcome: one sound at all times, Done hands the heard version to the player with no gap, paused stays paused. Add tested rules where the logic allows. Rule 6 applies: two failed fixes, stop and write it up.
b. **Hidden list newest-hidden first**, so an undo is at the top. Use when the song was marked (the journal has it).
c. **Say it when the laptop is behind.** The laptop server reports its version; if the app needs something it lacks, one plain line: "Laptop server is out of date: restart it" with the restart command name from COMMANDS. If a phone backup fails to save, say so once (on Library), not silently. Add a doctor line that shows the server's version if it's easy.
**Stop line:** if the session runs long, c waits. a goes in first.
## Phone check (new build first, then restart the laptop server)
1. Play a grouped song, tap Compare. Pass: the music never stops or jumps; the dial opens. Flip, flip back, tap Done. Pass: it keeps playing, no tap needed. Do it 5 times, once with a lock and unlock before Done.
2. In Compare, swipe the dial fast back and forth 10 times, then listen. Pass: only one version ever plays. Pause, wait 2 minutes. Pass: nothing starts by itself.
3. Mark a song Not mine, open Hidden. Pass: it's at the top.
4. Stop the laptop server and open Library. Pass: a plain line says the laptop can't be reached or is out of date, not silence. Start the server: the line goes away.
