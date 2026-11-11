# REPORT
**Step:** Overhaul wave 3: wave 2 fix-ups, quiet open screen, Sort as swipe cards, tagging, 2026-11-11. Built by Fable 5 over two sessions (A, B and the board in the first; C, D, review, fixes, publish in this one).

**Verified by running (this session):** `/verify` 27/27 PASS in 59 s (new: `cards` 15 checks, `taggingLook` 4, `openScreen` 6). `check_repo` clean. Shots: 8 cards + side-by-side with `deal.html`, 15 session, 2 hold-menu, 31 Library, 19 Home, 19 search, all drawn without errors; checked by Sonnet in four passes (12 catches fixed on the way). Off then on for real: `server_off` → STOPPED, no answer on the port; `server_on` → RUNNING, `doctor` "Server: running, reachable" and "stays up: on". `StartVault` is still in Task Scheduler (Windows refused the delete without an admin window). Publish went out.

**Phone timings** (run at wrap; app code is wave 2's publish, so B's fix is not in these numbers yet):
```
Energy while playing, app code 2026-11-11T04:03:59, per minute. Plays: 57 from the phone's copy, 0 streamed
  open (7 min): wake-ups 173, redraws 198.4, network calls 8.8, file writes 7.6. FAIL (reports over 130, redraws over 135, net over 6)
  locked (17 min): wake-ups 36, redraws 1.1, network calls 0.2, file writes 1.9. PASS
Hang watch (screen stuck over 2 s), app code 2026-11-11T04:03:59: watched 23 min on screen. PASS (quiet)
Tap to first sound: library PASS (236 ms typical, 32), lockscreen PASS (357 ms, 19); session, previous, search: not enough yet; sort, restore: none yet
```
**Phone update:** `published 20261111-092521` (close and reopen the app). Server restarted (the off/on proof).

**Needs the phone:** 1. Home: rows open on different songs; Not played in a while starts at 0:00; a Library row with heart, Versions and plays shows the phone icon, second line whole. 2. Laptop off (`server_off`), then search and Library: each says "Laptop not reachable…"; `server_on`: it clears on the next list. 3. Sort › Cards: throw 10 cards right, left, up, fast: amber Mine / grey Not mine / Not sure stamp as you drag, one buzz per verdict, nothing double-counts, the count drops by one each, no stamp or tilt left on the next card; Undo the last from the toast under the buttons. 4. Tag songs: a short session (count line + amber bar, Not mine pill, Next song lit); open Lines, hold a line: the half sheet; Change words and Delete, then Undo. Then listen locked 10 min, and 7 min open, for B's numbers (`timings` after).

**Changed:** `app/` Cards.tsx, Tagging.tsx, Player.tsx, cardsCore.ts (new), cards.test.mjs (new), taggingLook.test.mjs (new); `tools/shots/` entry.tsx, fixtures.mjs, shoot.mjs, side.mjs; docs: DECISIONS, LESSONS (two `plan` rows now kept true by tests and shots), STATUS, overhaul/LABELS, board/wave3-review.md (new). From the first session: Home, Library, SearchScreen, SongRow, energy.ts, libraryCore, outbox, phoneBackup, playLog, playOrder, playerStore, playlistCore, tagStore, their tests, openScreen.test.mjs, board/wave3.md.

**Done when:** A: no-repeat and day-change tests pass (`library`); Not played from 0 test passes (`playData`); phone-icon row shot drawn, second line whole (a row with all four marks at once isn't in the fixture: check 1 covers it); `StartVault` absent **fail** (owner deletes it); off then on run for real **pass**; laptop-off shots now fail every fetch like a real phone and show the app's own line **pass**. B: model test holds the ceilings **pass**; `timings` quoted above (open FAIL on wave 2's code: the fix ships now; locked PASS). C: swipe and tap tests **pass** (15); shots start, mid-swipe ×3, after a throw, last song, Not sure pile, hard title, side-by-side **pass**. D: session and tag-edit shots **pass** (sheet from two openers). `/verify` 27/27 under 1 min, `check_repo` clean, published: **pass**. I prove 1-4: not run (for chat).

**Plan I chose:** all 6 STATUS lines ticked. Guessed: the Undo for tag edits stays on the reserved line (the board said a toast); the up drag lifts the card half the finger, 32 pt at most; the card behind is bare; the Undo toast takes the "+ Version" row's spot; Next song lit amber.

**Fresh-eyes review** (`board/wave3-review.md`, 20 catches): fixed 1 (A's shots redrawn, fixtures fail the fetch), 2 (double verdict guard), 3 (one ghost per throw), 11 (sheet shot from the Sort-card player), 13 (card fills the screen: the Sort layer was padded twice), 14 (behind card air); proved 7 (menu closes on song change). Left for chat: 4 (list refetch if the probe passes while the fetch times out), 5 (backup errors read as laptop off), 16 (search's laptop line shifts the list 25 pt), 17, 18, 20. The rest as built with reasons in the file.

**Not done:** `StartVault` delete (needs an admin window: Task Scheduler › StartVault › Delete). Stretch (waveform spike): not started.

**Decisions needed:** (1) Catch 16: a reserved line in search so nothing shifts (costs 25 pt always) or keep the line that appears. Default keep. (2) Catch 4 and 5 (`Library.tsx`, `phoneBackup.ts`): fold a test for "probe passes, list fetch fails" and "backup timeout" into wave 4's whole-app pass. Default yes.

**Proposed next step:** wave 4 (Queue, versions, settings, whole-app pass, Live Activity spike last), after the phone checks and B's open-screen numbers on this publish.
**Pitch:** let the shots' fake player judge a card (drop it from the fake list), so "nothing left on the next card" is a drawn frame of the *next* song, not the same one back.
**Odd in how we work:** the fresh-eyes agent ran 4.4 min and 127k Sonnet tokens on a 2,600-line diff; its best catches (stale A shots, the doubled padding's cause) were things the Sonnet shot checks had flagged as "unused space" without a cause. Shot checks say what; the reviewer says why. Keep both.
