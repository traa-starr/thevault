# NEXT: Batch 6.4, Compare feels instant and stays in the player (build)
Written by chat, 2026-11-07.
Log: Board answers and disagreements settled, see the two 2026-11-07 rows at the end of `DECISIONS.md`: open dimmed at the ~3 s cap; phone copies when all versions are on the phone; haptic on every flip; "Compare" label with a fixed-width pulse; "2/4" in the dial label only; no undo after Done; no source switch mid-Compare (logged by chat)
Queue after this: Phase 1 "Done when" with me (away from home, screen locked, laptop asleep). Then `/verify`, then the Phase 2 plan session.
Read: this file, `docs/board/batch-6-4-compare.md` (the plan: Agreed + Tests), last 2 rows of `DECISIONS.md`. Code of `Compare.tsx`, `compareStore.ts`, `compareEngine.ts`, `compareEngine.test.mjs`, `playerStore.ts`, `Player.tsx` as needed.
Session: Opus, medium effort. Parts 0 and 0b are done.
## Parts
a. **Flips instant.** Measure first (phone copy or stream, loaded before or at the flip), write the numbers in REPORT. Then build the board's plan: versions parked as muted players playing in line, about 6 at once nearest first (Code measures the real iPhone limit and logs the call), sticky window, readiness loading / aligned / skipped, flip = both volumes set in one step. Source rule per Q2. Keep every 6.3 one-sound rule. Add the board's tests list to `compareEngine.test.mjs` (a fake clock is fine).
b. **Song keeps playing while Compare gets ready.** Per the board's "The wait": music and controls work normally, "Compare" pulses (fixed width), haptic on the tap, dial shows when every version is aligned or skipped, ~3 s cap, then opens with unready ones dimmed (40%, grey "Not ready", skipped). Late arrivals undim without moving the dial. Haptic on every flip.
c. **Player screen stays still.** One controls slot of fixed height; player mode and Compare mode crossfade inside it (~200 ms); remove the extra "Back to ..." row. Compare row: [play/pause] [dial with version label + "2/4"] [Done]. Subtitle never changes. Lock screen title names the sounding version.
**Stop line:** if the session runs long, c waits. a goes in first.
## Phone check (new build first; server restart not needed unless the doctor says so)
1. Play a grouped song, tap Compare. Pass: music never stops; button pulses; dial fades in; artwork, title and bar don't move at all. Done fades back, no gap.
2. Flip 10 times at a normal pace. Pass: no load you can hear, a light tick each flip, same spot, never two versions at once.
3. Swipe the dial fast 20 times (the song with the most versions). Pass: one version at a time, ends on the one you stopped on, no crash.
4. In Compare, pause 2 minutes, play, flip. Pass: nothing starts by itself; the same drum hit lines up after the flip.
5. Lock the phone mid-Compare, pause and play from the lock screen, unlock. Pass: title is the version playing; pause silences everything; play brings back one version.
6. Stop the server, open Compare on a song with versions missing from the phone. Pass: dial opens within ~4 s, missing ones dimmed and skipped. Start the server again after.
