# Status

**Phase 1.** Updated 2026-11-06 by Code. How we work: `WORKFLOW.md`. Build order: `BATCH-PLAN.md`. Design: `BLUEPRINT.md`. My commands: `COMMANDS.md`.
**In progress:** nothing.
**Next up:** me: new build, phone checks, then `Review.`
**Current task:** `NEXT.md` "Batch 6.2, Restore, survival and inline Compare" (built, checks pending).

## Done
- Phase 0 closed (`SPIKE-RESULTS.md`). ROADMAP verified: 1.1-1.10, 1.12-1.17, 1.19-1.23. 1.11 built, unproven. Library at `E:\VaultLibrary`, 1,395 songs, 314 Mine, all imported with phone copies.
- Batches 1-5, 4d and 6.1 phone-verified (6.1 on 2026-11-06: 829 MB of 8 GB saved).
- Batch 6.2 built 2026-11-06, all parts (0, 1, a, b). Board notes `board/batch-6-2-restore.md`. Design ideas: `DESIGN-NOTES.md`.

## Queue
1. Phase 1 "Done when" with me (away, screen locked, laptop asleep) after the 6.2 checks. 2. After Phase 1: Opus plan session (Plan mode, board inside) for Phase 2 tagging.
3. Parked (Code's pitches): split the 638-song folder set; server `/status` count-only answer; A-Z jump strip; doctor's fail line names changed files; Hidden count on the Hidden link; light vibration when a queue song lifts; song length stored at scan time; doctor warns on Mine songs without copies; Keychain note so a reinstall keeps the laptop address; server stops printing harmless "connection reset" tracebacks when the phone drops a connection (chat, 2026-11-06).

## Open questions
- SideStore keeps app data across re-signs? Final test: check 4 below. If not, the phone backup restores it.
- Does BandLab export keep the title, and what formats? (ROADMAP 5.1)
- Waiting for later: `SAVE ME` (mine?), 26 date-only names and `Untitled...` files. Chat-defaults: the 8 same-render
  copies keep the `Music` copy; `Session Music` loose files stay in the scan. Mine 315 in the dry run, 314 now.

## Checks pending (Batch 6.2, new build first)
1. Airplane mode. Library > a group with a version not on the phone > Versions > Compare. Swipe the dial sideways
   both ways, then tap the ‹ › arrows. Pass: lands on the nearest version on the phone each time, never 2 places; a
   version not on the phone shows greyed "Not on this phone" only when nothing playable lies further that way.
2. Full player on a song not in a group: "+ Version" shows. On a grouped song: no "+ Version".
3. Full player on a grouped song, tap Compare. Pass: a one-line dial opens under the buttons, no new screen; Compare
   reads Done; Previous/Next greyed; flips land at the same second; after a flip, "Back to <name>" sits left under
   Versions and takes you back. Swipe the dial 10 times fast and slow: the player never closes. Lock the screen: it
   names the version you hear. Tap Done: the version you heard plays on. From a Library group: the player opens with the dial.
4. Laptop on, open the app once (no "waiting to send" line). Refresh the app in SideStore. Airplane mode, open
   Library. Pass: "On this phone: 314" still, songs play, nothing downloads again. Do it twice in a row.
5. Laptop off (or airplane mode), mark 2 songs Mine/Not mine. Pass: "2 changes waiting to send" on Library; still
   there after force-closing and reopening. Laptop on, tap the line: it goes away.
6. Put 1 song in the Not sure pile. Laptop on, open the app, wait 10 s, send the app to the back. Delete the app,
   reinstall from SideStore, type the laptop address. Pass: same Mine count, groups and Hidden list; a "Welcome back"
   card names the Not sure pile and last song; "Saving to phone" counts up from 0 to 314.
7. Same as 6 but laptop off when you first open the reinstalled app. Pass: "Fresh install: connect to your laptop to
   get everything back", not an empty Library with no reason. Laptop on: everything comes back as in 6.
