# NEXT: Tag fixes + change tags from the list (batch 2a)
Format: goal
Written by chat, 2026-11-08.
Log: player polish checks 4 of 4 pass (results `PHASE-2-RESULTS.md` "Player polish"); bug: Tag icon and X feel laggy, reopen after a cancel only eventually, no sign a tap registered, two fast taps fail while Cancel works fine; the 1 s guard goes, icon answers every tap like Cancel (owner); dragging the knob must not snap to a tick, jump only on tick tap or Tags row (owner); re-tap cancels even with words typed and the amber X stay as built (chat); batch 2 split: this step = fixes + 2a, session (2b, 2c) next (chat); goal trial task 3 of 3 (chat) (logged by chat)
Queue after this: Phase 2 batch 2b+2c from `BATCH-PLAN.md` (tagging session, Not mine on the card; new screen, board meets, not fast-lane). Then laptop-only phone-copy refresh (fast-lane OK, see STATUS queue).
Read: `docs/PHASE-2-RESULTS.md` "Player polish", DECISIONS rows dated 2026-11-08, `docs/BLUEPRINT.md` "Phase 2: tagging", `docs/BATCH-PLAN.md` "Batch 2" part a, `docs/BOARD.md` "When it meets", `app/Player.tsx`, `app/Tagging.tsx`, `app/playOrder.ts`, `app/tagStore.ts`.

## Goal
Finish ROADMAP 2.4 (edit and delete tags) and fix two things I hit on the phone:
- The Tag icon and its X answer every tap right away: each tap gives instant feedback (a press highlight plus a light haptic, the same as other buttons), and after a cancel the next tap past the guard opens the field. No tap goes unanswered.
- Dragging the knob seeks freely, never snapping to a tick. Jumping to a tag happens only on a tick tap or a Tags list row.
- In the Tags list, hold a row: Change words · Move to now · Delete. Each change shows "· Undo" for 6 s in the reserved line. Rows never reorder while playing (BLUEPRINT).

## Done when
Code proves:
1. A test: two taps 300 ms apart open then cancel; a third reopens. Only a bounce under about 250 ms is ignored, and an ignored tap never extends the lockout. The 1 s guard is gone.
2. A test: a drag released 1 s from a tick lands where it was released, not on the tick; a tick tap still jumps.
3. Tests: Change words, Move to now and Delete each save through the same phone-first journal/outbox as new tags, and Undo restores the tag exactly (words and second); a deleted tag stays gone after sync.
4. `/verify` all PASS, including the music guard test.
I prove:
5. Tap Tag twice fast: it opens, then cancels, as quick as the Cancel button. Tap it again: it opens. Every tap feels answered at once (highlight + buzz). Drag the knob to just past a tick and let go: it stays where I let go.
6. Open Tags · N, hold a row, Change words: the new words show in the list and when play passes that tick. Hold another, Delete, then tap Undo within 6 s: it's back, same time and words.
7. Play to a new spot, hold a row, Move to now: its tick moves to the current time; nothing in the list jumps while playing.

## Limits
- First, part 0: a short board meeting (flow, screen and logic seats; board test lines 2 and 3). Advisory: it can trim, not redesign. Notes in `docs/board/phase-2-batch-2a.md`.
- Order if it runs long: the two fixes first, then Delete + Undo, then Change words, then Move to now (Move to now may wait; say so in REPORT).
- Lead for the lag: `TAP_GUARD_MS = 1000` in `playOrder.ts`, and `tagTapped` resets `lastTap` even on an ignored tap. Cancel has no guard, which is why it feels fine. Also check whether a slow render makes taps feel late.
- Not in this step: the tagging session, Not mine on the card, Library's Shuffle. Don't touch music folders, the guard or check_repo. If a laptop change is needed, say why in REPORT.
