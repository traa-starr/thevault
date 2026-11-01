# Report

**Step:** Duplicate-names report, 2026-10-31.

**Verified by running:**
- `python spike/dup_names.py` on Music, Session Music, tape and the loose files in the iCloud root: 1,718 audio files listed. That matches MAP (443 + 1,233 + 23 = 1,699, plus 19 loose).
- 125 names are used more than once: group 1 (same name, different size) 34 names / 70 files; group 2 (same name and size) 38 names / 81 files; group 3 (only the ending differs) 53 names / 107 files.
- 26 files have a name that is only a date.
- Repo check (`python .claude/scripts/check_repo.py`): clean.
- The script only reads names, sizes and dates (`os.stat`), so no cloud-only file was downloaded. No music folder was written to.

**Rerun (same day, at my request):** Session Music now counts only its top-level files plus the `#FREEMONEY THE MIXTAPE` folder (new `--flat-keep` option in `spike/dup_names.py`). Result: 1,549 files (Session Music 1,058 + 5 in the mixtape folder, Music 442, tape 23, loose 21); 100 repeated names (group 1: 15, group 2: 34, group 3: 51); 26 date-only. The numbers above are from the first, wider run.

**Group 2 cleared (same day, at my request):** 34 names, 42 files marked not-to-import. 22 names: keep the `tape` file. 4 names: not mine, excluded for good (one added after the first pass). 8 names: mine, copies; I keep the `Music` copy. **Guessed:** that last choice was not stated. Nothing was moved or deleted. Decisions are in `spike/output/triage-decisions.json`; a rerun with `--decisions` gives 1,507 files, 66 repeated names (group 1: 15, group 2: 0, group 3: 51). Logged in DECISIONS.

**Group 3 cleared (same day, at my request):** wav next to an mp3: keep the mp3 (30 names). 12 other-artist names excluded (slim, shay, testzy, sav, trez, turtle, mk). 9 names left, all m4a vs mp3. `--decisions` now also reads a `group3` list. Rerun: 1,453 files, group 1: 15, group 2: 0, group 3: 9. `PLAYA.mp3` had vanished from `Music` since the earlier run (not by this tool), so `Playa` is no longer a duplicate. Open: render `ANY WAY new limit.wav` to a compressed file.

**Other-artist names, all groups (same day, at my request):** 17 more single-file names excluded for good (shay, testzy, trez, turtle, mk, stab4sav variants, Slimey Jit, DREAM Savo_). `SAVE ME` stays in: not sure yet. Names are stored lowercase in `not_mine_names` (the script compares lowercase). Rerun: 1,436 files, group 3 still 9 names, m4a vs mp3 undecided.

**Group 3 finished, more not-mine names (same day, at my request):** m4a vs mp3 pairs: keep the m4a (6 names). Not mine, excluded with all variants: V8, Tahiti, spin, Respawn, Neva Switch, Lost Again, Fake Love, Going Fast, payroll. Rerun after more edits on the laptop side: 1,396 files, 1 repeated name left (`flip`, group 1), 26 date-only.

**Duplicates done (same day, at my request):** `flip` (3 files) are all different versions of mine: keep all. New `keep_all_names` list in the decisions file, read by `spike/dup_names.py`. `spinaround_` is mine and a different song from `spin`. Rerun: 1,395 files, 0 repeated names, 26 date-only. Date-only names and the auto-named `Untitled...` files wait for later.

**Needs the phone:** None.

**Your check (laptop):** open `spike/output/duplicate-names.md` (gitignored, holds song names). Read groups 1 and 2, sort any same-name files you care about, then tell chat at `Review.` whether filing keeps your names (D) or uses fingerprint folders (C).

**Changed:** `spike/dup_names.py` (new), `docs/STATUS.md`, `docs/REPORT.md`. Output is in `spike/output/` (not committed).

**Differed from NEXT.md:**
- I did not reuse `inventory.json`; the new script does its own listing so it can be re-run any time.
- Guessed: how a name counts as "only a date" (forms like `7.29.23`, `2025-03-14`, `20250314`, `11.12-001`). Catches 26; `1228 6_2` and `12.15-004` are in the list too, so it may include a few that are not dates. Easy to tune.
- Guessed: a group counts as 1 if any two files with the same ending differ in size, as 2 if same-ending files all match, as 3 only if the endings differ. A name with three files can mix cases, so every file in the group is listed together.
- Names are compared ignoring capitals, so `6AM` and `6am` count as the same name.

**Not done:** Nothing. Stop line not needed.

**Decisions needed:** Audio filing, C (fingerprint folder) or D (mirror your names). Hard to undo, so no default. Yours after reading the report. Note for you: groups 1 and 2 include same name in `Music` and `Session Music`, and group 3 (107 files) is mostly bounce + mp3 pairs; under D these would need your sorting first.

**Proposed next step:** After your pick at `Review.`, build ROADMAP 1.1 (library folder + database).

**Pitch:** Have the future scanner (1.2) reuse this name grouping to flag same-name files at import, so the Vault asks about them instead of silently overwriting.
