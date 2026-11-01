# NEXT: Batch 1: First write (Mine / Not mine / Undo)
Written by the plan session, 2026-11-01. Awaiting owner approval at `Review.` in chat.
Log: all answers and plan calls are in DECISIONS, 2026-11-01 plan session rows. (logged by plan session)
Queue after this: Batch 2 "Safety and pull" (`BATCH-PLAN.md`).
Read: `BLUEPRINT.md` ("How writes stay safe", "The first write path"), then `server/vault_server/server.py`, `store.py`, `app/Player.tsx`, `app/Library.tsx`, `app/playOrder.ts`.
## Parts
a. **Server write path.** `POST /changes` as in the blueprint, kinds `mine_set` and `mine_restore`; new journal kind `song_field_restore`; lock file around each `record`; no schema bump. `/songs` leaves out not mine and adds a `sorted` flag; `/songs?hidden=1` lists the not-mine songs. Self-tests: repeated id does nothing, bad kind refused, missing header refused, undo restores a guess, rebuild from journal gives the same result, a re-scan keeps a verdict, no music file opened for writing. Measure journal read time per write. Update the server docstring: it isn't "no route changes anything" now.
b. **App.** Mine and Not mine buttons in the Player. Outbox saved on the phone, sent at once, retried when the laptop answers. Not mine moves to the next song immediately and shows a 5-second Undo toast; Undo brings the song back and returns to it. The song leaves the current play order without breaking Previous. Keep the logic in `playOrder.ts` and test it the same way.
c. **Shuffle skips Mine.** Library shuffle only lands on songs whose value isn't "mine", while sorting goes on. The list and tap-to-play still include them.
**Stop line:** d waits if the session runs long.
d. **Survival stamp (1.18 first half).** The app writes a stamp file on first run and shows its date in small text on home. Nothing else depends on it.
Limits: nothing writes to a music folder. Only the journal and database change. No new packages unless a part can't work without one; note it in REPORT.
## Phone check
Setup: push, run Build iOS (unsigned), install the new `TheVault.ipa` in SideStore, then on the laptop `python server/vault_cli.py serve E:\VaultLibrary`.

**Part b: Not mine and Undo**
1. Play a song you know isn't yours. Tap Not mine. Pass: next song starts at once, Undo toast shows.
2. Tap Undo within 5 seconds. Pass: back on that song, and it's still in the Library.
3. Tap Not mine again and let the toast run out. Go back to the Library. Pass: the song is gone and the count is one lower.
4. Force-quit and reopen the app. Pass: still gone.
5. On the laptop, stop the server, then tap Not mine on a playing song. Start the server again and reopen the Library. Pass: that song is gone.

**Part c: Mine and shuffle**
6. Tap Mine on a song. Pass: it's marked, and music keeps playing.
7. Filter to a few titles including that one. Tap Shuffle and press Next until the list runs out. Pass: the Mine song never comes up.
8. Tap that song directly. Pass: it still plays.

**Part d: survival stamp**
9. Note the date on home. Refresh in SideStore. Reopen the app. Pass: same date, and laptop address kept. A different date means the data was wiped: report it.
