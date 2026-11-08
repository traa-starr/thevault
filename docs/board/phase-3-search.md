# Board: Phase 3 search on the phone + fast session Next + centred player (2026-11-08)

Seats: flow, screen, logic, tester. Brief: NEXT.md "Fast session Next, centred player everywhere, search on the phone".

## Agreed
- **Field:** always visible, its own line under Library's header links, full width, 44 pt, "Search songs and tags", round x
  to clear (only with text). Return closes the keyboard and keeps the results. Empty field = Library exactly as today.
- **Results:** one row per song (its best tag ranks it), keyed by song, fixed height. Line 1 title + the best tag's time
  on the right; line 2 the matched tag words, matched words bold white, the rest grey, "+N more" if other tags matched.
  Capped (50 rows) with a quiet footer. Never hides a song that shares a word; only reorders.
- **Typing:** latest keystroke wins (short wait ~120 ms), no spinner, nothing moves while the thumb is moving. Keyboard
  dismisses on drag; a tap on a row works first time with the keyboard up.
- **Tap:** plays that song from the tag's second (the tag's second wins over a session's 0:15), opens the player sheet,
  closes the keyboard. Search text stays behind the sheet. Ignored while Compare or Sort has the player.
- **Index:** derived, never saved. Built from the phone's tag copy with the outbox on top (a tag just saved is findable),
  rebuilt only when the tag set really changes. Search never touches the network.
- **Next:** seek bar shows 0:15 at the tap, never 0:00; first sound within ~1 s; no spinner, no fade-out of the old song.
  Mechanism: the already-loaded queued song, silent until it reaches 0:15. Every exit gives the volume back.
- **Controls:** Previous / Play / Next in one fixed centred row: an equal-width slot each side (Shuffle or empty on the
  left, empty on the right), so the row is in the same place in Library, Sort card, session and after a restore.
- **Timings:** plain `POST /timings`, best effort, its own file on the laptop (`timings.jsonl`), not the journal, not an
  outbox kind. Numbers only (ms, tag count, kind, app version): never search text or titles. Phone keeps the last 50.

## Disagreed (Code's pick in bold; owner can change at review)
- Next after a result tap. Flow: walk the results. Logic: walk Library from that song. **Library** (results change as I type).
- One letter. Flow: don't search, "Keep typing". Screen: search it. **Search it** (it's cheap, never wrong).
- Cancel button. Flow: iOS-style Cancel. Screen: x only. **x only** (one control; Return closes the keyboard).
- Recent searches row. Flow: yes. **Not now** (parked).
- Now-playing bar while typing. Screen: hide. **Leave as is** (the keyboard covers it anyway).

## Owner questions (defaults in use)
1. E (3.4 slang table, 3.5 boost the pick) writes to the journal forever, so its shape is yours: logic seat's pick is
   a pick saved as an event {search words, song, tag, time}, boost from the latest pick, above all tiers, never hiding
   anything. Default: **E waits for your yes.**
2. Tag time on the match line: one time on the right (default) or a time per matched tag.

## Proposed phone checks (tester)
1. Tag songs: Next 5 fast, 3 slow, then lock-screen Next twice. Pass: each starts ~0:15 within ~1 s, seek bar never
   0:00, volume always comes back.
2. Player from a Sort card, from Library, from a session, then force-close and reopen. Pass: Previous / Play / Next
   centred each time, nothing jumps as the title or tags load.
3. Library: 2-3 words of a tag, tap the top result with the keyboard up. Pass: first tap plays from the tag's moment.
   Type 😀 or nonsense: a clear message, no freeze.
4. Airplane mode, repeat 3. Pass: same results. Then the laptop `timings` command prints this phone's numbers.
