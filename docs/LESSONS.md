# Lessons: misses that reached my phone, and the check that catches them now

Chat adds a line at every `Review.` for each fail or "something off": what slipped, and the check that would have caught
it before me. Code reads this before planning and adds those checks to its plan. Keep it short: fold old lines into
The bar in `CHAT-INSTRUCTIONS.md` once they're standard.

| Date | Slipped through | Check that catches it now |
|---|---|---|
| 2026-11-08 | Tag words showed only after a jump, never during plain playback | Test the passive path (play with no taps), not just the tap path |
| 2026-11-08 | Tag icon felt laggy: 1 s guard, reset by every ignored tap | Rapid-tap test on every control: each tap answered, no guard over 250 ms |
| 2026-11-08 | Dragging the knob snapped to ticks | Seek test: a drag lands where it's released |
| 2026-11-08 | Shuffle pop-up box broke the flow; Shuffle text covered tag words | Screenshot with two notices on screen at once; no dialogs inside the player |
| 2026-11-08 | Eye button crash (screen state vs file on disk) | Test toggles repeatedly, and after a restart |
| 2026-11-08 | Session cards played a beat from 0:00, then jumped in (wait for length, then seek) | Start point handed to the player at load; a test that no audio plays before it. Screenshots can't hear: list sound-timing failure modes too |
| 2026-11-08 | REPORT dismissed a fresh-eyes catch ("Cards have the same") without checking | A catch is only "not taken" with a reason checked on the real path, written in REPORT |
