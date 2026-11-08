# Plan session brief: Phase 2 (Tagging)
Written by chat, 2026-11-07. One Claude Code session on Opus. **Docs plus one throwaway mockup. No app or server code.**
The owner is an audio engineer, not a developer: plain words, one line per jargon term.
(The Phase 1 brief this replaces is in git history.)

## Objective
Design Phase 2 so the build batches can run without stopping to design, and give me a tagging card I can tap on the
phone **before** any real code is built.

## Read first
`VISION.md` (tagging, search), `ROADMAP.md` Phase 2 + Phase 3 + "Decisions to raise", `DECISIONS.md` (Phase 1 summary;
settled, never re-ask), `BLUEPRINT.md` ("Left open for Phase 2", "Hard to change later"), `BOARD.md`, `DESIGN-NOTES.md`,
STATUS open questions. Code only as needed: the journal, `POST /changes` allow-list, the shared player, the sorting card.

## Deliverables
1. **Board meeting** (the batch adds screens, so the board test says yes). Notes in `docs/board/phase-2-tagging.md`.
2. **Mockup:** `spike/mockups/tagging-card.html`, one self-contained file, phone-sized, fake songs and tags. Tappable:
   play/pause, tap-a-moment, type a line, tag list, tap a tag to jump, edit/delete, Not mine, next card, progress.
   Follow `DESIGN-NOTES.md` and my taste (big controls, minimal, nothing jumps). Chat publishes it as a private page at
   review so I can try it on the phone.
3. **`BLUEPRINT.md`:** replace "Left open for Phase 2" with a short Phase 2 section: tag data, journal lines for add /
   edit / delete, outbox and sync state (2.6), tagging screen and how I get there, jump-to-tag, restore (2.7). File stays
   under ~150 lines.
4. **`BATCH-PLAN.md`:** Phase 1 batches fold to one line (done). Phase 2 items 2.1-2.7 grouped into batches, each 2-3
   phone checks, ROADMAP IDs, stop line, calls marked "blocks batch N". Batch 1 is the real build of what the mockup shows,
   **written here, not in NEXT** (chat writes NEXT after I've tried the mockup).
5. **`DECISIONS.md`** rows for my answers and your calls. **`STATUS.md`** and **`REPORT.md`** as usual.

## Ask me (multiple choice, max ~8, rounds of 4, recommendation first, "other" always)
- **Hard to undo, never default:** what one tag line in the journal holds (text, time in the song, which version it was
  heard on, date), and how edit and delete are recorded (old lines must always replay). Say what a senior engineer would
  pick and why, and include one option I didn't think of.
- **Taste:** what happens when I tap "tag here" (keep playing vs pause; the moment is the tap, not when I finish typing);
  dictation (iPhone keyboard mic as the bridge, no new build, vs in-app); how "favoring untagged" picks songs; whether I
  can also tag from the normal player, not just the session; whether the card can name `Untitled...` and date-only songs
  (STATUS "waiting for tagging").
- **Note, don't ask:** Phase 3 "search on phone or laptop" (ROADMAP Decisions to raise). Just make sure the tag shape
  doesn't block either answer.
- Decide reversible technical things yourself and log them. Don't re-ask anything in DECISIONS.

## Limits
No app or server code, no installs, no builds, no git. Throwaway mockup only in `spike/mockups/`. Repo is public: no
addresses, real song names, audio or credentials in docs or the mockup (fake names only). Music folders and BandLab
untouched. Docs short; STATUS and REPORT under 40 lines.
