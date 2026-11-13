**Step:** Calm the app, part 1: Hidden leaves Library, laptop desk, inventory, iCloud groundwork, 2026-11-12. One session, goals A-F done; stretch not started.
**Verified by running:** `/verify` 33/33 PASS (50 s); `check_repo` clean (one WARN: STATUS length, trimmed after). New: `app/hidden.test.mjs` 12, `server/test_desk.py` 33, `server/test_moved.py` 18, all pass. 9 `calm-*` shots + 4 desk shots + the full set (164/164 drawn), each checked by a subagent. Live: `/desk` 200, doctor `PASS Desk`, server version 6. Link dry run on a copy of the real db: 0 changes.
**Phone timings:**
```
Tap to first sound, app code 2026-11-11T23:21:16 (36 of 689 samples; older code not judged)
  session: typical 257 ms, over 1 s: 0. not enough yet (1 of 5)
  sort: none yet
  library: typical 220 ms, slow end 257 ms, worst 568 ms (30 times); over 1 s: 0. PASS
  previous: typical 225 ms; over 1 s: 0. not enough yet (1 of 5)
  lockscreen: typical 116 ms; over 1 s: 0. not enough yet (3 of 5)
  search: none yet
  restore: typical 166 ms; over 1 s: 0. not enough yet (1 of 5)
```
**Phone update:** published 20261112-205751, server restarted.
**Needs the phone:** (1-4 this step; the render step's 4 checks are in STATUS)
1. Library: chips read All, Favorites, Needs tags, Versions, Archived. No Mine, no Hidden word at the end. Pass: exactly that.
2. Home gear, Settings, Hidden songs (row shows 724). Type part of a name: list narrows, count "N of 724". Tap a folder chip. Tap a row: it plays in the mini player. Restore one: pill says In Library; Back: count is one less. Library: the song is there.
3. Laptop: double-click `Vault Desk`. Search, Restore one (button says In Library). Phone Library: pull down; the song is there.
4. Hide that song again from the phone (hold it, Not mine). Click back into the desk window: it's back in the hidden list.
**Changed:** app: App, Hidden, Library, Settings, libraryCore, library.test; new hiddenCore, hidden.test. server: server, songs (moved files), renders, doctor, vault_cli, test_doctor, test_server; new desk.py, test_desk, test_moved, desk_shots. tools/shots: entry, fixtures, shoot, new desk.mjs. docs: ICLOUD-ORGANIZE, overhaul/INVENTORY, board/calm-1 and calm-1-review, LABELS, MAP, STATUS, REPORT. `.claude/skills/next/SKILL.md` (pending copy). spike/link_dry_run.py.
**Done when:** A chip test pass, shot pass · B Hidden test (815 fake) pass, 4 shots pass · C desk test pass (loads, lists, journal like the phone's, no address or path), icon on Desktop pass, doctor Desk line pass · D INVENTORY (158 controls, 14 screens) pass, shots saved pass · E 3 moved-file cases pass (failed first; scanner fixed), temp folder only pass · F memo 46 lines with picks pass · /verify pass · check_repo pass · publish pass · I prove 1-4: not run (for chat).
**Plan I chose:** [x] board, [x] A+B, [x] C, [x] E, [x] D+F, [x] review, fixes, verify, publish. Guessed (reversible): Restore keeps the row in place ("In Library") so nothing moves under the thumb; desk answers on 127.0.0.1 only; "Last render click" recorded in `vault-settings.json`; Library got pull to refresh (needed for I prove 3); SERVER_LEVEL 6, phone's NEEDS_SERVER left at 5.
**Not done:** stretch (3.7 search re-run script), to save budget. Tags today: 33.
**Review:** 9 catches (0 high, 3 medium, 6 low), 7 fixed, 2 not taken with reasons checked on the real path (`board/calm-1-review.md`).
**Decisions needed:** (1) iCloud memo picks: second audio copy on C: first (recommend; default none until you say), then organize by your hands from a move list. Hard to undo: no default. (2) Board's open questions for the redesign: a hidden song tapped while another plays replaces it (as now) or asks first; default replace.
**Odd in how we work:** the music guard blocked a test for the word "iCloud" in its comment; rewording was enough, but a docstring tripping a write guard costs a retry each time.
**Proposed next step:** Review (8 phone checks) + world map in chat from INVENTORY.
**Pitch:** a "move list" command that prints where each Mine song sits now and where the memo would put it, so organizing iCloud is a checklist, not a project.
