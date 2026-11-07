# Report
**Step:** Batch 6.2, Restore, survival and inline Compare, 2026-11-06. Parts 0, 1, a, b done.

## Verified by running
- `python server/test_server.py`: ALL PASSED, incl. 12 new `/phone-backup` checks (replace whole, refusals, journal untouched).
- `node --experimental-strip-types app/playOrder.test.mjs`: ALL PASSED (4 new dial-skip checks). `test_backup.py`: ALL PASSED.
- `npx tsc --noEmit` in `app/`: no errors. `check_repo.py`: clean.

## Needs the phone
See STATUS "Checks pending" (7 checks). New build first (GitHub build, then SideStore).

## Changed
`app/`: Compare.tsx (now the inline dial), compareStore.ts, Player.tsx, App.tsx, Library.tsx, Sort.tsx, Cards.tsx,
Versions.tsx, nav.tsx, outbox.ts, playerStore.ts, playOrder.ts + test, new `phoneBackup.ts`, new `Notices.tsx`.
`server/`: vault_server/server.py, backup.py, test_server.py. Docs: DECISIONS, STATUS, MAP, REPORT, new
`board/batch-6-2-restore.md`, new `DESIGN-NOTES.md`.

## Differed from NEXT.md
- 0a: couldn't reproduce the 2-place jump off the phone. Likely cause: a late scroll event from the dial's own move to
  the skipped-to row. Fix: the skip is now one tested rule (nearest playable row in the swipe's direction), and the dial
  ignores its own echo. Nothing playable that way: it rests on the marked row ("Not on this phone"), never a dead stop.
- a: added a phone backup on the laptop (`phone-backup.json`, your call): Not sure pile, a copy of unsent changes, last
  song and spot, 2 settings. Sent on open, on going to the back, 3 s after a change, every 5 min. A fresh install asks
  for it before sending one, so an empty phone can't overwrite it. Also: "N changes waiting to send" line on Library,
  Sort and home; "Welcome back" card naming what came back; "Fresh install: connect to your laptop" when it's off.
- b: Mine / Not mine buttons, Shuffle and swipe-up-to-Queue hide while Compare is open (they act on the queue's song,
  not the version you hear). Closing the player any way = Done. Compare's old screen and its own seek bar are gone.
- Not sure pile backs up within 5 min or on going to the back, not on each tap (avoids a file loop between modules).

## Not done
- The laptop address must still be retyped after a reinstall (Keychain parked, your call).

## Decisions needed
- None blocking. Board defaults taken: 48 pt dial row, Compare reads Done while open, song end stops at 0:00 (4d rule).

## Proposed next step
Phone checks, then Phase 1 "Done when" with you (away from home, screen locked, laptop asleep), then the Phase 2 plan session.

## Pitch
A design-system file (colours, sizes, spacing in one place) before the overhaul, so the redraw is one change. Ideas list in `DESIGN-NOTES.md`.
