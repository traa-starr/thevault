# NEXT: Player polish (tag words while playing, Tag re-tap cancels, Shuffle cycle)
Format: goal
Written by chat, 2026-11-08.
Log: player fix-up checks 5 of 6 pass, fail = tag words show only after a jump (results in `PHASE-2-RESULTS.md` "Player fix-up"); taste calls kept: Shuffle on = blue, tag shape; Tag re-tap cancels, replacing "inert while typing" (owner); Shuffle taps cycle Off > Mine > Unsorted > Off, no dialog, pool name on the right (owner); tick words show 4 s or until the next tick, normal play only (chat-default); polish goes before batch 2, goal trial task 2 of 3 (chat) (logged by chat)
Queue after this: Phase 2 batch 2 from `BATCH-PLAN.md`, goal trial task 3 (not fast-lane), its hold-a-row actions inside the Tags list. Then laptop-only phone-copy refresh (fast-lane OK, see STATUS queue).
Read: `docs/PHASE-2-RESULTS.md` "Player fix-up", DECISIONS rows dated 2026-11-08, `docs/board/player-fixup.md`, `docs/BOARD.md` "When it meets", `app/Player.tsx`, `app/Tagging.tsx`, `app/playOrder.ts`.

## Goal
Three small changes to the player I live in (ROADMAP 2.3/2.4 behavior otherwise unchanged):
- As a song plays and passes a tag's tick, that tag's words show above the controls, the same way they show after a jump.
- While typing a tag, tapping the amber Tag icon again cancels, exactly like Cancel (Cancel stays).
- Shuffle has no pop-up: each tap cycles Off > Mine > Unsorted > Off. The pool name shows on the right side of the
  reserved line for 3 s; tag words keep the left side, so both can show at once.

## Done when
Code proves:
1. A test: normal playback crossing a tag's time shows its words; they clear after 4 s or when the next tag is passed, whichever is first; dragging the seek bar across ticks shows nothing until play passes one.
2. A test: four Shuffle taps go Mine, Unsorted, Off, Mine, from one place (`order.shuffle`), and Next follows the pool; the Unsorted/Mine dialog is gone from the player.
3. A test: Tag tap, type, Tag tap again saves no tag and leaves no words-free mark (same result as Cancel).
4. `/verify` all PASS, including the music guard test.
I prove:
5. Play a tagged song from before its first tick: each tag's words show as playback passes it, without tapping anything.
6. Tap Shuffle 3 times: Mine, Unsorted, Off, each named on the right with no box; with Shuffle on and a tag passing, both texts are readable at once.
7. Tap Tag, type a few letters, tap Tag again: the field closes, no new row in Tags · N, music never stopped.

## Limits
- First, part 0: a short board meeting (flow and screen seats; board test line 2). Advisory: it can trim, not redesign. Notes appended to `docs/board/player-fixup.md`.
- Order if it runs long: tag words (the failed check) first, then Tag re-tap, then Shuffle.
- Tag editing (Change words, Move to now, Delete) is batch 2: don't build it. No laptop changes expected; if one is needed, say why in REPORT.
- Tag stays a full-size tap target. Don't touch music folders, the guard or check_repo.
