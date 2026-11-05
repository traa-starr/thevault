# Report

**Step:** Batch 5, Import and copies (+ version fixes), 2026-11-04. Parts 0, a, b, c built. Nothing has run on a phone yet.
## Verified by running
- App: `tsc --noEmit` clean; `playOrder.test.mjs` 53 PASS (6 new: newest Main, picks, Keep as Main, merges, Mine in one change).
- Laptop: `test_server`, `test_library`, `test_doctor`, `test_backup` ALL PASSED; new `test_import.py` 18/18. Guard 39/39. Repo check clean.
- Dates (read-only on the real database): no song has the pull date 2026-11-01; modified times survived. Year-only tags: the
  file's day is in the tag's year for 228 of 231. Which date wins: full tag date, else a year-only tag gets the file's
  modified day if same year, else the modified day.
- Dry run on a scratch copy of the real library (deleted after): `songs` would refresh 1,014 dates (780 only relabelled after
  the pull, 195 year-only tags get their exact day); then `mains`: **11 of 32 groups switch to their newest Main**, 21 already
  newest, 0 hand picks (the one Make main from 4c was on a song later removed from its group).
- Import on that scratch copy, real files: 315 Mine songs copied, 0 fingerprint mismatches, 0 cloud-only. Phone copies:
  315 songs, **873.3 MB**, 2.8 MB average; 57 made as AAC 192, 258 copied as is, 0 failed. Biggest: Project_16 newwwW 9.0 MB,
  chyu 8.4, above me-001 6.0. `ANY WAY new limit.wav` 24.6 MB became a 3.5 MB m4a. Second run: 0 copied, 1.6 s. Not mine imported: 0.
## Needs the phone
Laptop first (PowerShell in `E:\dev\thevault`): stop the server, then run `python server\vault_cli.py songs E:\VaultLibrary`,
then `python server\vault_cli.py mains E:\VaultLibrary` (expect "Main changed to newest: 11"), then
`python server\vault_cli.py import E:\VaultLibrary` (about 15 minutes), then start the server. New phone build needed.
1. Library: group 2 songs with different dates, no Make main. Pass: Main is the newer one. Then Make main on the older one and add a third song. Pass: my pick stays Main.
2. Library filter row: tap Unsorted, then Grouped. Pass: only unsorted songs; then only version groups.
3. Laptop: run the import command again. Pass: "copied now: 0", "Mine songs" equals "already in", "taken out" and Not mine never counted.
4. Safari: `http://<laptop>:8787/songs/4df3bbae-0fc6-4675-a9bb-3b7b3b7ef60d/copy` (ANY WAY new limit). Pass: plays and seeks; the import's size lines match the numbers above.
## Changed
`app/`: Library, Versions (.tsx); family, outbox, playOrder, sortData, versionStore, playOrder.test. `server/`: vault_cli, README, test_server, new test_import; `vault_server/`: family, library, server, songs, store, new importer. docs: DECISIONS, ROADMAP, STATUS, REPORT.
## Differed from NEXT.md
- One `import` command does part a and b in a row; `mains` is a new one-off for old groups. `/kept` built (not deferred).
- Make main on the current Main shows as "Keep as Main"; the Versions sheet says "Main, your pick" for a locked Main.
- Unsorted filter = not Mine and not judged yet; filters are one at a time (tap again for all).
- Select mode's "Main ·" label now marks the newest ticked song, not the first held.
- A song no longer Mine loses its library and phone copies on the next import (only the library's own folders).
- `/audio` now plays the library copy when one exists. Command output survives emoji song names (one stopped the first run).
## Not done
Nothing from NEXT. I didn't run `songs`, `mains` or `import` on the real library: those are yours (check 3).
## Decisions needed
None.
## Proposed next step
Batch 4d, Compare versions (board pass first).
## Pitch
Have `doctor` warn when Mine songs are missing a library or phone copy, so a new Mine song never slips past the import.
