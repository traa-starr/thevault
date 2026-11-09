# Board: playback feel, play first, info after (2026-11-08)

Seats: flow, screen, logic, tester. Brief: NEXT.md "Play first, info after". Facts given: session Next ~800 ms vs Sort
91 ms on the phone; Next goes mute, advance, wait for "loaded", seek to 0:15, play; session songs play from phone copies
(523 MP3 kept as-is, 151 AAC), Sort songs stream from the laptop; Library's 1 ms timing is not a real measurement.

## Agreed
- **Order after a tap:** title, play state and the start spot (0:15 / 0:30) at the tap; then sound; then length, ticks,
  tags. No spinner, no "finding 0:15" words: under 1 s, a word that comes and goes is itself a flicker.
- **Measure before rebuilding anything.** Each sample carries its stages: tap to loaded, seek ms, re-seek yes/no,
  source (phone copy / stream), file type. Numbers only. The phone then says where the 800 ms goes.
- **Path named at the tap,** not guessed at first sound: session, sort, library, previous, lockscreen, search, restore.
- **First sound is real sound:** playing, volume up, not still muted. Library's instant "1 ms" no longer counts.
- **Latest tap wins.** A skipped song makes no sound; the volume always comes back; one pending timing per tap.
- **Length (C):** its own nullable store on the laptop, filled by a background job when the server starts (library copy
  first, else the original only if it's on disk; cloud-only left empty, never downloaded). Not in the journal: it can be
  measured again any time. Sent with the song list; an old cached list without it still opens.
- **Length is display only.** It never decides the short-song rule (that waits for iOS's own length), so a wrong stored
  length can't seek past a song's end.
- **Nothing shifts:** both time texts in fixed-width boxes ("–:––" to "3:42" moves nothing); reserved line and title box
  keep their height; the seek bar keeps its look. Screenshot before and after info, same boxes.
- **Seek bar usable at once** with a stored length: a drag before iOS has loaded the song waits and lands, never swallowed.

## Disagreed (Code's pick in bold; owner can change at review)
- Stream from the laptop when reachable (flow: yes, invisible, fall back after ~1 s). Logic + tester: never prefer the
  stream (laptop asleep, away on cellular, mid-song stalls). **Phone copy stays first** (BLUEPRINT rule); the stage
  timings decide what's next.
- iOS length differs from the stored one. Screen: keep stored under 3 s, switch silently above, only with the finger off.
  Logic: phone always wins. **Switch silently when off by over 2 s, finger off the bar**; same second kept.
- Previous kept ready in a slot (flow). **Not now:** expo-audio rebuilds the list on Previous natively; reachable only by
  routing Previous like a fresh load with the start spot, measured on its own path.

## Owner questions (defaults in use)
1. If the stage timings show local MP3s are the slow part: re-make the 523 MP3 phone copies as AAC (faststart) so they
   load like Sort's? Logic's pick: yes, after a 5-song test. Default: **no change this step**; it re-sends every copy.
2. Faint dim on the left time until sound starts? Default: **none**.
3. Fast-skipped songs count as heard? Default: **no**.

## Proposed phone checks (tester, merged with NEXT)
1. Session: Next 5 fast, 3 slow, then pause, lock, lock-screen Next twice. Pass: each ends in music near 0:15, never
   silence, volume normal, length shows at once.
2. Previous 3 times, a Library song, a search result. Pass: each starts about as fast as a Sort card; the search result
   plays from its tag's moment.
3. Player from Library, a Sort card, a session, one song under 15 s. Pass: length at once, nothing jumps as info fills
   in, the short song plays from 0:00 without a silence.
4. Laptop: `timings` block in REPORT, each path under its own name, PASS/FAIL per path.
