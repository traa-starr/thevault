# Board notes: batch 3b, player polish
Meeting 3, 2026-11-01: flow, screen, tester. Advice for chat to review; nothing here is decided until it reaches DECISIONS.

## Agreed
1. Full player splits in two: the current stack stays centred on top, a fixed dock sits at the bottom. The dock keeps its
   space when the buttons are hidden, so nothing jumps.
2. Mine left, Not mine right, equal width, 56 tall, 12 apart, 40 of bottom margin. Play stays the only loud button.
3. Hide is words, not an icon, in the same spot in both states so there's always a way back.
4. Undo toast on this screen sits directly above the buttons, never on them. It stays there when they're hidden.
5. Queue: holding anywhere on a row lifts it, with a quiet grip mark on the right as the hint. A hold that lifts never
   jumps. Movement before the lift is a scroll. Once lifted, the list can't scroll by hand and sideways is ignored; the
   edges auto-scroll. Same-place drop does nothing. Reordering never touches the music.
6. Links under the 44 minimum (Shuffle, Queue, Back) go up to 44.

## Disagreed
- **Hide wording and side.** Flow: "Hide" / "Show", right, or left if stray taps show. Screen: "Hide buttons" / "Show
  buttons", left: "Hide" beside Not mine reads as hiding the song. Code's call: Screen's.
- **Back and Queue.** Flow: move them to a top header. Screen: keep the order. Code's call: keep, as the brief didn't ask.
- **Hold time.** Flow 300 ms, Screen 250 ms. Code's call: 300, since a short hold released would jump the song.
- **Double tap on Not mine** (Flow only): ignore it for 500 ms, or two songs go. Code's call: yes.

## Owner questions
- Dragging with Shuffle on reorders the shuffled order and Shuffle stays on. Shuffle off goes back to list order, as
  today, forgetting the drag. Default stands unless you say otherwise.

## Must handle (Tester)
- `track` holds frozen orders: rewrite it on release like `setShuffleOn`, then `replaceAhead`, or the next song change undoes the drag.
- Work by song id in a tested `moveInOrder`, never by row number: rows wrap, hide removed and avoided songs, and stop at 200.
- Keep `list` untouched (it can be the same array as `sequence`). Keep `at` on the current song. Keep the same songs on
  the played side of `furthest`, so a Mine song can't slip into a shuffle.
- A song ending mid-drag: rows stay frozen, apply to the latest order at release, cancel if the song is now playing.
- `tapUndo` restores the older order, which would lose a drag made within the 5 seconds.
- Sort's order is thrown away on leaving, so drag is off there.
- Sheet swipe-down and list scroll can fight the drag: check on the phone.

## Proposed phone checks
1. Drag the 5th Up next song to first, then Next on the lock screen. Pass: no restart, that song plays, title matches.
2. Drag a song, let two songs finish locked, open Queue. Pass: the order holds, right song playing.
3. Shuffle on, drag, Not mine, drag again, Undo within 5 seconds. Pass: song back at its second, latest drag still there.
4. Hold the next-up row until its song starts, then release. Pass: nothing jumps or restarts.
