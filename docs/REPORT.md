# Report

**Step:** Prototype player screen (ROADMAP 1.13), 2026-11-01. Unfinished: the build run waits for your push.

**Verified by running:**
- `npm run typecheck` in `app/`: no errors.
- `npx expo export --platform ios`: the app bundles without errors.
- `python .claude/hooks/test_guard_music.py`: 39/39. `python .claude/scripts/check_repo.py`: clean.

**Not proven yet:** the player has never been run or touched. The checks above only show the code is well formed, so how the buttons and seek bar behave is untested until the phone check.

**Needs the phone:** after the push.
1. On GitHub: Actions > Build iOS (unsigned) > Run workflow, leave App folder as `app`. Wait for the green tick.
2. Open the run, download `unsigned-ipa`, unzip it to get `TheVault.ipa`, and get that file onto the phone as before.
3. In SideStore: install `TheVault.ipa` over the current app. Bundle ID is unchanged, so it should update in place.
4. On the laptop: `python server/vault_cli.py serve E:\VaultLibrary`.
5. Open The Vault. Pass: "1,395 songs on the laptop", without retyping the address.
6. Tap "Open player". Pass: "Fake Song One" at 0:00.
7. Tap Play. Pass: the button says Pause and the time and bar move. Tap Pause. Pass: they stop.
8. Drag the seek bar, and tap a spot on it. Pass: the knob follows and the time matches.
9. Tap Next and Previous. Pass: the title changes and time goes back to 0:00. Previous from the first song goes to the last.
10. Tap Back. Pass: the laptop line is still there.

**Changed:** `app/Player.tsx` (new), `app/App.tsx`, `app/README.md`, `docs/STATUS.md`, `docs/REPORT.md`, `docs/ROADMAP.md`.

**Differed from NEXT.md:**
- Picked: when a song's pretend time runs out, the next song starts. Next and Previous wrap around the list.
- Picked: Previous always changes the song. "Restart the song first" can wait for the real player (1.15).
- Picked: the seek bar is hand-built, with no new add-on, so the build setup stays as it was.
- Picked: "Open player" also shows while typing an address, so the player works with no laptop set.

**Not done:** the build run. It builds from GitHub, so it needs your push.

**Decisions needed:** None hard-to-undo.

**Proposed next step:** finish this phone check, then ROADMAP 1.14 library list.

**Pitch:** Show the player's song position as remaining time on tap, like most players, once real playback lands in 1.15.
