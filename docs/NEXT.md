# NEXT: Overhaul wave 4: Queue, versions, settings, whole-app pass, groundwork
Format: goal
Written by chat, 2026-11-11.
Effort: high
Log: Wave 3 review 3 of 3 run pass; Sort cards check waits for new songs (owner has none). Shots' fake player judges a card, so the next card is proved by a shot (Code's pitch, chat). Catch 16 kept as built; 4, 5 get tests; 17, 18, 20 fixed here (chat). New-songs-by-themselves memo (frame check, chat). Fable promo ends 11-16: this is the last overhaul wave on it (owner) (logged by chat)
Size: the rest of O.4 plus wave 3's leftovers plus two memos. No rebuild: ships by publish. Goals A-C are what I'll touch next; D-E are laptop-only groundwork. 5 goals.
Queue after this: my 3.7 searches at ~50 tags and revisit E (3.4, 3.5); then whatever I pick from D's memos. O.5 Live Activity only after the D spike says it can work sideloaded.
Read: `docs/LESSONS.md`; `docs/overhaul/DESIGN-SYSTEM.md`; `docs/overhaul/LABELS.md`; `docs/overhaul/TEARDOWN.md` Queue, Versions, Compare, Mini player rows; `docs/overhaul/REBUILD.md` Live Activity row; `docs/board/wave3-review.md` catches 4, 5, 9, 17, 18, 20; last 6 DECISIONS rows; files you touch.

## Goal
A. **Queue, Versions and Compare in the new style** (O.4 wave 4). Same look and words as waves 1-3. What each does (reorder, set Main, compare two) stays as built.
B. **Settings in one quiet place.** Whatever setup bits are still scattered (laptop address, update line, anything else of that kind) live on one Settings screen in the same style, reached without crowding Home.
C. **Whole-app pass.** Walk every screen against the design system: anything that still looks like the old app gets brought in line. Fold in: tests for catch 4 (probe passes, list fetch times out: no loop) and 5 (backup timeout isn't "laptop off"); 17 (session pill and "+ Version" line up); 18 (Delete set apart from Cancel in the hold menu); 20 (Not played in a while changes songs by day, not only order); the shots' fake player saves a verdict so `cards-after-throw` shows the *next* song. Read `timings` at the start and at `/wrap`: the open-screen line on wave 3's code must PASS (130 / 135 / 6); if not, fix it first.
D. **Groundwork memos, no app code.** (1) New songs by themselves: 2-3 options for the always-on server noticing new songs in the music folders and getting them into Sort, with what each costs and what a senior engineer would pick. Read-only on my music. (2) Live Activity spike (REBUILD.md row): in `spike/` only, can it work on a SideStore free-account install, and if yes, my steps for one throwaway build. Nothing installed.
E. **`doctor` says whether the old `StartVault` job is gone**, so I never open Task Scheduler to check.

## The bar
- Board meets first for A-B (new screens). One short meeting, notes to `docs/board/wave4.md`, defaults for any owner question.
- List how A-C could break before building (LESSONS included). Each one a test or a changed-screen shot.
- Controls: instant pressed look, 44 pt, no swallowed tap, nothing shifts. Plain labels. A sheet closes by swipe to where its Back goes (every opener).
- Screenshots only of changed screens, checked by a subagent.
- One fresh-eyes review (the `fresh-eyes` agent): catches to `docs/board/wave4-review.md` before any fix; may run in the background.
- Two failed fixes on a goal: write it up, move on. REPORT under 40 lines with "Odd in how we work:".

## Done when
Code proves:
- A: tests that reorder, set Main and compare do what they do today; shots of Queue (from player and mini player, mid-close), Versions sheet, Compare.
- B: shot of Settings; test the laptop address still saves and survives a restart of the app.
- C: catch 4 and 5 tests pass; shots of the session row and hold menu; Not played in a while day-change test shows different songs; `cards-after-throw` shot shows a different title than `cards-start`; `timings` open line quoted, PASS.
- D: two memos in `docs/` (new songs, Live Activity), each under 40 lines, with a pick and why. No app or server code from them.
- E: `doctor` shows a StartVault line (gone / still there), with a test.
- `/verify` all PASS under 1 min; `check_repo.py` clean; publish goes out.
I prove:
1. Queue: open it from the player and from the mini player; it looks like the rest of the app, drag a song to reorder (one tick), swipe down lands where you came from.
2. Versions: open a song with versions, play two, compare, set a Main; looks like the rest.
3. Settings: find it, the laptop address is right; close and reopen the app, still connected.
4. Whole app: Home, Library, search, player, tagging, hold a line: nothing looks older than the rest; Delete sits apart from Cancel. `doctor` says StartVault gone.

## Stretch (only if every goal is met and budget is left)
1. Waveform spike (DESIGN-NOTES Tech 1): `spike/` only, shapes for 20 songs, time and size for all, a 10-line memo. No app code.

## Limits
- No rebuild: if a piece needs one, write it in `overhaul/REBUILD.md` and leave it. D's Live Activity is a spike and memo only.
- Search engine, rating, tagging rules, play counting, Sort rules and steady-screen rules stay as built; this changes look, movement and the noted fixes only.
- D(1) is a memo: no scanning job, no change to import or scan. Never write inside iCloud Drive or FL Studio Projects.
- No offload work (parked). No "My projects" row (6.1).
- If it runs long: D, then E wait. A-C ship first.
- The repo is public: fake names in shots and tests, no laptop address or Tailscale names.
