# NEXT: Batch 4c, Select mode and fixes
Written by chat, 2026-11-04.
Log: Batch 4b phone: checks 0, 2, 3, 4, 5, 6, 7 passed; 1 failed (full player "Another version of…" does nothing, app later froze, music kept playing until stopped in Control Center). New: "Skipped" seen after Home from Cards. Owner asks: select mode in Library, grouping marks Mine, Newest default (mine). Select-mode details below are chat-default (logged by chat)
Queue after this: Batch 5 "Import and copies" (ROADMAP 1.22, 1.7). Then Batch 6 "Offline and finish".
Read: this file, `docs/board/batch-4-versions.md` (rules 8-14), DECISIONS rows from "Batch 4b build" down. Code of `Library.tsx`, `Player.tsx`, `Cards.tsx`, `versionStore.ts`, `playerStore.ts` as needed.
Session: Opus. ROADMAP 1.23 follow-up. Short board pass on select mode only (flow + logic seats, advisory, one round), notes in `docs/board/batch-4c-select.md`.
## Parts
0. **Bugs.** (1) Full player "Another version of…" does nothing: it now opens Library in select mode with the playing song ticked (see a). (2) App froze (no touch, music on) some time after that tap and swiping the player down: find the cause, likely a sheet or overlay left open over the screen; it must not happen again. (3) After Home from Cards with a card song playing: the last library song came back paused, then about 30 s later a different song started by itself and the mini player showed "Skipped". Leaving Cards must stop every Cards timer and auto-advance; nothing starts playing without a tap.
a. **Select mode in Library (like a file manager).** Hold a row = select mode, that row ticked; tap rows to tick/untick; a bar at the bottom with the count and actions: **Group as versions**, **Mine**, **Not mine**, Cancel. All in the Library list itself: no picker sheet, no pop-up. Works on unsorted songs. Group as versions: every ticked song becomes Mine and joins one family; Main = the first song held; if a ticked song is already in a family, the others join that family (two families ticked = merged under the first held song's Main). One Undo toast takes the whole action back. Works offline through the outbox like 4b. The old row "Another version of…" menu item and picker go; sort-card link can stay as is.
b. **Newest is the default sort** every time the app opens (Library and anywhere A-Z was the default).
**Stop line:** part 0 always goes in. Then a. b is tiny, always include it.
## Phone check
0. Full player > "Another version of…". Pass: Library opens in select mode with that song ticked, music keeps playing. Use the app 2 minutes after: no freeze.
1. Cards: play a card song, tap Home. Wait 1 minute. Pass: nothing plays by itself, no "Skipped".
2. Library: hold an unsorted song, tick 2 more next to it, Group as versions. Pass: one row "Versions · 3", all three are Mine, the held one is Main. Undo splits them and puts them back unsorted.
3. Tick a song plus a song from an existing group, Group. Pass: it joins that group.
4. Tick 3 songs, Not mine. Pass: all hidden; Undo brings them back.
5. Kill and reopen the app. Pass: Library opens sorted Newest.
