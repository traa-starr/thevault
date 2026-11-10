# NEXT: Steady screen, straight-back Queue, and the overhaul teardown + mockups
Format: goal
Written by chat, 2026-11-09. Roadmap: A, B, C fixes on Phase 2 items; D = O.1, E = O.2, F = O.3.
Log: Cool, quick and rated review: checks 6 of 6 pass, 2 owner notes (screen freeze from the mini player; Queue swipe-down goes via Library) (owner + chat); rating kept as built (owner); goal format kept after its 3-task trial (chat-default, owner didn't answer); rebuilds are fine when they buy quality; only routine updates go by publish (owner) (logged by chat)
Size: My 2.7 sessions + wipe check run alongside (ship line 2026-11-15). Two phone fixes, the battery read-back, the native pieces that don't touch overhaul screens (built, one full rebuild), and all the overhaul design work before 2.7 lets app code start: everything code can do without me, one big session while Fable is on.
Queue after this: my 20 acceptance searches (3.7) at ~50 tags; revisit E (3.4, 3.5) then; Phase 2 closes when I pass 2.7; then the overhaul build from the mockups I pick (full rebuilds as needed).
Read: `docs/LESSONS.md` (every line a check in your plan; two new ones from this review), the last 6 DECISIONS rows, `docs/PHASE-2-RESULTS.md` last section, `docs/DESIGN-NOTES.md` (whole file: the owner's bar and the ideas), `docs/BOARD.md`, `docs/BLUEPRINT.md` player + navigation sections, the files you touch.

## Goal
The app never freezes on me, closing the Queue feels right, and I get to see what the redesigned Vault could look like before any of it is built.
A. **No more frozen screen.** Twice in Library, with a song playing, the screen froze for good (sound kept going) after opening the mini player or tapping pause on it. Not every time. Find the cause and fix it. Add a hang watch: the phone reports any screen stall over 2 s in `timings` (which screen, what was tapped).
B. **Queue swipe-down goes straight back.** Opened from the full player, a swipe down returns to the player, like Back does (today it drops to Library, then the player slides up again). Opened from the mini player, a swipe down returns to whatever was under it (already right: keep it).
C. **Read the battery.** My locked listen: 1% in 30 min, no heat (was hot within 15-20 min before). Read the phone's energy lines in `timings` and judge them against the ceilings. If anything still FAILs, say what the next lever is, rebuild or not.
D. **Teardown.** Every screen (Home, Library, player, mini player, Queue, Sort card, session, Tagging, Versions, Compare, search) screenshotted and scored against the owner's bar in DESIGN-NOTES: what feels a step down from Spotify / Apple Music / Instagram, and why, in plain words. Written to `docs/overhaul/TEARDOWN.md`.
E. **Clickable mockups of the whole app.** Board meeting (test lines 1, 2: new screens and motion). Two or three directions, each a clickable prototype covering every screen in D plus the moves between them (open player, Queue, mini player, tabs), in `spike/mockups/` with fake song names only, that I can open on my phone and tap through. Each direction names which native iPhone pieces it needs (glass, native tabs, SF Symbols, Live Activity, haptics) and ends in a design system sketch (colours, type, sizes, spacing) the build would use.
F. **Native pieces now, one full rebuild.** Build the native pieces that don't touch overhaul screens: fewer iOS player reports while locked (battery), a URL scheme so a lock-screen Shortcut can open search, the laptop address kept in the Keychain so a reinstall finds it, haptics on the controls that exist today. Then `docs/overhaul/REBUILD.md`: what's left for the overhaul's own rebuild (glass, native tabs, SF Symbols, Live Activity), gain and risk each. The rebuild itself: Code gets everything ready, I run the GitHub build and SideStore.

## The bar (how to work)
- Plan in STATUS "In progress", one line per goal. A and B first: they ship to my phone by publish.
- Before A and B, list how they could break and make each a test or screenshot: pause spam with the mini player half open, mini player opened while Library redraws, swipe-down mid-animation, Queue from the player after a session, Queue from the mini player on Sort and Home. LESSONS lines are part of the list.
- Tests first. A hang that only shows on the phone is proven by the phone's hang watch staying quiet in my next real use, not by the model.
- Controls: instant pressed look, 44 pt, no swallowed tap, nothing shifts. Screenshot every changed screen from every place it opens.
- Hostile self-review of the whole diff, then one fresh-eyes review (A and B touch timing and navigation). List its catches in REPORT.
- Two failed fixes on a goal: write it up, move on. Don't stop the session.
- REPORT under 40 lines (it was 42). One line "Odd in how we work:".

## Done when
Code proves:
- A test that spams mini-player open / pause / Next while Library redraws passes 200 rounds with no stall; the cause is named in REPORT. Hang watch lines show in `timings` (a fake stall in a test is reported).
- A test per opener (player, mini player on Library, Sort, Home) checks where swipe-down lands; screenshots mid-close.
- `timings` energy lines from my locked listen judged, PASS/FAIL per ceiling, in REPORT.
- `docs/overhaul/TEARDOWN.md` covers every screen listed in D, each with a screenshot name.
- 2-3 mockup directions open from the laptop on the phone; no real song names, no app code changed for them; `check_repo.py` clean.
- F's pieces built with tests; the GitHub build config ready (standard runners); `docs/overhaul/REBUILD.md` lists what's left. After my install: locked wake-ups per minute below today's 120 in `timings`.
- Exact steps for me in REPORT for the rebuild (GitHub build, SideStore), lines from COMMANDS.md.
- `/verify` all PASS under 1 min.
I prove:
1. Library with a song playing: open the mini player, pause/play 10 times fast, close, reopen, Next 5 times; repeat 3 times. Pass: the screen never freezes.
2. Full player, swipe up to the Queue, swipe down. Pass: straight back to the player, no Library flash. Then from the mini player on Library and on Sort: swipe up, swipe down. Pass: back on the same screen.
3. After the rebuild install: the app finds the laptop without typing; a Shortcut opens straight to search; controls tap with a light haptic. Pass: all three.
4. Tap through each mockup direction on the phone. Pass: every screen opens and moves; I say which I like and why (that's my pick for the overhaul build).

## Stretch (only if every goal is met and budget is left)
1. Last `timings` PASS/FAIL on the phone (long-press the bottom line), so a session ends with a verdict and no laptop.
2. Play count and "last heard" per song, stored and synced (data only, no new screen), so the overhaul can surface forgotten songs.

## Limits
- No app code for the overhaul until 2.7 passes (DECISIONS 2026-11-09). Mockups live in `spike/` only; the design system file waits for the build.
- A and B ship by publish first, so my phone gets them even before the rebuild. F is the one full rebuild this step (DECISIONS 2026-11-09: rebuilds fine when they buy quality).
- Rating stays as built (owner kept it).
- My music is read-only; mockups use fake names (the repo is public).
- If it runs long: E's third direction waits, then the haptics.
