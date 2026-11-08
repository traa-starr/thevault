**Step:** Phase 2 code-complete (fixes, change tags, tagging session, restore, Code's eyes), 2026-11-08.

**Verified by running:** `/verify` 11/11 PASS on the final code (incl. playOrder, typecheck, music guard test, check_repo). playOrder tests all pass (9 new). Server test: 2 new tags-command checks pass. `npm --prefix tools/shots run shots`: 21 of 21 screens drawn without errors. `vault_cli.py tags E:\VaultLibrary` on the real library: "6 tags on 2 songs".

**Phone update:** publish. Run `python server\vault_cli.py publish E:\VaultLibrary`, then close and reopen the app. Also `server restart` (new `tags` command only; the running server's routes didn't change).

**Needs the phone:**
1. (Done when 7) In the player, tap Tag twice fast. Pass: the field opens then closes, as quick as Cancel. Tap once more: it opens. Cancel it. Drag the knob to just past a tick and let go. Pass: it stays where you let go.
2. (8) Tags · N open, hold a row about half a second. Pass: the row turns into Change words · Move to · Cancel · Delete in place. Change words, type, Return. Pass: the row shows the new words, and they show when play passes that tick. Hold another row, Delete, then Undo. Pass: it's back in the same place. Hold a row, Move to now. Pass: its tick moves; no row moves.
3. (9) Library, tap Tag songs. Pass: "N of M tagged" top right, the song starts about 30% in. Tag a song with no tags: N goes up by one. Play ten cards with the big Next: no song twice. On one, Not mine, then Undo. Pass: M goes down and back, the music never stops. Close. Pass: back in Library, the same song playing.
4. (10) Library, tap Shuffle three times. Pass: "Shuffle: Mine", "Shuffle: Unsorted", "Shuffle", no box. Airplane mode: change one tag's words twice, delete another, Undo the delete. Airplane off, then on the laptop run the tags command for that song. Pass: the second words, and both tags.

**Changed:** `app/Library.tsx`, `app/Player.tsx`, `app/Sort.tsx`, `app/Tagging.tsx`, `app/playOrder.ts`, `app/playOrder.test.mjs`, `app/playerStore.ts`, `app/tagStore.ts`, new `app/sessionStore.ts`; `server/vault_cli.py`, `server/vault_server/tags.py`, `server/test_server.py`; new `tools/shots/` (screenshot tool); `docs/COMMANDS.md`, `docs/MAP.md`, `docs/ROADMAP.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/REPORT.md`, new `docs/board/phase-2-complete.md`.

**Done when:**
1. Screenshot command, every screen: pass. Fixed after looking: the field placeholder was cut off ("A line to remember" now); the session's Not mine / Next sat one button too high; Library's song count wrapped onto two lines.
2. Tag taps (open, cancel, reopen; 180 ms double tap counts) and seek (a drag lands where released, a quick or careful tap on a tick jumps): pass.
3. Change words, Move to now, Delete through the outbox as whole-tag lines, Undo exact sent or not, deleted stays gone: pass.
4. Session pool, 3x weighting, no repeats in a lap, counter, a draft saved to its own song on Next, Not mine and Undo: pass.
5. Restore test (an unsent add, two unsent edits, an unsent delete, a resend) and the tags command on a real song: pass.
6. `/verify` all PASS incl. the music guard: pass (11/11).
7-10. not run (for chat).

**Plan I chose:** all 8 STATUS plan lines ticked. Board settled 5 splits (`board/phase-2-complete.md`). The screenshot tool is esbuild + react-native-web + headless Edge, with fake stores, in its own folder with its own packages. Expo web would have pulled packages into `app/`.

**Fresh-eyes review caught (fixed):** Delete then Undo brought the row back at the bottom. Library Shuffle after a session would land on nothing. The 250 ms bounce could still drop a fast double tap (now 150 ms). A careful tick press over 300 ms seeked instead (now 600 ms). The session's big Next did nothing in Compare. Undo of Not mine read an old Mine mark. Change words erased the Undo of a tag just saved. **Not taken:** treating "laptop not checked yet" as offline (Library does the same today); a 30%-in load with no intro blip (Cards have the same); a centred row in the session (owner question 1); "Move here" wording; the lap end (the list wraps, checked by a test). I had missed all 7 fixes. Worth the tokens this time.

**Not done:** a lap redrawn when the pool runs out (it replays; parked). Session state lives in memory: after an app kill the player plays on without the session look.

**Decisions needed:**
1. Next in the session shows twice (controls row and the big one). Keep both (default) or only the big one?
2. Undo of Not mine after Next goes back to that song (default) or only puts it back in the pool?

**Proposed next step:** my real tagging sessions and the restore check, then Phase 2 closes.

**Pitch:** the session's look survives an app kill (save "in a session" with the lap), so a lock-screen session never quietly turns back into the plain player.
