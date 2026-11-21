**Step:** Opus: car autoplay fix, Previous restarts, fresh-eyes, world map goal 4, mockups from the server. 2026-11-20 (goals 1-4 earlier sessions, goal 5 + wrap this one).

**Verified by running:** `/verify` 35/35 PASS (63 s). Server test: 17 new mockup checks failed first, pass now. Live server restarted (level 7): `/mockups` 301 → `/mockups/` 200, `/mockups/world/` 200, `app.js` 200, `check.mjs` 404; same 200s through the Tailscale address by number and by name. Publish: "Published update 20261121-002649". check_repo clean.

**Phone timings:**
```
Hang watch (screen stuck over 2 s), app code 2026-11-19T05:32:39: watched 8 min on screen. PASS (quiet)
  library: typical 256 ms, slow end 273 ms, worst 273 ms (6 times); over 1 s: 0. PASS
  previous: typical 233 ms, slow end 242 ms, worst 242 ms (3 times); over 1 s: 0. not enough yet (3 of 5)
  lockscreen: typical 355 ms, slow end 374 ms, worst 374 ms (3 times); over 1 s: 0. not enough yet (3 of 5)
  session, sort, search, restore: none yet. Energy: open not enough yet (2 of 5 min), locked none yet.
```
(Verbatim lines from this run; detail lines dropped for the 40-line cap. Old app code: today's publish is newer.)

**Phone update:** published 2026-11-21 00:26; server restarted.

**Needs the phone:**
1. Car: swipe the Vault closed, play a YouTube video, pause it, connect to the car / Bluetooth. Pass: the Vault stays silent, YouTube is the one waiting. Then play a Vault song, pause, reconnect: it resumes.
2. Player: Previous 10 s into a song restarts it; Previous twice fast goes back a song. Repeat one on, Next: next song plays, Repeat one still lit. Same Previous from the lock screen.
3. Hold a song → song sheet → Versions: opens as a page inside the sheet, Back arrow returns. Settings shows a Laptop Status row.
4. Safari: `http://<the Vault address>:8787/mockups/` opens the three directions; `/mockups/world/` the world map. No command typed.

**Changed:** app: Home, Library, Notices, SearchScreen, Settings, SongRow, SongSheet, Versions, SheetFrame (new), engine, family, laptopCore, playOrder, playerStore, playlistCore, versionStore, yourLines + tests (laptop, playOrder, playlistCore, songActions, wave4, yourLines). server: server.py, test_server.py. docs: COMMANDS, DECISIONS, REPORT, STATUS, overhaul/LABELS. tools/shots/fixtures.mjs.

**Done when:** Goal 1 cause in REPORT + cold-start test: pass. playOrder restart / back / Repeat-one-Next: pass. `/verify` all PASS: pass. Fresh-eyes catches with fixed / left: pass (below). Goal 4 shots taken and checked (8, subagent): pass. Mockup address 200 by curl: pass. Publish: pass. I prove 1-4: not run (for chat).

**Plan I chose:** 1-5 all [x]. Goal 1 cause: expo-audio took the lock screen on every launch (even iOS's background wake for a car), and its native play handler played before app code could stop it. Fix: lock screen only after my own first play since launch; any earlier sound stopped and logged. Goal 2: `previousDoes` in playOrder.ts; lock-screen Previous is caught after expo-audio's native move, so a split second of the song before may sound. Goal 3 fresh-eyes, 9 catches: fixed 1 (Home line swapping while looking), 2 (line card ignored playable/Archived), 5 (rows that can't play lost their hold), 6 (search rows show my line); left 3 (owner's call, below), 4 (iOS list scroll cancels the pull), 7 (WORLD-MAP rule 2; icon shows Paused), 8 (owner's time-left choice kept), 9 (bar fixed height, nothing moves). Goal 4: Versions + "Add as a version of…" are pages in the sheet (SheetFrame.tsx); Settings Laptop Status row, dot on Home `...`. Goal 5: `/mockups/` route in server.py, page files only, never outside spike/mockups.

**Not done:** native patch to expo-audio (on an interruption, let go of the lock screen, never resume by itself; clean lock-screen Previous). Needs a full rebuild: owner's call. Without it: Vault paused in the switcher, YouTube plays and stops, iOS may hand the car's "play" back to the Vault. A version's hold menu wasn't shot (shot tool has no hold step).

**Decisions needed:**
- Shuffle "Unsorted": every song not Mine (Library and player today) or only songs not yet sorted (Home's hold)? Recommend: not yet sorted everywhere (matches the word). Default: as today.
- expo-audio patch + full rebuild for the two native gaps? Recommend yes, after the phone walk shows whether the gaps bite. No default (rebuild, SideStore).

**Proposed next step:** my phone walk of 1-4 + the 4 render checks + the heat listen, then 3.7.

**Pitch:** one small expo-audio patch file (patch-package) carrying both native fixes, so the next full rebuild closes goal 1's and goal 2's gaps in one go.

**Odd in how we work:** goals 1-4 each needed their own session start; REPORT grew per goal to 57 lines and had to be cut back at wrap. A per-goal cap of ~8 lines would save the trim.
