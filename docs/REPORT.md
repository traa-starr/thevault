# Report

**Step:** Batch 4c, Select mode and fixes, 2026-11-04. Parts 0, a, b built. Nothing has run on a phone yet.
## Verified by running
- `npx tsc --noEmit` (app): clean. `playOrder.test.mjs`: 48 PASS, ALL PASSED (5 new: group rules and its Undo).
- `server/test_server.py`: ALL PASSED (server unchanged). Music guard: 39/39. Repo check: clean.
- Board pass (flow + logic, one round): `docs/board/batch-4c-select.md`.
## Needs the phone
0. Full player > "Another version of…". Pass: the player closes, Library opens in select mode with that song ticked and
   scrolled into view, music keeps playing. Also tap "Versions · N" in the full player: the player closes, Versions opens.
   Use the app 2 minutes after: no freeze.
1. Cards: play a card song, tap Home. Wait 1 minute. Pass: nothing plays by itself, no "Skipped".
2. Library: hold an unsorted song, tick 2 more next to it, Group as versions. Pass: one row "Versions · 3", all three are
   Mine, the held one is Main. Undo splits them and puts them back unsorted.
3. Tick a song plus a song from an existing group, Group. Pass: it joins that group (the group keeps its Main).
4. Tick 3 songs, Not mine. Pass: all hidden; Undo brings them back.
5. Kill and reopen the app. Pass: Library opens sorted Newest.
## Changed
`app/`: App, Cards, Library, Player, Versions (.tsx); engine, family, nav, playerStore, versionStore, playOrder.test; docs: STATUS, REPORT, DECISIONS, new `board/batch-4c-select.md`.
## Differed from NEXT.md
- Freeze cause: the picker opened a second sheet over the player sheet. iOS shows only one sheet at a time, so it failed
  without a sound and left a stuck layer. Fix: the player closes first, then the next thing opens. The Versions sheet and
  picker can no longer open while the player sheet is up.
- Bug 3 cause: leaving Cards, a late "playing" signal from the card song counted as a Play tap. The paused library song
  then looked stuck, so the stall watcher skipped to a new song after about 30 s. Fix: for 3 s after a song is brought back
  paused, a "playing" signal pauses it again; a paused song waiting to seek no longer counts as loading.
- Lead rule: a ticked family keeps its Main even when a plain song was held first (brief's wording, check 3). Logic seat
  preferred "first held always leads". Two families: the first held family leads.
- Bulk Not mine skips family rows ("N version groups skipped: use Versions"). Bulk Mine skips rows already Mine.
- No Cancel button in the bar: Back turns into Cancel, top left, and the title shows "N ticked". Saves room for 3 buttons.
- Undo after an action doesn't bring the ticks back.
## Not done
Nothing from NEXT.
## Decisions needed
None.
## Proposed next step
Batch 5, Import and copies.
## Pitch
Send Mine + group as one change the laptop applies all at once: today, if the laptop refuses the group, the songs stay Mine but ungrouped.
