# NEXT: Play first, info after: every Next as fast as Sort cards
Format: goal
Written by chat, 2026-11-08.
Log: Fast Next review: checks 4 of 4 pass, 1 note; phone timings session Next typical 797 ms (5 of 33 over 1 s) vs Sort 91 ms (owner + chat); play first, info after: sound never waits on length, title, start spot or tags (owner); phone timings are the proof, not the model (chat); E waits until more tags (owner); song length at scan time promoted from Stretch (chat); lock-screen search Shortcut parked, needs a rebuild (chat) (logged by chat)
Size: My real sessions + wipe check (2.7, ship line 2026-11-15) run alongside; 3.7 waits for ~50 tags. Ship line means no new phase, so Code finishes playback feel (the app's heart) on every path plus the cheap parked items. That fills one session.
Queue after this: my 20 acceptance searches (3.7) at ~50 tags; revisit E (3.4, 3.5) then; Phase 2 closes when I pass 2.7.
Read: `docs/LESSONS.md` (every line a check in your plan), the last 4 DECISIONS rows, `docs/PHASE-2-RESULTS.md` last section, `docs/board/phase-3-search.md`, `docs/BLUEPRINT.md` player sections, `docs/BOARD.md`, STATUS parked list, the files you touch.

## Part 0: board meeting (test line 2: what I hear after a tap, a fix for something I flagged)
One meeting on playback feel: what fills in after sound starts, and in what order. Notes in `docs/board/playback-feel.md`. Taste calls the board splits on: pick one, say it in REPORT, I change it at review.

## Goal
Music starts the moment I tap, wherever I tap, and the screen catches up after. Playing music is the biggest part of this app, so it has to feel seamless.
A. **Session Next at Sort-card speed, on the phone.** Find why the phone measures session Next at ~800 ms when Sort cards are ~90 ms and the model said 300. Sound comes first; length, title, start spot, tags and anything else the player shows fill in after and never sit in front of first sound. Lock-screen Next and the 0:15 / 0:30 starts stay.
B. **Every play path, same rule.** Previous (REPORT says it still rebuilds and is slow), lock-screen Next and Previous, Library tap, search-result tap, Sort cards, after a restore. Each path reports its own Next-to-first-sound to `timings`, with the path's name.
C. **Song length known before play (was Stretch).** Lengths stored at scan time and sent with the phone's song list, so the seek bar shows the real length at once, not "–:––". Fills the 1,395 songs already in the library without me running anything new.
D. **Timings that judge themselves.** `timings` prints one line per path: typical, slow end, worst, count, and PASS/FAIL against the target (typical within 2x of Sort, none over 1 s). `/wrap` reads `timings` and puts that block in REPORT, so I never relay numbers again.
E. **Cheap parked items.** Hidden count on the Hidden link; `/verify` under 1 min (the slow checks behind a flag if needed); the doctor's fail line names the changed files; server `/status` count-only answer. Add any new command line to `COMMANDS.md`.

## The bar (how to work)
- Board meets first (Part 0). Plan in STATUS "In progress", one line per goal.
- Before building each goal, list how it could break and turn each into a test or screenshot: fast Next taps, Next while the last one is loading, lock-screen Next while paused, short song (under 15 s), killed mid-load, offline, laptop asleep, a song with no length stored, length stored wrong. LESSONS lines are part of that list.
- Tests first. The model can't stand in for the phone: the model test must explain the 800 ms (reproduce it, with the phone's real waits) before the fix counts.
- Controls: instant pressed look, 44 pt, no swallowed tap, nothing shifts when info fills in late (screenshot the player before and after info arrives).
- Hostile self-review of the whole diff, then one fresh-eyes review (risky timing). Anything not taken: a reason checked on the real path.
- Two failed fixes on a goal: write it up, move to the next goal. Don't stop the session.

## Done when
Code proves: a model test that reproduces the phone's ~800 ms session Next before the fix and shows under 300 ms after; a test that first sound is never behind length, title, start spot or tags on any path in B; each path in B sends timings with its name (fake report test); the server's song list carries lengths for all 1,395 songs (count printed); player screenshots before and after info arrives show no shift; `timings` prints PASS/FAIL per path; REPORT carries the `timings` block; Hidden count shown; `/verify` all PASS and under 1 min (time printed).
I prove:
1. Tag songs: Next 5 times fast, 3 slowly, then lock-screen Next twice. Pass: music starts about when Sort cards do, at 0:15, the seek bar shows the real length at once, volume always comes back.
2. Previous 3 times in a session, then tap a Library song, then tap a search result. Pass: each starts as fast as a Sort card; the search result plays from its tag's moment.
3. Open the player from Library, a Sort card and a session. Pass: the length shows straight away (no "–:––"), nothing on screen jumps as info fills in.
4. After using it, read REPORT's timings block at review (Code puts it there). Pass: every path PASS.

## Stretch (only if every goal is met and budget is left)
A-Z jump strip in Library (new control: board notes first); split the 638-song folder set. Say in REPORT which you took.

## Limits
- Order: A and B first (my real sessions need them), then C, D, E.
- No change to tags, sync, journal or outbox rules. No search changes (E waits). No new phase (ship line).
- No native modules, no full rebuild: publish only. If something needs a rebuild, stop that part and write it up.
- Music read-only, no git, public-repo rules as always. My sessions keep running on the published app.
