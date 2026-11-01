# Report

**Step:** Real app, built and sideloaded (ROADMAP 1.12), 2026-11-01. Unfinished: the build run (part b) waits for your push.

**Verified by running:**
- `npm run typecheck` in `app/`: no errors. `npx expo-doctor`: 20/20 checks passed.
- `npx expo export --platform ios`: the app bundles without errors.
- `npx expo config --type introspect`: name "The Vault", bundle ID `io.github.traastarr.thevault`, Tailscale exception present.
- `python .claude/hooks/test_guard_music.py`: 39/39. `python .claude/scripts/check_repo.py`: clean.

**Not proven yet:** the app has never been compiled or run on a phone. The song count and "not reachable" lines are untested. Build pass/fail and size are unknown.

**Needs the phone:** after the push and a passing build.
1. On GitHub: Actions > Build iOS (unsigned) > Run workflow, leave App folder as `app`. Wait for the green tick.
2. Open the run, download `unsigned-ipa`, unzip it to get `TheVault.ipa`, and get that file onto the phone the way you did for Vault Spike.
3. In SideStore: My Apps > + > pick `TheVault.ipa`.
4. On the laptop: `python server/vault_cli.py serve E:\VaultLibrary`. Note the name in its "On the phone" line.
5. Open The Vault from the home screen: its name is under the icon. Type that name (just the name part, or the whole address) and tap Save. Pass: "1,395 songs on the laptop".
6. Ctrl+C the server, reopen the app. Pass: "Laptop not reachable".
7. Open Vault Spike. Pass: it still opens.

**Changed:** `.github/workflows/build-ios.yml`, `app/README.md`, `app/App.tsx`, `app/app.json`, `app/index.ts`, `app/package.json`, `app/package-lock.json`, `app/tsconfig.json`, `docs/STATUS.md`, `docs/REPORT.md`, `docs/DECISIONS.md`.

**Differed from NEXT.md:**
- Added an address box and a "Change laptop address" link, because the address has to live on the phone. It's saved in a small file in the app's own storage.
- Picked: the build now defaults to `app/`. The spike build still works by typing `spike/vault-spike` as the App folder. The `.ipa` is named after the app, so the spike's name changes too.
- Picked: the app may use plain web addresses for Tailscale names and local names only, because the server doesn't use https. A bare number address may be refused, so use the name.
- Picked: dark screen, and the default Expo icon. A real icon needs an exception to the repo's image rule, so it waits.

**Not done:** the build run. It builds from GitHub, so it needs your push, and the GitHub command tool (`gh`) isn't on this laptop, so you start it.

**Decisions needed:** None hard-to-undo.

**Proposed next step:** finish this phone check, then ROADMAP 1.13 prototype player screen (fast-lane OK).

**Pitch:** Have the server offer a small "/status" answer with just the count, so the app doesn't download all 1,395 song entries just to count them.
