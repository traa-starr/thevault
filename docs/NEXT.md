# NEXT: Overhaul wave 3: wave 2 fix-ups, quiet open screen, Sort as swipe cards, tagging
Format: goal
Written by chat, 2026-11-11.
Effort: high
Log: Wave 2 review 7 of 8 pass + 3 notes (check 8 pending at writing). "On this phone" becomes a tiny phone-outline icon (owner). Not played in a while plays from 0:00 (owner). Home rows show different songs: a song in only one row's first 5 cards, top row wins; unordered rows shuffle daily; Recently added and Most played keep order, skip songs already up front (owner + chat-default). Code deletes the old StartVault job (owner). Energy FAIL looked into first (chat). Review catches 3, 13, 15, 16, 17, 18 fixed here; 6, 7, 8, 12 left (chat). Offload idea parked (owner) (logged by chat)
Size: wave 3 of 4 (O.4) plus wave 2's notes and catches plus the open-screen energy FAIL. No rebuild: ships by publish. A first so a short session still ships what I'll notice. 4 goals.
Queue after this: wave 4 (Queue, versions, settings, whole-app pass, Live Activity spike last). Promo ends 11-16. Then my 3.7 searches at ~50 tags.
Read: `docs/LESSONS.md`; `docs/overhaul/DESIGN-SYSTEM.md`; `docs/overhaul/LABELS.md`; `spike/mockups/deal.html` (the swipe card) + `app.css`; `docs/board/overhaul-mockups.md` Sort part; `docs/overhaul/TEARDOWN.md` Sort + tagging rows; `docs/board/wave2-review.md` catches 3, 13, 15-18; last 8 DECISIONS rows; files you touch.

## Goal
A. **Wave 2 fix-ups (owner notes).** Library rows: a tiny phone-outline icon (thin upright rectangle) replaces the words "On this phone", so the second line stops getting cut. "Not played in a while" plays from the beginning. Home rows show different songs (rule in Log). The old Windows job `StartVault` is gone; run off then on for real and prove the server still starts at log-in. Review catches 3 (Needs tags before tags load), 13, 15 (title matches bold like line matches), 16 (search says when the laptop is off; laptop-off shots fail the fetch like a real phone), 17 (Loading songs ends in a plain fail line), 18 (right edges line up).
B. **Quiet with the screen open.** Energy with the app open read 157 wake-ups, 167 redraws, 13 network calls a minute (ceiling 130 / 135 / 6). Find what wakes it with every song on the phone and bring it under, with a model test holding the ceiling. Read `timings` yourself at the start and at `/wrap`, so I never run it.
C. **Sort as Deal's swipe card (O.4 wave 3).** Sort's screen becomes the swipe card from `deal.html`, still tucked away behind Sort's entry, not on Home. What a swipe or tap does stays as built (Mine / Not mine, play, next).
D. **Tagging session and tag editing in the new style (O.4 wave 3).** Same look as wave 1-2 (design system, plain labels); what saves and how stays as built.

## The bar
- Board meets first for C-D (new screens). One short meeting, notes to `docs/board/wave3.md`, defaults for any owner question.
- List how A-D could break before building (LESSONS included: Home repeats, laptop checks that a phone copy would pass). Each one a test or a changed-screen shot.
- Controls: instant pressed look, 44 pt, no swallowed tap, nothing shifts; a swipe never also counts as a tap. Plain labels.
- Screenshots only of changed screens, checked by a subagent, plus side by side with `deal.html` for C.
- One fresh-eyes review (the `fresh-eyes` agent): catches to `docs/board/wave3-review.md` before any fix; may run in the background.
- Two failed fixes on a goal: write it up, move on. REPORT under 40 lines with "Odd in how we work:".

## Done when
Code proves:
- A: test that no song repeats in Home rows' first 5 cards (when a row has others) and unordered rows change by day; test Not played in a while starts at 0; shot of a Library row with heart + Versions + plays and the icon, nothing cut; `StartVault` absent; off then on run for real, server answering after; laptop-off shots show the real "Laptop not reachable" line on Library and search.
- B: model test with the open-screen ceiling passes; `timings` read and quoted in REPORT (open, and locked if data exists).
- C-D: tests that each swipe and tap does what Sort's does today; shots of the card (start, mid-swipe, last song), tagging session and tag edit.
- `/verify` all PASS under 1 min; `check_repo.py` clean; publish goes out.
I prove:
1. Home: the rows open on different songs; Not played in a while starts from the top; Library rows show the phone icon and the second line isn't cut.
2. Laptop off (`server_off`, exact line in COMMANDS), then search and Library: each says the laptop isn't reachable; turn it back on and it clears.
3. Sort: swipe through 10 songs as cards, each swipe does the right thing, nothing double-counts, it feels quick.
4. Tagging: run a short session and edit a tag on a song; it saves and looks like the rest of the app. Then listen locked 10 min (for B's locked numbers).

## Stretch (only if every goal is met and budget is left)
1. Waveform spike (DESIGN-NOTES Tech 1): `spike/` only, shapes for 20 songs, time and size for all, a 10-line memo. No app code.

## Limits
- No rebuild: if a piece needs one, write it in `overhaul/REBUILD.md` and leave it.
- Search engine, rating, tagging rules, play counting and steady-screen rules stay as built; this changes look, movement and the noted fixes only.
- No offload work (parked, hard to undo). No "My projects" row (6.1).
- If it runs long: D waits, then C. A and B ship first.
- My music is read-only; the repo is public (fake names in shots and tests, no laptop address or Tailscale names).
