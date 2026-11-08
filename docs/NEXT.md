# NEXT: Session polish, laptop upkeep, search groundwork
Format: goal
Written by chat, 2026-11-08.
Log: Phase 2 code-complete checks 4 of 4 pass, 2.2/2.4/2.5 ticked (results `PHASE-2-RESULTS.md`); bug: on every session Next a beat plays from 0:00, then it jumps in; session cards start at 15 s, Sort cards at 30 s, fixed times (owner); session has no Shuffle (fine) but its other player buttons are no longer centred (owner); session survives an app kill, Code's pitch promoted (chat); goal format kept after its 3-task trial (owner); double Next and Undo-after-Next stay as built (owner); NEXT sized by the new sizing check in CHAT-INSTRUCTIONS (owner); Phase 3 groundwork is spike and memo only, no app code (chat) (logged by chat)
Size: (Read: also `docs/BATCH-PLAN.md` "My requests".) My real tagging sessions and wipe check (2.7) are mine and run alongside this. Everything Code can do without me: the review's 3 fixes, the laptop queue item, cheap parked pitches, and Phase 3's hard-to-undo question (search on phone or laptop) made ready for me to choose at review.
Queue after this: Phase 2 closes after my sessions + wipe check; then Phase 3 build on the option I pick.
Read: `docs/LESSONS.md` (every line a check in your plan), `docs/PHASE-2-RESULTS.md` "Phase 2 code-complete", the last 3 DECISIONS rows, `docs/BLUEPRINT.md` "Phase 2: tagging" (reading tags), `docs/ROADMAP.md` Phase 3, STATUS queue and parked list, the files you touch.

## Part 0 (loop change, do first)
Copy `docs/pending-skills/wrap-SKILL.md` over `.claude/skills/wrap/SKILL.md`, then delete the pending copy. From this `/wrap` on, you publish and restart the server yourself, and your last message is three lines. Use it at the end of this session.

## Goal
My real tagging sessions feel right from the first card, the laptop needs less babysitting, and Phase 3's big call is ready for me.
A. **Clean starts (2.2, Sort cards).** Session cards start at 0:15, Sort cards at 0:30. The start time goes to the player when the song loads, so the first thing I hear is that spot, never a beat from 0:00. A song shorter than its start point starts at 0:00. An undone Sort card still carries on from where it was.
B. **Session layout.** The session has no Shuffle, and that's fine, but the player buttons left behind must sit centred, not lopsided. Same 44 pt targets, no shift when the session opens or closes.
C. **Session survives an app kill.** Save "in a session" with its lap, counter and place. After a kill and reopen, or lock-screen Nexts while the app slept, the player still shows the session look and the same lap.
D. **Laptop upkeep (BATCH-PLAN "My requests" 2026-11-07 + parked).** I sort on the phone between builds, and the laptop never catches up on its own: 465 Mine, only 314 with phone copies. The server makes phone copies by itself: on start, and in the background soon after a song is marked Mine (never slowing playback; safe if it's stopped mid-copy). After a sort session, Library songs play without me running `import`. `/next` also prints "phone copies made now: N" as a backstop. Doctor warns about Mine songs without phone copies. The server stops printing harmless "connection reset" tracebacks. Update `COMMANDS.md` for anything I run.
E. **Search groundwork (Phase 3, spike only).** In `spike/search/`: the ranking ladder (3.1-3.3: exact phrase > words in order with gaps > all words > rare words; common words down-weighted; slang endings like drip/drippin) as pure functions with tests, run on fake tags at my library's size (1,395 songs, ~20 tags each, slang and misspellings). Measure speed and size both ways: on the phone vs on the laptop, plus one option I didn't ask about. Write `docs/SEARCH-OPTIONS.md`: 2-3 options, numbers, what a senior engineer would pick and why. No app code; I choose at review.

## The bar (how to work)
- Board test from `BOARD.md` (B touches a screen; E is a hard-to-undo call). Say in REPORT whether it met.
- Plan in STATUS "In progress", one line per goal. Before building each, list how it could break (fast Next taps, Next while loading, lock-screen Next, a short song, app killed mid-load, offline, Undo right after Next; for D, server already stopped or import failing) and turn each into a test or screenshot check.
- Tests first. Screenshots can't hear: for A, a test proves the start time reaches the player at load and no seek follows.
- Screenshot every changed screen, incl. the session look after a simulated restore. Hostile self-review of the whole diff before `/wrap`. One fresh-eyes review (new screens + risky logic). Anything you don't fix: say why, checked on the real path.
- Two failed fixes on a goal: write it up, move to the next goal. Don't stop the session.

## Done when
Code proves: a server test where marking a song Mine makes its phone copy with no command, and a stop mid-copy leaves no broken file; start-time tests (session 15 s, Sort 30 s, short song 0, undone card resumes); session-restore test (same lap, counter, place after a reload); session screenshots show the controls centred; `/next`'s refresh prints the count on the real library; doctor shows the warning line; the spike's tests pass and `SEARCH-OPTIONS.md` has measured numbers for each option; `/verify` all PASS.
I prove:
1. Tag songs: the controls sit centred. Tap the big Next 5 times fast, then slowly. Pass: each song's first sound is about 0:15, never a beat from the start.
2. Sort cards: mark 3 new songs Mine, then find them in Library and play them (no laptop command in between). Swipe through 5 cards. Pass: each starts about 0:30 with no blip. Undo one: it carries on where it was.
3. In a session, swipe the app away, reopen. Pass: still in the session, same "N of M tagged", same order. Lock the phone, Next twice from the lock screen, unlock. Pass: session look, counter right.
4. Read `SEARCH-OPTIONS.md` with chat at review and pick one.

## Stretch (only if every goal is met and budget is left)
Parked pitches in this order: song length stored at scan time; `/verify` under 1 min; Hidden count on the Hidden link. Say in REPORT which you took.

## Limits
- Order matters: A, B, C first (my sessions need them), then D, then E. If it runs long, E waits, not A-C.
- E stays in `spike/` and docs: no `app/` or `server/` search code until I choose.
- No change to tags, sync, Library or Shuffle behaviour. Music read-only, no git, public-repo rules as always.
