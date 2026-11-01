# NEXT: Auto "mine" detection (ROADMAP 1.5)
Written by chat, 2026-11-01.
Log: Songs step accepted (chat). Doctor also flags songs with no present place (chat-default). Auto-mine order: my verdict > `tape` or `#FREEMONEY THE MIXTAPE` = mine > artist name as a whole word in title or local tag = "likely mine" (guess) > unknown; auto never says "not mine" (chat-default). (logged by chat)
Queue after this: ROADMAP 1.8 server (serves known songs by id only, over Tailscale, with seeking). Then 1.10 `doctor` (Tailscale, server, guard, library marker, `test_library.py`, music fingerprint before/after a scan, songs with no present place).
Read: `ROADMAP.md` (1.5), `DECISIONS.md` ("Mine" rule, Everything in `tape` is mine, Session Music scope, Auto "mine" rules for 1.5), `server/README.md`.

## Parts
a. **Rules.** Each song gets a mine status: my verdict if I gave one; else "mine" from folder (`tape`, `#FREEMONEY THE MIXTAPE`); else "likely mine" from an artist name as a whole word in the title or a local file's tag; else unknown. Stored as a guess with its reason, through the journal. Never overwrites a verdict, never says "not mine", never opens a cloud-only file.
b. **Show it.** `vault_cli.py check` gets a Mine line: mine (mine verdict / folder), likely mine, unknown, counts only.
c. **Prove it.** Self-test with the fake folder: verdict beats folder and name; `tape` = mine; `l1` inside another word doesn't match; cloud-only uses title only; a rerun changes nothing; survives a rebuild. Real run, counts only. Music folders unchanged (fingerprint). Guard test, repo check, then STATUS.
Limits: no server, no phone code, no downloading. Music folders never written to. No song names in the repo or REPORT beyond counts.

**Stop line:** if the session runs long, finish a and its tests; b waits.

## Phone check
None. My check: `python server/vault_cli.py check E:\VaultLibrary` shows the Mine line with the counts Code reported.
