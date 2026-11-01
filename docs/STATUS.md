# Status

**Phase 0 closed.** Updated 2026-10-31 by Code. How we work: `WORKFLOW.md`. Build order: `ROADMAP.md`.

**In progress:** nothing.
**Next up:** me: check `E:\VaultLibrary`, commit and push, then `Review.` in chat.
**Current task:** `NEXT.md` "Library folder and database" is built (ROADMAP 1.1); waiting for chat's review.

## Done
- Music guard proven; music folders unchanged after the spikes. `.gitignore` proven. Untethered audited.
- Spikes D1-D6 passed or logged: `SPIKE-RESULTS.md`. First iOS build and D4c sideload passed.
- Architecture memo finished (G1). The four calls approved 2026-10-31 (G2). Phase 0 closed (G3).
- ROADMAP 1.11 built: full Xcode log saved on a failed build. Not proven until a build fails.
- Storage options decided: shape C (journal), tags on the song, audio filed `audio/<code>/<real filename>`.
- Duplicate names done: 1,395 files, no repeated names (`flip` kept on purpose). Decisions in `spike/output/triage-decisions.json` (gitignored).
- **ROADMAP 1.1 built (2026-10-31):** library at `E:\VaultLibrary` with marker, `audio/`, `phone/`, `vault.db`, `journal.jsonl`, and a copy of my sorting file. Code in `server/vault_server/`. Self-test passes (28 checks). Empty so far: no scanner yet.

## Queue after NEXT
1. ROADMAP 1.2 read-only scanner, including turning my name lists into per-file verdicts, not names.
2. Options on how sorting works, then the stream-and-sort items 1.19-1.22.
3. ROADMAP 1.10 `doctor` script: also confirm the library marker is found before any scan or backup runs (and run the library self-test, Code's pitch).

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
