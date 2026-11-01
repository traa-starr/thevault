# Report

**Step:** Build upkeep + storage options, 2026-10-31.

**Verified by running:**
- `git status --short`: 2 files modified, 1 new.
- Repo check (`python .claude/scripts/check_repo.py`): clean.
- Workflow read back by eye (no YAML tool installed here). **Unproven until a build fails:** I did not force a failure.

**Needs the phone:** None.

**Changed:** `.github/workflows/build-ios.yml`, `docs/ROADMAP.md` (1.11 ticked, "built, unproven"), new `docs/STORAGE-OPTIONS.md`, plus `docs/REPORT.md` and `docs/STATUS.md`.

**Differed from NEXT.md:**
- 1.11: the log upload step sits at the end of the job with `if: failure()`, so it runs after any earlier failure. It uses `if-no-files-found: ignore`, so a failure before Xcode starts (for example `npm ci`) saves no log and doesn't add a second error. Xcode's output now goes through `tee` into the runner's temp folder before `tail -40`. The console view is the same as before.
- The memo adds two small calls to the storage choice, because the layout is also hard to undo: where tags attach (version vs song) and how audio is filed (by hash vs readable names). Both are on the Approve sheet.

**Not done:** Nothing. No database, no folders, no app or server code.

**Decisions needed:** The three picks on the Approve sheet in `docs/STORAGE-OPTIONS.md`. They're hard to undo, so there's no default. Recommendation: C (journal), tags on the version, audio filed by hash.

**Proposed next step:** After your picks at `Review.`, build ROADMAP 1.1 (library folder + database) from them.

**Pitch:** Add a `doctor` check that confirms the library marker file is found before any scan or backup runs. It stops a wrong drive letter from silently starting an empty library.
