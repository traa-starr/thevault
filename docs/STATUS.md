# Status

**Phase 0 closed.** Updated 2026-10-31 by chat. How we work: `WORKFLOW.md`. Build order: `ROADMAP.md`.

**In progress:** nothing.
**Next up:** me: new Code session, type `/next`.
**Current task:** `NEXT.md` "Library folder and database" (ROADMAP 1.1). Code copies `spike/output/triage-decisions.json` (the only copy of my sorting) into the library in part c.

## Done
- Music guard proven; music folders unchanged after the spikes. `.gitignore` proven. Untethered audited.
- Spikes D1-D6 passed or logged: `SPIKE-RESULTS.md`. First iOS build and D4c sideload passed.
- Architecture memo finished (G1). The four calls approved 2026-10-31 (G2): client C, all on E:, backup to C: then phone, BandLab hand export. See DECISIONS.
- Phase 0 closed (G3): summary at top of DECISIONS, empty `app/` and `server/` with READMEs.
- ROADMAP 1.11 built: full Xcode log saved as a run artifact on a failed build. Not proven until a build fails.
- Storage options memo written and reviewed (ROADMAP 1.1, options only): `STORAGE-OPTIONS.md`. Nothing built.
- Duplicate names done: I sorted every repeated name with Code. Now 1,395 files, no repeated names (`flip` kept on purpose, 3 versions), 26 date-only names. Decisions: `spike/output/triage-decisions.json` (gitignored, laptop only). Nothing moved or deleted.
- Audio filing decided (2026-10-31): fingerprint folder with the real filename inside, `audio/<short code>/<real filename>`. Browse folder of my names parked.

## Queue after NEXT
1. ROADMAP 1.2 read-only scanner, including turning my name lists into per-file verdicts, not names.
2. Options on how sorting works, then the stream-and-sort items 1.19-1.22.
3. ROADMAP 1.10 `doctor` script, with Code's pitch: also confirm the library marker file is found before any scan or backup runs.

## Open questions
- How sorting mine / not mine works on the phone (swipe each, bulk by folder first, short previews): options before ROADMAP 1.19.
- Does SideStore keep app data across re-signs? (needs the real app, ROADMAP 1.18)
- Does BandLab export keep the title, and what formats? (one test song, ROADMAP 5.1)
- `SAVE ME` stays in for now: not sure it's mine.
- `ANY WAY new limit.wav` is the newest version but wav only: needs a compressed render (ROADMAP 1.7).
- The 8 same-render copies keep the `Music` copy (chat-default, not stated by me): say if wrong.
- 26 date-only names and the auto-named `Untitled...` files wait for later.

## Phone checks pending
None.
