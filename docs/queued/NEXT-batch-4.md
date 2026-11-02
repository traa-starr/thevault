# NEXT: Batch 4, Real sorting
Written by chat, 2026-11-02.
Log: Batch 3c phone checks 1-5 all passed (mine). Queue drag accepted; closes the 3b drag retry. Lift vibration pitch parked (chat-default) (logged by chat)
Queue after this: Batch 4b "Versions, manual" (ROADMAP 1.23, board notes ready). Then Batch 5 "Import and copies".
Read: `docs/BATCH-PLAN.md` (Batch 4), `docs/board/batch-4-versions.md` (Agreed 1-5, board splits), DECISIONS rows "How sorting works", "Not sure return", "Batch 4/4b board splits", the batch 2 sorting prototype.
Session: Opus. ROADMAP 1.21. No board meeting: met 2026-11-01 for this batch.
## Parts
a. **Sets and sweep.** Sort home lists sets: folders first, then repeated name patterns. Only songs nobody has judged yet; a set with none left disappears. Open a set: its songs show inline, fine at 50+ rows. "All mine" / "All not mine" shows the contents first, goes as one send, and Undo puts back only what that sweep changed.
b. **Cards.** One card per unsorted song, likely mine first, starts about 30% in. Mine / Not mine buttons plus swipe; small Not sure button plus swipe up (song stays unsorted, leaves this pass, counted on Sort home as "Not sure · N", comes back only when I open that pile). 5-second Undo. Progress counter read from the laptop, so it survives a restart. A song judged anywhere else drops out at once.
c. **Mine filter and shuffle choice.** Library gets a Mine filter. Shuffle asks: unsorted or Mine.
**Stop line:** name-pattern sets wait (folders go first), then c.
## Phone check
1. Sort one song in a set by card, then sweep All mine on the rest, then Undo. Pass: only the swept songs come back; the one sorted by hand stays sorted.
2. Open a set, play one of its songs, tap Not mine in the player, go back. Pass: gone from the set list and from the cards.
3. Do 5 cards (one Not sure), kill the app, reopen Sort. Pass: counter kept, "Not sure · 1" shows, no song from those 5 appears again.
4. Turn shuffle on, pick Mine. Pass: only Mine songs play.
