---
name: where
description: Read-only orientation for when I'm lost - where the project is and my one next action. Use when I type /where or ask what's going on or what to do next.
---

# /where: where are we

Change nothing. Read `docs/STATUS.md`, the top of `docs/NEXT.md`, the "Needs the phone" part of `docs/REPORT.md`, then
`git status --short` and `git log -1 --format=%cd`.

Work out my next action, using the first that's true:
1. STATUS "In progress" names a part: new Code session, `/next`.
2. Uncommitted changes and REPORT covers the current NEXT: commit and push (give the one-line message).
3. REPORT lists phone checks with no result yet: do them (list them), then `Review.` in chat.
4. REPORT has no results to wait for: `Review.` in chat.
5. NEXT hasn't been started (REPORT covers an earlier step): new Code session, `/next`.

Answer in at most 5 lines: where we are, what's waiting on whom, **YOUR NEXT ACTION**. Plain words.
