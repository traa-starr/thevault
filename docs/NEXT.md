# NEXT: Fable kit: world map, one mockup, build kit; find the heat
Format: goal
Written by chat, 2026-11-12.
Effort: high (Opus). Fable is not used here: this step is everything Fable needs before its one build session.
Log: Review deferred again; the 8 phone checks (render 4 + calm 4) are walked at the next review with this step's (owner). Phone warm behind the camera with the app open, battery drain, mild (owner note). Opus drafts the world map into the mockup instead of a separate chat placement session; the owner judges the mockup on the phone (chat-default, promo ends 2026-11-16). Heat cause found on Opus before Fable (chat-default) (logged by chat)
Size: the whole Fable kit plus the heat hunt, so the next review can approve the mockup and the step after is the one Fable session. 4 goals; publish only if D changes app code.
Queue after this: Review (mockup + heat + the 8 deferred checks); chat writes the Fable NEXT from the kit. Then ONE Fable session (Model: fable, clear between goals). Then Opus fresh-eyes and fix-ups. Promo ends 2026-11-16.
Read: `docs/LESSONS.md`; last 6 DECISIONS rows; ROADMAP O.6; `docs/overhaul/INVENTORY.md`; `docs/overhaul/DESIGN-SYSTEM.md`; CHAT-INSTRUCTIONS "Fable session" (the kit list only); files you touch.

## Goal
A. **World map (O.6), `docs/overhaul/WORLD-MAP.md`.** Every one of the 158 controls in INVENTORY gets one home: on screen / one gesture away / a sheet / Settings / desk / gone. The song is the centre; rare options sit one gesture away like Compare (hidden, easy, never leaves the screen). Counts per screen before and after; each daily screen (Home, Library, Player, Sort) at about half its controls or fewer. Mark every move that changes something I likely use daily. Board meeting first; the board also names ONE idea that makes the app feel like The Vault, not a Spotify / YouTube Music clone, and the map uses it.
B. **One clickable mockup from the map, opened on my phone.** Home, Library, Player, Sort, Settings, plus the sheets and gestures the map creates, tappable. A short "what moved where" list on the page. Mockup only, no app code. My taste: haptics, big controls (44 pt), minimal and out of the way, plain labels.
C. **Fable build kit, `docs/overhaul/FABLE-KIT.md`.** Code map (which file holds each screen and control the map changes, under 60 lines); the shot list (changed screens only); how it could break (LESSONS included), each tied to a test or a shot; the build split into 2-4 goals, each shipping on its own, most important first. New tests for the map's logic written now and failing on purpose; old tests that pin behaviour the map changes are listed (or updated to the map). Fable only makes them pass.
D. **Heat with the app open.** Find the cause, don't guess: read the open-screen energy lines in `timings`, list everything that runs while the app is open and playing (timers, polling, animations, keep-awake, list redraws, pull to refresh, the Hidden count), and measure what you can. Small and safe fix: build it, test it, publish. Anything bigger: write the cause and the fix plan into FABLE-KIT for Fable or the next Opus step.

## The bar
- Board first for A (notes `docs/board/world-map.md`).
- D: cause before fix; a fix gets a test or a measured number. Two failed fixes: write it up and move on.
- Screenshots only of the mockup and changed screens, checked by a subagent.
- One `fresh-eyes` review (Sonnet) only if D changes app code. REPORT under 40 lines with "Odd in how we work:".

## Done when
Code proves:
- A: WORLD-MAP lists all 158 controls with a home each (count matches INVENTORY), before/after counts per screen, daily screens at about half or fewer.
- B: mockup opens on the phone (the link or exact steps in REPORT); every screen in A's list is in it; shots checked.
- C: FABLE-KIT exists with all five parts; the new tests run and fail for the right reason; `/verify` otherwise PASS.
- D: the cause named with the evidence (a line from timings or a measurement); if fixed: test pass, publish goes out. `check_repo.py` clean.
I prove:
1. Mockup on the phone: tap through Home, Library, Player, Sort, Settings. Each daily screen feels calmer; I find Compare, Hidden songs and tag editing each within one gesture. Pass / notes.
2. Heat: play a song with the app open, screen on, 15 min, starting from a cool phone. Not warm behind the camera; battery % before and after.

## Limits
- No app redesign code: the mockup is a page, not the app. Only D may touch app code, and only for the heat.
- Never write inside iCloud Drive, FL Studio Projects or `Vault Renders`.
- No rebuild; if D needs one, write it in `overhaul/REBUILD.md` and stop D.
- The repo is public: fake song names in the mockup, tests and shots; no laptop address.
- If the session runs long: A and B first (they block my phone check), then D, then C.
