# Batch plan: Phase 2 (tagging)

Written 2026-11-07 by the Phase 2 plan session. Design: `BLUEPRINT.md` "Phase 2: tagging". Board: `board/phase-2-tagging.md`.
Each batch is one Code session with 2-3 phone checks. Chat writes each batch into `NEXT.md` at review.

**Phase 1: done** (batches 1-6 and 3d, 4b-4d, 6.x; closed 2026-11-07). Its batch list is in git history.

**Blocks batch 1:** I tap through the mockup on the phone (chat publishes it as a private page). Anything I change there changes batch 1 first.
No other owner calls are open: the tag record, tag moment, where tagging lives, song picking, field and seek bar are in DECISIONS (2026-11-07).
Board: batches 1 and 2 add screens, so the plan-session board covers them; chat calls a short one again only if the mockup changes much.

## Batch 1: Tag from the player
**ROADMAP:** 2.3, 2.4 (jump only), 2.6. Real build of what the mockup shows, in the normal player.
a. **Laptop first.** `POST /changes` allows `tag_add` and `tag_remove`: song checked (following a merge), text trimmed and capped at 500, `made_at` kept on edits. `GET /tags`. Tests: allow-list flips (`test_server.py` "tags refused" check), resend does nothing, merged song, rebuild from journal compares tags row for row incl. an old line with no `made_at`.
b. **Phone tag store:** copy of `GET /tags` in app storage, outbox on top, sync word per tag; tags go into the phone backup through the outbox.
c. **Player:** "Tag here", second frozen at the tap, music keeps playing, field in the reserved line with nudge, Return saves, Cancel, one draft at a time, draft saved on every keystroke and back after a kill. "Tagged at 1:42 · Undo".
d. **Tag list and seek bar ticks:** tap a row or tick to jump; the playing row marked; rows never reorder.
**Stop line:** ticks wait if long; the list ships first.
**Phone checks:**
1. Playing a kept song, tap Tag here, wait 30 s typing, Return: the tag shows the tap's second; tapping it later jumps there.
2. Airplane mode: tag, then mid-typing a second one kill the app; reopen: the draft is back, both say "Saved on phone".
3. Airplane off at home: both turn "On laptop" within a minute.

## Batch 2: Change tags, tagging session
**ROADMAP:** 2.4 (edit, delete), 2.2, 2.5.
a. Hold a row: Change words · Move to now · Delete, each with Undo (whole-tag lines, BLUEPRINT).
b. Tagging session: Library header "Tag songs" (and the Sort tab); counter "N of M tagged"; pool = Mine songs that can play now, untagged 3x, no repeats until the pool runs out; cards start about 30% in; Next saves an open draft to its own song.
c. Not mine on the card with Undo; the song keeps playing until Next; the Mine filter holds everywhere.
**Stop line:** "Move to now" waits if long.
**Phone checks:**
1. Session: ten cards, counter moves when a song gets its first tag, no song twice, Close returns with the same song playing.
2. Not mine then Undo on a card: the song is back, nothing on screen jumps.
3. Offline: change one tag's words twice and delete another, then Undo the delete; back online, the laptop shows the second words and both tags.

## Batch 3: Restore and real sessions
**ROADMAP:** 2.7, Phase 2 "Done when".
a. Restore test with one tag still unsent: wipe, restore, compare. A laptop script lists tags per song so I can compare.
b. Small fixes from my real sessions ride along.
**Phone checks:**
1. Wipe with one unsent tag: every tag back, same words, jump lands on the same second, deleted ones stay gone.
2. Real sessions done (my call), then Phase 2 closes.

## My requests (2026-11-07, for chat to place)
- 465 songs are Mine but only 314 have phone copies: `import` makes the rest. I'd like sessions to refresh this by themselves.
- A plain tour of the laptop commands: what each one is for and when to run it.

## Still parked
`/status` count-only answer · A-Z jump strip · doctor's fail line naming changed files · `/verify` under 1 min.
