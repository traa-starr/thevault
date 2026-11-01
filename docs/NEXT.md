# NEXT: Prototype player screen (ROADMAP 1.13)
Written by chat, 2026-11-01.
Log: 1.12 phone check passed (mine). /status pitch parked (chat-default). (logged by chat)
Queue after this: ROADMAP 1.14 library list: scroll, sort, basic title filter.
Read: `ROADMAP.md` (1.13), `VISION.md` (player parts only), `app/App.tsx`, `app/README.md`.

## Parts
a. **Player screen.** In The Vault, a player screen fed by a short list of fake songs (made-up titles, no real names): title, play/pause, seek bar, next, previous. Buttons change what's shown (title, play state, position moving while "playing"). No real audio, no server calls for this screen.
b. **Keep the laptop line.** The 1.12 screen and saved address still work; reach the player from it with one tap.
c. **Build and hand over.** Typecheck, repo check, guard test. Same build and sideload path. REPORT gives plain phone steps.
Limits: no real playback, no downloads, no library list yet. Don't change the bundle ID.

**Stop line:** if long, finish a and b; the build run can wait.

## Phone check
1. Open The Vault, tap into the player. Play/pause toggles, the seek bar moves and can be dragged, next/previous change the title. Laptop line still shows the count with the server on.
