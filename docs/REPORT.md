# Report

**Step:** Auto "mine" detection (ROADMAP 1.5), 2026-11-01.

**Verified by running:**
- `python server/test_library.py`: ALL PASSED, including new mine checks for every case in NEXT part c.
- Real run: 1,395 mine statuses written. Mine by my verdict 68, mine by folder 5, likely mine 115 (12 from title, 103 from tag), unknown 1,207. Adds up to 1,395 songs; 0 said "not mine".
- Second run of `songs`: 0 written.
- `check` shows the Mine line; Songs and Scanned counts unchanged (1,395 songs; keep 68, not mine 83, skip 68, unsorted 1,327).
- Music folders before and after the scan and both runs (whole iCloud Drive): 2,241 files, same listing code.
- `python .claude/hooks/test_guard_music.py`: 39/39. `python .claude/scripts/check_repo.py`: clean before these doc edits; rerun at wrap.

**Needs the phone:** None. My check: `python server/vault_cli.py check E:\VaultLibrary` shows the Mine line with the counts above.

**Changed:** `server/vault_server/songs.py`, `server/vault_server/scanner.py`, `server/vault_server/store.py`, `server/vault_cli.py`, `server/test_library.py`, `server/README.md`, `docs/ROADMAP.md`, `docs/STATUS.md`, `docs/REPORT.md`, `docs/DECISIONS.md`. Outside the repo: `E:\VaultLibrary` database and journal.

**Differed from NEXT.md:**
- Guessed (logged in DECISIONS): names match in any capitals, so someone else's song with "mojo" in its title counts as likely mine. `_` counts as a word break. Tags checked: artist, album artist, title.
- A skipped copy counts as my mine verdict, because I only skip copies of songs I called mine.
- If I call a file not mine after it became a song, the status shows "not mine" from my verdict. Auto still never guesses it. 0 today.
- A hand-set status never changes and counts under "mine (my verdict)". 0 today.
- Database format went up to 4, so it rebuilt from the journal and I re-scanned (1,546 places read as new, verdicts intact).
- A local file already checked isn't reopened until it changes; one that couldn't be read is retried each run (0 today).
- The self-test's fake files can't be read by ffprobe, so "a rerun doesn't reopen" is proven on its real-audio test files only.
- The music guard blocked commands that named a locked folder alongside writes elsewhere; I split them. The guard is unchanged.

**Not done:** Nothing from NEXT. Known gaps:
- The scan found 917 cloud-only places. Those songs are judged by title alone until they're local, so some of the 1,207 unknown may have my name in a tag.
- Tested with the offline attribute, not a real iCloud placeholder.
- The status updates when `songs` runs, not by itself after a scan.

**Decisions needed:** None hard-to-undo.

**Proposed next step:** ROADMAP 1.8 server (already queued).

**Pitch:** Show "likely mine" first on the sorting screen (1.19), so the 115 quick calls come before the 1,207 unknowns.
