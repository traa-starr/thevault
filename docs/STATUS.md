# Status

**Phase 0 closed.** Updated 2026-10-31 by Code. How we work: `WORKFLOW.md`. Build order: `ROADMAP.md`.

**In progress:** nothing.
**Next up:** me: commit, read `STORAGE-OPTIONS.md`, then in chat type `Review.` with my three picks.
**Current task:** `NEXT.md` "Build upkeep + storage options" is finished. Awaiting review.

## Done
- Music guard proven; music folders unchanged after the spikes. `.gitignore` proven. Untethered audited.
- Spikes D1-D6 passed or logged: `SPIKE-RESULTS.md`. First iOS build and D4c sideload passed.
- Architecture memo finished (G1). The four calls approved 2026-10-31 (G2): client C, all on E:, backup to C: then phone, BandLab hand export. See DECISIONS.
- Phase 0 closed (G3): summary at top of DECISIONS, empty `app/` and `server/` with READMEs.
- ROADMAP 1.11 built: full Xcode log saved as a run artifact on a failed build. Not proven until a build fails.
- Storage options memo written (ROADMAP 1.1, options only): `STORAGE-OPTIONS.md`. Nothing built.

## Queue after NEXT
1. I choose the storage picks in chat at `Review.`.
2. ROADMAP 1.1 built from that choice (library folder + database).
3. ROADMAP 1.2 read-only scanner.

## Open questions
- Storage picks (shape, where tags attach, audio filing): hard to undo, mine to choose.
- Does SideStore keep app data across re-signs? (needs the real app, ROADMAP 1.18)
- Does BandLab export keep the title, and what formats? (one test song, ROADMAP 5.1)

## Phone checks pending
None.
