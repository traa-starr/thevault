# NEXT: Batch 4b, Versions (manual)
Written by chat, 2026-11-04.
Log: Batch 4 phone checks 0-5 all passed; "Skipped..." never seen, watch closed (mine). Closes ROADMAP 1.21. Queue auto-scroll fix rides along as part 0 (chat-default) (logged by chat)
Queue after this: Batch 5 "Import and copies" (ROADMAP 1.22, 1.7). Then Batch 6 "Offline and finish".
Read: `docs/BATCH-PLAN.md` (Batch 4b), `docs/board/batch-4-versions.md` (Agreed 6-15 and Proposed phone checks), DECISIONS rows "Versions storage", "Not mine on a Main with versions", "Batch 4/4b board splits".
Session: Opus. ROADMAP 1.23. No board meeting: met 2026-11-01 for this batch.
## Parts
0. **Queue auto-scroll fix.** Auto-scroll is dead until the list's end has been drawn once: the patch measures list length from the last row, which isn't drawn on open. Use the list's real content size instead. Scrolling must work straight after opening Queue on a long list.
a. **Storage and link.** New `song_family` table per DECISIONS, rebuildable from the journal. "Another version of…": visible button on the full player, plus Library row and sort card. Picker sheet over the screen, music never stops: short list (recently played first, then same folder/nearest), search above, only Main versions of Mine songs, rows show title, folder, date, length. Board rules 8, 9, 13, 14 (refusals, no chains, one Undo, journal lines through the outbox, order kept). Linking an unsorted song = "Mine and linked".
b. **Versions view.** "Versions · N" chip on Library row and full player, only when a song has versions. Sheet: Main on top; each row Play, Make main, Remove in a menu. Board rules 11, 12. Library shows one row per family (the Main).
c. **Rules.** Shuffle plays only the Main. Not mine on a non-Main: leaves the family, hidden, Undo restores both. Not mine on a Main with versions: pick the new Main from a short list; only one other = promoted with a toast.
**Stop line:** parts 0 and a always go in. Then b. c's Not-mine-on-Main picker can wait (refuse it with a plain line meanwhile).
## Phone check
0. Open Queue on a long list, lift a song straight away and hold it near the bottom edge. Pass: the list scrolls without first scrolling to the end by hand.
1. Full player > "Another version of…" > pick a song. Pass: music never stops; Library shows one row with "Versions · 2". Undo within 5 seconds splits them.
2. Library row > "Another version of…" on a third song, pick a version (not the Main) of that family. Pass: it lands under the Main, "Versions · 3".
3. Laptop off (or server stopped), link another song. Pass: shows as waiting, sends when the laptop is back.
4. Versions view > Make main on another version > kill and reopen the app. Pass: the new Main holds the Library row, shuffle Mine plays it, the old one is in Versions.
5. Versions view > Not mine on a non-Main version. Pass: it leaves the family and is hidden; Undo puts it back.
