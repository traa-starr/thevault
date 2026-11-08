# NEXT: Player fix-up (crash, layout, Tags button)
Format: goal
Written by chat, 2026-11-08.
Log: batch 1 checks 3 of 4 pass, check 4 asks for a calmer player (results in `PHASE-2-RESULTS.md`); ROADMAP 2.3 and 2.6 ticked; eye (Unhide) crash new in batch 1, fixed first; new layout from my sketch; Tag as an amber icon (chat-default); Tags list opens the way Compare does (chat-default); goal-style NEXT trial approved (3 tasks), this is task 1 of 3; fix-up goes before batch 2 because batch 2's editing lives in the new Tags list (chat) (logged by chat)
Queue after this: Phase 2 batch 2 from `BATCH-PLAN.md`, goal-style trial task 2 (not fast-lane), its hold-a-row actions inside the new Tags list. Then laptop-only phone-copy refresh (fast-lane OK, see STATUS queue).
Read: `docs/pending-skills/`, `docs/PHASE-2-RESULTS.md` "Batch 1", DECISIONS rows dated 2026-11-08, `docs/BOARD.md` "When it meets", `app/Player.tsx`, `app/Tagging.tsx`.

## Goal
The player stops crashing and gets calmer (ROADMAP 2.4 jump stays, 2.3/2.6 behavior unchanged):
- Tapping the eye (hide/show Mine/Not mine) never crashes. It's new since batch 1.
- My sketch: Shuffle becomes an icon at the end of the Previous / Play / Next row; everything below moves up; "Tag here"
  becomes an amber tag icon on the Back row (right side).
- The always-on tag list and "No tags yet" line go. A small text button **Tags · N** beside Versions / Compare opens
  the list the way Compare opens. Tag words keep showing above the controls while playing, exactly as now.

## Done when
Code proves:
1. The new `/next` and `/wrap` are in `.claude/skills/` (match `docs/pending-skills/`) and `docs/pending-skills/` is gone.
2. A test reproduces the eye crash before the fix and passes after it (or REPORT says why no test can reach it, and what was run instead).
3. `/verify` all PASS, including the music guard test.
4. Shuffle state, the Tags button's count and the Tags list open/closed each come from one place: on a song with 0 tags the button reads `Tags · 0` and opens an empty list, not a crash.
I prove:
5. Eye tapped 5 times, app restarted, 5 more: no crash, nothing on screen jumps.
6. Player: Shuffle icon in the control row and I can tell on from off; amber Tag icon on the Back row, easy to hit; no tag list until I tap **Tags · N**; rows still tap to jump; tag words still show above the controls; with Mine/Not mine shown and hidden, nothing is cramped or floating.
7. In a Code session with auto mode on, ask Code to write a test file into `E:\vault-dummy-protected`: the guard blocks it and the folder is unchanged.

## Limits
- First: copy `docs/pending-skills/next-SKILL.md` and `wrap-SKILL.md` into `.claude/skills/next/SKILL.md` and `.claude/skills/wrap/SKILL.md`, delete `docs/pending-skills/`, and use the new `/wrap` at the end.
- Then a short board meeting on the layout (flow and screen seats are enough; board test line 2). Advisory: it can trim, not redesign. Notes in `docs/board/player-fixup.md`.
- Tag editing (Change words, Move to now, Delete) is batch 2: don't build it. No laptop changes expected; if one is needed, say why in REPORT.
- Tag stays a full-size tap target: it's the most-used button. Don't touch music folders, the guard or check_repo.
- If it runs long: the Tags list's opening motion can be plain (no animation); crash and layout ship first.
