**Step:** Steady screen, straight-back Queue, and the overhaul teardown + mockups, 2026-11-10. Built by Fable 5 over two sessions (the first hit its usage cap after the fresh-eyes review; the second finished the review's fixes, E's pages and F).

**Verified by running:** `/verify` 18/18 PASS in 50 s. Steady-screen test 24 checks (200-round spam, the old pop-up sheet shown getting stuck under the same taps, a fake 3.4 s stall reported, swipe-down per opener x7). Shots 71/71, 7 mid-close. Mockups: `node spike/mockups/check.mjs`: 3 directions, 0 script errors, 0 controls under 44 pt, 150 taps each. `check_repo` clean. Published twice (A+B first, then F's app code); typecheck clean.

**Phone timings** (C; energy is from the 28 min locked listen on the build before this step):
```
Search: typical 8 ms, slow end 13 ms, worst 15 ms (172 times), about 23 tags
Energy while playing, app code 2026-11-09T19:56:17, per minute. Plays: 12 from the phone's copy, 0 streamed
  open: none yet
  locked (28 min): wake-ups 123, redraws 0.4, network calls 0.2, file writes 1.3. PASS
Hang watch: nothing yet (the phone sends it when the app goes to the background, after a minute on screen)
Tap to first sound: library, previous, lockscreen PASS (215 / 225 / 56 ms typical, none over 1 s); session, restore not enough yet (2 of 5); sort, search none yet
```
C verdict: every locked ceiling PASS. Wake-ups (123) are the one number still high; the lever is F's slower locked reports (30 a minute), which needs the rebuild. "Open" has no line yet: needs a minute of playing with the screen on.

**Phone update:** published 2026-11-10 06:02 (A, B, hang watch, and F's app code, which waits quietly for the build). Then `full rebuild` for F's native pieces, mine, any time: steps in `docs/overhaul/REBUILD.md`.

**Needs the phone:**
1. Library, a song playing: open the mini player, pause/play 10 times fast, close, reopen, Next 5 times; 3 rounds. Pass: never freezes. Then app to the background and `timings` on the laptop: "Hang watch" shows minutes watched, 0 stalls.
2. Full player, swipe up to Queue, swipe down. Pass: the player, no Library flash. Mini player on Library, then on Sort: swipe up, swipe down. Pass: same screen.
3. After the rebuild: app connects without typing; a Shortcut "Open URLs" `thevault://search` lands on the search box; controls tick. Pass: all three. Locked listen 10 min: wake-ups about 30.
4. COMMANDS "Mockups on the phone", tap through Wall, Line, Deal. Pass: every screen opens and moves; say which and why.

**Changed:** app: `App.tsx Library.tsx Player.tsx Tap.tsx Versions.tsx nav.tsx playerStore.ts playlistCore.ts engine.ts energy.ts search.ts timings.ts app.json package.json package-lock.json`, new `sheetCore.ts hang.ts hangWatch.ts keychain.ts steadyScreen.test.mjs patches/expo-audio+58.0.11.patch`, tests `playlistCore.test.mjs search.test.mjs`. server: `timings.py test_server.py`. tools/shots (6 files). spike/mockups: `index/wall/line/deal.html app.css app.js check.mjs`. docs: `overhaul/TEARDOWN.md overhaul/REBUILD.md board/overhaul-mockups.md STATUS LESSONS DECISIONS ROADMAP COMMANDS REPORT`.

**Done when:** 200-round spam test + cause named: pass. Hang lines in `timings`, fake stall reported: pass. Test per opener + mid-close shots: pass. Energy judged: pass (above). TEARDOWN covers every screen with a screenshot name: pass (written in session 1; not re-read in session 2). 2-3 mockups open from the laptop, fake names, no app code: pass on the laptop, phone not run. F's pieces with tests, build config on a standard runner, REBUILD.md: pass; "below 120 after install": not run (mine). Rebuild steps: pass (REBUILD.md; COMMANDS had no rebuild line, added). `/verify` under 1 min: pass. I prove 1-4: not run (for chat).

**Cause of the freeze:** the player was an iOS pop-up sheet. iOS can't turn one round half-way: opened while still closing (or closed while opening), the request was dropped and an empty see-through sheet stayed over the whole app, taking every touch while the music played. Now it's a layer in the app that always heads where the player says.

**Plan I chose:** A [x] B [x] C [x] D [x] E [x] F [x] reviews + verify + publish + wrap [x]. Guessed: locked reports every 2 s, not 5 (the start-spot finder and the stuck-song watch lean on reports); runtime version kept at 1 with every native piece checked before use, so publish works across the rebuild; `?q=` on the search link.
**Fresh-eyes catches (session 1, fixed; listed from the code, the review text was lost with the session):** a freeze with no tap before it went unreported (on-screen flag added); an old slide's late end could be taken for the new one's; one tap could be named twice; a mark could be saved late for a tap that started nothing. Session 2 found the hang test not updated for the flag fix (1 FAIL, fixed + a new test), a squashed player tile and 8 small controls in the mockups (fixed), the shots kit breaking on the Keychain module (stand-in added).

**Not done:** stretch 1 and 2. The Swift patch isn't compiled (Windows can't): first proof is the GitHub build; fallback in REBUILD.md.
**Decisions needed:** which mockup direction (no default: it's check 4). Rebuild now or with the overhaul's? Recommend now: 15 min of mine, and it proves the build pipeline before O.5 leans on it.
**Proposed next step:** review, then 2.7 sessions; after my pick, O.4 wave 1 (shell: tabs + mini player) from the chosen mockup.
**Pitch:** `timings` verdict on the phone (stretch 1): every check above that ends "run timings on the laptop" becomes a long-press.
**Odd in how we work:** a session that dies mid-review leaves no trace of the review's findings; the reviewer should write its catches to a file before fixes start.
