---
name: next
description: Do the current step in docs/NEXT.md. Accepts a brief pasted from chat, which it saves as NEXT.md first, or "pass" to log a passed phone check and start the next queued step. Resumes by itself if a session was cut off.
argument-hint: "[brief from chat | pass]"
---

# /next: do the one task

Arguments: `$ARGUMENTS`

## 1. Work out the task
- **A brief from chat:** overwrite `docs/NEXT.md` with it. Append its `Log:` lines to `docs/DECISIONS.md` and its queue to STATUS.
- **`pass`:** (only for a step with no phone checks, or checks I already passed in chat) read the STATUS queue. If the next item is marked `fast-lane OK`, log the pass in `docs/DECISIONS.md`, write
  that item out as `docs/NEXT.md`, and go on. If not, stop and tell me: "This one needs chat: type `Review.` there."
- **Nothing:** use `docs/NEXT.md` as it stands. Chat normally logs its `Log:` lines itself and ends them with
  `(logged by chat)`. If that marker is missing and the lines aren't in DECISIONS, append them.

## 2. Orient, reading the minimum
Read `docs/STATUS.md`, `docs/NEXT.md`, and only what NEXT's `Read:` line names.
- **Resume check:** if STATUS "In progress" names a part of *this* NEXT (same step name), run `git status` and
  `git diff --stat`, then continue from that part. Don't redo finished parts. If it names an older step, it's stale:
  clear it and note that in REPORT.
- **Already finished:** if `docs/REPORT.md` covers this same step, stop and tell me my next action instead of redoing it.
- **Can't start:** if NEXT asks for something CLAUDE.md forbids, or a decision it depends on isn't in DECISIONS.md, stop
  and say so in one line.

## 3. Build
- Before each part, set STATUS "In progress" to "<step name>, part <x>". After it, run its check.
- Stay inside NEXT. Bigger ideas go in REPORT as the Pitch. A decision it didn't foresee: reversible, pick and note it in
  REPORT; hard to undo, stop and ask (CLAUDE.md rule 3).
- After 2 failed fixes on the same thing, stop and write it up in REPORT.
- Parts after a stop line only if the session has room.
- If a part needs my hands now (phone, sign-in), give me numbered steps, one small batch at a time, and wait for the result.

## 4. Close
Run `/wrap`. Its last message says whether the phone needs an update (none / publish / full rebuild) and only counts
the phone checks: chat walks me through them one at a time at `Review.`
