**Step:** Session polish, laptop upkeep, search groundwork, 2026-11-08.

**Verified by running:** `/verify` 12/12 PASS on the final code (new: playlistCore test). playlistCore 15 start-spot checks (fake player logs every moment sound comes out). playOrder ALL PASSED (start points, session restore). test_import: auto copies, burst = one run, stop mid-copy, overlapping runs. test_doctor, test_server (hang-up quiet) ALL PASSED. Shots 23/23. Spike: ladder 10/10; bench numbers in `SEARCH-OPTIONS.md`. Real library `copies`: "phone copies made now: 308", "Mine songs still without a phone copy: 0".

**Phone update:** published 20261108-182104 (18:21), server restarted. Close and reopen the app.

**Needs the phone:**
1. Library, Tag songs. Pass: Previous / Play / Next sit centred. Tap the big Next 5 times fast, then 3 times slowly. Pass: each song's first sound is about 0:15, never a beat from the start.
2. Sort, Cards: mark 3 new songs Mine. Wait about a minute (the laptop copies them). Library: find them and play them. Pass: they play, no laptop command. Back in Cards, swipe 5 cards. Pass: each starts about 0:30, no blip. Swipe one, Undo. Pass: it carries on where it was.
3. In a session, tap Not mine on one card, swipe the app away, reopen. Pass: the session look, same "N of M tagged", same song and second, same order. Lock the phone, Next twice on the lock screen, unlock. Pass: session look, counter right, and each lock-screen song starts about 0:15 (at most a tiny tick).
4. Read `docs/SEARCH-OPTIONS.md` with chat and pick A, B or C.

**Changed:** `.claude/scripts/verify.py`, `.claude/skills/next/SKILL.md`, `.claude/skills/wrap/SKILL.md`, `app/App.tsx`, `app/Cards.tsx`, `app/Player.tsx`, `app/engine.ts`, `app/playOrder.ts`, `app/playOrder.test.mjs`, `app/playerStore.ts`, `app/sessionStore.ts`, new `app/playlistCore.ts` + `.test.mjs`; `server/vault_cli.py`, `server/vault_server/{doctor,importer,server}.py`, new `server/vault_server/autocopy.py`, `server/test_{doctor,import,server}.py`; `tools/shots/fixtures.mjs`; new `spike/search/`; `docs/{COMMANDS,DECISIONS,MAP,REPORT,STATUS}.md`, new `docs/SEARCH-OPTIONS.md`; deleted `docs/pending-skills/wrap-SKILL.md`.

**Done when:**
- Server test: a Mine mark makes its phone copy with no command; a stop mid-copy leaves no broken file: pass.
- Start-time tests (session 15 s, Sort 30 s, short song 0, undone card resumes): pass. Sound before the spot: none in the fake player.
- Session-restore test (same lap, counter, place): pass. Session screenshots centred (also after a simulated restore): pass.
- `/next`'s refresh count on the real library: pass (308 made). Doctor warning line: pass (test; real library has 0 missing, so PASS there).
- Spike tests pass and `SEARCH-OPTIONS.md` has measured numbers for A, B, C: pass. `/verify` all PASS: pass (12/12).
- I prove 1-4: not run (for chat).

**Plan I chose:** Part 0 [x], A [x], B [x], C [x], D [x], E [x], review + wrap [x]. Guessed: the engine's playlist logic moved to `playlistCore.ts` so a fake player can test it. With a start point, Next reloads the song (no gapless move): a cost nobody hears in a session. A restored session reopens the player sheet. Session buttons sit 29 pt right of the normal player's row (which also has Shuffle); "no shift" read as no jump inside the session.
**Board test:** A = a fix restoring an agreed call (no). B = a flagged fix whose exact shape you gave (centred), so no seats run; E's call is yours at review. Not met.

**Fresh-eyes review caught (fixed, tests added):** a restored session with a Not mine song never loaded its sound (load guard now a ticket); lock-screen Next while paused started playing; Compare's volume could be undone by the mute; a song that never loads could leave the volume at 0; a seek sent the instant the song changed could be lost (retried once); `copies`/`import` overlapping the server's run (one copy run at a time now, `copies.lock`); a retry could push a Mine run back 5 min. **Not taken:** a lock-screen Pause pressed in the under-a-second wait for the seek still plays when the seek lands (rare; needs native pause events); hiding `TimeoutError` (review found it safe). I had missed all 7.

**Not done:** Stretch (none taken: the review fixes used the room). Lock-screen moves still start from 0:00 for the few ms before the app mutes them: the true fix is native (a start time per queued song) and needs a full rebuild. Say if you hear a tick.

**Decisions needed:** search on the phone (A, Code's pick), the laptop (B) or SQLite full-text (C): `SEARCH-OPTIONS.md`. Hard to undo, no default.

**Proposed next step:** Phase 2 closes after your sessions + wipe check; Phase 3 starts with a real-phone timing of the chosen option.

**Pitch:** store each song's length at scan time: short-song starts and the seek bar would know the length before the song loads.
