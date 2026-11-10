# Board: the overhaul mockups (2026-11-09)

Seats: flow, screen, logic, tester. Brief: NEXT.md goal E (ROADMAP O.2): 2-3 clickable directions of the whole app.
Facts given: the owner's bar and taste (DESIGN-NOTES), sorting is done, daily use is shuffle Mine / tag / rate /
compare / search, no cover art exists, sideloaded with a free Apple ID. No code.

## Agreed
- **Three directions that differ on one thing I can feel:** what I see when I open the app at night.
  **A "Wall"**: a song to hear. Art-led, like Apple Music: generated tiles everywhere, the player is the tile.
  **B "Line"**: a box to search and my own lines. Text-led: "rap a line" first, waveform with tag dots, almost no art.
  **C "Deal"**: a card to judge. One forgotten song at a time, swipe to Fire / Shelve: the Sort card grown up.
  Three skins of one tab bar and one list would only be a choice of colours.
- **Tabs: Home, Library, Search** (Search as the round button, bottom right). Queue is never a tab. The mini player
  floats above the tab bar; the player and Queue sit above the tabs and never reload when a tab changes.
- **Sort is no longer a place.** Its cards become "Rediscover / Forgotten" on Home; leftover sorting and the Not sure
  pile are quiet Home rows that vanish at zero. The tagging session starts from a Home row.
- **Player, biggest first:** tile or waveform, title, seek with tag dots, Previous / Play / Next as symbols, then one
  quiet row of my own actions. Tag stays the closest control to the thumb, never in a menu. The eye, + Version,
  Shuffle and the rest go one level down. Nothing shifts when info arrives.
- **Glass only on the tab bar, the mini player and the transport.** Lists stay solid (glass under text hurts reading).
- **Queue:** a sheet from the player's bottom edge; swipe down lands on the same player. The drag keeps its bump.
- **Generated tile:** colour from the song (hue from the title, band from its group, older darker, newer brighter),
  first letters large and faint, never changes for a song, dim enough for a dark room.
- **Honest labels in every mockup:** FAKE DATA on songs; NEEDS NEW LOGIC on play count, last heard, forgotten shelf,
  waveform; NEEDS REBUILD on tabs, glass, SF Symbols; MAY NOT WORK SIDELOADED on Live Activity (it needs a second
  app target; the lock-screen controls I have already work).
- **Hard cases in every direction:** a 70-character title, all caps, emoji, untitled; 1,395 rows; a song with 0 tags
  and one with 30; a version group; Fire and Shelved; laptop off; a slow load; Undo after a mis-tap; 44 pt targets.
- **A banner on each mockup** says what a web page can't show: haptics, sound, real glass, the lock screen, speed. Add
  it to the Home Screen first, or Safari's own bars eat the bottom of the screen.
- **Speed is never judged from a mockup.** The app's own timings decide that.

## Disagreed
- **Which to cut if only two fit.** Flow: cut Wall (generic, I can already picture it). Screen: cut Deal (fold its
  cards into Wall's Home). Tester: Deal is optional but Line alone under-serves forgotten songs. Built: all three.
- **Mine / Not mine on the player.** Flow and screen: one small toggle by the title. Tester: in the "more" place with
  the eye. Built: a small toggle in Wall and Line, a swipe in Deal, so I can feel both.
- **Haptics on ordinary taps.** Screen: none, a light tick on transport as an option. Flow: Fire, Shelve and a card
  throw only. NEXT F asked for a light tick on today's controls, so that is built; the overhaul can narrow it.

## Owner questions (defaults in use)
1. Is the app a place to browse, or a place to be dealt songs? (a) browse (b) dealt (c) both, as Line does.
   Default: decided by which mockup I pick.
2. Accent colour: amber (Wall), mint (Line) or coral (Deal)? Default: each mockup keeps its own; any can take any.
3. Play count and "last heard" (stretch, not built): one counter per song, or a log of plays that counts are worked
   out from? The logic seat would keep the log (later ideas need no redo). Hard to undo: mine to choose before it's built.

## Proposed phone checks (each direction, added to the Home Screen first)
1. One hand, low brightness: reach Play, Next, Tag and Fire without shifting grip. Pass: thumb alone, no wrong taps.
2. From opening, reach a song by a line I rapped in under 3 taps; then a forgotten song with no search.
3. Tag 3 lines in a row while it "plays", then fix one. Pass: nothing jumps, Undo is offered.
4. Shelve the wrong song, then Next twice fast. Pass: Undo stays in reach and brings it back.
5. Scroll the 1,395-row Library fast, open the 70-character title and the 30-tag song. Pass: nothing cut or crowded.
6. Player, Queue, swipe down twice, tap the mini player, switch tabs. Pass: each swipe goes back exactly one step.
The choosing question: which one would I open at 2 a.m. in the studio, one hand, and hear something I forgot I made?
