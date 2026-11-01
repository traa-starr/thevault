# NEXT: Library folder and database (ROADMAP 1.1)
Written by chat, 2026-10-31.
Log: Audio filing decided: C, code as the folder, `audio/<short code>/<real filename>`; phone copies the same way under `phone/` (mine). The browse folder of my song names is parked (mine). Code is 7 lowercase letters and digits taken from the file's hash, made longer only if it collides with a different file; the full hash lives in the database (chat-default). Storage shape C (journal) and tags on the song, each tag quietly recording which version it was typed on, stay as decided (mine). Name-based "not mine" lists become per-file verdicts at the scanner, ROADMAP 1.2, not here (chat-default). (logged by chat)
Queue after this: ROADMAP 1.2 read-only scanner, including turning my name lists into per-file verdicts. Then options for how sorting works (before 1.19), and 1.10 `doctor`.
Read: `STORAGE-OPTIONS.md` (the three words, journal, re-scan rules, "If E: is unplugged"; its file layout paragraph is replaced by the Audio filing row), `DECISIONS.md` (Library location, Database backup, Storage shape, Tags attach to, Audio filing rows), `ROADMAP.md` (1.1, 1.9), `MAP.md`.

## Parts
a. **Library folder.** Create the library at the path I give on the command line (`E:\VaultLibrary`), never written into the repo. It holds a marker file, `audio/`, `phone/` and the journal. Filing rule: one folder per file, named by its code, holding the file under its real name (`audio/43w4636/any way.mp3`). If the marker is missing, every command stops with a plain "library missing" and creates nothing. It must never start a blank library in the old place.
b. **Database and journal.** One SQLite file in the library. Lists for songs, versions, files (with full hash, code, original name and original path), tags, groups, links and my per-file verdicts (keep / not mine). Every change of mine (tag, group, verdict, link) is written to the journal first, by one function, with an id so repeats do nothing. Tags attach to the song and also record the version they were typed on. Re-scans may add and update files but never touch tags, groups, verdicts or links.
c. **Prove it, then copy my sorting in.** A small self-test that builds a throwaway library in a temp folder (not on E: and not near my music) and shows: marker missing means stop and create nothing; two different files with the same code get different folders; deleting the database and replaying the journal brings back every tag, verdict and group. Then copy `spike/output/triage-decisions.json` into the library folder as it is (my only copy of the sorting; nothing is read from it yet). Repo check, then update STATUS.
Limits: no scanner, no audio copied into the library, no server endpoints, no phone code. The music folders are never touched. No song names, paths or database in the repo.

**Stop line:** if the session runs long, finish a and b; the self-test and the copy of my sorting wait.

## Phone check
None. My check: after the session, open `E:\VaultLibrary` and confirm the folder, the marker file and `triage-decisions.json` are there.
