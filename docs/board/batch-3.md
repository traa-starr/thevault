# Board notes: batch 3, the real player
Meeting 1, 2026-11-01. Advice for chat to review; nothing here is decided until it reaches DECISIONS.
Words: **stack** = a pile where the newest item comes off first. **Playlist player** = see `BLUEPRINT.md`.

## Agreed
1. One player sits above every screen. Screens only send it commands. Back never stops the music.
2. Now-playing bar on Home, Library, Hidden and Sort, near the bottom: title, Play/Pause, Next. Hidden until something
   has played. Tapping it opens the full player as a sheet; closing the sheet never touches the music.
3. Mine / Not mine are not on the slim bar: too easy to mis-tap beside Pause.
4. Sort doesn't "pause a queue". Entering it saves the library's song, exact second, order and shuffle on a stack; sort
   gets its own list. Shuffle belongs to the list, so sort can't change the library's shuffle.
5. Undo: the song and second are saved at the moment of the tap, not when Undo is tapped. Only the newest action can be
   undone. The 5-second toast sits above the bar and survives changing screens. Hidden list Restore has no saved spot.
6. If the laptop can't be reached on Undo: a plain message, and the song stays Not mine. (Tester; no seat objected.)
7. Back: Home none. Library to Home. Hidden to Library. Full player closes to the screen under it. Queue to the player.
   Sort to the screen it came from, restoring the library's place. Swipe-back does the same as the Back button.
8. The queue holds song ids, not list positions. `playOrder.ts` uses positions today, so a list refresh, filter or Not
   mine would point at the wrong song. A list refresh must not rebuild or restart the queue.
9. Queue view opens from the full player: current song, then Up next; tap to jump; Not mine songs drop out. In sort it
   shows the sort order. Remaining-time tap flips `3:41` and `-2:10`, with a full-height tap target.
10. Lock screen: title, seek, previous, next, play/pause. No Mine / Not mine on it.
11. No server, journal or database change. Player state is phone memory only. Nothing here is hard to undo.
12. Keep the player behind one small set of commands so the playlist player and single player can swap. The bar and
    keep-playing-across-Back must work on the single player too, so build them first: they survive if the switch fails.
13. Words on screen: Up next, Queue, Sorting, Paused. Never "context", "window" or "playlist".

## Disagreed
- **Leaving Sort, what plays?** Flow: the sort song keeps playing and the bar offers "Back to <song> 2:14". Screen: library
  song restored, always paused. Logic and Tester: restored, playing only if it was playing. See owner question 1.
- **How music stops.** Flow: Pause only. Screen: Stop in a menu, never by swipe. Logic: X on the bar, or swipe it away.
  Tester: bar's Stop or Pause. Code's lean: Pause only for now; the fewest controls, and it's easy to add one later.
- **Tapping a Library song during Sort.** Logic: refused, Sort is exclusive. Tester: it replaces the saved library entry.
  Code's lean: Tester's, since refusing a tap is a dead end, and it fits "act on it on any screen".
- **End of a song in Sort.** Logic: loops, so no song is skipped unjudged. Others didn't address it. Code's lean: loop.
- **Lock-screen next in Sort.** Logic: moves the card too, or disabled. Others silent. Code's lean: moves the card, no
  verdict given; the song comes back later because it's still unsorted.
- **Remaining-time choice.** Flow and Screen: remembered between launches. Logic: this session only. Reversible; remember it.

## Owner questions
1. **When you leave Sort, what happens to the music?** (a) the library song returns at its spot, paused, one tap to go on
   *(default: three seats restore it, and nothing starts by surprise in the studio)*; (b) it returns and plays by itself;
   (c) the sort song keeps playing and the bar offers "Back to <song> 2:14".
2. **Should the app reopen where you left off after being closed?** (a) No, it starts stopped *(default; Tester's call,
   and the phone can lose its place anyway)*; (b) Yes, same song and second, paused. (b) is small and can come later.
## Must handle (Tester)
- Calls and Siri: the bar must match what is really playing, and a call during Sort must not lose the saved library spot.
- Returning from Sort: re-check the saved song is still allowed, because it may have been sorted meanwhile. Marks live in
  one shared place, not per screen.
- Seeking on the playlist player is unproven and Undo depends on it: test Undo there first, seek only once loaded.
- Bad songs (cloud-only, missing) ahead in the list: skip them; if several in a row fail, stop with a message, never loop.
- Not mine on the last song of a list leaves a defined state. App killed or SideStore refresh: queue gone, stopped.
- Keep "what shuffle avoids" an input to the player: batch 4b's canon-only rule will change it.

## Proposed phone checks
1. Play a song, Back to Home, reopen Library. Pass: music never stops, bar shows the same song, its Pause works.
2. Lock the phone near a song's end. Pass: next song starts by itself, its title shows, lock-screen next and previous work.
3. At about 1:30 tap Not mine, then Undo within 5 seconds. Pass: same song at about 1:30. Repeat with the laptop off.
   Pass: a plain message, and the song stays Not mine.
4. Enter Sort from a playing library song, then leave. Pass: the library song is back at its spot, as question 1 decides.
