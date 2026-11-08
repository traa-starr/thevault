# NEXT: Batch 6.6, Compare in place + lock-screen first press (over the air)
Written by chat, 2026-11-07.
Log: 6.5 phone results; Compare lives inside the normal player, the Compare word becomes the wheel, Back becomes Done (mine); wheel momentum (mine); lock-screen double press is a bug; board skipped and Compare freeze not broken (chat); player buttons in Compare (chat-default). See the rows "Batch 6.5 phone" and "Batch 6.6 calls" at the end of `DECISIONS.md` (logged by chat)
Queue after this: Phase 1 "Done when" with me (away, screen locked, laptop asleep). Then `/verify`, then the Phase 2 plan session.
Read: this file, last 3 rows of `DECISIONS.md`, the `publish` line in `COMMANDS.md`. Code of `Player.tsx`, `Compare.tsx` (CompareDial), `compareStore.ts`, `compareEngine.ts`, `playerStore.ts` as needed.
Session: Opus, medium effort. No build: app code only, ships over the air.
## Parts
a. **Compare stays inside the normal player.** The player's controls (Previous, Play/Pause, Next, the Shuffle line) never change, fade or move in Compare: remove the separate Compare row with its own Play and Done. In Compare, Play/Pause controls the version that's sounding; Previous/Next keep today's rule (another song ends Compare). The Compare word itself becomes the wheel in the same spot, right of "Versions · N": about the size of the word, a quiet pill like the model picker in the Claude app, name in Compare's blue plus a dim "3/5", scroll up/down to switch, no tap to expand. While comparing, Back turns into Done (same spot, Done does what it does today); after Done it says Back again and the wheel turns back into the word. Nothing else on the screen moves when Compare opens or closes.
b. **Wheel momentum.** A flick travels several versions and settles where it stops, like the iPhone picker; never snaps back after one step. Only the version it lands on sounds, passing rows stay silent. Keep 6.5's rules: a row that can't sound goes back after 0.6 s, the name always matches what you hear.
c. **Lock screen, first press.** Every pause or play from the lock screen works on the first press, in Compare and in normal playback (today each needs two). Find why; add a test where the engine allows.
d. **Ship it.** Run tsc and the engine tests, then the `publish` line yourself. No GitHub build. REPORT gives the publish result line.
**Stop line:** a and c first, then b. Whatever doesn't fit ships in the next over-the-air round.
## Phone check (no build: server running, close and reopen the app, the home screen's bottom line shows the new Update time)
1. Play TOXICBRAT, tap Compare. Pass: the Compare word turns into the small wheel in place; Previous, Play, Next don't change or move; Back says Done. Nothing else moves.
2. Flick the wheel hard, then slowly, 10 times. Pass: a hard flick goes several versions and settles where it stops, no snapping back, the name always matches what you hear.
3. In Compare, tap the player's Play/Pause. Pass: it pauses and resumes the version you hear.
4. Tap Done. Pass: Done says Back again, the wheel is the Compare word again, right away.
5. Lock the phone and pause/play from the lock screen, once in Compare and once on a normal song. Pass: each works on the first press.
