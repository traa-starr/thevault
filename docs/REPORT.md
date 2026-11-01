# Report

**Step:** Server, stream a song by id (ROADMAP 1.8), 2026-11-01.

**Verified by running:**
- `python server/test_server.py`: ALL PASSED, 41 checks: unknown id refused, paths in place of an id refused, seeking returns the right bytes, cloud-only refused without opening (also when the database is out of date), nothing written.
- Real run on `E:\VaultLibrary`: lists 1,395 songs (589 on the laptop, 806 cloud-only). All 589 answer. mp3, wav and m4a each decode from 5 seconds in over the server. A cloud-only song answers "not on laptop yet".
- Headless Edge (a browser with no window): the page shows 1,395 of 1,395 rows. One mp3 loaded, jumped to 63.9 s of 127.9 s, and reported playing.
- Reachable on the laptop address, the Tailscale address and the Tailscale name. Not reachable on the laptop's other network address.
- Stop path: a simulated Ctrl+C prints "Stopped." and exits cleanly.
- Music folders before and after (whole iCloud Drive): 2,241 files, same listing code.
- `python server/test_library.py`: ALL PASSED. `python .claude/hooks/test_guard_music.py`: 39/39. `python .claude/scripts/check_repo.py`: run at wrap, see my last message.

**Needs the phone:**
1. On the laptop run `python server/vault_cli.py serve E:\VaultLibrary`. It prints the phone address.
2. Phone on Tailscale. Open that address in Safari. If it doesn't open, try the second address it prints.
3. Tap a song near the top: it plays. Drag the timeline: it jumps there.
4. Scroll past the laptop songs and tap one marked "not on laptop yet": the message shows and nothing plays.
5. Ctrl+C on the laptop: it says "Stopped."

**Changed:** `server/vault_server/server.py` (new), `server/test_server.py` (new), `server/vault_cli.py`, `server/README.md`, `docs/ROADMAP.md`, `docs/STATUS.md`, `docs/REPORT.md`, `docs/DECISIONS.md`. Nothing changed in `E:\VaultLibrary`.

**Differed from NEXT.md:**
- Picked: Python's built-in web server, so nothing to install, on port 8787 (logged).
- Added: refuses requests using an address name it doesn't know, so a web page can't reach the server by a trick.
- Added: the server checks the file's live cloud status before opening, because the scan can be out of date. The list itself comes from the last scan, so a label can be behind. Tapping still gets the true answer.
- Added: the test page's list shows laptop songs first.
- Windows `netstat` gave odd, inconsistent results here, so "listens only on these addresses" rests on the connection tests and the code, not on netstat.
- Repo check flagged Tailscale-style addresses in my code and test. I rewrote those lines; the check is unchanged.

**Not done:** Nothing from NEXT. Not proven: audible sound (the Edge test ran with no window, muted), a real Ctrl+C key press, and anything in phone Safari. The phone check covers these.

**Decisions needed:** None hard-to-undo.

**Proposed next step:** ROADMAP 1.10 `doctor` (queued, fast-lane OK).

**Pitch:** Have `doctor` warn when the scan is old, so the "on laptop" labels don't quietly drift.
