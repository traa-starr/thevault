---
name: wrap
description: Close a Vault session. Writes REPORT and STATUS, logs decisions, runs the repo safety check, and gives a one-line commit message and my next action. /next runs it at the end of every step.
---

# /wrap: close the session

Do these in order. Say in REPORT if one was skipped, and why.

1. **Numbers.** Anything REPORT quotes is measured now by running it, not remembered. Summary lines only.
2. **`docs/REPORT.md`**, overwritten, under 40 lines, these headings:
   - **Step:** NEXT's exact step name, and date. Chat matches REPORT to NEXT by this.
   - **Verified by running:** what ran, what came out.
   - **Phone update:** exactly one of: `none` (no app code changed) · `publish` (app code changed: run the publish line
     from COMMANDS.md, then close and reopen the app) · `full rebuild` (app.json, package.json or native code changed:
     GitHub build plus SideStore). Decide from `git status --short` on `app/`, not memory. Add `server restart` if
     `server/` changed.
   - **Needs the phone:** numbered exact taps, and what passing looks like. "None" if none. Chat walks me through these
     at `Review.`, one at a time.
   - **Changed:** files, taken from `git status --short`, not memory.
   - **Differed from NEXT.md:** including anything guessed.
   - **Not done:** with why.
   - **Decisions needed:** each with a recommendation and a default. Hard-to-undo ones get no default.
   - **Proposed next step.**
   - **Pitch:** one upgrade, one-line why.
3. **`docs/STATUS.md`**, under 40 lines: "Updated <date> by Code", what's done, "In progress" (cleared, or naming the
   unfinished part), **"Next up"** (whose move: normally `me: commit, update the phone, then Review.`; `Code: /next` if a part is
   unfinished), the queue after NEXT, open questions, phone checks pending. Don't repeat REPORT. Don't touch `NEXT.md`:
   chat writes it.
4. **`docs/DECISIONS.md`:** every settled call from this session. Hard-to-undo entries list date, options, choice and why.
5. **`docs/MAP.md`:** only if a location changed. **`docs/ROADMAP.md`:** tick items built this step.
6. **Safety check:** `python .claude/scripts/check_repo.py`. Fix anything it flags. Never weaken the check to pass.
7. **Last message, short, nothing pasted from the docs. Never print the phone checks: chat walks me through them.**
   - What happened, in one or two lines. Say plainly if something failed.
   - **Phone update:** the same line as REPORT, in plain words, with the exact line to copy if it's `publish`.
     First line of the message if it isn't `none`.
   - **Phone checks waiting:** a count only ("3 checks, chat walks you through them"). "None" if none.
   - **Commit message:** one line. I do git myself: never commit, push or merge.
   - **YOUR NEXT ACTION:** normally "Commit and push, do the phone update above, then in a new chat in the Project type
     `Review.`" If the step had no phone checks and the next step is `fast-lane OK`: "Commit and push, then in a new
     Code session type `/next pass`."
