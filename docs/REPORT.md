# Report

**Step:** Phase 1 close: fold DECISIONS. Parts a, b, c, 2026-11-07.

## Verified by running
- Archive `docs/decisions/phase-0-1.md`: 246 table lines (231 rows + headers), same as the 246 in the old DECISIONS. Copied by line range, word for word.
- `docs/DECISIONS.md`: 4,160 bytes (target under 8 KB), was 75,974.
- `check_repo.py`: clean.

## Needs the phone
None.

## Changed
- `CLAUDE.md`, `docs/DECISIONS.md`, `docs/MAP.md`, new `docs/decisions/phase-0-1.md`.

## Differed from NEXT.md
- DECISIONS had two table headings (planning chats, Phase 0), with all Phase 1 rows under the Phase 0 table. Both moved whole, headings included.
- Phase 0 summary kept as is, except its "rows are below" line now points to the archive.
- New table titled "From Phase 2 on", columns Topic | Choice | Why (the most recent table's columns).

## Not done
Nothing.

## Decisions needed
None.

## Proposed next step
`/verify` (fast-lane OK).

## Pitch
A `check_repo.py` warning when DECISIONS goes over 8 KB, so the next fold shows up by itself.
