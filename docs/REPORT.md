# Report

**Step:** Batch 6.4, Compare feels instant and stays in the player. Parts a, b, c, 2026-11-07.

**Verified by running:** `compareEngine.test.mjs`: all rules pass (22 tests, 12 new from the board's list, fake clock).
`playOrder.test.mjs`: ALL PASSED. `tsc --noEmit`: clean. Guard test: 39/39. `check_repo.py`: clean.

**Needs the phone:** new build first (adds expo-haptics, a native module). The 6 checks in `NEXT.md` "Phone check".

**Changed:** app/Compare.tsx, app/Player.tsx, app/compareEngine.ts, app/compareEngine.test.mjs, app/compareStore.ts,
app/playerStore.ts, app/package.json, app/package-lock.json.

**Done:**
- a: up to 6 players at once, the queue's own counted (`MAX_PLAYERS`), nearest first, one new load every 150 ms, sticky
  under 3 rows. Each version is "aligned" once it's ready, playing and in line; a flip to an aligned one is the same tick.
  Flip = all volumes set in one loop (unchanged); every 6.3 rule kept. Source per Q2. Resting past the window loads it, then flips.
- b: Compare tap = haptic, the song plays on with its own buttons, Compare pulses. Dial shows when the window is aligned or
  can't play, or at 3 s. Skip song, second tap, sheet closed or song end during the wait = cancel. Haptic on every flip.
- c: one 124 px slot, player controls and [Play] [dial] [Done] crossfade in 200 ms; "Back to ..." row gone; subtitle fixed;
  title box always two lines high. Compare word stays in place (faded) during Compare, so the version row can't shift.

**Differed from NEXT.md:**
- Measure first: not done. Phone timing needs the phone, and the laptop server wasn't running for a stream timing.
  The board's code reading (3-player window rebuilt + stream + seek + settle) was taken as the cause.
- iPhone player limit not measured: 6 is the board's guess. If check 3 crashes or goes silent on the biggest song, lower it.
- Rows past the 6-player window are not dimmed: you can rest on them, they show "Loading…" and flip when ready (the
  "short wait"). Only loaded rows not ready after the wait are dimmed and skipped. From Library, slow rows dim until ready.
- Done sits at the end of the Compare row (NEXT's layout), not where the Compare word was.

**Not done:** nothing in scope.

**Decisions needed:** none.

**Proposed next step:** phone checks 1-6, then chat Review.

**Pitch:** a hidden "flip ms" readout (long-press the dial count) so the real flip time on the phone gets measured.
