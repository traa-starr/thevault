# Report

**Step:** Library list (ROADMAP 1.14), 2026-11-01. Unfinished: the build run waits for your push.

**Verified by running:**
- `npm run typecheck` in `app/`: no errors.
- `npx expo export --platform ios`: the app bundles without errors.
- `python server/test_server.py` and `python server/test_doctor.py`: all passed, including a new check that the list gives dates.
- `python .claude/hooks/test_guard_music.py`: 39/39. `python .claude/scripts/check_repo.py`: clean.
- Real database, read-only: 1,395 songs, all 1,395 with a date (1,204 full dates, 191 year only).

**Not proven yet:** the Library screen has never been run or touched. Scrolling, sorting and filtering are untested until the phone check. The real server hasn't answered with the new date field either, only the test one.

**Needs the phone:** after the push.
1. On GitHub: Actions > Build iOS (unsigned) > Run workflow, leave App folder as `app`. Wait for the green tick.
2. Open the run, download `unsigned-ipa`, unzip it to get `TheVault.ipa`, and get that file onto the phone as before.
3. In SideStore: install `TheVault.ipa` over the current app.
4. On the laptop: `python server/vault_cli.py serve E:\VaultLibrary`. If it was already running, stop and restart it, or dates won't show.
5. Open The Vault. Pass: "1,395 songs on the laptop". Tap "Open player", then Back. Pass: both still work.
6. Tap "Open library". Pass: "1,395 songs", each row showing a title and a line like "2024-05-01 · On the laptop".
7. Flick all the way to the end. Pass: it reaches the last song without stalling.
8. Tap Newest. Pass: the order changes, latest dates on top. Tap A-Z. Pass: back to title order.
9. Type part of a title. Pass: the list narrows and the count reads like "42 of 1,395". Type nonsense. Pass: "No titles match".
10. Stop the server, tap Back, tap "Open library". Pass: "Laptop not reachable" within about 10 seconds, no crash.
11. Restart the server, tap "Try again". Pass: the list comes back.

**Changed:** `app/Library.tsx` (new), `app/App.tsx`, `app/README.md`, `server/vault_server/server.py`, `server/test_server.py`, `docs/STATUS.md`, `docs/REPORT.md`, `docs/ROADMAP.md`.

**Differed from NEXT.md:**
- Server: the list answer existed but had no date, so I added one read from the database. Still no writes and no music folder access.
- Picked: the detail line shows both date and where it lives, not one or the other.
- Picked: a "Try again" button on the not-reachable message.
- Picked: "Open library" stays hidden until a laptop address is saved.
- Picked: a year-only date sorts just after the full dates of that year when newest first. Those dates are guesses from tags or file times, so "Newest" is only as good as they are.
- Picked: switching sort jumps back to the top of the list.

**Not done:** the build run. It builds from GitHub, so it needs your push.

**Decisions needed:** None hard-to-undo.

**Proposed next step:** finish this phone check, then settle the 1.15 vs 1.20 order question before the real player.

**Pitch:** A small A-Z strip down the side of the list, because 1,395 songs is a long flick to reach the middle.
