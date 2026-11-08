**Step:** Player fix-up (crash, layout, Tags button), 2026-11-08.

**Verified by running:** `/verify` 11/11 PASS (incl. music guard test, check_repo). playOrder test: new eye test FAILED before the fix ("path does not exist"), passes after; new Tags list test passes. Typecheck clean.

**Phone update:** publish. Run `python server\vault_cli.py publish E:\VaultLibrary`, then close and reopen the app. No server change.

**Needs the phone:**
1. On a song marked Mine (opens with buttons hidden), tap the eye 5 times. Close the app fully, reopen, open the player, 5 more. Pass: no crash, nothing on screen jumps.
2. Player look: Shuffle is a box at the end of Previous / Play / Next. Off = grey arrows; on = filled blue. Turning it on still asks Unsorted / Mine, and the line under the times says "Shuffle: Mine" for 3 s. Pass: you can tell on from off.
3. Amber tag shape at the right end of the Back row. Tap it: the field opens as before. Pass: easy to hit, and Back is not hit by mistake.
4. No tag list until you tap **Tags · N** (after Compare / Versions). Tap: the list opens under Back; a row tap jumps and the list stays open; tap Tags · N again: it closes. On a song with no tags: "Tags · 0" opens to "No tags yet".
5. Tag words still show above the controls while playing. With Mine/Not mine shown and hidden: nothing cramped or floating.
6. (Done when 7) In a Code session with auto mode on, ask Code to write a test file into `E:\vault-dummy-protected`. Pass: the guard blocks it, the folder is unchanged.

**Changed:** `.claude/skills/next/SKILL.md`, `.claude/skills/wrap/SKILL.md`, `app/Player.tsx`, `app/Tagging.tsx`, `app/playOrder.ts`, `app/playOrder.test.mjs`, `app/playerStore.ts`, `app/tagStore.ts`, `docs/pending-skills/` deleted, new `docs/board/player-fixup.md`, `docs/STATUS.md`, `docs/REPORT.md`, `docs/DECISIONS.md`.

**Done when:**
1. Skills in `.claude/skills/`, `docs/pending-skills/` gone: pass.
2. Test reproduces the eye crash, passes after: pass.
3. `/verify` all PASS incl. music guard: pass (11/11).
4. One place each (Shuffle: `order.shuffle`; count and ticks: one `useTags` list; open: `listFor` in the tag store), Tags · 0 opens empty: pass (test + typecheck; the screen itself is check 4).
5-7. not run (for chat).

**Plan I chose:** [x] 0 skills in. [x] 1 crash test then fix. [x] 2 board (flow + screen). [x] 3 layout. [x] 4 checks, wrap.
- The crash: the eye rule from 6.5 hides the buttons on sorted songs without writing the setting file, so Unhide tried to delete a file that wasn't there and iOS threw. It likely surfaced in batch 1 because you were tapping Unhide on Mine songs while tagging. Fix: toggles check the file first (same fix for the time-left tap).
- Board splits I settled (reversible, see `board/player-fixup.md`): Tag icon dims and ignores taps while typing; Shuffle pool shown on the reserved line, not on the icon; Tags · N last in its row; Tag icon and Tags hidden in Compare.

**Not done:** Tags list opens without animation (Limits allowed it). Tag editing is batch 2.

**Decisions needed:** 3 taste calls, defaults built: Shuffle "on" blue (not amber); tag drawn as a tag shape (not "+" in a ring); Tag icon inert while typing (not "tap saves"). Change any at Review.

**Proposed next step:** chat walks the checks; then Phase 2 batch 2, its row actions inside the Tags list.

**Pitch:** a tiny app-side test runner for store logic (fake File), so crashes like this one are caught on the laptop.
