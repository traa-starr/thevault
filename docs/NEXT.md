# NEXT: Overhaul wave 2: Library, search screen, fuller Home, server that stays up
Format: goal
Written by chat, 2026-11-10.
Effort: high
Log: Wave 1 review 7 of 7 pass (Home, player, tabs + freeze, rebuild icons + glass, play counting, tag field over keyboard, Lines). Native tab bar dropped: the drawn bar has the glass and can't reload the player (chat). Wave 1 defaults kept: amber accent, "Not played in a while" rotates daily, Mine / Not mine as two quiet words, "Next song" in the session action row (chat-default, owner can change). Home v2 auto rows go in wave 2; "My projects" row waits for ROADMAP 6.1 (chat). Server starts itself and restarts if it stops (chat-default, frame check) (logged by chat)
Size: wave 2 of 4 (O.4) plus Home v2's rows (they reuse wave 1's play data and Library's data) plus the always-on server (laptop only, small). No rebuild: everything ships by publish. Ordered so a short session still ships A-B. 5 goals.
Queue after this: wave 3 Sort as Deal swipe cards (tucked away) + tagging session + tag editing; wave 4 Queue, versions, settings, whole-app pass, Live Activity spike last. Promo ends 11-16.
Read: `docs/LESSONS.md`; `docs/overhaul/DESIGN-SYSTEM.md`; `docs/overhaul/LABELS.md`; `spike/mockups/wall.html` (Library and search views) + `app.css` (the spec); `docs/board/overhaul-mockups.md` "Tabs" and proposed checks 2 and 5; `docs/overhaul/TEARDOWN.md` Library + search rows only; last 4 DECISIONS rows; `server/schedule_backup.ps1` (how we already schedule a laptop job); files you touch.

## Goal
A. **Search as its own screen (O.4 wave 2).** The round search button and Home's "Search" box open a search screen as in `wall.html`: box focused with the keyboard up, results as I type (today's search engine and timing unchanged), recent searches when the box is empty, tap a result to play. Fixes the wave 1 note: both now just open Library.
B. **Library in Wall's style (O.4 wave 2).** Art tiles on rows, Favorite / Archived marks, filter chips (All, Mine, Favorites, Archived, Needs tags), sort order kept. 1,395 rows scroll smooth; long titles never cut into the next row.
C. **Fuller Home (owner, queue 4).** Under today's rows add: Recently added, Most played, Favorites, Needs tags (Mine with no tags), Versions to compare (groups with 2+ versions). Each row hides when empty; a row's "See all" opens Library with the matching chip. Plain titles only.
D. **Server that stays up (frame check).** The laptop server starts by itself when I log in and comes back on its own if it stops, no window to keep open. One command turns it on (like nightly backup), one turns it off; `doctor` says if it's running. Update `COMMANDS.md`.
E. **Small fixes from wave 1's fresh-eyes review** that are still worth it (catch 9: a count reading +1 during one list fetch), if the fix is under an hour.

## The bar
- Board meets first (line 1: search is a new screen; Home gains rows). One short meeting, notes to `docs/board/wave2.md`, defaults for any owner question.
- List how A-C could break before building (LESSONS included): search under the keyboard, a result tap while typing, Library fast-scroll with art loading, a chip with 0 songs, Home on a fresh wipe with every row empty. Each one a test or a changed-screen shot.
- Controls: instant pressed look, 44 pt, no swallowed tap, nothing shifts. Plain labels (LABELS.md).
- Screenshots only of changed screens, checked by a subagent, plus side by side with `wall.html`.
- One fresh-eyes review (new screens): catches written to `docs/board/wave2-review.md` before any fix. It may run in the background while you write docs; don't sit idle waiting for it.
- Two failed fixes on a goal: write it up, move on. REPORT under 40 lines with "Odd in how we work:".

## Done when
Code proves:
- A: test that search results and timing match today's search for the same words; shots of the search screen empty, typing, results, no results.
- B: test scrolling the full 1,395-song model with no dropped rows; shots of every chip, a 70-character title, a 30-tag song.
- C: test that each row's songs follow its rule and empty rows hide (fresh-wipe model); shots of Home full and empty.
- D: kill the server process, it's back within a minute (log line); `doctor` shows it running; off command leaves nothing scheduled.
- `/verify` all PASS under 1 min; `check_repo.py` clean; publish goes out.
I prove (after publish, server started by itself):
1. Restart the laptop, log in, don't open anything: the phone plays a song. 
2. Round search button and Home's Search box: keyboard up straight away, type a line I tagged, tap the song, it plays. Empty box shows my recent searches.
3. Library: looks like Wall, flick fast top to bottom, every chip shows the right songs, nothing cut or jumpy.
4. Home: new rows make sense (Recently added, Most played, Favorites, Needs tags, Versions to compare), "See all" lands on the right chip, every label plain.

## Stretch (only if every goal is met and budget is left)
1. Waveform spike (REPORT's pitch, DESIGN-NOTES Tech 1): in `spike/` only, make waveform shapes for 20 songs on the laptop, measure time and size for all 1,393, a 10-line memo. No app code.
2. Wave 3 start: the swipe-card Sort screen from `deal.html`, behind Sort's current entry, nothing removed.

## Limits
- No rebuild: if a piece needs one, write it in `overhaul/REBUILD.md` and leave it.
- Search engine, rating, tagging and steady-screen rules stay as built; this changes look and movement, not what a tap does.
- No "My projects" row (waits for 6.1). No Line pieces.
- If it runs long: E waits, then C's Versions row.
- My music is read-only; the repo is public (fake names in shots and tests, no laptop address or Tailscale names).
