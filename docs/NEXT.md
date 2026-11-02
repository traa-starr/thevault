# NEXT: Board setup and first meeting (batches 3, 4, 4b)
Written by chat, 2026-11-01.
Log: Batch 2 passed all laptop and phone checks; prototype feedback (inline "show songs" is the keeper; sort only shows songs I haven't sorted anywhere); manual versions linking pulled into Phase 1 as batch 4b and ROADMAP 1.23; design board set up; sort borrows the shared player (starting idea, board refines) (logged by chat)
Queue after this: Batch 3 "The real player", written by chat from the board notes.
Read: `docs/BOARD.md`, `docs/pending-agents/*.md`, `BATCH-PLAN.md` (batches 3, 4, 4b), `BLUEPRINT.md` (App, Sorting), `VISION.md` (Groups, Design), `app/App.tsx`, `app/Library.tsx`, `app/Prototype.tsx`.
Session: Opus medium. **No app or server code. No new packages.** Docs only.
## Parts
0. Copy the four files in `docs/pending-agents/` into `.claude/agents/` unchanged. Confirm they load.
a. **Meeting 1: batch 3, the real player.** Brief all four seats on: one shared player I can control from every screen
   (bar plus lock screen); how sorting borrows the player (my starting idea: sort plays through the same player and pauses
   the library queue, which picks back up when I leave sort; the board can do better); Undo returns to the spot in the
   song; what Back does. Write `docs/board/batch-3.md` in the BOARD.md format.
b. **Meeting 2: batches 4 and 4b, sorting and versions.** My notes from the prototype: it's okay; my favorite part is
   opening a set's songs right in the list without leaving the screen. Sort must be smart: anything I already sorted
   anywhere (library, player, sort) never shows again; only questionable songs stay. Versions are a second layer of sort,
   but not every song has versions and titles alone won't always show them, so I must be able to say "this is another
   version of song X" from library, player or sort at any time. The app doesn't have to say "groups". Settled (DECISIONS "Versions rules"): called Versions; only my songs
   get them; one canon version picked by ear, changeable any time; only canon plays and shows as one Library row; other
   versions open in a separate view; wrong link = Undo toast + Remove there. Board designs that view, how a link is made
   in two taps, and the "Not sure" choice in sort. The logic seat gives options for how versions are stored, marked owner picks (Phase 4's name proposals,
   fingerprint proposals, merge and split must fit later). Write `docs/board/batch-4-versions.md`.
**Stop line:** b waits if the session runs long.
## Phone check
None: docs only. Wrap, then I type `Review.` in chat.
