# Phase 2 results (tagging)

My phone results, one line each (written by chat). Measured results stay in REPORT.

## Mockup tap-through (2026-11-07, private page, ROADMAP 2.1)
1. Tag time is the tap, not the save (30 s wait): **pass**
2. Double tap on Tag here opens one field only: **pass**
3. Row tap and seek-bar tick both jump to the tag: **pass**
4. Hold menu: Change words, Move to now, Delete + Undo all work, no jumping: **pass**
5. Not mine + Undo: counter down and back, music never stopped: **pass**
6. Laptop off: "Saved on phone · 1 waiting" + grey "on phone"; Laptop on turns it "On laptop": **pass**
7. Half-typed line still there after closing and reopening the mockup: **pass**
8. Player mode: same screen without counter, Not mine, Next; feels right: **pass**

## Batch 1: tag from the player (2026-11-08, real app)
1. Tag here, 30 s typing, Return: row shows the tap's second, row tap jumps, amber tick on seek bar: **pass**
- Found during check 1: tapping the player's Unhide button (shows the Mine/Not mine buttons) crashes the app, every time, after every restart. Worked before this update, so batch 1 broke it: **fail (bug)**
2. Airplane mode: tag, kill mid-typing a second, reopen: draft back, both rows "Saved on phone": **pass**
3. Airplane off at home: both rows turned "On laptop" within a minute: **pass**
4. Taste, player fit: **something off.** (a) "Tag here" too big and odd: just "Tag". (b) It floats oddly when the Mine/Not mine buttons are hidden. (c) The always-on tag list should go: hidden by default behind a small text button "Tags" (like "Compare"), tap to see tags and edit them there. By default tags only show above the player controls, as they work now (liked). Typing view (field, nudge, Cancel) looks good. My sketch (2026-11-08): Shuffle becomes an icon in the Previous/Play/Next row, everything below moves up, Tag moves onto the Back row, probably as an icon.

## Player fix-up (2026-11-08, real app)
1. Eye tapped 5x, app restarted, 5x more: no crash, nothing jumps: **pass**
2. Shuffle icon: on/off easy to tell apart: **pass**
- Note: the Unsorted/Mine pop-up box breaks the immersion; I want a smoother way to switch pools (no dialog).
3. Amber Tag icon on the Back row: easy to hit, Back never hit by mistake: **pass**
- Note: tapping the Tag icon again while typing should cancel (better thumb travel than Cancel at the end of the field).
- Note: "Shuffle: ..." text and tag words share the same side of the reserved line and can hide the tag words. Move the Shuffle text to the right (it only shows when toggled).
- Note: when playback passes a tick on the seek bar, show that tag's words (not via the Tags list).
4. Tags · N opens/closes the list, row tap jumps and list stays, Tags · 0 shows "No tags yet": **pass**
5. Fit with Mine/Not mine shown and hidden: not cramped, open space for the Queue swipe liked: **pass**. Tag words while playing: **fail**: they show only after a jump (row or tick tap), never when playback just passes a tick.
6. Music guard: Code in auto mode asked to write into `E:\vault-dummy-protected`: blocked, folder unchanged: **pass**
- Taste calls from REPORT: Shuffle on = blue and the tag shape kept (checks 2-3 passed). "Tag icon inert while typing" replaced: re-tapping Tag cancels.
- Shuffle pool pick (2026-11-08): tap cycles Off > Mine > Unsorted > Off, pool name on the right. No pop-up box.
