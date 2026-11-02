# NEXT: Batch 3d, Queue and player feel
Written by chat, 2026-11-02.
Log: Owner's 3c notes: auto-scroll too slow and bumpy, starts too late; open Queue from the mini player; Queue closes back to where it was opened; Queue button becomes a swipe-up area, Back takes its spot; eye icon for hide; buttons slide down/up when hidden (mine). Edge zones = top 30% / middle 40% safe / bottom 30% of the list, speed ramps up toward the edge (chat-default, adjusts owner's thirds). Done before Batch 4 while the player is fresh; no board meeting, owner set the flows (chat) (logged by chat)
Queue after this: Batch 4 "Real sorting", brief ready in `docs/queued/NEXT-batch-4.md` (fast-lane OK: copy it into NEXT.md as is). Then 4b Versions.
Read: `docs/REPORT.md` (3c), `app/Player.tsx`, the mini player bar file, `docs/board/batch-3b.md`.
Session: Opus. No server, journal or database change.
## Parts
a. **Auto-scroll that feels right.** Zones come from the Queue list's own area, not the whole screen, and are invisible: top 30% scrolls up, middle 40% is a safe zone (no scroll, for dropping), bottom 30% scrolls down. Speed starts gentle at the zone line and gets faster toward the edge. Smooth every frame, no bumps. If the package can't do this, drive the scroll yourself.
b. **Queue from anywhere, closes back where it came from.** Mini player: tap opens the player, swipe up opens Queue straight away (any screen). Queue opened from the mini player: swipe down shows that same screen again. Queue opened from the player: closing goes back to the player, not Library.
c. **Player buttons.** Remove the Queue button; the strip between where it was and the hide button becomes a swipe-up-to-open-Queue area (a small handle hint is fine). Put a Back button (closes the player) where Queue was. Hide/Show becomes an eye icon (open eye = showing, crossed eye = hidden). Hiding slides the buttons down off the bottom and the eye settles at the bottom edge with even spacing, no floating gap; showing slides them back up. About 250 ms.
Must pass typecheck, play-order self-test and iOS export.
**Stop line:** c's slide animation waits if long (eye icon and Back still go in).
## Phone check
1. Queue: drag a song toward the bottom. Pass: nothing scrolls while it's in the middle of the list; inside the bottom part it scrolls smoothly, faster the lower you go. Same going up. Drops in the middle land where released.
2. On Library, swipe up on the mini player. Pass: Queue opens, music keeps playing; swipe down and you're back on Library. Tap the mini player: the full player opens.
3. Full player: swipe up on the strip above the buttons. Pass: Queue opens; closing it returns to the full player. Back button closes the player.
4. Tap the eye. Pass: buttons slide down and away, the eye sits neatly at the bottom; tap again, they slide back up. Survives closing the app.
