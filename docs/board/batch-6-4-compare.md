# Board: Batch 6.4, Compare feel (2026-11-07)

## Agreed
- **Why it's slow (logic + tester, from the code; Code measures first):** only 3 players live at once (`nearby()`), so
  each dial rest drops one and builds a new one. With the laptop on, siblings stream from the laptop, then a forced seek
  to the playing second, then `canFlipTo` waits for loaded + playing + within 0.12 s. That chain is the ~5 s.
- **The slowness didn't make 6.3 stable.** The gate (`canFlipTo` + pending flip), volume-only swaps and
  `keepAudioSessionActive` did. Keep all three; move the waiting to before the dial shows.
- **Parked = playing silently (muted), not paused.** Starting a paused player at the flip costs 50-200 ms and can fail.
  The existing drift pull (>0.08 s, once a second) keeps them in line. All pause when the song pauses.
- **Readiness per version:** loading / aligned / skipped. Dial shows when every version in the window is aligned or
  skipped (3 s cap). Late arrivals undim without moving the dial and never flip by themselves.
- **Cap the players** (about 6, nearest first, staggered loads). Sticky window: drop a player only when it is 3+ rows
  away. Code measures the real iPhone limit. Versions past the cap: dimmed, short wait.
- **Hard cut in one step:** both volumes set together; last gesture wins; rapid A-B-A ends with exactly one audible.
- **Done unchanged from 6.3:** queue loads the sounding version silently and hands over; never adopt a Compare player.
- **Screen:** one controls slot of fixed height (today's extra "Back to ..." row in `Compare.tsx` is the jump). Player
  mode and Compare mode both draw inside it; 200 ms crossfade; the hidden layer catches no taps. Compare row:
  [play/pause] [dial with version label + "2/4"] [Done]. Subtitle never changes. Done sits where Compare was.
- **The wait:** music, play/pause, seek and skip all work normally. Skipping to another song cancels Compare. A second
  Compare tap cancels and tears down half-loaded players; late callbacks do nothing. Light haptic on the Compare tap.
- **Dimmed version:** 40% opacity, grey "Not ready" (not red), skipped by swipe and arrows.
- **Lock screen:** pause silences every player; title names the sounding version.

## Disagreed
- Button during the wait: UX wants the label to read "Getting ready..."; UI keeps "Compare" with an opacity pulse so the
  button can't change width (a width change is the jump). Chair's lean: UI, fixed width.
- At the 3 s cap: UX says a one-line "2 of 4 ready" note; UI says the dimmed rows are enough. Chair's lean: dimmed rows
  plus the "2/4" already in the label.
- Under 2 versions ready: UX says don't open ("Not ready yet, try again"); UI says open with one dimmed row (owner Q1).
- Undo after Done: UX yes (back into Compare); UI no. Chair's lean: no, Done is cheap to redo.
- Laptop comes back mid-Compare: tester wants dimmed versions to undim; logic fixes the source at open. Chair's lean:
  they undim only if their stream recovers; no source switch mid-Compare.
- Haptic on every flip: UX yes; others silent (owner Q3).

## Owner questions (defaults in brackets)
1. After 3 s, if only the playing version is ready: open the dial with the others dimmed, or don't open and show
   "Not ready yet" on the button? [open, dimmed: you can still see what's coming]
2. When every version of a song is on the phone, Compare uses the phone copies even with the laptop on (fast, all the
   same quality)? If some are missing, all stream from the laptop so the A/B is fair. [yes]
3. A light tick (haptic) on every flip, so you feel it without looking? [yes]

## Tests to add (compareEngine.test.mjs)
Instant-ready fake players; seek that lands 0.3 s late; 20 flips in one tick with exactly one audible each tick while
playing and none while paused; `play()` that takes a tick; fast swipe while paused; 12 versions vs the cap (sounding and
pending never dropped); a player that never loads (skipped at 3 s, dial opens); a late-ready player; Done mid-load and
after rapid flips; pause, seek, resume, flip; song end fires once.

## Proposed phone checks
1. Play a grouped song, tap Compare. Pass: music never stops; button pulses; dial fades in; artwork, title and bar don't
   move at all. Done fades back, no gap.
2. Flip 10 times at a normal pace. Pass: no load you can hear, same spot, never two versions at once.
3. Swipe the dial fast 20 times (the song with the most versions). Pass: one version at a time, ends on the one you
   stopped on, no crash.
4. In Compare, pause 2 minutes, play, flip. Pass: nothing starts by itself; the same drum hit lines up after the flip.
5. Lock the phone mid-Compare, pause and play from the lock screen, unlock. Pass: title is the version playing; pause
   silences everything; play brings back one version.
6. Stop the server, open Compare on a song with versions missing from the phone. Pass: dial opens within ~4 s, missing
   ones dimmed and skipped. Start the server again after.
