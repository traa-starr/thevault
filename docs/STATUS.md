# Status

**Phase 0 closed.** Updated 2026-10-31 by Code. How we work: `WORKFLOW.md`. Build order: `ROADMAP.md`.

**In progress:** nothing.
**Next up:** me: commit and push, then in chat type `Review.`
**Current task:** `NEXT.md` "Close Phase 0" is finished (ROADMAP G3 ticked). Chat writes the next one.

## Done
- Music guard proven; music folders unchanged after the spikes. `.gitignore` proven. Untethered audited.
- Spikes D1-D6 passed or logged: `SPIKE-RESULTS.md`. First iOS build and D4c sideload passed.
- Architecture memo finished (G1). The four calls approved 2026-10-31 (G2): client C, all on E:, backup to C: then phone, BandLab hand export. See DECISIONS.
- Roadmap and chat + Code workflow set up.
- Phase 0 closed (G3): summary at top of DECISIONS, empty `app/` and `server/` with READMEs, CLAUDE.md now allows app code there.

## Queue after NEXT
1. Fast-lane: ROADMAP 1.11, save the full Xcode log as a run artifact on any failed build. No other workflow changes. fast-lane OK.
2. ROADMAP 1.1: how songs, files and versions are stored. Hard to undo: Code brings 2-3 options, I choose.

## Open questions
- FL projects (155) have no backup. Code's pitch: copy to E:. Decide before Phase 5, sooner is fine.
- Does SideStore keep app data across re-signs? (needs the real app, ROADMAP 1.18)
- Does BandLab export keep the title, and what formats? (one test song, ROADMAP 5.1)

## Phone checks pending
None.
