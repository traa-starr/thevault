# How we work: chat + Claude Code

I carry one short line between two Claudes. Chat manages, Code builds, I test on the phone and make the few calls only I
can make. Chat's full job: `CHAT-INSTRUCTIONS.md`. Code's: the `/next` and `/wrap` skills. The playbook behind both:
`HOW-I-WORK.md` in The Plug.

## The loop
1. **Code:** `/next` works NEXT.md, then wraps. Last message: goals met, phone update (none / published / full rebuild), commit message.
2. **Me:** commit and push with the VS Code buttons; do the phone update if there is one.
3. **Chat:** new chat in the Project, type `Review.` Chat walks the phone checks one at a time, then writes the next NEXT.md.
4. **Me:** commit and push chat's files, new Code session, `/next`.

## Lines to type
| Where | Line | What happens |
|---|---|---|
| Code | `/next` | Does NEXT.md; resumes a cut-off session |
| Code | `/next pass` | Phone check passed, no notes: starts the queue's next `fast-lane OK` item |
| Code | `/next <brief>` | Backup only, when chat can't reach the laptop |
| Code | `/wrap` | Closes a session early (`/next` runs it by itself) |
| Code | `/review` | Chat is capped or out of reach: Code does the review |
| Code | `/where` | Lost? Where we are and my one next action. Changes nothing |
| Code | `/verify` | Every laptop check, one PASS/FAIL each |
| Chat | `Review.` | Phone checks one by one, then the next NEXT.md |

## Rules that live here
- One writer at a time: Code at `/wrap`, chat at `Review.`. STATUS `Next up` says whose move it is.
- A question in REPORT is answered in chat, not in the Code thread (except a one-line yes/no that blocks the step).
- When a phase closes, chat folds its DECISIONS rows into `docs/decisions/phase-N.md` and leaves a short summary.
- Settled memos move to `docs/archive/`.
