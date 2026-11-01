# Report

**Step:** Duplicate-names report, 2026-10-31.

**Verified by running:**
- `python spike/dup_names.py` on Music, Session Music, tape and the loose files in the iCloud root: 1,718 audio files listed. That matches MAP (443 + 1,233 + 23 = 1,699, plus 19 loose).
- 125 names are used more than once: group 1 (same name, different size) 34 names / 70 files; group 2 (same name and size) 38 names / 81 files; group 3 (only the ending differs) 53 names / 107 files.
- 26 files have a name that is only a date.
- Repo check (`python .claude/scripts/check_repo.py`): clean.
- The script only reads names, sizes and dates (`os.stat`), so no cloud-only file was downloaded. No music folder was written to.

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
