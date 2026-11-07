# Report

**Step:** Batch 6.5, over-the-air updates + last Compare fixes (build). Parts 0, b, c, a, d, 2026-11-07.

**Verified by running:** `tsc --noEmit`: clean. `expo export --platform ios`: bundles (1,205 modules). `compareEngine.test.mjs`:
all rules pass (24 tests; 2 new lock-screen tests fail on the old engine). `playOrder.test.mjs`, `test_server.py`, `test_doctor.py`:
ALL PASSED. New `test_updates.py`: ALL PASS (17). Guard 39/39. `check_repo.py`: clean.
Part 0 proven on the laptop: a real `publish` into a throwaway library, then `GET /update` answered 200 multipart with
runtime 1, and the 3.3 MB bundle downloaded with a matching hash. `expo config` shows the updates settings in the build.

**Needs the phone:** new build first (adds expo-updates, native). Restart the laptop server (level 3). The 6 checks below.

**Changed:** app/App.tsx, Compare.tsx, Player.tsx, app.json, compareEngine.ts, compareEngine.test.mjs, compareStore.ts,
package.json, package-lock.json, phoneBackup.ts, playerStore.ts, new app/updates.ts; server/vault_cli.py,
vault_server/server.py, new vault_server/updates.py, new test_updates.py; docs/COMMANDS.md, STATUS, REPORT, DECISIONS.

**Done:**
- 0: build holds a placeholder update address; the app points updates at the typed laptop address (counts from the next
  open). Laptop serves `/update` (Expo protocol v1, iOS only, runtime must match) and `/update-files/...` from
  `E:\VaultLibrary\updates` (last 5 kept). On open, a new update reloads the app at once if nothing plays (first minute),
  else it's used next open. Home screen's bottom line shows "Update <date>, <time>" when running one. Server level 3.
- b: the engine follows the player the lock screen drives (the queue's, even when silent). Compare word uses one fade node.
- c: Mine/Not mine show only by the eye; in Compare they stay as the eye says, dimmed, no taps. Sorted songs open hidden,
  unsorted showing; a hand flip lasts to the next song; Done on another version keeps the eye.
- a: vertical wheel, one row, name in Compare's blue + dim "3/5", snaps; a wheel stopped between rows finishes on its row;
  a row that can't sound goes back to the one you hear after 0.6 s; a version lining up shows dimmed. Play/Done are text.
- d: no haptic on Compare tap or flips; light tick on queue grab and each spot passed (`onIndexChange`).

**Differed from NEXT.md:**
- Check 0's "visible word": the home screen's bottom line ("Build N..." becomes "Update <date>, <time>"), so no second commit.
- Override needs one close/reopen after installing before updates count (Expo rule). Laptop off: the check fails quietly.
- Anti-bricking is off (Expo requires it for a typed address): a crashing update may need a reinstall. Publish only tested code.
- Runtime version is a fixed "1" in app.json: raise it with any native change, or old builds would get code they can't run.
- Eye and Done-word fixes have no automated test (React and expo modules don't run in node). Only expo-updates is native.

**Not done:** nothing in scope. **Decisions needed:** none.

**Proposed next step:** phone checks 0-5, then chat Review; then Phase 1 "Done when".

**Pitch:** `publish` refuses unless tsc and the engine tests pass first, so a broken update can't reach the phone.
