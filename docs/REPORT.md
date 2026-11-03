# Report

**Step:** Batch 4, Real sorting (+ player swipe fix), 2026-11-02. Parts 0, a (folders and name patterns), b, c built. None of it has run on a phone yet.

## Verified by running
- `npx tsc --noEmit` (app): clean. `playOrder.test.mjs`: ALL PASSED.
- `server/test_server.py`: ALL PASSED, new sort checks included. With a real-sized journal, a 300-song sweep took 6.8 s and its Undo 6.3 s.
- `server/test_library.py`: ALL PASSED. Music guard test: 39/39.
- `/sorting` on the real library (read-only): 1,395 songs, 898 unsorted (56 likely mine, 5 mine by folder), 4 folder sets (638, 248, 7, 5 songs), 44 name sets (8 songs at most).

## Needs the phone
0. Full player: swipe up anywhere in the blank space above the buttons (no label). Pass: Queue opens; close it, back on the player. Seek and buttons still work.
1. Home > Sort > open a set > One by one > judge one song > Back > open the set again > All mine > tap Undo on the toast. Pass: only the swept songs come back; the one judged by card stays sorted.
2. Sort > open a set > tap one of its songs > in the player tap Not mine > Back. Pass: gone from the set list and from Cards.
3. Sort > Cards: do 5 cards, one of them Not sure > kill the app > reopen > Sort. Pass: the "sorted" count kept, "Not sure · 1" shows, none of those 5 shows up in Cards again.
4. Full player > tap "Shuffle: off" > pick Mine. Pass: only Mine songs play. Also try Library > Shuffle > Mine.
5. Cards: each song starts about 30% in. Pass: no song starts at 0:00 (except one you Undo, which carries on from where it was).

## Changed
`app/App.tsx`, `app/Library.tsx`, `app/Player.tsx`, `app/outbox.ts`, `app/playOrder.ts`, `app/playerStore.ts`, new `app/Sort.tsx`, `app/Cards.tsx`, `app/sortData.ts`; deleted `app/Prototype.tsx`; `server/vault_server/server.py`, `server/vault_server/store.py`, `server/test_server.py`; docs.

## Differed from NEXT.md
- Part 0, why it failed (best guess, untested): the strip only asked for the touch after the finger moved, and inside the player sheet nothing ever handed it over. The fix takes the touch the moment the finger lands, like the top grab area, which works.
- "Judged" also counts the Phase 0 triage calls (the 68 "mine by verdict"), so they never show in Sort. Folder-guessed Mine (5) still show, first.
- Sweep Undo is a toast that stays until the next sweep or leaving Sort, not 5 seconds: a 600-song mistake deserves more time.
- Lock-screen Next in Cards moves the card on with no verdict; the skipped songs come back next time Cards opens.
- Name sets need 3 or more songs (two alike happen by chance); a name set identical to a folder set is dropped.
- The sorting prototype is gone; home now has a "Sort" link. Big sends get a longer phone timeout (50 ms per change).
- My `git rm` staged the prototype deletion by mistake; I unstaged it at once. It shows as an ordinary deleted file.

## Not done / Decisions needed
- Nothing from NEXT; no decisions needed. Cards don't preload songs, so each may take a moment before sound.

## Proposed next step
Batch 4b, Versions (manual), once these checks pass.

## Pitch
Split the 638-song folder set by subfolder or year: one sweep that size is hard to check by eye.
