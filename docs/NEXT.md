# NEXT: Batch 6.1, Downloads and offline play
Written by chat, 2026-11-06.
Log: Batch 4d phone checks 1-6 all passed. No level match in Compare: part c dropped, true levels, no toggle (mine). Batch 6 split into 6.1 (downloads, offline play) and 6.2 (restore, survival) (chat-default) (logged by chat)
Queue after this: Batch 6.2 "Restore and survival" (BATCH-PLAN 6c-d, ROADMAP 1.18 final). Then Phase 1 "Done when" with me.
Read: this file, `BATCH-PLAN.md` Batch 6, ROADMAP 1.17 and 1.18, `BOARD.md`. Code of `engine.ts`, `playerStore.ts`, `Library.tsx`, server `/audio` and phone-copy routes as needed.
Session: Opus, medium effort. Board seats on Sonnet.
## Parts
0. **Tidy 4d.** Compare plays every version at its true level: no loudness measuring, no toggle, gains at 1. Remove anything level-match from the 4d code that would change volume. One line in REPORT confirming.
1. **Board pass** (all four seats, one round, notes in `docs/board/batch-6-offline.md`, under 60 lines). Brief: kept (Mine) songs get stored on the phone so they play with the laptop off. Seats answer: does it download all Mine songs automatically or do I pick; where I see progress and what's stored; what the storage limit looks like (starts 8 GB) and what happens when it's hit; how a song shows it's on the phone vs laptop-only; what happens when a song stops being Mine. Take the board's defaults; list them in REPORT.
a. **Downloads.** Phone copies of Mine songs download to the app's own storage, newest first, with progress I can see, stopping at the limit. Resumes after the app closes or the laptop drops. Nothing outside the app's storage is touched.
b. **Play from the phone first.** If a song is on the phone, it plays from there (player, queue, Compare's offline fallback). If not and the laptop is unreachable, it says so plainly instead of hanging.
**Stop line:** the limit can start fixed at 8 GB (no setting). 0, 1, a, b otherwise all go in.
## Phone check
1. Laptop on: open the app, watch downloads run. Pass: progress counts up, newest songs first.
2. Close the app mid-download, reopen. Pass: it carries on, doesn't restart from zero.
3. Laptop asleep (or Wi-Fi and Tailscale off), screen locked: play a downloaded song, skip to the next. Pass: plays, lock-screen controls work.
4. Same, tap a song that isn't downloaded. Pass: a plain message, no hang.
5. Compare on a downloaded group, laptop off. Pass: flips work; no level change between versions beyond the real one.
