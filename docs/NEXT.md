# NEXT: Doctor, one check before phone tests (ROADMAP 1.10)
Written by chat, 2026-11-01.
Log: Server step accepted, phone check passed (chat). Laptop check passed (mine). Doctor warns on an old scan (chat-default). (logged by chat)
Queue after this: ROADMAP 1.12 real app built and sideloaded (has calls of mine: chat raises them at the next review).
Read: `ROADMAP.md` (1.10), `DECISIONS.md` ("Doctor checks the music fingerprint", "Doctor flags songs with no present place", "Doctor warns on an old scan", "Server framework and port"), `server/README.md`.

## Parts
a. **Checks.** One command, `vault_cli.py doctor <library>`, prints a plain pass/warn/fail line each for: Tailscale up, server reachable (or not running), music guard test passes, library marker present, `test_library.py` passes, scan age (warn when old), songs with no present place (count). Ends with one overall line.
b. **Fingerprint.** Doctor saves a music-folder fingerprint and, when a scan runs, compares before and after: any change is a fail. Read-only: doctor never writes inside music folders, only its own record in the library.
c. **Clean up and prove.** Doctor stops any test servers it started. Self-test covers each check passing and failing. Real run on `E:\VaultLibrary`. Guard test, repo check, then STATUS.
Limits: no phone app code, no fixing things automatically, just report. No Tailscale names or song names in the repo or REPORT.

**Stop line:** if the session runs long, finish a; b's before/after compare waits.

## Phone check
1. Laptop: run doctor, all lines pass (or warn with a reason). Start the server, phone in Safari plays a song, as last time. Stop the server, run doctor again: it says the server isn't running.
