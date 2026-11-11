**Step:** Overhaul wave 4: Queue, versions, settings, whole-app pass, groundwork, 2026-11-11. Built over two sessions (A-E, shots, review, fixes in the first; verify, publish, wrap in this one).
**Verified by running:** `/verify` 29/29 PASS in 65 s (over the 1-min bar by 5 s). `check_repo` clean. `doctor` PASS, 1 WARN (scan 10 days old), "Old StartVault job: gone". Shots `cards`: 9 of 9, `cards-start` front "2025-01-10", `cards-after-throw` front "No Sleep 2". Phone copies made now: 0.
**Phone timings:**
```
Search: typical 7 ms, slow end 13 ms, worst 19 ms (197 times), about 33 tags
  open: none yet
  locked (2 min): wake-ups 31, redraws 0.0, network calls 1.8, file writes 1.8. not enough yet (2 of 5 min)
Hang watch: watched 23 min on screen. PASS (quiet)
  session: typical 256 ms, worst 267 ms (2 times); over 1 s: 0. not enough yet (2 of 5)
  library: typical 261 ms, worst 281 ms (4 times); over 1 s: 0. not enough yet (4 of 5)
  sort, previous, lockscreen, search, restore: none yet
```
**Phone update:** published 20261111-232116; server restarted (doctor changed).
**Needs the phone:** 1. Queue: from the player, then from the mini player: looks like the rest; drag a song (one tick); swipe down lands where you came from. 2. Versions: a song with versions, play two, Compare, set a Main. 3. Settings: tap the gear on Home, address right; close and reopen the app, still connected. 4. Walk Home, Library, search, player, tagging, hold a line: nothing looks older; Delete sits apart from Cancel. 5. Leave the app open and playing 7 min (screen on) for the open-screen line.
**Changed:** app: App, Compare, Hidden, Home, Icon, Library, Notices, Player, Sort, Tagging, Versions, family, nav, phoneBackup, playLog, playOrder, playerStore, sheetCore; new Settings, laptopCore, laptop.test, wave4.test; tests frame, playData, searchScreen, taggingLook. server: doctor + test_doctor, test_keepalive. tools/shots: fakes, fixtures. docs: DECISIONS, STATUS, REPORT, ROADMAP, overhaul/LABELS; new NEW-SONGS-OPTIONS, LIVE-ACTIVITY-OPTIONS, board/wave4, board/wave4-review.
**Done when:**
- A tests + shots (Queue both openers mid-close, Versions, Compare): pass (tests run now; shots checked last session, `board/wave4-review.md`).
- B Settings shot; address saves and survives restart (`laptop.test`): pass.
- C catch 4 + 5 tests, session row + hold menu shots, day-change test, cards-after-throw differs: pass. `timings` open line: **fail (not run): "none yet"**, wave 3 code had no open listen either.
- D two memos, 39 lines each, each with a pick: pass. E doctor StartVault line + test: pass ("gone").
- `/verify` all PASS: pass, but 65 s, not under 1 min. check_repo clean, publish out: pass.
- I prove 1-4: not run (for chat).
**Plan I chose:** 1 [x] board + break list · 2 [x] A · 3 [x] B · 4 [x] C · 5 [x] E, D · 6 [x] shots, fresh eyes, fixes, verify, publish, wrap. Calls in DECISIONS "Wave 4 build calls".
**Not done:** open-screen line (needs your 7-min open listen). Stretch (waveform spike): skipped, Fable budget.
**Decisions needed:**
- Review catch 7: put the Versions explaining line back? Rec: no, the Main's menu says it. Default: leave out.
- Review catch 6: gap between "All mine" and "All not mine" in Sort? Rec: only if you mis-tap. Default: as built.
- New songs memo: rec option 1 (30-min timer) + "look now" in Sort. Live Activity: rec a throwaway build after 2.7. Your pick.
**Proposed next step:** Review. wave 4 on the phone, then your 3.7 searches at ~50 tags.
**Pitch:** split `/verify`'s two slow items (playlistCore 17 s, tsc 17 s) to run side by side: back under a minute.

Odd in how we work: the music guard blocks harmless read-only Bash lines that mix `grep -E` with pipes ("hides its content"); I split them into Grep calls.
