# Board: wave 3 (2026-11-11)

Seats: flow, screen, logic, tester. Brief: NEXT goals C (Sort as Deal's swipe card) and D (tagging session and tag
editing in the new style). What a swipe or tap saves stays as built; this is look and movement only. No code.

## Agreed
- **The card (C).** A tall card in the song's own tile colour, corner 22, the first two letters large and faint, title
  30 heavy bottom-left (2 lines, then …), date under it. The next card sits behind it at 94%, a little lower, for
  show only: it never plays, counts or takes a touch. The card follows the finger with no lag.
- **Stamps, not colours.** "Mine" (amber) top-left, "Not mine" (grey outline) top-right, "Not sure" top-centre on an
  upward drag. They fade in with the drag and read the drag only. The red and green blocks go: amber stays the one accent.
- **Under the card:** three quiet round buttons (Not mine, Not sure, Mine), the same choices as the swipe; Undo always
  in the same spot; a thin amber progress line with "N left here" in the header beside Back.
- **The verdict is saved the moment the finger lifts**; the throw is drawn after. A kill mid-throw loses nothing.
- **The card has no tap of its own**, so a swipe can never also count as a tap. Past the 110 pt mark is a verdict,
  short of it springs back; down never grabs.
- **Tagging session (D):** one song, one job. The count becomes a proper line ("3 of 10 tagged" with a thin amber
  bar), Next song the clear main action, Not mine and its Undo in the same quiet pill style as Sort.
- **Tag editing (D):** Lines rows in the list style (time in fixed digits, words 17); the hold menu a half sheet
  (`raised`, corner 22) with 52-high rows, Delete last in plain white; Undo as the same toast as everywhere. The
  reserved line for typing stays, so nothing jumps. Timers (6 s Undo, 400 ms hold) and what saves stay as built.

## Disagreed
- **Buttons under the card.** Screen: three round 56 buttons with 12 pt words. Flow: glass. Built: solid `raised`
  rounds with words (glass is kept for the four pieces in the design system).
- **The tag icon.** Flow: calm it to grey. Screen: keep amber, add the word. Built: unchanged (amber Tag is in the
  design system; the owner passed it in waves 1-2).

## Owner questions (defaults in use)
1. A small buzz when a swipe decides? Default: yes, on the decision only, never during the drag (as today).
2. "Not mine" stamp: grey, or a soft red? Default: grey.

## How A-D could break, and what catches each
| # | Break | Caught by |
|---|---|---|
| 1 | A swipe also fires a tap or a button (double verdict) | test: one release, one verdict; the card has no tap |
| 2 | Fast double swipe judges one song twice or the wrong song | test: two releases, two different songs |
| 3 | Undo after a throw brings back the wrong card or leaves a version link | test: swipe, Undo: song, place and link back |
| 4 | A stamp or offset left on the next card | shot: card after three swipes; test: position resets with the verdict |
| 5 | Killed mid-throw: verdict lost | test: the save happens at release, before any animation |
| 6 | Up swipe clashes with a scroll or swipe-down | test: down never grabs; up only when more up than sideways |
| 7 | Few songs: a Home row empties or repeats after the no-repeat rule | test: 3, 6 and 12 songs; no empty heading |
| 8 | Day rollover reshuffles rows under my thumb | test: order depends on the local day only; rebuilt only when Home comes back into view |
| 9 | 1,395 songs: the no-repeat rule and shuffle stall Home | test: rows build in under 50 ms on 1,395 songs |
| 10 | "Not played in a while" from 0:00 on a song that can't play: silence | as built: only playable songs are in the row; a miss says so (test) |
| 11 | "Laptop not reachable" missing on search, or stuck after it's back; Loading never ends; Needs tags lists all before tags load | tests + laptop-off shots that fail the fetch like a real phone |
| 12 | The energy fix freezes the seek bar or tag words | model test: ceilings hold and the bar still moves each second |
| 13 | Tag editing: the sheet under the keyboard, or a double tap saving twice | shot: tag edit; saving path untouched |
| 14 | Home repeats (LESSONS) | test: no repeat in any row's first 5; full-Home shot checked |
| 15 | A laptop check a phone copy would pass (LESSONS) | laptop-off proof uses the "Laptop not reachable" line only |

## Proposed phone checks
1. Sort: throw 5 cards right, left and up, fast. Each song judged once, no stamp left behind, count right; Undo the last.
2. Laptop off: Library and search both say so; on again, it clears.
3. Home: no song in the first 5 of two rows; Not played in a while starts at 0:00.
4. Tag session: a short run, edit one tag; then 10 min locked.
