# NEXT: Library list (ROADMAP 1.14)
Written by chat, 2026-11-01.
Log: 1.13 phone check passed (mine). Code's 1.13 picks accepted (chat-default). Remaining-time pitch parked for 1.15 (chat-default). 1.14 list shape (chat-default). (logged by chat)
Queue after this: ROADMAP 1.15 real player, after I raise the 1.15/1.20 order question.
Read: `ROADMAP.md` (1.14), `app/App.tsx`, `app/Player.tsx`, `app/README.md`, the server's song-list answer in `server/`.

## Parts
a. **Song list from the laptop.** A Library screen, one tap from home, listing all 1,395 songs from the server: title plus one short detail line (date or where it lives). Scrolls smoothly through the whole list. Shows a plain message when the laptop is off. If the server has no list answer yet, add a read-only one (no writes, no music folder access beyond what the server already reads).
b. **Sort and filter.** Sort by title (A-Z) and by date (newest first). A title filter that narrows as you type, with a count ("42 of 1,395"). Tapping a song does nothing yet.
c. **Build and hand over.** Typecheck, repo check, guard test. Same build and sideload path. REPORT gives plain phone steps.
Limits: no playback, no downloads, no verdicts or tags. Don't change the bundle ID. Player screen and laptop line keep working.

**Stop line:** if long, finish a; sort and filter can wait.

## Phone check
1. Server on. Open Library: the list shows 1,395 songs and scrolls to the end without stalling. Switch sorts: order changes. Type part of a title: the list and count narrow. Server off: a plain "laptop not reachable" message, no crash.
