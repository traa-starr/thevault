# The design board

Four advisors that meet before a batch that passes the test below, so Code builds something that feels right the first
time. Set up 2026-11-01 (DECISIONS). They advise; they don't decide. Chat decides what's reversible, I decide taste and
anything hard to undo. My ideas go in as a starting point, not law.

| Seat | Asks | File |
|---|---|---|
| Flow designer (UX) | How does it feel in the hand? Taps, order, what happens next | `.claude/agents/flow-designer.md` |
| Screen designer (UI) | What does it look like? Layout, states, words on screen | `.claude/agents/screen-designer.md` |
| Logic architect | What rules and data make that true, and what breaks later? | `.claude/agents/logic-architect.md` |
| Tester | How does it break? Drafts the phone checks | `.claude/agents/tester.md` |

Chat chairs: it reads the notes at `Review.` and turns them into NEXT.

## When it meets
The one test, applied to the batch's NEXT.md before it's written. A yes to any line means a meeting:
1. It adds a screen, or a new way to move between screens.
2. It changes what I see or hear after a tap (timing, motion, things moving on screen, what plays), including a fix for
   something I flagged on the phone as feeling wrong.
3. It changes a rule the logic seat guards: journal, outbox, manual choice wins.

No to all three means no meeting. Always no: laptop-only work, wording, and a bug fix that only restores behavior
already agreed in DECISIONS. Unsure counts as yes.
- Met so far: 3 (player), 4 (sorting), 4b (versions), 4c, 4d (Compare), 6 (offline), 6.2 (restore).
- A meeting is part of a docs-only Code session, or part 0 of a build session when the batch is small.
- Seats run only when NEXT.md or I call a meeting. Code never starts them on its own.

## How a meeting runs
1. Code gives all four seats the same brief (the batch, my notes, the questions) and runs them side by side.
2. Code writes `docs/board/<batch>.md` (under 60 lines): **Agreed**, **Disagreed** (each side in a line), **Owner
   questions** (max 3, with defaults), **Proposed phone checks**. No code.
3. Chat reviews it, logs what's decided in DECISIONS, and writes the batch into NEXT.

Cost: seats run on Sonnet and answer in under 30 lines each, so a meeting stays cheap.
