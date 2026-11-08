**Step:** Phase 2 plan session (tagging), 2026-11-07.

**Verified by running:** the mockup was driven in headless Chrome at iPhone size (390×844) by a throwaway script: play, Tag here, a double tap (one draft only), 2 s of typing (the second stayed frozen at the tap, music kept playing), Return, sync word "On laptop", jump from a row, hold → Delete → Undo, a draft surviving a reload, Not mine → Undo (counter 3 of 11 → 4 of 12), Next ×12 (all 12 songs, no repeats), Player mode. Console errors: none. Page width 390, nothing spills sideways.

**Needs the phone:** at review chat publishes the mockup as a private page. Tap through it:
1. Tap play, tap **Tag here**, type a line, wait 30 s, tap Return. Pass: the row shows the second you tapped, not when you saved.
2. Tap **Tag here** twice fast. Pass: one field only.
3. Tap a row, then a tick on the seek bar. Pass: both jump to that second.
4. Hold a row: Change words, Move to now, Delete, then **Undo**. Pass: each works, nothing on screen jumps.
5. Tap **Not mine**, then **Undo**. Pass: the counter goes down and back, the music never stopped.
6. Footer: **Laptop off**, tag something. Pass: "Saved on phone · 1 waiting" and a grey "on phone" on the row; **Laptop on** turns it "On laptop".
7. Start typing a tag, close the tab, reopen. Pass: the half-typed line is back.
8. Footer **Player**: same screen with no counter, Not mine or Next. Tell chat what feels wrong.

**Changed:** `docs/BATCH-PLAN.md` (Phase 2 batches, Phase 1 folded), `docs/BLUEPRINT.md` (Phase 2 section), `docs/DECISIONS.md`, `docs/ROADMAP.md` (2.1 and 6.1 notes), `docs/STATUS.md`, `docs/REPORT.md`, new `docs/board/phase-2-tagging.md`, new `spike/mockups/tagging-card.html`.

**Differed from NEXT.md:** naming `Untitled`/date-only songs moved out of Phase 2 to the release system (your answer); added to ROADMAP 6.1. No dictation (you type), so the mockup has no mic. Controls follow the newer DESIGN-NOTES note (small, text-like), not "big controls" from the brief. Accent colour amber is a placeholder. ROADMAP 2.1 noted as built, not ticked: its proof is your tap-through.

**Not done:** nothing.

**Decisions needed:** none open. Batch 1 is blocked only by your mockup tap-through.

**Proposed next step:** chat review, publish the mockup, I tap through it; then batch 1 from `BATCH-PLAN.md`.

**Pitch:** a `/refresh` step at the start of each build session (stop server, `import`, start server) so songs marked Mine between sessions get phone copies (465 Mine, 314 copies today; your request).
