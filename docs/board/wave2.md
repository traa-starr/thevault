# Board: overhaul wave 2, search screen, Library, fuller Home, server that stays up (2026-11-10)

Seats: flow, screen, logic, tester. Brief: NEXT.md 2026-11-10 (goals A to D). One short meeting. No code.

## Agreed
- **Search is a third place under the same tab bar**, the round button lit. Leave by a tab or Cancel. One search
  screen however it's opened (round button, Home's box, the lock-screen link); a second tap changes nothing.
- **It searches every listed song** (what Library's All shows), so results equal today's Library search. A result tap
  plays from the tagged second inside the list of everything playable, newest first. A tap carries the song, never a
  row number, so results still changing can't play the wrong song. One tap plays, keyboard up or not.
- **Recent searches:** only a search that led to a tap on a result (typing "ki", "kil", "kill" must not fill it).
  Eight, newest first, a repeat moves to the top. Tapping one fills the box, it doesn't play. A Clear word. Kept in a
  small file on the phone only: a convenience, not truth.
- **Coming back from the player lands on search with the words still there.** Cancel or a tab clears the box.
- **Library loses its own search box** (search is one place now) and gains chips: All, Mine, Favorites, Archived,
  Needs tags, Versions. The selected chip is white, not amber. Unsorted shows only while unsorted songs exist.
- **Rows keep one fixed height** (60, tile 44): the title is one line and cuts with "…"; the marks and the second
  line never give way. A song that can't play now is dimmed and says why in words.
- **Favorite and Archived are quiet marks**, not amber: 300 amber marks would make amber stop meaning "on".
- **Home's new rows show only a family's Main, never an Archived song, only songs that can play now.**
  Recently added: by the song's date, newest first, no-date songs left out. Most played: 2 plays or more.
  Favorites and Needs tags: newest first. Versions to compare: one card per group, biggest group first.
- **"See all" only lands on something real:** Favorites, Needs tags and Versions on their chips; Recently added on
  All sorted Newest; Most played on All with a third sort order, Most played. No invented chips.
- **Home tells Library which chip to open the way "+ Version" already does** (held until Library takes it). A chip
  asked for from outside leaves select mode first.
- **Server:** the scheduled job must not stop on battery, must have no time limit, must wait longer between tries
  when the library drive isn't there, must give way quietly when a server is already running by hand, and its log
  must roll over. `doctor` asks the server itself, not only whether the job exists. Off leaves nothing running.

## Disagreed
- **Keyboard up: where the mini player goes.** Flow: lift it above the keyboard so Pause stays in reach. Screen:
  leave it; the field and results need the room. Built: it stays under the keyboard; one drag on the results drops
  the keyboard and it's back.
- **Sort order control.** Screen: a small menu. Flow: one word that changes on tap. Built: one word, tap to change
  (Newest, A to Z, Most played): no pop-up to aim at.
- **Lower Home rows.** Screen: smaller cards (104) so seven rows aren't a wall. Flow: same size everywhere. Built:
  smaller for the five new rows.
- **Shuffle, Tag songs, Hidden in Library.** Screen: behind a "…" menu. Flow: Shuffle visible, Tag songs only in
  Needs tags. Built: Shuffle and Tag songs stay on the title row, Hidden is the last quiet word in the chip row
  (a tap must keep doing what it did; nothing moves into a menu this wave).
- **A card in Versions to compare.** Flow: open the group. Logic default: play like every card. Built: opens the
  group's Versions sheet, where Compare is.

## Owner questions (defaults in use)
1. A Versions to compare card: opens the group (default) or just plays the song?
2. Recent searches: only ones I tapped a result from (default), or everything I typed?
3. "Recently added" goes by the song's own date (the only date there is). Keep that name (default), or "Newest"?
4. Library's own search box is gone: finding a song to tick for grouping now means scrolling or a chip. Fine
   (default), or put a small filter back in select mode in wave 3?

## Proposed phone checks
1. Restart the laptop, log in, open nothing, wait a minute: the phone lists songs and plays one. No window appeared.
2. Round search button: keyboard up at once; type a tagged word, tap a result while the list still moves: that song
   plays from its second on the first tap. Swipe the player down: the words are still there. Clear the box: recents.
3. Library: flick top to bottom fast: no freeze, no blank rows. Every chip shows a count or a plain "none" line.
4. Home: the new rows, "See all" on each lands on the right chip or order, nothing jumps under the thumb.
