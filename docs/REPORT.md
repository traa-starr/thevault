# Report
**Step:** Batch 6.3, Compare audio fix, Hidden order, out-of-date warning, 2026-11-06. Parts a, b, c done.

## Verified by running
- `node --experimental-strip-types app/compareEngine.test.mjs` (new, fake players): 10 rules pass: no reload of the playing song, never two audible (10 fast flips), Done with no gap, paused stays paused.
- `python server/test_server.py`: ALL PASSED (new: hidden list newest first). `python server/test_doctor.py`: ALL PASSED
  (new: version shown, older running server warns). `playOrder.test.mjs`: ALL PASSED. Guard test 39/39.
- `npx tsc --noEmit` in `app/`: no errors. `check_repo.py`: clean.

## Needs the phone
NEXT.md "Phone check" 1-4. New build first, then restart the laptop server (Stop the server, then Start the server).

## Changed
`app/`: compareEngine.ts, compareStore.ts, engine.ts, playerStore.ts, phoneBackup.ts, Notices.tsx, Library.tsx, new
`compareEngine.test.mjs`. `server/`: vault_server/server.py, doctor.py, test_server.py, test_doctor.py. Docs: STATUS, REPORT, DECISIONS.

## Differed from NEXT.md
- a, the shared cause: two players for one song, plus expo-audio switching the phone's sound off 100 ms after any
  pause if nothing is playing at that instant. Compare's players paused and closed at Done while the queue's player was
  still seeking, so the sound went off under it: silence that needed a pause and play, and after 10 s the stall watch
  gave up on it and skipped to a new song (the "skip" while paused). Also while Compare had the sound, the stall watch
  still ran on the queue's player and nothing it reported counted.
- a, the fix: from the player, Compare borrows the queue's own player for the playing song (no reload, no pause; it
  loops the song and hides lock-screen Next/Previous while open). Other versions load silently beside it. Done on that
  song: nothing happens to the sound. Done on another version: the queue loads it silently and takes over the way a flip
  does, once it plays in line (6 s at most; any tap finishes it at once). Compare's players never switch the sound off.
  Insurance: 1.5 s after Done, a player that should play but hasn't moved gets a fresh Play; the stall watch does the same once before counting.
- a: from Library, Compare still uses its own players and the queue comes back paused, as 6.2 decided.
- c: the line also covers "backup didn't save" (shows until the next save works, not literally once). Tap = check again.
  Checked on open, on coming back to the front and every 5 min, so after a restart it clears on tap or within 5 min.

## Not done
Nothing. a's root cause is read from expo-audio's source, not seen on the phone: checks 1 and 2 decide it.

## Decisions needed
None.
## Proposed next step
Phone checks, then Phase 1 "Done when" with you.
## Pitch
Add the new compare test to the planned `/verify` command so every later step re-checks the one-sound rules.
