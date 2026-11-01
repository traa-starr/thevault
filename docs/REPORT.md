# Report

**Step:** Duplicates, then title, date and source (ROADMAP 1.4 + 1.6), 2026-11-01.

**Verified by running:**
- `python server/test_library.py`: 95 checks, ALL PASSED. New checks use a fake music folder and cover every case in NEXT part c, plus: a cloud-only file reaching the laptop joins the song with the same bytes and brings my tag, and a likely twin with different bytes becomes its own song.
- Real run: 1,395 songs, 64 in more than one place, 0 "likely" links. Dates: 231 from tag, 1,164 from modified time. 4,185 details written.
- Second run of `songs`: 0 added, 0 written.
- `check` shows 1537 files, 1395 songs. Verdict counts unchanged: keep 68, not mine 83, skip 68, unsorted 1,327.
- Music folders before and after (whole iCloud Drive): 2,241 files, same listing code both times.
- `python .claude/hooks/test_guard_music.py`: 39/39. `python .claude/scripts/check_repo.py`: clean.

**Needs the phone:** None. My check: `python server/vault_cli.py check E:\VaultLibrary` shows the Songs line with the counts above.

**Changed:** `server/vault_server/songs.py` (new), `server/vault_server/store.py`, `server/vault_server/scanner.py`, `server/vault_cli.py`, `server/test_library.py`, `server/README.md`, `docs/ROADMAP.md`, `docs/STATUS.md`, `docs/REPORT.md`, `docs/DECISIONS.md`. Also uncommitted, not from this step: `docs/CHAT-INSTRUCTIONS.md`. Outside the repo: `E:\VaultLibrary` database and journal.

**Differed from NEXT.md:**
- Not-mine files get no song, so the 83 aren't counted. Unsorted files do get one.
- New `songs` command, run after scan and sorting, so skip verdicts exist before linking.
- Source "FL" is stored per song, not per file. DECISIONS says "every scanned file"; every song in the scan has it.
- Database format went up to 3, so the real database rebuilt from the journal and I re-scanned (1,546 places read as new, verdicts intact).
- Added joining songs: without it, a cloud-only file arriving later would leave an empty song behind.
- Tag dates use ffprobe, opening local files read-only. A local file with no tag isn't reopened until its modified date changes.
- The music guard blocked one wrap command that named a locked folder and wrote docs; I split it. The guard is unchanged.

**Not done:** Nothing from NEXT. Known gaps:
- If a file later changes to not mine, or vanishes, its song stays and is still counted. 1.5 or the sorting screen (1.19) should handle this; today it affects 0 songs.
- 0 "likely" links on the real data, so that path is proven only on the fake folder.
- Tested with the offline attribute, not a real iCloud placeholder going local.

**Decisions needed:** None hard-to-undo.

**Proposed next step:** ROADMAP 1.5 auto "mine" detection, then 1.8 server (already queued).

**Pitch:** Make `doctor` (1.10) also flag songs with no present place, so the gap above shows up instead of hiding in the count.
