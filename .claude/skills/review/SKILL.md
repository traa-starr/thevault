---
name: review
description: Do chat's manager job from inside Code - check the last step against NEXT.md and write the next NEXT.md. Use when I type /review because chat is out of reach or capped.
argument-hint: "[my phone results]"
---

# /review: check the last step, set up the next

My phone results, if any: `$ARGUMENTS`

Follow the review in `docs/CHAT-INSTRUCTIONS.md` ("When I type `Review.`", "What you decide", "Never default these"),
with these differences, because you have the actual files:

1. Read `docs/STATUS.md`, `docs/REPORT.md`, `docs/NEXT.md`, the end of `docs/DECISIONS.md`. Then `git status` and `git log -3`.
2. **Verify, don't trust REPORT:** compare its "Changed" list with `git diff --stat` and the last commit. Re-run one
   cheap check it claims passed. Run `python .claude/scripts/check_repo.py`. Point out anything built that NEXT didn't ask for.
3. Log my results and answers in `docs/DECISIONS.md` and STATUS. A hard-to-undo call without my answer stays open.
4. **Don't write code.** If nothing blocks it, overwrite `docs/NEXT.md` in the block's format, and update the STATUS queue.
5. Answer in this order: **Decided**, **Needs you** (max 3, multiple choice, using AskUserQuestion), **YOUR NEXT ACTION**
   (normally: commit and push, then a new Code session with `/next`).
