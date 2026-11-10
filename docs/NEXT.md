# NEXT: Overhaul wave 1: the new frame, Home and player
Format: goal
Written by chat, 2026-11-10.
Log: Review 3 of 3 pass (freeze, Queue swipe, mockups); 2.7 passed (wipe check with the rebuild), Phase 2 closed. Mockup pick: **Wall** is the base (open Home, Library, floating tabs + round search). **Player from Deal** (background tinted from the art, transport in a pill, action row under it). **Deal's swipe card becomes Sort**, tucked away like Sort is today, never Home. Search and Queue as in the mockups. **Nothing from Line** (no go). Overhaul builds in place, no "New look" switch (2.7 passed). Laptop address: no more work (owner) (logged by chat)
Size: wave 1 of 4 (O.4) plus the data Home needs plus the native pieces that come with the shell, in one rebuild. Ordered so a session cut short still ships A-C by publish. Fable usage burns fast: no new mockups, no re-designing; the mockup files are the spec.
Queue after this: wave 2 Library + search screen (fast-lane OK once wave 1 passes); wave 3 Sort as Deal swipe cards (tucked away) + tagging session + tag editing; wave 4 Queue, versions, settings, whole-app pass against the bar, Live Activity spike on a throwaway build last. Promo ends 11-16.
Read: `docs/LESSONS.md`, `docs/DESIGN-NOTES.md` (the bar), `docs/board/overhaul-mockups.md`, `docs/overhaul/TEARDOWN.md` (Home, player, mini player, tabs rows only), `docs/overhaul/REBUILD.md` "Left for the overhaul", `spike/mockups/wall.html` + `deal.html` + `app.css` (the spec), last 6 DECISIONS rows, files you touch.

## Goal
A. **Play data (stretch 2 from last step).** Play count and "last heard" per song, stored on the phone, synced to the laptop and restored after a wipe like ratings. Makes "Recently played" and "Rediscover" real.
B. **The new frame (O.4 wave 1).** Wall's floating tab bar (Home, Library) with the round search button, and the mini player that sits above the tabs and grows into the full player. Today's other screens (Sort, sessions, Library list, search) keep working inside it, unrestyled.
C. **The player from Deal.** Background tinted from the song's art colour, transport (previous, play, next) in a pill, Favorite / Archive / Tag / Lines / Queue row under it, tag dots on the seek bar (from Wall). Everything the player does today still works the same.
D. **Wall's Home.** Search box ("Search") opening search, Shuffle + Favorites, Recently played and "Not played in a while" rows from A's data (Not played in a while: Mine, not Archived, longest not heard; plays from 0:30). Sort and sessions reachable from Home, tucked away.
E. **Native pieces with the shell (O.5, low risk).** SF Symbols for icons, native tab bar if it can host B without reloading the player, Liquid Glass on tab bar and mini player with a solid fallback below iOS 26. One full rebuild, steps added to `REBUILD.md`. Everything must still run by publish on today's build (check each piece before use).

## The bar
- **Plain labels everywhere (owner, 2026-11-10).** Say what a thing is or does in the words any music app uses: "Search", "Favorite", "Archive", "Recently played". No slogans, no slang, no clever names ("Rap a line", "Dealt for you" are out). Fire becomes **Favorite**, Shelve / Shelved becomes **Archive / Archived** on every screen (same behaviour; stored values unchanged). A test lists every on-screen string so chat can read them at review.
- Board meets first (lines 1 and 2): one short meeting on how Wall + Deal's player combine into one design system (colours, type, sizes); write it to `docs/overhaul/DESIGN-SYSTEM.md` and use it everywhere.
- Before building, list how B-D could break and make each a test or screenshot: the steady-screen spam test through the new tabs, mini player growing while a tab switches, player tint on a song with no art, a swipe-down mid-grow, Home rows empty on a fresh wipe. LESSONS lines are part of the list.
- Tests first. Controls: instant pressed look, 44 pt, no swallowed tap, nothing shifts. Screenshots of every changed screen from every place it opens, plus side by side with the mockup.
- Hostile self-review of the whole diff. Then one fresh-eyes review (new screens): **it writes its catches to `docs/board/wave1-review.md` before any fix starts.**
- Two failed fixes on a goal: write it up, move on.
- REPORT under 40 lines, one line "Odd in how we work:".

## Done when
Code proves:
- A: play count and last heard survive a model wipe + restore (test); `/status` or a command shows them on the laptop.
- B: the steady-screen spam test passes 200 rounds through the new tabs; swipe-down lands where Back goes from every opener (tests + mid-close shots).
- C, D: screenshots of Home, player (dark art, light art, no art), mini player on each tab, next to `wall.html` / `deal.html` shots.
- E: pieces built with tests; app still publishes and runs on today's build; `REBUILD.md` updated; GitHub build config on a standard runner.
- `/verify` all PASS under 1 min; `check_repo.py` clean.
I prove (after publish, and again after the rebuild):
1. Home: looks like Wall; Recently played shows what I just played; Shuffle and Favorites start the right songs; every label is a plain word.
2. Player: art-tinted, pill transport, tag dots; Favorite, Archive, Tag, Lines, Queue all work; swipe down to the mini player, tap it to grow back.
3. Tabs: Home, Library, search button, all with a song playing; mini player stays and never freezes (repeat the freeze test once).
4. After the rebuild: Apple icons and glass on the tab bar and mini player; Sort and a tagging session still open and work.

## Stretch (only if every goal is met and budget is left)
1. Wave 2 start: Library list in Wall's style (art tiles, Favorite / Archived labels, filter chips).
2. Last `timings` PASS/FAIL on the phone (long-press the bottom line).

## Limits
- No Line pieces. Sort stays tucked away, not Home.
- Rating, tagging and the steady-screen rules stay as built; overhaul changes look and movement, not what a tap does.
- If it runs long: E waits (it can ride wave 2's rebuild), then D's "Not played in a while" row.
- My music is read-only; the repo is public (fake names in shots and tests).
