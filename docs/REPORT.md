**Step:** Player polish (tag words while playing, Tag re-tap cancels, Shuffle cycle), 2026-11-08.

**Verified by running:** `/verify` 11/11 PASS (incl. playOrder test, typecheck, music guard test, check_repo). The 3 new playOrder tests pass.

**Phone update:** publish. Run `python server\vault_cli.py publish E:\VaultLibrary`, then close and reopen the app. No server change.

**Needs the phone:**
1. (Done when 5) Open a song with 2+ tags, drag to before the first tick, press Play, touch nothing. Pass: as play passes each tick its words show on the left of the line under the times ("1:23  words"); they go after about 4 s or when the next tick passes. A tag with no words shows just its time.
2. Drag the knob across a tick and let go past it. Pass: no words show until play passes the next tick.
3. (Done when 6) Tap Shuffle 3 times, a second or two apart. Pass: "Shuffle: Mine", "Shuffle: Unsorted", "Shuffle off" on the right side of that line, no box; blue on for the first two. With Shuffle just tapped and a tick passing, both texts readable at once.
4. (Done when 7) Tap Tag: the Tag icon turns into an amber X. Type a few letters, wait a second, tap the X. Pass: the field closes, Tags · N doesn't go up, the music never stopped. Also: tap Tag twice fast: the field stays open.

**Changed:** `app/Player.tsx`, `app/Tagging.tsx`, `app/playOrder.ts`, `app/playOrder.test.mjs`, `app/tagStore.ts`, `docs/board/player-fixup.md`, `docs/STATUS.md`, `docs/REPORT.md`, `docs/DECISIONS.md`.

**Done when:**
1. Tick-words test (passes show, 4 s / next tick clears, drag and seek show nothing): pass.
2. Shuffle test (Mine, Unsorted, off, Mine from `order.shuffle`; Next follows the pool); dialog gone from the player: pass (Library's own Shuffle still asks, NEXT only covered the player).
3. Tag test (tap, type, tap closes with nothing saved, as Cancel): pass.
4. `/verify` all PASS incl. music guard: pass (11/11).
5-7. not run (for chat).

**Plan I chose:** [x] 0 board (flow + screen). [x] 1 tag words (test first). [x] 2 Tag re-tap. [x] 3 Shuffle cycle. [x] 4 verify, wrap.
- Rules sit in `playOrder.ts` (`tickWordsAfter`, `shuffleAfterTap`, `tagTapped`) so they're tested without a phone. A time step over 1.5 s counts as a seek, not play.
- Board splits I settled (reversible, `board/player-fixup.md`): a tag with no words shows its time only; "Shuffle:" prefix kept; no M/U mark on the icon; Undo note beats tick words and the Shuffle text; the 1 s double-tap guard on Tag stays.

**Not done:** Tag editing (batch 2). No fade on the words (screen seat's optional idea, skipped).

**Decisions needed:**
1. Tag re-tap with words already typed: cancels and loses them (built, as you decided) or does nothing? Board flow seat recommends "does nothing". Default: as built.
2. Tag icon while typing: amber X (built) or the tag icon unchanged? Default: X.

**Proposed next step:** Phase 2 batch 2 (goal trial task 3).

**Pitch:** let Library's Shuffle cycle the same way, so the pop-up is gone everywhere.
