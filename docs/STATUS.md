# Status

**Phase 0.** Updated 2026-10-31 by chat. How we work: `WORKFLOW.md`.

**In progress:** Log D4/D5 results + first build run, part c (waiting on the build run).
**Next up:** me: push the 17:58 commit if not pushed, let the build finish, confirm server/Expo/`tailscale serve` are off, then Code: `/next` (resumes part c).
**Current task:** `NEXT.md`, "Log D4/D5 results + first build run".

## Done
- Music guard proven on a dummy folder (39/39 fake calls, live write/delete/rename blocked, reads work). Music folders unchanged after the spikes.
- `.gitignore` proven. Docs written. Untethered audited (`AUDIT-untethered.md`).
- Spikes D1, D2, D3, D4a, D4b, D5, D6: `SPIKE-RESULTS.md`. Skills updated from chat's versions. Build workflow checked as far as Windows allows.
- BandLab research: `BANDLAB-OPTIONS.md`. Draft architecture memo: `ARCHITECTURE-OPTIONS.md`.
- Chat + Code workflow set up and tightened (who writes what, `Next up` line): `WORKFLOW.md`, `CHAT-INSTRUCTIONS.md`.

## Queue after NEXT
1. D4c: install iTunes + iloader + SideStore, install `.ipa`, test lock screen, background, re-sign.
2. Finish `ARCHITECTURE-OPTIONS.md` with results, then I approve in DECISIONS.md.
3. If the build fails: save the full Xcode log as an artifact (chat-default; can be one of part c's 2 fixes).
4. Later: `doctor` script that checks Tailscale, server and guard before phone tests (deferred until after D4c).

## Open questions
- Client option C? Library at `E:\VaultLibrary`? Database backup into iCloud? BandLab method A?
- FL projects have no backup: decide separately.
- Is E: an internal drive with enough space?
- Does SideStore keep app data across re-signs? (D4c)
- Does exporting from BandLab keep the title, and what formats does your app offer? (one test song)

## Phone checks pending
- The build run on GitHub Actions (NEXT phone check 1): started, in progress.
