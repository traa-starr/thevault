# NEXT: Stream real songs into the player (ROADMAP 1.20 + core of 1.15)
Written by chat, 2026-11-01.
Log: 1.15 vs 1.20 order: streaming first, real player on top (mine). Mine / Not mine buttons go in the player as the following step, pulled ahead of the 1.21 card (mine). Cloud-only songs are not streamed yet, so playing never makes iCloud download (chat-default). Shuffle added to this step for hunting not-mine songs (mine). (logged by chat)
Queue after this: "Not mine in the player" (see STATUS queue 1; needs the server's first write, so Code proposes how in REPORT of this step). Then the rest of 1.15 (queue, remaining-time tap).
Read: `ROADMAP.md` (1.15, 1.20), `app/Library.tsx`, `app/Player.tsx`, `app/App.tsx`, the server's song list and audio answer in `server/`.

## Parts
a. **Tap to play.** Tapping a song in the Library opens the player and plays it, streamed from the laptop. Nothing is saved on the phone. Seeking works (drag and tap) on a streamed song. Reuse the existing audio answer on the server; keep it read-only.
b. **Real list in the player.** Next and previous move through the Library list in its current sort and filter. Pause, play and seek as in 1.13, now on real songs. The fake data goes.
c. **Shuffle.** A Shuffle button in the Library and the player: plays a random laptop song from the current list (respects the filter), and next keeps picking random songs without repeats until the list runs out. Previous goes back through what was played. Off returns to list order.
d. **Cloud-only songs.** The 806 cloud-only songs show as "Cloud only" in the list, can't be tapped, and next/previous skips them. The server never opens a cloud-only file.
e. **Build and hand over.** Typecheck, repo check, guard test. Same build and sideload path. REPORT gives plain phone steps and a short proposal for how Not mine should save on the laptop (where it's written, how undo works, nothing ever deleted).
Limits: no downloads, no verdict buttons yet, no queue. Don't change the bundle ID. Never touch music files beyond read-only streaming.

**Stop line:** if long, finish a, c and d; b can wait.

## Phone check
1. Server on. Library, tap a laptop song: it plays within a few seconds. Drag the seek bar: it jumps and keeps playing. Next/previous: plays the neighbour in the list, skipping cloud-only. Cloud-only rows can't be tapped. Tap Shuffle: a random song plays, next gives another random one, previous goes back to the one before. Server off mid-song: a plain message, no crash.
