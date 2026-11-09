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

## Player polish (2026-11-08, real app)
1. Tag words while playing: each tick's words show as playback passes it, clear after ~4 s or next tick: **pass**
2. Drag across a tick: no words until play passes the next tick: **pass**
- Note: dragging the knob snaps to a tick. It should not: drag seeks freely; jumping to a tick only on a tick tap or a Tags list row.
3. Shuffle taps cycle Mine / Unsorted / off on the right, no box, blue on; readable with tag words at once: **pass**
4. Tag re-tap cancels (amber X, nothing saved, music keeps playing); double-tap keeps the field open: **pass**
- Bug: Tag and its X feel laggy: after a cancel, Tag reopens only eventually, and I can't tell if a tap registered and is lagging or didn't register at all. Two fast taps on the icon don't work; the Cancel button works fine. The icon should answer as fast as Cancel.

## Phase 2 code-complete (2026-11-08, real app, OTA publish)
1. Tag double tap opens then closes as fast as Cancel, reopens on next tap; knob drag lands where released, no snap: **pass**
2. Hold a Tags row: Change words / Move to now / Delete + Undo, in place, rows never jump: **pass**
3. Tagging session: counter, 30% start, no repeats in ten, Not mine + Undo without stopping, Close back to Library: **pass**
- Note: start point too late; start ~15 s in, not 30%.
- Bug: on Next the song plays from 0 for a beat or two, then lags and jumps in. Sort cards do not do this. Owner asks: does the session use the same player as Sort cards, or a different one? (REPORT had listed "a 30%-in load with no intro blip" as Not taken, saying Cards have the same; owner says they do not.)
- Cause (chat read the code): the session and Sort cards use the same player; both wait for the song length, then jump to 30%. Call (owner): session cards start at 15 s, Sort cards at 30 s, both fixed times so the song starts there with no blip.
4. Library Shuffle cycles Mine / Unsorted / off with no box; offline: two edits, a delete and an Undo reach the laptop (`tags` command shows the second words and both tags): **pass**
- Result: 4 of 4 pass, 1 bug note (card start blip).

## Session polish (2026-11-08, real app, OTA publish 18:21)
1. Session: Previous / Play / Next centred; 5 fast + 3 slow Nexts, first sound about 0:15, no beat from 0:00: **pass**
- Note: on Next the seek bar shows 0:00, nothing plays, then it finds 0:15 and plays: a 3-5 s silent hold per Next. Sort cards start close to instant ("super nice"). Session Next should feel as fast as Sort cards.
2. Sort cards: 3 new Mine songs play from Library after ~1 min, no laptop command; 5 cards start about 0:30, no blip; Undo carries on: **pass**
- Note: tapping a Sort card pulls up the player, and its Previous / Play / Next aren't centred either. Centre them there too.
3. Session after closing the app and reopening: same session look, counter, song and order; lock-screen Next twice keeps the session, starts about 0:15: **pass**
4. Search option (`SEARCH-OPTIONS.md`): **A, on the phone** (owner).
- Result: 3 of 3 pass, 2 notes (3-5 s hold on session Next; player from a Sort card not centred).

## Fast Next, centred player, search (2026-11-08, real app, OTA publish 19:26)
1. Session: 5 fast + 3 slow Nexts, lock-screen Next twice; starts about 0:15, volume back: **pass**
- Note: much faster and usable, still not instant. Owner thinks the player waits on song info (length, title, start time, maybe tags) before sound. Music must start first and the info fill in after; playback must never wait on the player's info.
2. Player from a Sort card and from Library: Play dead centre, Previous / Next same size: **pass**
3. Search 2-3 tag words: song near top, words bold, time shown, tap plays from that moment; nonsense shows "No song or tag has", no crash: **pass**
4. Airplane mode: same search results; `timings` read back: **pass**
- Phone numbers (`timings`): search typical 8 ms, slow end 13, worst 15 (124 runs, ~8 tags). Next to first sound: session typical 797 ms, slow end 1,217, worst 1,272, 5 of 33 over 1 s; Sort typical 91 ms, worst 292, 0 over 1 s; Library typical 1 ms, worst 254.
- Finding: the model test said session Next 300 ms; the real phone says ~800 ms, about 9x slower than Sort cards. Matches the check 1 note.
- Result: 4 of 4 pass, 1 note (session Next still ~800 ms vs Sort 91 ms; sound must not wait on song info).
