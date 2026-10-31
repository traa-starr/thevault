# Status

**Phase 0.** Updated 2026-10-31 by Code. How we work: `WORKFLOW.md`. Build order: `ROADMAP.md`.

**In progress:** None.
**Next up:** me: commit and push, then in a new chat in the Project type `Review.`
**Current task:** `NEXT.md`, "Finish ARCHITECTURE-OPTIONS.md for my approval": done, waiting for review.

## Done
- Music guard proven on a dummy folder (39/39 fake calls, live write/delete/rename blocked, reads work). Music folders unchanged after the spikes.
- `.gitignore` proven. Docs written. Untethered audited (`AUDIT-untethered.md`).
- Spikes D1, D2, D3, D4a, D4b, D5, D6: `SPIKE-RESULTS.md`. Skills updated from chat's versions.
- First iOS build on GitHub Actions passed: unsigned `.ipa` produced (artifact expires 2026-11-07; re-run the workflow for a fresh one).
- D4c sideload: PASS on the phone. Refresh in SideStore within 7 days to keep the app working. Spike server, app-file server and `tailscale serve` are off.
- BandLab research: `BANDLAB-OPTIONS.md`. Architecture memo with Approve sheet: `ARCHITECTURE-OPTIONS.md`.
- Roadmap written: every feature, in build order, with who ticks what: `ROADMAP.md`.
- Chat + Code workflow set up and tightened (who writes what, `Next up` line): `WORKFLOW.md`, `CHAT-INSTRUCTIONS.md`.

## Queue after NEXT
1. Me: approve the four calls in DECISIONS.md.
2. Fast-lane: save full Xcode log as an artifact on any failed build.
3. Later: `doctor` script that checks Tailscale, server and guard before phone tests, and stops the test servers after (was the `spike/stop` pitch).

## Open questions
- The four calls: client, library location, database backup, BandLab method (Approve sheet in `ARCHITECTURE-OPTIONS.md`).
- FL projects have no backup: decide separately.
- Does SideStore keep app data across re-signs? (needs the real app)
- Does exporting from BandLab keep the title, and what formats does your app offer? (one test song)

## Phone checks pending
None (D4c reported 2026-10-31).
