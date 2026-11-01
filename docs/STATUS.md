# Status

**Phase 0 closed.** Updated 2026-10-31 by Code. How we work: `WORKFLOW.md`. Build order: `ROADMAP.md`.

**In progress:** nothing.
**Next up:** me: read `spike/output/duplicate-names.md` on the laptop, sort any same-name files, then `Review.` in chat with my pick (C or D).
**Current task:** `NEXT.md` "Duplicate-names report" is built. Audio filing waits for my pick.

## Done
- Music guard proven; music folders unchanged after the spikes. `.gitignore` proven. Untethered audited.
- Spikes D1-D6 passed or logged: `SPIKE-RESULTS.md`. First iOS build and D4c sideload passed.
- Architecture memo finished (G1). The four calls approved 2026-10-31 (G2): client C, all on E:, backup to C: then phone, BandLab hand export. See DECISIONS.
- Phase 0 closed (G3): summary at top of DECISIONS, empty `app/` and `server/` with READMEs.
- ROADMAP 1.11 built: full Xcode log saved as a run artifact on a failed build. Not proven until a build fails.
- Storage options memo written and reviewed (ROADMAP 1.1, options only): `STORAGE-OPTIONS.md`. Nothing built.
- Duplicate-names report built (`spike/dup_names.py`, output in `spike/output/`): 1,718 files, 125 repeated names, 26 date-only names.

## Queue after NEXT
1. I pick audio filing from the report at `Review.`.
2. ROADMAP 1.1 built (library folder + database).
3. ROADMAP 1.2 read-only scanner, then the stream-and-sort items 1.19-1.22 (options on how sorting works come first).
4. ROADMAP 1.10 `doctor` script, with Code's pitch: also confirm the library marker file is found before any scan or backup runs.

## Open questions
- Audio filing (C fingerprint folder / D mirror my names): hard to undo, mine to choose; waits for the report.
- How sorting mine / not mine works on the phone (swipe each, bulk by folder first, short previews): options before ROADMAP 1.19.
- Does SideStore keep app data across re-signs? (needs the real app, ROADMAP 1.18)
- Does BandLab export keep the title, and what formats? (one test song, ROADMAP 5.1)

## Phone checks pending
None.
