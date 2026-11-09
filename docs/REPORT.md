**Step:** Play first, info after: every Next as fast as Sort cards, 2026-11-09.

**Verified by running:** `/verify` 14/14 PASS in 44 s. nextTiming model (pretend iPhone + pretend app thread): old Sort Next 60 ms (phone 91), old session Next 720 ms (phone 797), new session Next 60 ms; every path (session, sort, library, previous, lockscreen, library tap, search, restore) times at real sound, never a muted start, volume back; a 1 s info redraw never delays sound with no spot to find; old order puts the whole load behind the redraw (1,660 vs 1,060 ms); fake report carries all 7 path names + stages. Server: lengths, `/status`, Hidden count, timings PASS/FAIL tests pass. `copies` on the real library: "Song lengths known: 1,392 of 1,393" (the one left is a 0-byte MP3); live `/songs`: 671 of 671 listed songs carry a length. Shots 40/40; `info-before/after` pairs from Library, Sort card, session: same button boxes. Repo check clean.

**Phone timings** (`timings E:\VaultLibrary`; all from the old code, so nothing new judged yet):
```
Tap to first sound, app code unnamed (395 of 395 samples; older code not judged)
  session: typical 797 ms, slow end 1217 ms, worst 1272 ms (33 times); over 1 s: 5. FAIL
  sort: typical 91 ms, slow end 102 ms, worst 292 ms (268 times); over 1 s: 0. PASS
  library: typical 1 ms, worst 881 ms (94 times). PASS (old code: not a real measurement)
  previous, lockscreen, search, restore: none yet
```

**Phone update:** published 20261109-050138, server restarted (new routes, lengths).

**Needs the phone:**
1. Tag songs: Next 5 times fast, 3 slowly, then pause, lock, lock-screen Next twice. Pass: music starts about as fast as a Sort card, at 0:15, the length shows at once, volume always comes back.
2. Previous 3 times in a session, then tap a Library song, then a search result. Pass: each starts about as fast as a Sort card; the search result plays from its tag's moment.
3. Open the player from Library, a Sort card and a session (one song under 15 s if you know one). Pass: length at once (no "–:––"), nothing jumps as info fills in; the short song plays from 0:00 with no silence. Library's Hidden link shows a count.
4. Use it a while, swipe the app to the background. Code puts the `timings` block in the next REPORT. Pass: every path PASS.

**Changed:** `.claude/scripts/verify.py`, `.claude/skills/wrap/SKILL.md`, `CLAUDE.md`; `app/{App,Library,Player}.tsx`, `app/{engine,playOrder,playerStore,playlistCore,sessionStore,timings,updates,versionStore}.ts`, `app/nextTiming.test.mjs`; `server/{test_doctor,test_server,vault_cli}.py`, `server/vault_server/{autocopy,doctor,scanner,server,store,timings}.py`, new `server/vault_server/lengths.py`; `tools/shots/{fixtures,shoot}.mjs`, `tools/shots/fakes/playerStore.ts`; `docs/{BATCH-PLAN,COMMANDS,DECISIONS,REPORT,STATUS}.md`, new `docs/board/playback-feel.md`.

**Done when:** model reproduces ~800 then under 300: pass (720 to 60; the redraw cost is fitted to the phone's 797, not measured, see below). Sound never behind info, every path: pass. Each path sends timings by name: pass. Lengths for all songs: pass (1,392 of 1,393; one empty file). Before/after shots no shift: pass. `timings` PASS/FAIL per path: pass. REPORT carries the block: pass. Hidden count: pass. `/verify` all PASS under 1 min: pass (44 s). I prove 1-4: not run (for chat).

**Plan I chose:** board [x], A [x], B [x], C [x], D [x], E [x], reviews + `/verify` [x]. Stretch: none.
Cause: a session opens over Library (Sort replaces it), and Library redrew all its drawn rows on every player report, in front of the seek finishing. Now it redraws only on a song change, at low priority, and every load asks for sound before the screen updates. Not proven on the phone: each sample now carries load / seek / start / app ms and the source (phone mp3 / m4a, stream), so the next `timings` shows whether the redraw or local MP3 seeks were the cost. Board splits (picked, change at review): phone copy stays first (no streaming instead); the phone's length replaces the laptop's only if off by over 2 s; Previous not kept ready.

**Fresh-eyes review caught (fixed):** a song's natural end counted as a lock-screen tap; "restore" label stuck after Next; a tap paused before sound logged a fake slow sample; starts over 3 s dropped from timings; Play dead after a drag on a song that never loaded. **Not taken:** a length going stale after a re-bounce (display only; the phone's own replaces it when off by over 2 s, checked in `shownLength`). My review caught: a load could pick up the old song list when you tapped the song already playing from a new list (fixed).

**Not done:** Stretch (A-Z strip, split the 638 set): budget.

**Decisions needed:** none new. MP3 copies: measure first (yours, logged).

**Proposed next step:** read the per-source timings; if local MP3s are the slow part, re-wrap or re-encode them (your call, 5-song test first).

**Pitch:** a hidden "timings" line on the phone's home screen (long press), so you see PASS/FAIL right after a session without the laptop.
