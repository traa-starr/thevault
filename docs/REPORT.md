# Report
**Step:** Batch 6.1, Downloads and offline play, 2026-11-06. Parts 0, 1, a, b done.

## Verified by running
- `python server/test_import.py`: ALL PASSED (new check: `/kept` stamps each copy, lists no copy-less Mine song).
- `python server/test_server.py`: ALL PASSED. `node --experimental-strip-types app/playOrder.test.mjs`: ALL PASSED.
- `npx tsc --noEmit` in `app/`: no errors. `check_repo.py`: clean. Phone copies on the laptop: 314 songs, 830 MB.
- Part 0: Compare has no gain or loudness code left; every version plays at full volume, its true level.

## Needs the phone
See STATUS "Checks pending" (6 checks). Needs a new build first (GitHub build, then SideStore).

## Changed
`app/offline.ts` (new), `app/App.tsx`, `app/Library.tsx`, `app/playerStore.ts`, `app/compareStore.ts`,
`app/compareEngine.ts`, `server/vault_server/importer.py`, `server/vault_server/server.py`, `server/test_import.py`,
`docs/board/batch-6-offline.md` (new), docs.

## Differed from NEXT.md
- Library now keeps its last song list on the phone, so it opens with the laptop off (needed for checks 3-5; not in NEXT).
- A download that breaks restarts that one song (2.6 MB average), not mid-file. The batch carries on where it was.
- With the laptop off, Next and shuffle pass over songs not on the phone instead of trying them.
- Compare uses phone copies when the laptop isn't known to be on at open, streams the full copy otherwise (4d rule kept).

## Not done
- Downloads run only while the app is open: iOS gives a sideloaded app no dependable background time (board agreed).

## Decisions needed
- None blocking. Board defaults taken (DECISIONS): un-Mined songs leave the phone after 7 days; full = stop, never remove.

## Proposed next step
Phone checks, then Batch 6.2 (restore and survival).

## Pitch
A "Remove from phone / Download now" hold action per song: handy once Mine grows past what 8 GB holds.
