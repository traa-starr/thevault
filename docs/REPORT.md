# REPORT
**Step:** Batch 6.7, Compare lock-screen play + Compare word spot (over the air). Parts a, b, c, d, 2026-11-07.

## Verified by running
- `tsc --noEmit`: clean. compareEngine tests: all rules pass (new 27, 28). playOrder tests: ALL PASSED.
- New test 27 (lock-screen pause, then play 0.3 s later, 3 rounds) failed on the old code ("round 1: the lock-screen play is not undone") and passes on the fix.
- `publish`: "Published update 20261108-014050 (runtime 1)".

## What was found (a)
After Compare followed any change (a lock-screen pause included), it ignored the lock-screen player for 1.5 s, treating a mismatch as its own command still on its way, and undid it. A play pressed within 1.5 s of the pause was paused again. Fix: once the lock-screen player has done what Compare last asked or adopted, any later change counts as outside at once. The 1.5 s wait now only covers Compare's own command before it lands (test 28: a slow start isn't read as a pause). Also: the lock screen re-reads playing on every change in Compare too, not only in normal playback.

## Needs the phone
Server running, close and reopen the app; home screen bottom line reads "Update 2026-11-08, 01:40" (or similar).
1. Open TOXICBRAT. Pass: the Compare word sits at the right, ending where the wheel's right edge will be. Tap Compare: the wheel opens there, nothing else moves. Done: the word is back in the same spot.
2. In Compare, lock the phone, pause then play from the lock screen, 3 times. Pass: every press works first time, no self-pause.
3. Normal song, same on the lock screen 3 times. Pass: still first press. Then on the home screen, long-press the bottom "Update ..." line. Pass: a "Lock-screen log" box shows your presses with times ("Queue player: paused/playing", "Compare follows the lock screen: ..."). "Copy all" opens the share sheet, where Copy is.

## Changed
`app/compareEngine.ts`, `app/compareEngine.test.mjs`, `app/compareStore.ts`, `app/playerStore.ts`, `app/Player.tsx`, `app/App.tsx`, new `app/pressLog.ts`, `docs/` (REPORT, STATUS, DECISIONS).

## Differed from NEXT.md
- Log lives in memory only (last 300 lines, empty each time the app opens), so do check 3's long press without closing the app. Copy goes through the share sheet: a clipboard module would need a full build.
- Compare engine gets the log passed in, so its tests still load it on their own.

## Not done
Nothing.

## Decisions needed
None.

## Proposed next step
Phone checks 1-3, then Phase 1 "Done when" with you.

## Pitch
Keep the log's last session on the phone in a file, so a problem after a restart can still be read.
