# NEXT: Batch 2: Safety and pull
Written by chat, 2026-11-01.
Log: Batch 1 passed all 9 phone checks; backup folder is `C:\VaultBackup` (chat-default); Code's "Undo returns to the spot" pitch goes into batch 3 with the shared player (chat-default) (logged by chat)
Queue after this: Batch 3 "The real player" (`BATCH-PLAN.md`), plus Undo returning to the spot in the song.
Read: `BATCH-PLAN.md` (Batch 2), `BLUEPRINT.md` (backup, `/health`, pull-cloud section), `MAP.md`, then `server/vault_cli.py`, `server/vault_server/server.py`, `app/Library.tsx`.
## Parts
a. **Nightly backup (ROADMAP 1.9).** A `backup` laptop command copies `vault.db` and `journal.jsonl` to `C:\VaultBackup`, keeps 14 copies, and skips with a plain warning while E: is unplugged. A Windows scheduled task runs it nightly; give me the one command to set that up and I run it. `/health` and doctor show the last backup's age. MAP gets the path.
b. **Pull cloud songs (ROADMAP 1.3).** `pull-cloud` laptop command as in the blueprint: one at a time, progress count, stops under 10 GB free on C:, safe to stop and rerun, read-only. First prove on 3-5 files that doctor's fingerprint check still passes after a pull. Don't run the full pull: give me the command. Then check the known gap: a kept song that was cloud-only keeps its verdict after the pull and a scan.
c. **Hidden list (part of 1.21).** A Hidden screen reachable from the Library, listing not-mine songs from `/songs?hidden=1`, with Restore per song that goes through the outbox like Undo.
**Stop line:** d waits if the session runs long.
d. **Sorting prototype (ROADMAP 1.19).** Fake data only: bulk sweep screen and a song card, with buttons and swipe. Nothing saved.
Limits: nothing writes to a music folder; the pull only reads, so iCloud downloads in its usual spot. No new packages unless a part can't work without one; note it in REPORT.
## Laptop check
1. Run the backup command once. Pass: a dated copy shows up in `C:\VaultBackup`, and doctor shows its age.
2. Run the full pull. Pass: it finishes with the count it said at the start (or stops cleanly at the space limit), then the scan runs and doctor passes.
## Phone check
Setup: push, run Build iOS (unsigned), install the new `TheVault.ipa` in SideStore, start the server.
1. Play a song that was cloud-only before the pull. Pass: it plays and seeks.
2. Library, open Hidden, tap Restore on a song. Pass: it leaves Hidden and is back in the Library, count one higher.
3. Prototype: sweep a set, then swipe and tap through a few cards. Report how it feels: fast enough, buttons in the right place, swipe directions right.
