# NEXT: Duplicates, then title, date and source (ROADMAP 1.4 + 1.6)
Written by chat, 2026-11-01.
Log: 1.2 scanner accepted (chat). Doctor also compares the music fingerprint before and after every scan (chat-default). Duplicate = same hash, or a skipped copy from my sorting file; same name with different content is a version, not a duplicate (Phase 4); hashless cloud-only files match only by name and size, marked "likely" (chat-default). Title = filename without ending; date = embedded date if local, else modified time, marked which; source "FL" as a marked guess on every file; cloud-only files never opened (chat-default). (logged by chat)
Queue after this: ROADMAP 1.5 auto "mine" detection (unknown by default, `tape` = mine, my verdicts always win), then 1.8 server. Then 1.10 `doctor` (Tailscale, server, guard, library marker, `test_library.py`, music fingerprint before/after a scan).
Read: `ROADMAP.md` (1.4, 1.6), `DECISIONS.md` (Duplicates rule, Title date and source, Scanner records places and files separately, Skipped copies), `server/README.md`.

## Parts
a. **Duplicates (1.4).** Every place in `sources` that holds the same content, or is a skipped copy of a kept file, points to one song. A song shows how many places it lives in. Hashless cloud-only files with the same name and size as another place are linked as "likely", never merged for sure. Same name, different content stays separate. All of it through the journal, so a rebuild gets it back. No file is touched.
b. **Title, date, source (1.6).** Fill title from the filename, date from the embedded tag when the file is local, else modified time (store which). Set source "FL" as a guess, stored as a guess. My own edits, when they come, always win over a guess. Never open a cloud-only file.
c. **Prove it.** Self-test with the fake music folder: byte-identical copies in two folders become one song; a skipped copy joins its kept file's song; same name, different content stays two songs; a cloud-only twin is "likely"; guesses never overwrite a manual value; all survive a rebuild. Then the real run with counts only: songs, songs with more than one place, "likely" links, dates from tag vs modified time. Music folders unchanged before and after (fingerprint). Guard test, repo check, then STATUS.
Limits: no downloading, no audio copied, no server, no phone code, no grouping of versions. Music folders never written to. No song names or paths in the repo or REPORT beyond counts.

**Stop line:** if the session runs long, finish a and its tests; b waits.

## Phone check
None. My check: `python server/vault_cli.py check E:\VaultLibrary` shows the song count and the duplicate counts Code reported.
