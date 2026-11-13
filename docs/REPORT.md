**Step:** Fable kit: world map, one mockup, build kit; find the heat, 2026-11-12. One session, goals A-D done.

**Verified by running:** `/verify` 33/35 in 51 s (the 2 FAILs are the new kit tests, failing on purpose: `Cannot find module songActions.ts / yourLines.ts`). Against a throwaway reference in the scratchpad they pass every rule check (15/16, 8/9; only "screens use it" fails until built). `server/test_server.py` ALL PASSED (new: "a skim is shown apart, not judged"). `node spike/mockups/world/check.mjs`: `ok world: 0 script errors, 0 controls under 44 px, 0 missed taps`, 42 shots + 150 random taps. A Sonnet checker counted WORLD-MAP: 158, every screen matches INVENTORY; shot review found 4 issues, all fixed (hold-sheet shot, Undo toast over the action row, leftover toast on Settings, sheet bottom padding). `check_repo.py` clean. Server restarted, RUNNING.

**Phone timings:**
```
Energy while playing, app code 2026-11-12T20:57:51. Plays: 6 from the phone's copy, 36 streamed
  open, skimming (5 min, 7.8 song starts a minute): wake-ups 177, redraws 161.6, network calls 4.8, file writes 8.4. Not judged
  open: none yet
  locked (3 min): wake-ups 36, redraws 1.0, network calls 0.7, file writes 1.7. not enough yet (3 of 5 min)
Hang watch: watched 7 min on screen. PASS (quiet)
Tap to first sound: library typical 382 ms, worst 1064 ms (40). FAIL (1 over 1 s); session, previous, lockscreen, restore not enough yet; sort, search none yet
```

**Phone update:** none (no app code changed; `app/` has only two new test files). Server restarted.

**Needs the phone:**
1. Mockup: laptop runs `python -m http.server 8790 --directory E:\dev\thevault\spike\mockups\world`; phone Safari `http://<laptop address>:8790`, read "What moved where", Open the app, Share > Add to Home Screen, open it from there. Tap through Home, Library, Player, Sort, Settings. Pass: each daily screen feels calmer; Compare, Hidden songs (Home `...` > Settings) and tag editing (player Tag) each found within one gesture.
2. Heat: from a cool phone, play songs from Library without skipping, app open, screen on, 15 min. Pass: not warm behind the camera; note battery % before and after. Then timings shows an "open" line judged (skims are now shown apart).
3. The 8 deferred checks (render 4 + calm 4), as listed in STATUS.

**Changed:** `app/songActions.test.mjs`, `app/yourLines.test.mjs` (new, failing on purpose), `docs/board/world-map.md`, `docs/overhaul/WORLD-MAP.md`, `docs/overhaul/FABLE-KIT.md`, `spike/mockups/world/` (5 files), `server/vault_server/timings.py`, `server/test_server.py`, `docs/COMMANDS.md`, `docs/STATUS.md`, this file.

**Done when:** A pass (158 homes, counts per screen; Home 6/11, Library 6/17, Player 13/23, Sort 6/12). B pass on the laptop (every screen in, shots checked); opens on the phone: not run (for chat). C pass (five parts plus heat; tests fail for the right reason; `/verify` otherwise PASS). D pass: cause named with evidence (the failing sample was 39 starts in 5 min; steady 2026-11-11 open listen was 67 wake-ups/min, under ceilings); no app fix, so no publish. I prove 1, 2: not run (for chat).

**Plan I chose:** 1 [x] board + WORLD-MAP · 2 [x] mockup (Sonnet helper) · 3 [x] heat · 4 [x] FABLE-KIT + tests · 5 [x] verify, check_repo, wrap. Picks where seats differed: `board/world-map.md` table (Compare word kept, Library hold = song sheet, no row swipes, Sort kept as a screen).

**Not done:** no heat fix: nothing in app code runs away; screen/GPU cost can't be counted from the app. Suspects for a later Opus step are in FABLE-KIT §6. Mockup leaves out: the line hold menu, a real tagging session, notice lines, first-run address.

**Decisions needed (at Review, defaults are the mockup):** Library row hold opens the song sheet (default yes); Home rows 7 -> 5 (default yes); Mine / Not mine only on unsorted songs, eye gone (default yes).

**Odd in how we work:** `/verify` will show 2 FAILs until the Fable session, by design; chat should expect them at Review.

**Proposed next step:** Review (mockup + heat + 8 checks), then chat writes the Fable NEXT from FABLE-KIT §4.

**Pitch:** after Fable, a "tag while it plays" Home row: songs with no lines play one after another with Tag lit, so the line card fills itself.
