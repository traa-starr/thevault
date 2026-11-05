# Board notes: batch 4d, Compare versions
Meeting 3, 2026-11-04. Owner's design fixed: A-B flip at the same second, a dial picker, opens from the full player and a
Library group. Screen words: **Compare**, **Done**, **Main**, **Playing**, **Match loudness**. Never A/B, LUFS or gain.

## Agreed
1. **The flip happens when the dial comes to rest on a row**, with no Switch button. A fling past 3 rows is one flip, not 3.
   Taps during a flip replace the target and don't pile up.
2. **No gap, built in:** Compare has its own players, kept apart from the queue's player. They run together and only the
   sounding one has volume, so a flip just swaps volumes. There's no seek or load at the moment of the flip. Silent players
   re-sync to the sounding one when they drift past about 80 ms. At most 3 load at once: the sounding one and its dial
   neighbours.
3. A version that isn't ready shows "Loading" on its row. The old one keeps playing until the new one is ready, so it
   never flips to silence.
4. **The queue's player pauses while Compare is open.** Its sounds, stall watch and song end ignore Compare.
   Compare never moves the queue. Not offered during Sort, which already borrows the player.
5. **The dial:** Main first, then newest to oldest. Each row shows title, date and length. Main is always marked, and the
   sounding row shows Playing. "2 of 5" sits under the dial. A group of 2 uses the same dial: one swipe flips.
6. One scrubber for all versions. Seeking moves every player. Play and Pause move them together.
7. A version that can't play (cloud only, missing, laptop off) is greyed, and the swipe skips it. Fewer than 2 that play:
   a plain line, and Compare doesn't open.
8. Compare listens to Versions. A version removed elsewhere leaves the dial. If it was the one playing, Compare moves to
   Main at the same second. A group that drops below 2 closes Compare.
9. **Level match:** the laptop measures each Mine song's loudness from the library copy (ffmpeg's EBU R128 integrated
   loudness plus true peak), as a step of `import` that can be rerun. It goes in a side table `loudness` written through
   the journal, the same way `imported` is, so it can be rebuilt with no schema bump. `/songs` sends the number. The phone
   turns louder versions down to the quietest in the group and never boosts. Versions not measured play as they are, and
   the toggle says "not measured". On by default; the setting is saved on the phone.
10. Nothing in Compare goes to the outbox or the journal: it changes no verdict. App killed mid-Compare: it reopens on the
    queue's song.

## Disagreed (Code's lean in bold)
- **Shorter version** (flip at 3:10 to a 2:50 one). Screen: land at its end. Tester: its end minus 0.5 s. Flow and Logic:
  refuse, and the row is greyed with "ends 2:50". **Refuse and grey: it never lands on silence.**
- **Song end.** Flow: loop. Screen: "Play again". Logic and Tester: stop. **Back to 0:00 paused; Play starts it again.**
- **Dial ends.** Flow: wrap around. Others: bounce. **Bounce, with "2 of 5" to show where you are.**
- **"Back to the last one" button** (Flow: one tap between the two you're judging). **Build it: it's small and it's the real
  A-B.**
- **Lock-screen Next and Previous in Compare.** Tester: they flip. Logic: hide them. **Hide them, title names the version.**
- **Make main or Remove from inside Compare** (Flow). **Park it: one more pitch.**
- **Library start when a song in that group is already playing.** Flow: start there, at that second. **Owner's design: Main
  at 0:00.**

## Owner questions (defaults taken)
1. **Close on a version the queue doesn't hold.** (a) It plays in the queue's spot, the way Versions' Play does, and the
   rest of the queue stays the same *(default)*. (b) The queue stays exactly as it was, and the bar just names the
   version (more player code).
2. **Close a Compare opened from Library.** (a) The song from before comes back at its spot, paused *(default; Sort does the
   same)*. (b) The compared version keeps playing in the bar.
3. **Song end:** (a) back to 0:00, paused *(default)*; (b) loop.

## Proposed phone checks
1. Full player, a grouped song at about 1:00: Compare, dial to another. Pass: within about 1 s of the same second, no restart.
2. Flip 8 times fast, then let it play 10 s. Pass: on the version the dial shows, one version heard, time counting.
3. Library, a group of 3+, then a group of 2: Compare. Pass: Main at 0:00, one row moves per swipe, Main marked, a fling stops
   at the end.
4. Loud vs quiet, Match loudness on then off. Pass: on = about the same; off = the real difference.
5. Lock the phone mid-Compare. Pass: the title names the version, and Pause and Play work.
6. Close Compare. Pass: the version keeps playing at that second; Up next unchanged.
