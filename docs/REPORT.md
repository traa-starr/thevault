# REPORT
**Step:** Overhaul wave 2: Library, search screen, fuller Home, server that stays up, 2026-11-10. Built by Fable 5 over two sessions (the first stopped on the limit during the fresh-eyes review; this one re-ran the review on Sonnet and finished step 6).

**Verified by running (this session):** `/verify` 24/24 PASS in 45 s, after the fixes. `check_repo` clean. Publish went out. Real kill proof for D: stopped the real server process, answering again in 4 s; log line `keeper: server stopped after 311 min (exit code -1). Starting it again in 2 s.` `doctor`: "Server stays up: on" PASS (overall PASS, 1 warning: scan is 9 days old). `playData` test now 35 checks (E).

**Phone timings:**
```
Search: typical 7 ms, slow end 13 ms, worst 15 ms (179 times), about 23 tags
Energy while playing, app code 2026-11-10T23:07:48, per minute. Plays: 10 from the phone's copy, 0 streamed
  open (5 min): wake-ups 157, redraws 167.2, network calls 13.4, file writes 4.8. FAIL (reports over 130, redraws over 135, net over 6)
  locked: none yet
Hang watch (screen stuck over 2 s), app code 2026-11-10T23:07:48: watched 7 min on screen. PASS (quiet)
Mine songs on the phone: 671 of 671 (the phone said so at 2026-11-10T23:15:54+00:00)
Tap to first sound, app code 2026-11-10T23:07:48 (20 of 590 samples; older code not judged). Pass: typical within 2x Sort, none over 1 s
  session: typical 181 ms, slow end 237 ms, worst 237 ms (18 times); over 1 s: 0. PASS
  previous: typical 192 ms, slow end 200 ms, worst 200 ms (2 times); over 1 s: 0. not enough yet (2 of 5)
  sort, library, lockscreen, search, restore: none yet
```
These are from the first session's mid-build publish, not tonight's. **The open-screen energy line is a FAIL** (5 min of data): not looked into, see Decisions 1.

**Phone update:** `published 20261111-040359` (UTC; close and reopen the app). No server code changed this session; the server restarted itself on the current code during the kill proof.

**Needs the phone:** the 4 "I prove" lines of NEXT. Extra for chat to walk: (a) Library's Shuffle pill: tap its top and bottom edge, it still takes. (b) Search, tap a recent search: the keyboard stays up. (c) Type fast and tap a result straight away, Cancel, open search: the recent search is the whole word. (d) Library rows with a heart, "Versions" or a plays count: is the cut second line ("On t…") OK or ugly (catch 14).

**Changed (this session):** `app/` Library.tsx, SearchScreen.tsx, playLog.ts, playStore.ts, playData.test.mjs, searchScreen.test.mjs; new `docs/board/wave2-review.md`; REPORT, STATUS, DECISIONS. Not mine, appeared mid-session (chat's): `docs/CHAT-INSTRUCTIONS.md`, one DECISIONS row, `.claude/agents/fresh-eyes.md`, `docs/pending-agents/`. Wave 2's build itself is in the last commit.

**Done when:** A pass (test in `/verify`; search shots drawn last session). B pass (1,395-row test; chip shots drawn) with the review's note that the test proves the row maths, not the phone's real list: check 3 settles it. C pass (rules + empty-rows test; Home full and empty shots). D pass for kill-and-back and `doctor`; **off leaves nothing scheduled: not run this session** (text-checked by `test_keepalive.py` only; running off then on was not worth risking the server before publish). `/verify`, `check_repo`, publish: pass. I prove 1-4: not run (for chat).

**Plan I chose:** all 6 lines ticked. Step 6 as run: review on Sonnet (general-purpose, given only NEXT, LESSONS, the diff, 34 changed-screen shots), catches in the file before any fix, E, `/verify`, publish. No new shots taken: the three fixes change no pixel.

**Fresh-eyes review** (`board/wave2-review.md`): 19 catches (4 wrong, 3 test gaps, 12 rough). Fixed 3: Shuffle's touch was 36 pt, now 44 (1); a fast result tap could save a half word as the recent search (10); tapping a recent search now keeps the box in focus (11). Proved 1: the real server restarts (9). Left as built: Home rows only show songs that play right now, so a row can hide while its chip has songs (2); Versions row is biggest group first, its See all is newest first (4); order word cycles on tap (5); quieter than the mockup (19). The rest are for chat and the phone: 3, 6, 7, 8, 12-18. **E:** done (wave 1 catch 9). A song list that arrives while a play is being sent now gives the right count whether the laptop listed before or after counting it; tested both ways.

**Not done:** Stretch: none started. Off-then-on not run for real (above). Catch 3 (Needs tags shows every Mine song until tags first load after a wipe) and 14 (cut second line) not fixed: both need a look decision.

**Decisions needed:** (1) Energy FAIL with the screen open (wake-ups 157, redraws 167, network 13 a minute on wave 2's code): look into it at the start of wave 3 (default), or now. (2) An older Windows job "StartVault" still opens the server in a window on a timer; the new "Vault server" job replaces it. Default: I leave it; recommend you delete it in Task Scheduler (it now just opens a window saying the port is in use). (3) Catch 14: drop "On this phone" from Library rows and only say where a song is when it is *not* on the phone (recommended), or keep. Default keep.

**Proposed next step:** wave 3 (Sort as swipe cards, tagging), starting with the energy FAIL.
**Pitch:** make the laptop-off shots fail the song-list fetch like a real phone does, so they show the "Laptop not reachable" line I'd really see (catch 16 was the stand-in, not the app).
**Odd in how we work:** chat's new `fresh-eyes` agent file landed after this session started, so it wasn't on my list; I ran the review as a general agent set to Sonnet (201k Sonnet tokens, 2.6 min, no Fable spent on it). I told it to write the file after the diff and again after the shots, so a cut-off can't lose the catches twice.
