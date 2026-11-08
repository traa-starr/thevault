# NEXT: Phase 2 code-complete (fixes, change tags, tagging session, restore, Code's eyes)
Format: goal
Written by chat, 2026-11-08.
Log: player polish checks 4 of 4 pass (results `PHASE-2-RESULTS.md` "Player polish"); bug: Tag icon guard (1 s, reset by every ignored tap) makes it laggy, two fast taps fail while Cancel works; the guard goes, the icon answers every tap like Cancel (owner); dragging the knob must not snap to a tick, jump only on tick tap or Tags row (owner); re-tap cancels even with words typed and the amber X stay as built (chat); steps become ambitious milestones, not small batches: batch 2 (a, b, c), batch 3a, Library Shuffle and a screenshot tool merged into this one step (owner); goal trial task 3 of 3 (chat) (logged by chat)
Queue after this: my real tagging sessions + restore check, then Phase 2 closes. Then laptop-only phone-copy refresh (loop change, see STATUS queue).
Read: `docs/LESSONS.md` (turn every line into a check in your plan), `docs/PHASE-2-RESULTS.md` (all), DECISIONS rows dated 2026-11-07 and 2026-11-08, `docs/BLUEPRINT.md` "Phase 2: tagging", `docs/BATCH-PLAN.md` batches 2-3, `docs/BOARD.md`, `spike/mockups/tagging-card.html`, the app files you touch.

## Goal
Everything left in Phase 2 that code can do, built and proven in one session, so after this only my real sessions and the restore check stand between us and closing Phase 2 (ROADMAP 2.2, 2.4, 2.5, 2.7).
A. **Code's eyes, first.** A laptop command that renders the app's screens at iPhone size with fake data and saves screenshots, so you check layout yourself before I ever see it. Expo web plus a headless browser is the obvious path; audio and gestures can be faked. Add its line to `COMMANDS.md`. Use it for every screen below.
B. **Fixes.** The Tag icon answers every tap as fast as Cancel (the 1 s guard goes; at most a ~250 ms bounce filter, and an ignored tap never extends it). Dragging the knob lands where I let go; only a tick tap or a Tags row jumps.
C. **Change tags (2.4).** Hold a row in the Tags list: Change words · Move to now · Delete, each with "· Undo" for 6 s in the reserved line. Rows never reorder while playing.
D. **Tagging session (2.2, 2.5).** BATCH-PLAN batch 2 b and c as written: "Tag songs" in the Library header and Sort tab, "N of M tagged", pool rules, cards start ~30% in, Next saves an open draft to its own song, Not mine with Undo, Mine filter holds everywhere.
E. **Library Shuffle** cycles like the player's. No Shuffle pop-up anywhere in the app.
F. **Restore, Code side (2.7).** A laptop command that lists tags per song (for my compare), and a test that a wiped phone with one unsent tag restores every tag: same words, same second, deleted ones stay gone.

## The bar (how to work)
- One board meeting first (flow, screen, logic seats) for the whole step; notes in `docs/board/phase-2-complete.md`. Advisory.
- Plan in STATUS "In progress", one line per goal. Before building each goal, list how it could break on my phone (lost or late tap, layout jump, keyboard covering things, offline, app killed mid-action, song change mid-action, empty list, 30+ tags, long text and emoji) and turn each into a test or a screenshot check.
- Rules get tests first, in the style of `playOrder.test.mjs`.
- Every control: instant pressed look, at least 44 pt to tap, no tap swallowed, nothing on screen shifts when it appears. BLUEPRINT taste holds: small text-like controls, fixed-height rows, no haptics.
- Screenshot every changed screen: empty, 1 tag, 30 tags, long words, field open. Look at them and fix what's off before `/wrap`. The session screen matches the approved mockup.
- Before `/wrap`, a hostile review: re-read your whole diff against every Done when line, DECISIONS and BLUEPRINT as if hunting for my next fail. Fix what you find, then `/verify`.
- **Fresh-eyes review, once, after your own review** (this NEXT asks for it, so the no-subagents rule allows it): one subagent that never saw the build gets only NEXT, `LESSONS.md`, the relevant DECISIONS and BLUEPRINT rows, the diff and the screenshots. Its job: find what would fail my phone checks or look amateur. It returns a ranked list. You fix what's real. No second run. In REPORT: what it caught that you missed (one line each), so we can judge if it's worth the tokens.
- Don't stop at the first problem. Two failed fixes on one goal: write it up in REPORT and move to the next goal. Keep the STATUS plan current so a cut-off resumes; past ~150k context, finish the current goal and `/wrap`.

## Done when
Code proves:
1. Screenshot command runs in one line and saves every screen listed above; REPORT names what you fixed after looking.
2. Tests: two taps 300 ms apart open then cancel, a third reopens; a drag released 1 s from a tick lands where released, a tick tap jumps.
3. Tests: Change words, Move to now, Delete each go through the phone-first journal and outbox (whole-tag lines, BLUEPRINT), Undo restores exactly, a deleted tag stays gone after sync.
4. Tests: session pool (Mine and playable only, untagged 3x, no repeats until the pool runs out), counter, Next saves a draft to its own song, Not mine + Undo.
5. Restore test passes with one unsent tag; tags-per-song command prints for a real song.
6. `/verify` all PASS, including the music guard test.
I prove:
7. Tag twice fast: opens then cancels as quick as Cancel; once more: opens. Drag to just past a tick: stays where I let go.
8. Hold a row: Change words shows the new words in the list and when play passes the tick; Delete then Undo brings it back; Move to now moves the tick; nothing jumps.
9. Session: ten cards, counter moves on a song's first tag, no song twice, Not mine then Undo puts it back, Close returns with the same song playing.
10. Library Shuffle cycles with no pop-up. Offline: change one tag twice, delete another, Undo the delete; back online the laptop shows the second words and both tags.

## Limits
- Don't touch music folders, the guard or check_repo. Screenshots use fake data only and live in `spike/output/` (gitignored).
- The screenshot tool's packages are laptop-only: they must not change what ships to the phone. If Expo web can't render a screen, fake that part; if the tool itself fails twice, write it up and build the rest anyway.
- Laptop changes are fine where a goal needs them (F, `POST /changes` if needed); say why in REPORT. Old server never meets a new kind (BLUEPRINT).
- Not in this step: phone-copy refresh, Phase 3 search, Move to now beyond the list.
