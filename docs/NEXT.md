# NEXT: Batch 6.7, Compare lock-screen play + Compare word spot (over the air)
Written by chat, 2026-11-07.
Log: 6.6 phone results (1-4 pass; 5 half: Compare lock-screen play pauses itself once); Compare word lines up with the pill's right edge (chat-default); lock-screen log added because this is the second fix (chat); board skipped (chat). See rows "Batch 6.6 phone" and "Batch 6.7 calls" at the end of `DECISIONS.md` (logged by chat)
Queue after this: Phase 1 "Done when" with me (away, screen locked, laptop asleep). Then `/verify`, then the Phase 2 plan session.
Read: this file, last 3 rows of `DECISIONS.md`, the `publish` line in `COMMANDS.md`, last REPORT's "What was found". Code of `Player.tsx`, `Compare.tsx`, `compareEngine.ts`, `engine.ts`, `playerStore.ts` as needed.
Session: Opus, medium effort. No build: app code only, ships over the air.
## Parts
a. **Compare lock-screen play, first press.** In Compare, pause from the lock screen already works first time; play doesn't: the lock-screen button flips to playing, then the version pauses itself before any sound, and a second play starts it. Normal playback is fine now, don't change it. Find what pauses it (likely Compare or the queue player undoing the play, the mirror of 6.6's pause fix); add an engine test that fails on today's code and passes on the fix.
b. **Lock-screen log.** Code's 6.6 pitch: a hidden log on the phone that records each lock-screen press and what the player and Compare did next, with times. A way to show it on the phone (for example a long press on the home screen's Update line), copyable as text. Nothing new visible on normal screens. If a's fix fails on the phone, the next step reads this log instead of guessing (two-fails rule).
c. **Compare word spot.** "Versions · N" and the open pill stay exactly where they are now. The closed Compare word moves right so its right edge lines up with the pill's right edge (today it sits at the slot's left, mid-row). Nothing moves when Compare opens or closes.
d. **Ship it.** tsc and the engine tests, then the `publish` line yourself. REPORT gives the publish result line.
**Stop line:** a and c first, then b. If a can't be found from code, ship b and c so the phone log can catch it, and say so in REPORT.
## Phone check (no build: server running, close and reopen the app, the home screen's bottom line shows the new Update time)
1. Open TOXICBRAT. Pass: the Compare word sits at the right, ending where the wheel's right edge will be. Tap Compare: the wheel opens there, nothing else moves. Done: the word is back in the same spot.
2. In Compare, lock the phone, pause then play from the lock screen, 3 times. Pass: every press works first time, no self-pause.
3. Normal song, same on the lock screen 3 times. Pass: still first press. Then open the hidden log (REPORT says how). Pass: it shows your presses.
