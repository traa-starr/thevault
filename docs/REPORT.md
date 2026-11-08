# Report

**Step:** Batch 6.6, Compare in place + lock-screen first press (over the air). Parts a, b, c, d, 2026-11-07.

## Verified by running
- `tsc --noEmit`: clean. `compareEngine.test.mjs`: all rules pass (2 new: lock-screen pause and play landing mid-seek). `playOrder.test.mjs`: ALL PASSED (1 new: a flick rests where it lands). Guard test 39/39.
- New test 25 failed on the old engine (the pause was re-played), passes on the new one.
- `publish`: "Published update 20261108-005832 (runtime 1)".

## Needs the phone
`NEXT.md` "Phone check" 1-5 (server running, close and reopen the app; home line shows the new Update time).

## Changed
app/Compare.tsx, app/Player.tsx, app/compareEngine.ts, app/compareEngine.test.mjs, app/engine.ts, app/playOrder.ts, app/playOrder.test.mjs, app/playerStore.ts, docs/STATUS.md, docs/REPORT.md.

## What was found (c, lock screen)
- Compare: when a lock-screen press landed while the queue's player was being lined up (a seek under way), Compare's tick played it again at once, so a second press was needed. Fixed: it never undoes a lock-screen press; it adopts it once the seek ends. Tested.
- Normal playback: no single cause proven from code. Two fixes: (1) the player thought it still held the lock screen after Compare from Library took it, so title updates did nothing; it now always re-claims fully (the old "update" call also blanked the lock screen before refilling it). (2) Every play/pause change makes the lock screen re-read the state, so its button can't lag a press behind. Check 5 tells us if that was it.
- (b) Cause of "moves one, snaps back from two": the wheel's rule picked the first row past the start, not where it landed. Now it rests where it lands; momentum set to the iPhone's normal speed.

## Differed from NEXT.md
- Shuffle in Compare ends Compare first, like Previous/Next (NEXT didn't say).
- The Compare word sits in a fixed 168-pt slot so the wheel fits without moving anything; the Versions row shifts left once (~45 pt) compared to 6.5, and stays put when Compare opens or closes.

## Not done
Nothing.

## Decisions needed
None.

## Proposed next step
Phone checks 1-5, then Phase 1 "Done when" with you.

## Pitch
Lock-screen test mode: a hidden home-screen line that logs each lock-screen press and what the player did, so the next "two presses" bug is read off the phone, not guessed.
