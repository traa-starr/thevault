# Board notes: batches 4 and 4b, sorting and versions
Meeting 2, 2026-11-01. Advice for chat to review. Screen words: **Main** (the canon version; Flow suggested "Plays in
shuffle" as its label). Never group, merge or canon.

## Agreed
1. Sorted = a manual Mine or Not mine from any screen. Those songs never show in Sort. A set shows only unsorted songs
   and vanishes when none are left. Set songs open inline (the prototype keeper), in a list built for 50+ rows.
2. An open list and the cards re-check before showing each song, so a song judged elsewhere drops out at once.
3. Bulk sweep Undo restores only what that sweep changed. The prototype's Undo set also clears hand-sorted songs: don't copy it.
4. A sweep is one send, not 50. If the laptop sleeps partway, the state must be known. Progress comes from the laptop's
   record after a restart, not memory.
5. **Not sure:** a third, smaller card button, plus swipe up. Not a verdict: the song stays unsorted, leaves this pass, never
   loops. Sort home shows a count, "Not sure · 12", so these songs can't vanish silently. Undo works as usual.
6. **Link, tap 1:** "Another version of…", on the player, Library row and sort card. The song on screen is the one linked.
   **Tap 2:** pick song X in a sheet over the current screen. The music never stops.
7. The picker opens on a short list, with search above it. It shows only Main versions of Mine songs. Rows show title,
   folder, date and length, so identical names can be told apart. Picking a non-Main version links to its Main.
8. X stays Main by default, with "Make main" on the 5-second toast and in the Versions view.
9. Refused with a plain line: linking a song to itself; a Not mine song (Restore it first). Chains never exist: every
   version points straight at the Main. A song that already has versions brings them along. One Undo reverses it all.
10. No version prompts in Phase 1 sort, and sweeps never ask. Proposals come in Phase 4, in a Sort home row that exists only
    when there are some, using the same link action: merge is linking, split is Remove.
11. **Versions view:** a sheet, from a "Versions · 3" chip on the Library row and full player, shown only when a song has
    versions. Main on top, then the others. Each: Play, Make main, Remove (in a menu, not a swipe). Playing one doesn't
    touch the queue. A family always has one Main; the last song left becomes a plain song again.
12. Changing Main keeps the current song playing. A queued song that stopped being Main is skipped when its turn comes.
13. Every link, Main change and Remove is a journal line (the permanent record) holding the earlier state, sent through the
    outbox with Undo. Undo before sending cancels the entry. Order must be kept: link, then Make main.
14. Make main moves the Mine verdict in one journal line, not two. The server refuses cycles and a family without one Main.
15. Not mine on a non-Main version: it leaves the family and is hidden; Undo restores both. Tags stay on the song they were
    written on; the Versions view shows the family's tags.

## Disagreed
- **Linking an unsorted song.** Flow and Screen: it also marks it Mine, in one action. Logic: linking isn't a verdict, but the
  song takes X's verdict. The same in practice, since the picker shows only Mine songs. Code's lean: "Mine and linked", one Undo.
- **Where Not sure songs are kept.** Screen: journal, survives a restart. Logic: phone only; losing it just asks again.
  Code's lean: Logic's, to keep a guess out of the permanent record.
- **Picker's short list.** Flow: recently played, plus the 5 songs before this. Screen: same folder, nearest title or date,
  recent links. Code's lean: both, recent first. Titles don't help, so songs just heard are the best clue.
- **Mine toast.** Flow: adds a "Link" action. Screen: only on a strong clue, which needs Phase 4. Code's lean: skip for now.
- **"Another version of…" on the player.** Flow and Screen: in the overflow menu. Code's lean: a visible button, because
  acting mid-listen is the point. Chat can settle it.

## Owner questions
1. **How are versions stored? Hard to undo, you pick.**
   - (a) **New table, `song_family` (what a senior engineer would pick).** It links whole songs and records which is Main.
     The journal stays the record, and the table can be rebuilt from it. Phase 4 proposals and "not a version" fit in it.
   - (b) **Reuse the existing `groups` tables.** Already there, but they can't mark a Main, so it needs an add-on.
   - (c) **Reuse the existing `links` table.** Has proposed/confirmed/rejected, but it joins files, not songs, so awkward.
2. **Not mine on a Main version with others under it?** (a) Pick the new Main from a short list; with only one other, it's
   promoted with a toast *(default; nothing vanishes silently)*; (b) ask "promote, or hide all"; (c) hide the whole family.
3. **When do Not sure songs come back?** (a) Only when you open the pile on Sort home *(default; Flow and Screen)*;
   (b) automatically next session (Logic); (c) back into the cards after a day.
## Proposed phone checks
1. Sort one song in a set by card, sweep All mine on the rest, Undo. Pass: only swept songs return; the hand-sorted one stays.
2. Open a set, play one of its songs, tap Not mine in the player, go back. Pass: gone from the list and from the cards.
3. Link B to A from the player. Pass: one Library row, "Versions · 2", music never stopped. Undo within 5 seconds splits them.
4. Laptop off, link C to B (a version of A). Pass: C lands under A, marked as waiting, and sends when the laptop returns.
5. Make main on a version, kill and reopen the app. Pass: the new Main holds the row, shuffle plays it, the old one is in Versions.
