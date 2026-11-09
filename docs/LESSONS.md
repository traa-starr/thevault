# Lessons: misses that reached my phone, and the check that catches them now

Chat adds a line at every `Review.` for each fail or "something off": what slipped, and the check that would have caught
it before me. Code reads this before planning and adds those checks to its plan. Keep it short: fold old lines into
The bar in `CHAT-INSTRUCTIONS.md` once they're standard.

**Kept true by** (added 2026-11-09): the test file or screenshot (`shots:<name>`) that now fails if the miss comes back.
Chat writes `plan` in a new row; Code swaps in the real test when it builds the check. `/verify` runs
`.claude/scripts/lessons.py`, which fails if a named test or screenshot has gone, so a lesson can't quietly lose its check.

| Date | Slipped through | Check that catches it now | Kept true by |
|---|---|---|---|
| 2026-11-08 | Tag words showed only after a jump, never during plain playback | Test the passive path (play with no taps), not just the tap path | `app/playOrder.test.mjs` |
| 2026-11-08 | Tag icon felt laggy: 1 s guard, reset by every ignored tap | Rapid-tap test on every control: each tap answered, no guard over 250 ms | `app/playOrder.test.mjs` `app/quickAndCool.test.mjs` |
| 2026-11-08 | Dragging the knob snapped to ticks | Seek test: a drag lands where it's released | `app/playOrder.test.mjs` |
| 2026-11-08 | Shuffle pop-up box broke the flow; Shuffle text covered tag words | Screenshot with two notices on screen at once; no dialogs inside the player | `shots:player-two-notices` |
| 2026-11-08 | Eye button crash (screen state vs file on disk) | Test toggles repeatedly, and after a restart | `app/quickAndCool.test.mjs` |
| 2026-11-08 | Session cards played a beat from 0:00, then jumped in (wait for length, then seek) | Start point handed to the player at load; a test that no audio plays before it. Screenshots can't hear: list sound-timing failure modes too | `app/playlistCore.test.mjs` |
| 2026-11-08 | REPORT dismissed a fresh-eyes catch ("Cards have the same") without checking | A catch is only "not taken" with a reason checked on the real path, written in REPORT | plan (wrap: a catch not taken needs its reason in REPORT) |
| 2026-11-08 | Session Next went silent for 3-5 s (seek bar at 0:00, then 0:15) while Sort cards start near-instantly | Time Next-to-first-sound on every path that plays a song, against the fastest path we have; a test fails above 1 s | `app/nextTiming.test.mjs` |
| 2026-11-08 | Session buttons centred, but the player opened from a Sort card stayed lopsided | A layout fix gets a screenshot from every place that screen opens (Library, Sort card, session, after restore) | `shots:centre-library` `shots:centre-sort-card` `shots:centre-session` `shots:centre-restored` |
| 2026-11-08 | Session Next passed the model test (300 ms) but took ~800 ms on the phone, 9x Sort cards; sound waited on song info | Sound timing is proven by the phone's own `timings` per play path, compared with the fastest path; nothing the player shows (length, title, tags) may sit before first sound | `server/test_server.py` (the timings command judges the phone's own numbers) |
| 2026-11-09 | Phone got hot and drained on long listens; nothing measured energy | Any playback change counts wake-ups and redraws per minute while locked (model test with a ceiling) and the phone reports them in `timings`; a long locked listen is a phone check | `app/quickAndCool.test.mjs` `server/test_server.py`, plus a phone check |
| 2026-11-09 | Next's pressed look stayed filled until the song loaded, so the tap felt laggy | A control's pressed look is timed on its own (lets go within ~100 ms), never tied to load; a test taps during a slow load | `app/quickAndCool.test.mjs` |
| 2026-11-09 | Eye (hide buttons) flipped per song on shuffle: a per-song rule that stopped fitting once sort was done | A setting the owner taps keeps their choice; any automatic reset is listed in NEXT and tested across 10 shuffled songs | `app/quickAndCool.test.mjs` |
