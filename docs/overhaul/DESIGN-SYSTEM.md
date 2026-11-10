# Design system: Wall base, Deal's player (ROADMAP O.4)

Written by Code, 2026-11-10, from the board (`docs/board/wave1-frame.md`) and the mockups (`spike/mockups/app.css`).
The values live in one file, `app/theme.ts`; screens never type a colour or a size of their own. Change it there.

## Colour (dark only)
| Name | Value | Used for |
|---|---|---|
| bg | `#000000` | Behind everything, true black (easy at night) |
| surface | `#111114` | Cards, full sheets |
| raised | `#1c1c21` | Chips, fields, half sheets, the solid stand-in for glass |
| line | `#2a2a30` | 1 pt hairlines only |
| text | `#f2f2f4` | Words to read |
| dim | `#a0a0aa` | Second line, quiet controls |
| faint | `#6a6a74` | Off / disabled. Never words I must read |
| accent | `#ffb020` (amber) | Only: the playing song, tag dots, Tag, an action that is on, Undo |
| onAccent | `#141006` | Text on amber |
| warn | `#3a2a06` / `#ffd58a` | Laptop not reachable. The only other colour |

The Play button is white with a black symbol, not amber.

## Type (system font)
Screen title 28 heavy · section heading 20 bold · player title 24 heavy, 2 lines at most · row 17 · meta 13 in dim,
times in fixed-width digits · action label 12 · tab label 10 · chip 14 · toast 15.

## Space and size
Unit 4 (8, 12, 16, 24). Screen side padding 16, player 20. Every tap target 44 pt or more.
Row 60 with a 44 tile · Home card tile 132 · player tile: a square, as wide as fits, at most 42% of the screen's
height · mini player 60 high, 12 from the sides, 8 above the tab bar, a 2 pt amber progress line along its bottom ·
tab bar 56 high, round search button 56 beside it · Play 64 round · transport pill 76 high · action row 52 high, five
equal slots, symbol 22 over a 12 pt word · seek bar 44 high to touch, 4 pt track · a list's last row scrolls clear of
the tab bar and mini player.

## Lists and chips (wave 2)
A list row is always 60 high: tile 44, title on one line (cut with …), one quiet second line, then my mark. Only
the words give way. Favorite is a small grey heart, Archived the word in grey: never amber, or a list of Favorites
would shout. The playing row's title is amber. A row that can't play now is at 40%.
Chips are 36 pills in a 44 touch; the one that's on is white with black text (not amber), and is scrolled into view.
Home's five lower rows use a 104 card; the first two keep 132. "See all" is grey, right of the heading, 44 high.
The search field is 48 high, `raised`, corner 12, with a grey Cancel beside it; matched words in a tagged line are
white and bold on a grey line.

## Corners
Row tile 8 · card tile 14 · player tile 22 · sheet 22 · tab bar 28 · mini player 18 · transport pill 38 · chips and
buttons fully round · fields and toasts 12.

## The tile (the picture every song has until real art exists)
Colour from the title, so a song's tile never changes. Older songs darker, newer brighter, capped so nothing glows in a
dark room. The first two letters large and faint. A song with no letters in its title gets a grey tile and "?".

## The player's tint
The whole background takes the tile's colour, as in Deal: about 40% of it at the top, easing to under half of that by
the buttons. A bright tile gives less. White text keeps a contrast of 7 to 1 or better and the quiet grey text 4.5 to 1,
even where the tint is strongest (tested on 500 titles, every year). Grey tile: plain black, no tint.

## Glass
Only the tab bar, the search button, the mini player and the transport pill. Real Liquid Glass needs iOS 26 and the
rebuild; anywhere it's missing they are solid `raised` with a faint edge. Nothing with text to read sits on glass.

## Movement
The mini player and the player are one object: one value moves both. The finger always wins and can turn it round at
any point. Tabs swap at once (no slide). Pressed look: the same instant flash on every control (`Tap.tsx`).

## Words
Plain music-app words: Search, Shuffle, Favorites, Recently played, Not played in a while, Favorite, Archive /
Archived, Tag, Lines, Queue, Playing, Paused. No slogans. `app/labels.test.mjs` lists every string on screen.
