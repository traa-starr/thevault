# Report

**Step:** Stream real songs into the player (ROADMAP 1.20 + core of 1.15), 2026-11-01. Build run waits for your push.

**Verified by running:**
- `npm run typecheck`: no errors. `npx expo export --platform ios`: bundles.
- Throwaway test of the play order (200 shuffle runs): no repeats, plays the whole list, previous retraces, off returns to list order.
- `python server/test_server.py`: all passed, including cloud-only files answering "not on laptop yet" unopened. Server unchanged.
- Guard test 39/39. Repo check clean.

**Not proven yet:** no sound has played in this build. Real streaming, seeking and the laptop-off message are only testable on the phone.

**Needs the phone:** this build adds a native audio part, so the new `.ipa` is required.
1. Push. GitHub: Actions > Build iOS (unsigned) > Run workflow, App folder `app`. Wait for the green tick.
2. Download `unsigned-ipa`, unzip, get `TheVault.ipa` to the phone, install over the app in SideStore.
3. Laptop: `python server/vault_cli.py serve E:\VaultLibrary`.
4. Open library, tap a song "On the laptop". Pass: sound within a few seconds.
5. Drag the seek bar, then tap elsewhere on it. Pass: jumps and keeps playing.
6. Next, Previous. Pass: the neighbours in the list, never a cloud-only song.
7. Back. Tap a "Cloud only" row. Pass: greyed, nothing happens.
8. Tap Shuffle in the Library. Pass: random song, "Shuffle: on". Next gives another; Previous returns to the one before.
9. Tap "Shuffle: on" to turn it off, then Next. Pass: the next song in list order.
10. Filter to a few titles, tap one, Next. Pass: stays within those titles.
11. Stop the server mid-song. Pass: "Laptop not reachable", no crash. Buffered audio may play on first, so allow up to a minute.

**Changed:** `app/App.tsx`, `app/Library.tsx`, `app/Player.tsx`, `app/playOrder.ts` (new), `app/README.md`, `app/app.json`, `app/package.json`, `app/package-lock.json`, `docs/STATUS.md`, `docs/REPORT.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`.
**Differed from NEXT.md (all reversible picks):**
- Added `expo-audio`, the package the spike proved, with background playback on as in the spike.
- Back stops the music. "Open player" is gone from home; the player opens from the Library.
- Shuffle stops with "Played every song in this list" when it runs out. List order wraps round.
- Previous at the first shuffled song restarts it.
- "File missing" rows also can't be tapped. After a phone call the button may say Pause while silent: tap Pause, then Play.

**Not done:** build run (needs your push). Queue and remaining-time tap stay for 1.15.

**Decisions needed:** How Not mine saves. Recommendation and default: a new file, `verdicts-journal` style, in `E:\VaultLibrary`, one added line per tap (song id, mine or not mine, time); the database is updated from it. Undo adds a line reversing the last one, so nothing is erased. The server gets one write route and stays read-only for music files; the song list leaves out not-mine songs. Before building, Code checks this against the existing verdict journal and reuses it if it fits.

**Proposed next step:** phone check, then "Not mine in the player".

**Pitch:** A now-playing bar in the Library, so music keeps going while you browse.
