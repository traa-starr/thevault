# Board: player fix-up (2026-11-08)

Seats: flow and screen (board test line 2). Advisory, trims only. Brief: NEXT.md "Player fix-up".

## Agreed
- Tags list opens in place in the space between the Back row and the dock; the swipe-up-to-Queue strip stays under it.
- Tap **Tags · N** to open, tap again to close. Open shows in the label (white, bold, like Shuffle's old "on" text).
- The list belongs to the song: closed on every song change. Row taps jump and leave the list open.
- Not opened by tagging; the new tick and the count going up are enough.
- Mine/Not mine dock keeps its fixed height, so the list never resizes when the eye is tapped.
- Tag icon and Tags button hidden in Compare (not dimmed); Back/Done keeps its spot.
- Tag icon: drawn from Views (no icon package), amber, full tap target (56 x 48), right end of the Back row, clear gap from Back.
- Shuffle: an icon at the end of Previous / Play / Next; off asks Unsorted / Mine as now; on taps off. Hidden while sorting with its slot kept, so the row never shifts.
- The floating "Tag here" spot over the eye row goes (it crowded Mine/Not mine).

## Disagreed
- Tag icon while typing. Flow: dimmed and inert, the field's Done and Cancel already finish. Screen: tap saves.
  Code's pick: dimmed and inert (reversible).
- Tags · 0. Flow: greyed, does nothing. Screen: opens a quiet "No tags yet". NEXT Done when 4 says it opens an empty
  list, so: opens, with one quiet line.
- Shuffle pool. Flow: a tiny M/U mark on the icon. Screen: no mark; say it on the reserved line for 3 s on change.
  Code's pick: the reserved line ("Shuffle: Mine"), the icon stays clean.
- Row order. Screen suggested reordering Versions / Compare / + Version. Not taken (trim, not redesign); Tags · N goes last.

## Owner questions (defaults built)
1. Shuffle "on" look: filled blue box like Mine (default) or amber? Amber is kept for tagging.
2. Tag icon: drawn tag shape (default) or a "+" in an amber ring?
3. Tag icon while typing: inert (default) or tap saves and starts another?

## Proposed phone checks
In NEXT already (5, 6). Add to 6: a song with 0 tags shows **Tags · 0** and opens to "No tags yet".
