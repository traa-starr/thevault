# Report

**Step:** Library folder and database (ROADMAP 1.1), 2026-10-31.

**Verified by running:**
- `python server/test_library.py`: 28 checks, ALL PASSED. Covers: marker missing stops and creates nothing (also from the command line, also for a folder that doesn't exist); init refuses a folder inside the repo; two different files with the same 7-letter code get different folders; a repeated change id does nothing; deleting the database and replaying the journal brings back every tag, verdict, group and link; a re-scan leaves all of those alone; a journal line the database missed (crash) is applied on open, a half-written last line is ignored.
- `python .claude/hooks/test_guard_music.py`: 39/39 passed. `python .claude/scripts/check_repo.py`: clean (warned REPORT was over 40 lines before this rewrite).
- `E:\VaultLibrary` created. `check` finds it: 0 files, 0 songs, 0 tags. `triage-decisions.json` there is byte-identical to the spike copy (cmp).

**Needs the phone:** None. My check on the laptop: open `E:\VaultLibrary` and confirm `VAULT-LIBRARY-MARKER.json`, `audio`, `phone`, `vault.db`, `journal.jsonl` and `triage-decisions.json` are there.

**Changed:** `server/vault_server/` (new: `__init__.py`, `library.py`, `store.py`), `server/vault_cli.py` (new), `server/test_library.py` (new), `server/README.md`, `docs/ROADMAP.md` (1.1 ticked), `docs/MAP.md`, `docs/STATUS.md`, `docs/REPORT.md`, `docs/DECISIONS.md`. Outside the repo: `E:\VaultLibrary\` (new).

**Differed from NEXT.md:**
- Added one more journaled change, `song_new` (song id, version id, file, original name). Without it a rebuilt database would have tags pointing at songs it doesn't know (chat-default, reversible).
- Verdicts and versions point at a file key (`hash:<hash>`, or `src:<path>|<size>` before the hash is known), not a database row number, so they survive a rebuild.
- "Groups" = confirmed or rejected "these songs belong together" records; "links" = proposed/confirmed/rejected, as in the storage memo. Table list is in `store.py`.
- `init` refuses a non-empty folder with no marker, as an extra guard.

**Not done:** Nothing from NEXT. Not built on purpose: scanner, audio copying, server endpoints, phone code. When a cloud-only file's hash finally arrives, its key changes from `src:` to `hash:`; carrying verdicts across belongs in the scanner (1.2).

**Decisions needed:** None hard-to-undo.

**Proposed next step:** ROADMAP 1.2 read-only scanner, turning my name lists into per-file verdicts.

**Pitch:** Have `doctor` (1.10) also run `test_library.py` so a broken library layer shows before any scan. One-liner of work, catches silent breakage.
