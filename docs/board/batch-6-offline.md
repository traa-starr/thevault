# Board notes: batch 6.1, Downloads and offline play
Meeting 4, 2026-11-06. Brief: Mine songs get stored on the phone so they play with the laptop off. Facts: 314 Mine
songs, phone copies (AAC about 192 kbps) total about 830 MB, limit fixed at 8 GB. Screen words: **On this phone**,
**Saving to phone**, **Laptop not reachable**. Never cache, sync, evict.

## Agreed
1. **All Mine songs download by themselves**, newest first, one at a time. No picking: everything fits 10 times over.
   Mine is the only trigger.
2. **Only while the app is open.** iOS gives a sideloaded app no dependable background time. "Resume" means: on open,
   on coming back to the front, and when the laptop answers again, it carries on with the songs still missing.
3. **A half file never plays.** Download to `<id>.part`, check the size against the laptop's, then rename. Leftover
   `.part` files are deleted on open. On the phone = in the list **and** the file is there with the right size.
4. **Paths are built at run time** from the app's Documents folder, never stored whole: a SideStore re-sign can move it.
5. **Progress is one quiet line at the top of Library**: "Saving to phone: 120 of 314" while it runs, then
   "On this phone: 314 songs · 830 MB of 8 GB". No pop-ups. Count = Mine songs only, not 1,395.
6. **The limit:** stop, keep everything, say so in that line ("8 GB limit reached: 12 songs not on this phone").
   Never delete a Mine song to make room. A phone that is really full stops the same way.
7. **Play from the phone first**, with no network call. Not on the phone and the laptop known to be off: a plain
   message at once, never a spinner. Compare uses the same choice.
8. **The laptop decides what is Mine.** Nothing is deleted because the laptop was unreachable; only after a real
   `/kept` answer. A copy rebuilt on the laptop (new size or date) downloads again and replaces the old one by rename.
9. A song tapped mid-download streams from the laptop; it never reads the `.part`.
10. Download state is a convenience, not a choice: it never goes in the outbox or the journal.

## Disagreed
- **When a song stops being Mine.** Flow: keep 30 days. Tester: 7 days. Screen and logic: next `/kept` answer.
  Taken: **7 days** after it first goes missing from `/kept`. Covers a mis-tap and Undo; space is no issue.
- **Progress screen.** Screen designer: a Downloads screen with Waiting and Retry lists. Others: one line is enough.
  Taken: **one line** (Pitch for later if it's ever needed).
- **Resume inside one file.** Logic: Range resume of the `.part`. Taken: **restart that one song** (2.6 MB average);
  the batch carries on where it was, which is what the phone check asks.
- **Mobile data switch** (flow, screen). Not taken: the laptop link is Tailscale either way, and 830 MB is a one-off.

## Server change (small)
- `/kept` gives each song a `stamp` (size and file date) and a `no_copy` list of Mine songs whose phone copy is
  missing, so the phone can tell "not Mine any more" from "copy not made yet" and never deletes the second.

## Owner questions (defaults taken, say if wrong)
1. Un-Mined songs leave the phone after 7 days. 2. Full: stop and say so, never remove. 3. Phone copy plays even
   when the laptop is on (instant, no network); Compare still streams the full-quality copy when it can.

## Proposed phone checks
1. Laptop on, open Library: "Saving to phone: N of 314" counts up; newest Mine songs land first.
2. Force-quit mid-download, reopen: it carries on near where it was; no song plays half-length.
3. Laptop asleep with Tailscale on, open Library: within about 10 s it shows the saved list and "Laptop not reachable".
4. Airplane mode, screen locked: play a saved song, skip to the next. Lock-screen controls work.
5. Same, tap a song not on the phone: a plain message within a few seconds, no hang.
6. Compare on a saved group, laptop off: flips work, no level change beyond the real one.
7. (6.2) SideStore refresh: saved songs still play in airplane mode.
