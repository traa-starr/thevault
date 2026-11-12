**Step:** Render folder button, guard fix, iCloud plan, 2026-11-11. One session, parts a-e all done; stretch not started.

**Verified by running:**
- a: `test_guard_music.py` 85/85 (every old block case still blocks, plus 7 hidden-content, 15 `-e`, 8 render-folder blocks; 13 read-only lines now pass).
- b: `timings` open line on wave 4's code: wake-ups 65, redraws 65.4, file writes 4.2 per min: PASS (under 130 / 135 / 6).
- c: `test_renders.py` 37 checks ALL PASSED (fake files in temp): 3 new counted; again "Nothing new."; growing file waits and the window says so; duplicate "already in the Vault"; folder untouched (names, sizes, times, bytes); rename/move stays the same song; cut-off click repaired. Real setup made the folder and `Send to Vault.lnk` on the Desktop; the icon's own command line ran: "Nothing new." On a temp copy of the real database (1,395 songs) a 3-song click took 3.8 s and all 3 were in Sort. Real doctor: `PASS Render folder: found`. Server answered throughout (no off/on); restarted at wrap for the new server code: RUNNING.
- d: `/verify` 30/30 PASS in 53 s. e: memo 39 lines, with a pick. `check_repo.py`: clean.

**Phone timings:**
```
Energy: open (8 min): wake-ups 65, redraws 65.4, network calls 0.7, file writes 4.2. PASS; locked: none yet
Hang watch: watched 9 min on screen. PASS (quiet)
Tap to first sound (app code 2026-11-11T23:21:16):
  session: typical 257 ms, worst 257 ms; over 1 s: 0. not enough yet (1 of 5)
  sort: none yet
  library: typical 244 ms, worst 568 ms; over 1 s: 0. not enough yet (4 of 5)
  lockscreen: typical 116 ms, worst 135 ms; over 1 s: 0. not enough yet (3 of 5)
  previous, search, restore: none yet
```
Not enough samples yet on any play path: not a pass.
**Phone update:** none (no app code changed; `git status` shows nothing under `app/`). Server restarted.

**Needs the phone:**
1. Export 3 or more new mixdowns into `Vault Renders` on the Desktop. Double-click `Send to Vault`. Pass: the window says "3 new songs, in Sort on your phone." and closes on a key.
2. Open Sort on the phone: they're cards. Throw each (stamps, buzz), Undo one. Pass: all behave like other cards.
3. Wait ~1 min (the laptop makes the phone copies), then play one from Recently added on Home. Pass: it plays.
4. Double-click the icon again. Pass: "Nothing new.", nothing changes on the phone.
**Changed:** `.claude/hooks/guard_music.py`, `test_guard_music.py`, `.claude/settings.json`, `server/vault_cli.py`, `server/vault_server/{renders (new), store, scanner, doctor}.py`, `server/test_renders.py` (new), `server/test_doctor.py`, `spike/cloud_tally.py` (new), docs: `ICLOUD-OPTIONS.md` (new), `board/render-review.md` (new), STATUS, REPORT, DECISIONS, MAP, ROADMAP.

**Differed from NEXT.md:**
- d: playlistCore and tsc already ran side by side; the slow one was the doctor test (each check waited 2 s for Windows to refuse a closed port). Fixed there instead: 73 s to 38 s.
- No screenshots: no phone screen changed. The window is a console window, proven by its command's output.
- "Phone copies made" happens when you sort a song Mine (the server copies it ~20 s later), not at the click: an unsorted song may not be yours.
- Guessed: the icon's picture (Windows' music note); the new songs' date is the file's date, so they top Recently added.
**Not done:** stretch (3.7 search re-run script): parts came first.
**Decisions needed:** iCloud tidy (memo `ICLOUD-OPTIONS.md`): 1 phone only (rec) / 2 phone and laptop / 3 move other artists out. Hard to undo for 3, so no default.
**Proposed next step:** queue item 2: my 20 acceptance searches (3.7) at ~50 tags, then revisit E (3.4, 3.5).
**Pitch:** back up the library's audio (3.2 GB on E:, one copy) to a second place: today only the database is backed up.
**Odd in how we work:** the guard blocked my own doc edits twice (STATUS has the word "iCloud" in the step name, plus a write in the same line). Editor tool works; harmless.
