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
   - **Phone timings:** the output of `python server/vault_cli.py timings E:\VaultLibrary`, pasted as is in a code
     block (one PASS/FAIL line per play path, newest app code only). Run it now, never from memory, so I never relay
     numbers. If it says "not enough yet", say so; that's not a pass.
   - **Phone update:** exactly one of: `none` (no app code changed) · `published <time>` (app code changed: you ran
     publish yourself in step 6b; I only close and reopen the app) · `full rebuild` (app.json, package.json or native
     code changed: GitHub build plus SideStore, mine). Decide from `git status --short` on `app/`, not memory. Add
     `server restarted` if you restarted it in step 6b.
   - **Needs the phone:** numbered exact taps, and what passing looks like, covering the "I prove" lines of Done when
     (goal format). "None" if none. Chat walks me through these at `Review.`, one at a time.
   - **Changed:** files, taken from `git status --short`, not memory.
   - **Done when** (goal format): every line of NEXT's Done when, each marked pass / fail / not run. "I prove" lines
     are `not run (for chat)`; chat walks them at `Review.` with the phone checks.
   - **Plan I chose** (goal format): the plan lines from STATUS, ticked or not, plus anything guessed.
     Recipe format instead: **Differed from NEXT.md:** including anything guessed.
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
6b. **Do the laptop side of the phone update yourself** (one job, not a task for me):
   - `server/` changed: restart the server with the Stop and Start lines from COMMANDS.md "From the phone", then
     confirm it's up with "Is it running?".
   - App code changed and no full rebuild needed: make sure the server is running, run the publish line from
     COMMANDS.md, and confirm the "Published update ..." line. If publish fails twice, write it up and put the line in
     the last message instead.
   - Full rebuild: don't start it; it needs me (GitHub build, SideStore).
7. **Last message: three lines, nothing else.** REPORT is for chat; I read the outcome in chat's review, not here.
   Don't summarise the work, don't list checks, decisions or pitches, don't explain the loop.
   - `Done: <x of y goals met>.` Add `<goal> failed` only if one did.
   - `Phone: <none | published, close and reopen the app | full rebuild needed, see REPORT>.`
   - The commit message in a copy block. I do git myself: never commit, push or merge.
   Then stop. I know the rest: commit, push, `Review.` in chat (or `/next pass` when fast-lane).
