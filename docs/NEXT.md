# NEXT: Calm the app, part 1: Hidden leaves Library, laptop desk, inventory, iCloud groundwork
Format: goal
Written by chat, 2026-11-12.
Effort: high (Opus; Fable comes back at 4 pm for the design work this step prepares)
Log: Render step's 4 phone checks move to the next review with this step's (owner). Library chips: Mine drops while nothing is unsorted, new order (chat-default). Hidden leaves Library for Settings, plus a laptop desk page (owner idea, chat-default details). O.6 One world, O.7 laptop desk added. Audio backup before any iCloud moving (frame check). Fable plan (owner + chat) (logged by chat)
Size: everything Code can do without me before the Fable design session: the two calm-down moves I asked for (Library chips, Hidden out of Library + laptop desk), the inventory Fable designs from, and the groundwork so iCloud organizing is safe when I pick. 6 goals; publish only, no rebuild.
Queue after this: Review (8 checks) + chat and I place every control from INVENTORY (the world map). Then Opus: the Fable kit (board, one clickable mockup I check on the phone, code map, shot list). Then ONE Fable session builds the locked mockup. Then Opus: fresh-eyes and fix-ups. 3.7 when tags reach ~50.
Read: `docs/LESSONS.md`; last 8 DECISIONS rows; ROADMAP O.6, O.7, 5.0b, 5.0c; `docs/ICLOUD-OPTIONS.md`; `docs/overhaul/DESIGN-SYSTEM.md` "Lists and chips"; files you touch.

## Goal
A. **Library chips (O.6).** While nothing is unsorted, All and Mine are the same list, so Mine goes. Order: All · Unsorted (only while something is) · Favorites · Needs tags · Versions · Archived. Mine comes back only alongside Unsorted. The Hidden line at the bottom of Library goes.
B. **Hidden songs live in Settings (O.6).** A "Hidden songs · 815" row in Settings opens the list: a search field (title and folder), a folder filter (chips or a short picker, one line), the count of what's shown. Tap a row: it plays (streams, nothing saved, same as Sort did). Restore stays on each row and the song is back in Library within seconds. Fast with all 815 (fixed-height rows).
C. **Laptop desk (O.7).** The server's own page in the laptop's browser, opened by a desktop icon `Vault Desk` (same style as `Send to Vault`): the hidden songs with search, folder filter, play in the browser, Restore. Counts at the top (mine, hidden, unsorted, tags, last scan, last render click). Restore uses the same change route the phone uses (journal, manual choice wins); no new kind of write.
D. **Inventory (O.6 groundwork), `docs/overhaul/INVENTORY.md`.** Every screen and sheet, every control on it: what it does, how often I'd likely use it (daily / weekly / rare, marked as a guess), and where it could live (on screen / one gesture away / a sheet / Settings / desk / gone), marked as a suggestion only. A count of controls per screen at the top. Screenshots of every screen saved for Fable (checked by a subagent, not read into your context). No building from it.
E. **Moved files stay the same song (5.0b groundwork).** Test with fake files in a temp folder: a file renamed, moved to a subfolder, and moved to another scanned folder keeps its song, verdict, tags, rating, versions and phone copy after a scan. If any fails, fix the scanner (server code only).
F. **One memo, `docs/ICLOUD-ORGANIZE.md`, under 50 lines, read-only.** (1) Second copy of the library's audio (3.2 GB on E:, today only in iCloud): 2-3 places, what a senior engineer would pick; this comes before any moving. (2) How I organize iCloud without loosening the music guard: 2-3 ways (my hands from a move list the Vault prints / a mover script Code writes into `spike/` that only I run, with a dry run and an undo list / one I didn't think of), the pick, and which guard rules stay exactly as they are. (3) What E's result means for each way.

## The bar
- Board first (new screens: B, C): one meeting, notes to `docs/board/calm-1.md`.
- List how A-C could break before building (LESSONS included); each a test or a screenshot.
- Controls: instant press, 44 pt, no swallowed tap, nothing shifts. Screenshots only of changed screens, checked by a subagent.
- One `fresh-eyes` review (Sonnet) of B, C and E: catches to `docs/board/calm-1-review.md` before any fix.
- Two failed fixes on a goal: write it up and move on. REPORT under 40 lines with "Odd in how we work:".

## Done when
Code proves:
- A: chip test: no unsorted songs gives All, Favorites, Needs tags, Versions, Archived; one unsorted song adds Unsorted and Mine; no Hidden line in Library (shot).
- B: Hidden test on 815 fake songs: search by title and by folder narrows the list; filter + search together; restore removes it from Hidden and adds it to Library. Shots: Settings, Hidden empty search, Hidden searched, Hidden filtered.
- C: server test: the desk page loads, lists hidden songs, a restore lands in the journal like the phone's; the page sends no laptop address or song paths outside the laptop. Icon on the Desktop; `doctor` has a desk line.
- D: INVENTORY exists, every screen in the app has a row group, shots saved.
- E: moved-file tests pass (3 cases above), music folders never touched (temp folder only).
- F: memo exists, under 50 lines, with picks. `/verify` all PASS; `check_repo.py` clean; publish goes out.
I prove:
1. Library: chips read All, Favorites, Needs tags, Versions, Archived; no Mine; no Hidden line at the bottom.
2. Settings, Hidden songs: type part of a name, the list narrows; pick a folder; tap a row, it plays; Restore one, it's in Library.
3. Laptop: double-click `Vault Desk`, search, restore one; on the phone it's in Library (pull to refresh at most).
4. Hide that song again from the phone; refresh the desk: it's back in its hidden list.

## Stretch (only if every goal is met and budget is left)
1. 3.7 groundwork: the script that re-runs my 20 searches, with an empty 20-line file for me. Say in REPORT how many tags exist today.

## Limits
- First: copy `docs/pending-skills/next-SKILL.md` over `.claude/skills/next/SKILL.md` (checkpoint after each goal, Edit tool, changed-screen shots only); it applies from this step on. Delete nothing else.
- Look changes only where A-C need them; the big redesign is Fable's next step (O.6). Home, player, Sort, tagging unchanged.
- Never write inside iCloud Drive, FL Studio Projects or `Vault Renders`. E uses a temp folder only. F is read-only (names and sizes); song names go to `spike/output/` only. No moving tool built.
- No rebuild; if one is needed, write it in `overhaul/REBUILD.md` and stop that goal.
- The repo is public: fake names in tests and shots, no laptop address, no real song names in docs.
