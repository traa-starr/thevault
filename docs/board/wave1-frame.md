# Board: overhaul wave 1, the frame, Home and player (2026-11-10)

Seats: flow, screen, logic, tester. Brief: NEXT.md 2026-11-10 (Wall base + Deal's player, play data, plain labels).
The design system itself is in `docs/overhaul/DESIGN-SYSTEM.md`. No code.

## Agreed
- **One system: Wall everywhere, Deal only inside the player.** Amber accent, Wall's corners and title size on lists;
  Deal's round feel only on the player's tile and the transport pill. Accent is for "this is playing", tag dots, Tag,
  an action that is on, and Undo. Never decoration. The Play button is white, not accent.
- **Tint is capped.** The player's background takes the tile's colour at about 40%, darker under the seek bar and
  buttons, so white text reads on any colour. A tile always exists (it is made from the title), so there is always a tint.
- **Glass only on the tab bar, the search button, the mini player and the transport pill.** Solid fallback everywhere
  it isn't available. Lists, rows, toasts stay solid.
- **The mini player and the player are one object with one movement.** One value drives both (two separate fades
  flicker). The finger always wins: a swipe down mid-grow turns round from where it is. A tab tap mid-grow closes the
  player and switches tab. None of it touches the music. Only the grab bar drags the sheet.
- **One swipe-down rule:** the player lands on the mini player, on the tab I was on. Queue lands on the player it
  came from.
- **Above the tabs:** tab bar, mini player, player, Queue and Versions are siblings over the tab content; only the tab
  content swaps. Home and Library both stay drawn (the hidden one is only hidden), so a tab change never reloads songs.
- **A play counts once, after 30 s of real listening** (pauses and seeking don't count). A skip before that is not a
  play. Compare flips and Sort cards don't count. Written to the outbox file at the 30 s mark, with its own id, so a
  force quit loses at most the play in progress and a retry can't count twice.
- **The laptop's log is the truth.** It works count and last heard out from the log and sends them with the song list;
  the phone shows that plus its unsent plays on top (the same trick as ratings). Two restores give the same numbers.
  The phone's time is kept, and never trusted later than the moment the laptop got it.
- **Empty Home rows vanish.** A fresh wipe shows no blank headings. "Not played in a while" never waits for the laptop.
- **Labels:** a test lists every on-screen string and fails on Fire / Shelve / Shelved. Stored values keep their names.

## Disagreed
- **Sort and the tagging session: tabs or no tabs.** Flow: hide tabs and mini player there (they are the player's
  own surface). Logic: keep everything above the tabs always. Built: tabs hide on Sort, the mini player stays (it is
  how Sort's sound is paused today); the session is the player itself, as now.
- **The eye.** Flow: fold it into Archive. NEXT says a tap must do what it did, and Archive (was Shelve) is not Hide.
  Built: Archive stays Shelve's behaviour only; Mine / Not mine move to the quiet line under the title.
- **Play length.** Logic: 30 s line only, length later if cheap. Tester: one rule, written down. Built: one line at 30 s;
  a second line with the full length when the song is left, same play id (the log keeps the longer one).

## Owner questions (defaults in use)
1. Accent colour: amber (Wall) or coral (Deal)? Default: amber. Coral reads as delete-red.
2. "Not played in a while" on day one, when nothing has a play yet: default is my oldest Mine songs first, reshuffled
   once a day, with songs heard long ago ahead of them as plays build up.
3. Mine / Not mine in the player: default is one small word under the title (tap flips it, with Undo), since sorting
   is done. The other way is keeping two big buttons.

## Proposed phone checks
1. Tap Home, Library, Home, Library fast for 10 s, then the mini player while a tab changes. Pass: no freeze, right
   screen, the mini player grows into the player.
2. In the player, swipe down half way, back up, then down; from Home and from Library. Pass: I land on the tab I was on.
3. Play a song past 0:30, skip another at 0:10, force quit, reopen. Pass: Recently played shows only the first.
4. Laptop off, play 3 songs past 0:30, laptop on, wait a minute. Pass: `python server\vault_cli.py plays E:\VaultLibrary`
   shows 3 plays, none doubled.
