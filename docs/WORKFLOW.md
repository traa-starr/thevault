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
| File | Written by | What it is |
|---|---|---|
| `docs/NEXT.md` | Chat, saved by Code | The ONE current task. Overwritten each step |
| `docs/REPORT.md` | Code | What the last session did, phone checks, decisions needed. Overwritten each step |
| `docs/STATUS.md` | Code | Where we are, the queue after NEXT, open questions. Under 40 lines |
| `docs/DECISIONS.md` | Code | Settled, never re-ask |

## The loop
1. **Code:** `/next` does the task, then wraps: REPORT, STATUS, and a one-line commit message.
2. **Me:** VS Code buttons: commit, push. Do any phone checks.
3. **Chat:** new chat in the Project, type `Review.` plus my phone results. It reads the repo on GitHub.
4. **Chat answers** with what it decided, what needs me (max 3), then one copy block starting `/next`.
5. **Me:** new Code session, paste the block. Code saves it as NEXT.md, logs the decisions in it, and starts.

## Lines to type
| Where | Line | What happens |
|---|---|---|
| Code | `/next` | Does NEXT.md. If a session got cut off, picks up from the part it stopped on |
| Code | `/next <brief from chat>` | Saves the brief as NEXT.md, then does it |
| Code | `/next pass` | Phone check passed, no notes: logs it and starts the queue's next item, if marked `fast-lane OK` |
| Code | `/wrap` | Closes a session early. `/next` runs it by itself at the end |
| Code | `/review` | Skips chat: checks the last step, then writes the next NEXT. For when chat is out of reach or capped |
| Code | `/where` | Lost? Where we are and my one next action. Changes nothing |
| Chat | `Review.` | Checks the last step, writes the next `/next` block |

## Sizing
One NEXT = one phone check, about 3 parts. Split earlier only where I must see A before B is worth building, or before
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
- Numbers are Code's, feel is mine: Code doesn't loop on screenshots or wait around on runs.
