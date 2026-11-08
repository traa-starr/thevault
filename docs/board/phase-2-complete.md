# Board: Phase 2 code-complete (2026-11-08)

Seats: flow, screen, logic (NEXT "The bar"). Advisory. Brief: NEXT.md goals B-E, BLUEPRINT "Phase 2: tagging", mockup.

## Agreed
- Hold a Tags row (400 ms; queue rows keep 300) turns it into a menu strip in place, same row height. No haptics (BLUEPRINT).
- Menu closes on Cancel, a tap elsewhere in the list (that tap only closes, never jumps), list close, another row's hold, song change. No timeout.
- Change words: the reserved-line field opens with the old words, "Change the words"; the nudge is hidden (time moves only by Move to now). Tag icon X cancels, as when tagging.
- Rows keep their order while the list is open: Move to now leaves the row in place; a new tag goes at the bottom. Time order comes back when the list is reopened or the song changes (not on pause: the thumb is editing then).
- Edit = whole `tag_add` (same id, `made_at`, `version_id`); Delete = `tag_remove`; Undo = take back if unsent, else the old whole tag. One Undo on the line at a time, so an older edit's Undo is gone once the next edit shows.
- A tag's song follows the laptop's copy (a merged-away song never shows it again while an edit waits).
- Session = the full player in session mode: Close left, "N of M tagged" right, Shuffle slot empty (width kept). Dock: Not mine + Next. Pool frozen at start as one weighted lap (untagged 3x) handed to the player as a plain list, so lock-screen Next and song end walk it too.
- Session Not mine: mark only, music plays on until Next; the song leaves the order; family guards as the player's; "Not mine · Undo" 6 s. Undo: take back if unsent, else Mine again only if it was a manual Mine, else back to the guess.
- N counts tagged songs inside M; M = pool minus this session's Not mine. Close: the sheet closes onto where I came from, same song playing.
- Library Shuffle cycles in place (no sheet, no box): "Shuffle", "Shuffle: Mine", "Shuffle: Unsorted", on look = the chip's on style. Nothing playing: starts a song from that pool in the bar. Playing: only what comes next changes.
- Pressed look, one rule: an instant light tint behind the control, never a fade.

## Disagreed
- Next twice in session (controls row and dock). Flow: keep both, same action. Screen: drop the controls-row one. Code's pick: keep both (the shared player's row never changes).
- Menu order. Mockup: Change words · Move to · Delete · Cancel. Screen: Delete last, far right, red. Code's pick: Change words · Move to now · Cancel · Delete.
- "Tag songs" in Library. Flow: header right. Screen: full-width row under the header. Code's pick: a header link left of Home (BLUEPRINT "Library header link", no height added).
- Sort tab: Code's pick a second button under Cards ("Tag songs"), as the screen seat said.
- Lap wrap. Logic: redraw a fresh weighted lap. Code's pick: the lap replays (465 songs is more than a session); parked.

## Owner questions (defaults built)
1. Next in session: in both places (built) or only on the dock?
2. Undo after Next on a Not mine: brings the song back and plays it again (built) or only puts it back in the pool?

## Proposed phone checks
In NEXT (7-10). Add to 8: hold a row, tap Cancel: music never blips. Add to 9: Not mine, Next, Undo: back on that song.
