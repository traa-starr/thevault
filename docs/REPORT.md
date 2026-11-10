# REPORT
**Step:** Overhaul wave 1: the new frame, Home and player, 2026-11-10. Built by Fable 5 in one session.

**Verified by running:** `/verify` 21/21 PASS in 45 s (new: `frame` 32 checks, `playData` 34, `labels` 4; `test_server` plays 28). Screenshots: 92 of 92 drawn, plus 4 side-by-side with the mockups (`side-*.png`). `expo export` builds (1,241 modules); publish went out. `status` on the real library: "Plays: 0 of 0 songs".

**Phone timings:**
```
Search: typical 7 ms, slow end 13 ms, worst 15 ms (179 times), about 23 tags
Energy while playing, app code build 23, per minute. Plays: 34 from the phone's copy, 0 streamed
  open (1 min): wake-ups 204, redraws 263.3, network calls 1.5, file writes 27.4. not enough yet (1 of 5 min)
  locked: none yet
Hang watch (screen stuck over 2 s), app code build 23: watched 6 min on screen. PASS (quiet)
Tap to first sound, app code build 23 (18 of 564 samples; older code not judged)
  library: typical 237 ms, slow end 368 ms, worst 368 ms (14 times); over 1 s: 0. PASS
  previous: typical 271 ms ... not enough yet (4 of 5)
  session, sort, lockscreen, search, restore: none yet
```
These are the old code's numbers: the new code has none until I use it. Locked wake-ups (~30 expected) still not measured.
**Phone update:** `published 2026-11-10 07:52 UTC` (close and reopen the app), server started (it was stopped) on the new code; the session then went idle mid-wrap and a second session finished STATUS and found the server stopped again, restarted it (RUNNING). Then `full rebuild` for check 4 only (`app/package.json` gained two packages; steps in `overhaul/REBUILD.md`).

**Needs the phone:** the 4 "I prove" lines of NEXT. Extra for chat to walk: (a) play a song past 0:30, skip one at 0:10, go to Library and back: only the first is in Recently played; `python server\vault_cli.py plays E:\VaultLibrary` shows it. (b) Tag a line with the keyboard up: the field stays visible. (c) Tap Lines: the list takes the art's place, nothing below moves.

**Changed:** new `app/` Home, Frame, Icon, Art, theme, tileColor, native, nativePieces, playLog, playStore + 3 tests; rewritten App, Player, nav; touched Library, Tagging, Notices, outbox, phoneBackup, playerStore, playOrder, sheetCore, sortData, ratingStore, Versions, Sort/Cards/Hidden (background only); `server/` store, songs, server, cli, test; `tools/shots` (fixtures, `side.mjs`); build workflow (prints Xcode version); docs: board x2, DESIGN-SYSTEM, LABELS, REBUILD, COMMANDS, MAP, ROADMAP, DECISIONS.

**Done when:** A pass (wipe + restore test; `status` and new `plays` command). B pass (200 rounds through tabs, 3,687 taps; swipe-down = down button from 6 openers; mid-close shots). C, D pass (shots of Home x8, player dark / light / no art / long titles, mini on each tab, side by side). E pass for SF Symbols and glass (tests both ways, publish builds, REBUILD updated, standard runner); **native tab bar not taken** (below). `/verify` pass; `check_repo` clean. I prove 1-4: not run (for chat).

**Plan I chose:** all 6 lines ticked. Board `board/wave1-frame.md`; defaults in use for its 3 owner questions (amber; day-one row; Mine / Not mine as two quiet words).

**Fresh-eyes review** (`board/wave1-review.md`, written before any fix): 15 catches. Fixed 9: replay after a list ends never counted (1), Compare time credited as one play (2), laptop's 6-decimal times maybe unreadable on the phone (3), "1 play waiting" line pushing Home down (4), blank Library with no address (5), rows moving under the thumb at 0:30 (6), versions doubling in Recently played (7), Home taps dead during Compare (8), tile colour stuck (11), laptop line not refreshed (14). Not taken, reason checked in the code: 9 (a count can read +1 for the length of one song-list fetch; the next list corrects it; ratings share the pattern), 10 (the typing field's place doesn't depend on screen height: the art is the only stretchy row and it lifts away whole), 12 (under a second), 13 (by design), 15 (playStore can't load on the laptop; its maths is tested, its wiring isn't).

**Not done:** native tab bar: it needs the app moved onto a navigation package and can't run on today's build; the drawn bar is the same on both and can't reload the player. Stretch: none started. My own find mid-build: the first tint let grey text drop to 3.1:1 on bright songs; the test caught it, now 4.6:1 worst case.

**Decisions needed:** (1) accent amber or coral: default amber. (2) "Not played in a while" on day one is a different dozen never-played Mine songs each day: default keep. (3) Mine / Not mine as two small words beside the eye: default keep; say if you want the eye gone now sorting is done. (4) Session's Next is now "Next song" in the action row plus the pill's Next (was a big button): default keep.

**Proposed next step:** wave 2: Library and the search screen in Wall's style (art tiles on rows, filter chips, search as its own screen from the round button).

**Pitch:** a waveform strip for the seek bar made once on the laptop (DESIGN-NOTES Tech 1): tag dots on a real shape is the one thing no benchmark app has.

**Odd in how we work:** NEXT said "tab bar ... if it can host B" but REBUILD already said native tabs need a navigation rewrite; the two docs disagreed and I had to pick. Also `/next` tells me to hold fixes for the review file, which cost a 7 minute idle wait: the review could run while docs are written.
