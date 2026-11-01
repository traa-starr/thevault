# How we work: chat + Claude Code

Goal: I carry one short line between two Claudes. Chat manages the project; Code does the work. I test on the phone and
make the few calls only I can make. Adapted from Untethered, without its heavy parts.

## Roles
- **Chat (claude.ai Project, the manager):** keeps the whole picture, checks Code's work, makes reversible calls itself,
  asks me only about taste, scope, money and anything hard to undo. Writes the next task. Writes no code. Instructions:
  `docs/CHAT-INSTRUCTIONS.md`.
- **Code (fresh session per step):** does exactly what `docs/NEXT.md` says, then `/wrap`.
- **Me:** phone tests, the few decisions, git buttons, carrying the line.

## The files
Each file has one writer at each moment: Code at the end of a step (`/wrap`), chat at review. Nobody writes while the
other is mid-turn.

| File | Code writes (at `/wrap`) | Chat writes (at `Review.`) |
|---|---|---|
| `docs/NEXT.md` | Only on `/next pass` (from a fast-lane queue item) | The ONE current task. Overwritten each step |
| `docs/ROADMAP.md` | Ticks items built this step | Ticks phone-verified items, closes phases, adds parked ideas. Reorders only with a DECISIONS row |
| `docs/REPORT.md` | What the session did, phone checks, decisions needed. Overwritten. Under 40 lines | Never. Review reads it |
| `docs/STATUS.md` | Done, In progress, Next up, queue, open questions | Clears In progress, sets Next up and queue, closes answered questions and reported phone checks. Under 40 lines |
| `docs/DECISIONS.md` | Calls made during the session | My answers and chat's calls. Settled, never re-ask |
| Result docs (`SPIKE-RESULTS.md`, options memos) | Measured results | My phone results, one line each |

**`Next up` line in STATUS** says whose move it is: `Code: /next`, `me: phone checks, then Review.`, or `me: answer in chat`.
Whoever writes last sets it. `/where` reads it first.

Full chat duties: `CHAT-INSTRUCTIONS.md` ("Files you manage").

## The loop
1. **Code:** `/next` does the task, then wraps: REPORT, STATUS, DECISIONS, and a one-line commit message.
2. **Me:** VS Code buttons: commit, push. Do any phone checks.
3. **Chat:** new chat in the Project, type `Review.` plus my phone results. It reads the docs straight from the laptop
   folder (no push needed for chat to see them).
4. **Chat** checks the work, logs decisions and phone results, updates STATUS, writes the next task into `docs/NEXT.md`,
   and tells me what it decided and what needs me (max 3).
5. **Me:** new Code session, type `/next`. Code starts the task. (If chat's Log lines are missing from DECISIONS, Code
   adds them first.) Same as Untethered.

## Outside the loop
I can bring chat anything (an idea, a worry, a question). Chat answers, and parks work-changing ideas in the STATUS queue
or open questions. It rewrites NEXT only if the idea should beat the current task and Code isn't mid-step.

## Lines to type
| Where | Line | What happens |
|---|---|---|
| Code | `/next` | Does NEXT.md. If a session got cut off, picks up from the part it stopped on |
| Code | `/next <brief from chat>` | Backup only, if chat can't reach the laptop: saves the brief as NEXT.md, then does it |
| Code | `/next pass` | Phone check passed, no notes: logs it and starts the queue's next item, if marked `fast-lane OK` |
| Code | `/wrap` | Closes a session early. `/next` runs it by itself at the end |
| Code | `/review` | Skips chat: checks the last step, then writes the next NEXT. For when chat is out of reach or capped |
| Code | `/where` | Lost? Where we are and my one next action. Changes nothing |
| Chat | `Review.` | Checks the last step, writes the next NEXT.md straight to the laptop |

## Sizing
One NEXT = one batch from `BATCH-PLAN.md`, 2-3 phone checks. Split earlier only where I must see A before B is worth building, or before
something hard to undo. A NEXT may have a stop line: parts after it happen only if the session has room.

## Decisions
- Reversible and technical: chat or Code decides, logs it, tells me in one line.
- Taste, scope, money: a recommendation and a default, asked once.
- Hard to undo: CLAUDE.md rule 3. Nobody defaults these. I choose.
- A question raised in REPORT is answered in chat, not in the Code thread. Same Code thread only for a one-line yes/no
  that blocks the step.

## Token habits
- New Code session per step, new chat per review. Past about 150k (`/context`), finish the part and `/wrap`.
- Sonnet for docs-only and `/wrap`-only sessions. Opus at medium effort for building. High effort only for hard-to-undo design.
- Docs stay short. If one needs a "don't read it whole" warning, it has outgrown its job.
- Trimming: STATUS and REPORT cap at 40 lines (the repo check warns). DECISIONS is one row per call; when a phase closes,
  chat folds its rows into a short summary block.
- Numbers are Code's, feel is mine: Code doesn't loop on screenshots or wait around on runs.
