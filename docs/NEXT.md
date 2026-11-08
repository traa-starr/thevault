# NEXT: Fast session Next, centred player everywhere, search on the phone
Format: goal
Written by chat, 2026-11-08.
Log: Session polish checks 3 of 3 pass, notes: session Next holds 3-5 s silent (seek bar 0:00, then 0:15) while Sort cards start near-instantly; player opened from a Sort card not centred (owner); search runs on the phone, option A (owner, hard to undo); Phase 3 builds alongside my 2.7 sessions + wipe check (chat); search opens from a field at the top of Library, a result plays from its tag's moment (chat-default) (logged by chat)
Size: My real sessions and wipe check (2.7) run alongside. Code can do without me: both review notes, and Phase 3 up to the point where I must write my 20 searches (3.7 needs ~50 real tags). That is 3.1-3.3 and 3.6 in the app, 3.4 and 3.5 if room, the acceptance-test runner, and a real-phone timing. One board meeting covers it.
Queue after this: my 20 acceptance searches (3.7) once I have ~50 tags; Phase 2 closes when I pass 2.7.
Read: `docs/LESSONS.md` (every line a check in your plan), `docs/SEARCH-OPTIONS.md`, `spike/search/`, the last 3 DECISIONS rows, `docs/ROADMAP.md` Phase 3, `docs/VISION.md` "Search", `docs/BLUEPRINT.md` "Reading tags", `docs/BOARD.md`, STATUS parked list, the files you touch.

## Part 0: board meeting (test lines 1 and 2: a new screen, and what I hear after Next)
One meeting for the milestone: the search field and results (where it sits in Library, what a result row shows, what a tap does, empty and no-match states) and the session Next timing. Notes in `docs/board/phase-3-search.md`. Taste calls the board splits on: pick one, say it in REPORT, I change it at review.

## Goal
Tagging sessions move as fast as Sort cards, the player looks the same wherever I open it, and I can type a half-remembered line and land on the moment in the song.
A. **Session Next as fast as Sort cards.** Find why Sort cards start near-instantly and session Next sits silent 3-5 s with the seek bar at 0:00, and give the session the fast path. First sound within about 1 s of Next, starting at 0:15; the seek bar never shows 0:00 first. Lock-screen Next and the 0:15 / 0:30 starts stay as they are.
B. **Centred player everywhere.** Previous / Play / Next centred in every place the player opens: Library, a Sort card tap, a session, after a restore. Same 44 pt targets, no shift.
C. **Search on the phone (3.1, 3.2, 3.3, 3.6).** Move the spike's ladder into the app as tested pure code that reads the phone's own tag copy (works offline, laptop asleep). Search field at the top of Library; results update as I type. Each result shows the song, the matched tag words and its time; a tap plays the song from that moment. Never hides a song that shares a word, only reorders. Ships by publish, no rebuild.
D. **Real-phone timing + acceptance runner (3.7 groundwork).** The app sends its search timings (typical and slow end, tag count) to the laptop, and a laptop command prints them, so REPORT and I see the real phone's numbers. A script runs a searches file (search line + the song I expect) through the same ladder and prints pass/fail per line; ship it with a 5-line example file. Add both lines to `COMMANDS.md`.
E. **If room: 3.4 then 3.5.** Misspelling tolerance plus a slang spelling table I can grow; the result I pick for a search ranks higher next time for that search. Both travel through the outbox like tags, so the laptop keeps them.

## The bar (how to work)
- Board meets first (Part 0). Plan in STATUS "In progress", one line per goal.
- Before building each goal, list how it could break and turn each into a test or screenshot: A: fast Next taps, Next while loading, lock-screen Next, short song, killed mid-load, offline; B: every entry point, after a restore; C: empty search, no match, one letter, emoji, 200-character line, keyboard covering results, typing fast, tags changing while results show, offline, laptop asleep, 1,400 songs. LESSONS lines are part of that list.
- Tests first. Screenshots can't hear: for A, a test times Next-to-first-sound on the session and Sort paths and fails above 1 s.
- Controls: instant pressed look, 44 pt, no swallowed tap, nothing shifts. Screenshot every changed screen in its edge states (empty, no match, long results, keyboard up) with the screenshot command.
- Hostile self-review of the whole diff, then one fresh-eyes review (new screen + risky timing). Anything not taken: a reason checked on the real path.
- Two failed fixes on a goal: write it up, move to the next goal. Don't stop the session.

## Done when
Code proves: a timing test where session Next and Sort-card Next both reach first sound within 1 s, with no seek-bar 0:00 shown; screenshots of the player from Library, Sort card, session and restored session with the controls centred; ladder tests ported from the spike pass in the app; search screenshots for empty, no match, many results and keyboard up; a search test on 1,400 fake songs offline (no server) returns results; the acceptance runner passes its example file; the timings command prints after a fake phone report; `/verify` all PASS. REPORT says whether E was taken.
I prove:
1. Tag songs: tap Next 5 times fast, then 3 slowly. Pass: each song starts about 0:15 within about a second, no long silent wait.
2. Sort: tap a card to open the player; then open the player from Library. Pass: Previous / Play / Next centred both times.
3. Library: type 2-3 words from a tag I wrote. Pass: that song is near the top, showing my tag words and time; tap it, and it plays from that moment. Type nonsense: a clear "no match", no crash.
4. Turn on airplane mode, search again. Pass: same results. Then tell chat the timing command's numbers.

## Stretch (only if every goal is met and budget is left)
Song length stored at scan time; Hidden count on the Hidden link; `/verify` under 1 min. Say in REPORT which you took.

## Limits
- Order: A and B first (my real sessions need them), then C, D, E. If it runs long, E waits.
- Search is read-only: no change to tags, sync, journal or outbox rules except E's two new outbox kinds. No `server/` search route (option A).
- No native modules, no full rebuild: publish only. If something needs a rebuild, stop that part and write it up.
- Music read-only, no git, public-repo rules as always. My sessions keep running on the published app.
