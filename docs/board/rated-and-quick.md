# Board: rated and quick (2026-11-09)

Seats: flow, screen, logic, tester. Brief: NEXT.md "Cool, quick and rated" (rating control, press look, what Shelved
does in each list). Facts given: the pressed look is drawn by the app's own thread, which Next keeps busy; the eye
resets per song; sync is outbox, then journal; 671 Mine songs.

## Agreed
- **One rule for Shelved:** out of anything the app picks for me, in anything I pick myself. Skipped by every shuffle
  (button, bar, lock screen, a song's end: one shared check, not per screen) and never dealt by a session. A list I
  play in order with shuffle off is my own pick, so it still plays every song in it, as before (built that way: NEXT
  says "leaves every shuffle and session"). Shown in Library and search
  with the word "Shelved". Tapped directly, or queued by hand: it plays, and playing never changes the rating.
- **Shelving the song that's playing never jumps the music.** It plays on; the next pick skips it. "Shelved · Undo"
  for about 6 s. Fire never moves anything.
- **Rating is on the tagging-session card too,** same spot, same shape.
- **Phone copies stay** for Shelved songs (still Mine; the count would lie otherwise).
- **Rating belongs to the one song,** never copied across a family. Shuffle plays only the Main, so a Shelved Main
  takes its family out of shuffle; a Shelved version changes nothing.
- **Storage:** its own kind `rating_set {song_id, value: fire | shelved | none}`, latest line wins, replayed from the
  journal, sent with `/songs`, the phone's unsent taps laid on top. Not mine then Mine again keeps the rating (a song
  that isn't Mine just ignores it). A merge: the surviving song's rating wins; unrated inherits the other's.
- **Marks are words or glyphs, never colour alone.** Fire filter: one toggle in the Library header's existing row.
- **Press look:** a ~100 ms flash from finger-down on every control, run off the app's thread, the same everywhere.
  Only the button flashes, never a whole scrolling row. Seek knob and queue drag stay lit while held (they're drags).
- **"N of M on this phone"** lives in a line the Library header already has; no new row.

## Disagreed (Code's pick in bold; owner can change at review)
- Control shape. Flow: one button that cycles Unrated > Fire > Shelved. Screen: Fire in the empty slot left of
  Previous, Shelve as a quiet word. Tester: two toggles, a second tap on the same word clears it. **Two word toggles:
  "Fire" in the empty slot left of Previous (mirror of Shuffle), "Shelve" as a quiet word in the Back row.** A cycle
  can overshoot Fire into Shelved on a double tap; neither spot is hidden by the eye or changed by a session.
- Shelve in a session. Screen: move on at once. Flow, logic, tester: keep playing. **Keeps playing** (a mis-tap can't
  cost a song I haven't heard).
- Up next already built. Flow: a Shelved song stays until the next rebuild. Logic, tester: dropped when reached.
  **The queue ahead is rebuilt at the tap** (same as a Not mine in a session), so it never plays by itself.

## Owner questions (defaults in use)
1. Two word toggles (default), or one button that cycles?
2. Shelve mid-listen keeps playing (default), or skips at once?
3. Ratings as words in the journal (fire / shelved / none): fine unless you ever want 1-5 stars (a new kind then).

## Proposed phone checks (tester, merged with NEXT)
1. Session: Shelve, Undo inside the note; kill and reopen: no mark. Shelve then Next fast: the mark is on the song I
   was hearing.
2. Airplane mode: Fire one song, Shelve another, Undo the second, airplane off. About 10 s later the laptop shows Fire
   on the first and nothing on the second (`tags` / `/status`).
3. Lock the phone mid-download for 30 min: the count moved or stopped cleanly, no stuck "saving".
