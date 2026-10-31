# Status

**Phase 0.** Updated 2026-10-31 by chat. How we work: `WORKFLOW.md`.

**In progress:** nothing.
**Next up:** Code: `/next`.
**Current task:** `NEXT.md`, "Log D4/D5 results + first build run". Not started.

## Done
- Music guard proven on a dummy folder (39/39 fake calls, live write/delete/rename blocked, reads work). Music folders unchanged after the spikes.
- `.gitignore` proven. Docs written. Untethered audited (`AUDIT-untethered.md`).
- Spikes D1, D2, D3, D6: `SPIKE-RESULTS.md`. D4a, D4b, D5 passed on the phone (to be written into `SPIKE-RESULTS.md` by NEXT part a).
- BandLab research: `BANDLAB-OPTIONS.md`. Draft architecture memo: `ARCHITECTURE-OPTIONS.md`.
- Chat + Code workflow set up and tightened (who writes what, `Next up` line): `WORKFLOW.md`, `CHAT-INSTRUCTIONS.md`.

## Queue after NEXT
1. D4c: install iTunes + iloader + SideStore, install `.ipa`, test lock screen, background, re-sign.
2. Finish `ARCHITECTURE-OPTIONS.md` with results, then I approve in DECISIONS.md.
3. Later: `doctor` script that checks Tailscale, server and guard before phone tests (deferred until after D4c).

## Open questions
- Client option C? Library at `E:\VaultLibrary`? Database backup into iCloud? BandLab method A?
- FL projects have no backup: decide separately.
- Is E: an internal drive with enough space?
- Does SideStore keep app data across re-signs? (D4c)
- Does exporting from BandLab keep the title, and what formats does your app offer? (one test song)

## Phone checks pending
- None. Next one: the build run on GitHub Actions (NEXT phone check 1).
