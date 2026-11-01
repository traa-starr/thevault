# Report

**Step:** Batch 1: First write (Mine / Not mine / Undo), 2026-11-01. All parts a-d built, including those after the stop line.

**Verified by running:**
- `server/test_server.py`, `test_library.py`, `test_doctor.py`: all passed. New tests cover each one NEXT lists, plus the lock, busy and merged songs.
- `app/playOrder.test.mjs`: all passed. `npm run typecheck`: clean. Music guard: 39/39.
- On a throwaway copy of the real library: 1,395 songs listed. Not mine gave 1,394 listed and 1 hidden; Undo gave back 1,395 and "likely mine". Rebuild from the journal gave the same result. The copy is deleted. The real journal and database hashes were unchanged.
- Journal time per write, 7,196 lines: read 32 ms, whole write 52-89 ms. Fast enough, so a fresh `Store` per write stays.
- Not proven: nothing has run on the phone or been built by Actions. The app's buttons, toast, outbox and stamp are only type-checked; only the order and list logic has tests.

**Needs the phone:** NEXT's 9 checks, listed in the closing message.

**Changed:** `app/App.tsx`, `app/Library.tsx`, `app/Player.tsx`, `app/README.md`, `app/playOrder.ts`, `app/outbox.ts` (new), `app/playOrder.test.mjs` (new), `server/test_server.py`, `server/vault_cli.py`, `server/vault_server/server.py`, `songs.py`, `store.py`, `docs/DECISIONS.md`, `docs/MAP.md`, `docs/STATUS.md`, `docs/REPORT.md`.

**Differed from NEXT.md:**
- Tapping Mine again takes it back. NEXT didn't ask, but a wrong Mine tap had no other fix until the Hidden list.
- Undo restarts the song from the top, not from where it was.
- The stamp shows date and minute, not just the date.
- After loading once, the Library keeps its list if a refresh fails.
- Home re-checks the song count on return from the Library.
- Added `app/playOrder.test.mjs`. No test file existed to copy. No new packages.
- Guesses and Mine: shuffle skips any song whose value is "mine", including the 73 guessed ones, as NEXT words it.

**Not done:** The Hidden list screen (batch 4 or wherever BATCH-PLAN puts it). `/songs?hidden=1` is ready, but today a not-mine song comes back only by Undo or a laptop change. ROADMAP has no ticks: the queue item has no ROADMAP ID, and 1.18 is only half done.

**Decisions needed:** None.

**Open risks:**
- A large bulk sweep holds the write lock for the whole list, so a laptop command could hit its 5-second wait. Batch 4 should measure this.
- If a song is marked Not mine with a pending retry and its id later changes through a merge, the laptop refuses the change. It's rare, and the red line on the Library says so.

**Proposed next step:** Batch 2: Safety and pull, after the phone checks.

**Pitch:** Undo returns to the spot in the song, not the top: a mis-tap while listening shouldn't lose your place.
