# Report

**Step:** Read-only scanner (ROADMAP 1.2), 2026-11-01.

**Verified by running:**
- `python server/test_library.py`: 70 checks, ALL PASSED. New checks use a fake music folder: re-scan adds and reads nothing, other-artist subfolders never recorded, a pretend cloud-only file (real offline attribute set) never read, verdicts survive a rebuild from the journal, a future file sharing a not-mine name stays unsorted.
- Real scan: 1,546 files: `Music` 439, `tape` 23, `Session Music` 1,063, iCloud root 21. 21 artist subfolders skipped. 917 cloud-only. Nothing unreadable.
- Verdicts: 217 added. By file: keep 68, not mine 83, skip (copy) 68, unsorted 1,327. Unmatched names: 0. Keeps only in another artist's subfolder: 0. `tape` files marked not mine: 0.
- 1,546 - 83 - 68 = 1,395, the same total as the duplicate-names step.
- Second real scan: 0 new files.
- Music folders before and after (whole iCloud Drive: file list, sizes, modified times): 2,241 files, same listing code both times.
- `python .claude/hooks/test_guard_music.py`: 39/39. `python .claude/scripts/check_repo.py`: clean.

**Needs the phone:** None. My check: `python server/vault_cli.py check E:\VaultLibrary` shows 1537 files and the Scanned line with the counts above.

**Changed:** `server/vault_server/scanner.py` (new), `server/vault_server/store.py`, `server/vault_cli.py`, `server/test_library.py`, `server/README.md`, `docs/ROADMAP.md`, `docs/STATUS.md`, `docs/REPORT.md`, `docs/DECISIONS.md`. Already uncommitted from chat: `docs/MAP.md`, `docs/NEXT.md`. Outside the repo: `E:\VaultLibrary` database and journal.

**Differed from NEXT.md:**
- Added a `sources` table (one row per place), since byte-identical copies share one `files` row: 1,546 places, 1,537 files.
- A skip verdict sits on the file's location, not its hash, so it can't overwrite the kept copy's verdict. Other verdicts sit on the file key, so a byte-identical file under another name shares them. Slightly wider than "those exact files" (chat-default, reversible).
- `apply-sorting` is its own command and runs once, so a re-run can't catch a future song by name.
- Added `fingerprint` for the before and after proof. It lists files and opens none.
- The old database was rebuilt to add the skip verdict; it held 0 files.
- A file that vanishes is marked missing, not removed. If any file or folder couldn't be read, nothing is marked missing that run.
- The music guard blocked one of my helper scripts because its text named a locked folder. I wrote this report directly instead; the guard is unchanged.

**Not done:** Nothing from NEXT. Known gap for 1.3: if the database is rebuilt while a kept file has gone back to cloud-only, it gets a `src:` key and shows unsorted until it is local again. No verdict is lost, the journal still has it. Not tested on a real iCloud placeholder going local; the test uses the offline attribute.

**Decisions needed:** None hard-to-undo.

**Proposed next step:** ROADMAP 1.4 duplicates + 1.6 source tag, title and date (fast-lane OK).

**Pitch:** Have `doctor` (1.10) also compare the music fingerprint before and after every scan, so "read-only" is checked each run, not just today.
