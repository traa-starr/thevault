# NEXT: Fable builds the world map (O.6), goals 1-3
Format: goal
Written by chat, 2026-11-13.
Model: fable
Clear between goals: yes. After each goal: checkpoint (tick STATUS plan, 2 lines), stop; I type `/clear` then `/next`.
Effort: high
Log: Library row hold = song sheet (owner). Home keeps Most played, drops only Versions to compare (owner). The eye stays on the player as today (owner). Shuffle stays on the player as today, and a new Repeat (Off / all / one) balances the row; both smaller than the main buttons (owner). Repeat cycles Off, all, one and is remembered after closing the app (chat-default). Library gets a Has tags chip; Needs tags moves after Versions (owner). Has tags is a chip only, no Home row: Home's line card already opens on tagged songs (chat-default). Mockup gap: the line hold menu stays as today (chat) (logged by chat)
Size: FABLE-KIT goals 1-3, each ships on its own. Goal 4 (Versions pages, Settings Laptop status) and fresh-eyes are the next Opus NEXT. Promo ends 2026-11-16.
Queue after this: Opus: fresh-eyes on the diff, fix-ups, FABLE-KIT goal 4, serve mockups from the Vault server (no typed command). Then my phone walk of the new app + the 4 render checks + the heat listen.
Read: `docs/overhaul/FABLE-KIT.md` (§1, §3, §4, §5; skip §6); `docs/overhaul/WORLD-MAP.md` top block "Owner's corrections" only (it beats the kit); `docs/LESSONS.md`; files you edit. Nothing else.

## Goal
1. **Song sheet + calm player** (FABLE-KIT goal 1), but **the eye stays**: it shows or hides Mine / Not mine on the player for every song and keeps its choice, as today. **Shuffle stays** on the player and toggles as today (Queue's header gets no Shuffle). **New Repeat** button: tap cycles Off, Repeat all (the list starts over at its end), Repeat one (the song loops); remembered after closing the app. Shuffle and Repeat sit one each side of previous / play / next, smaller than those, like Apple Music. Everything else on the face moves as the kit says.
2. **Holds and menus everywhere** (kit goal 2), plus: Home rows are Recently added, Most played, Favorites, Needs tags. Library chips read All, Favorites, Versions, Has tags, Needs tags, Archived (+ Unsorted / Mine as today); Has tags = songs with at least one tag.
3. **Your lines** (kit goal 3).

## The bar
- First, before goal 1: change the kit tests to the owner's calls, nothing else in them: `app/songActions.test.mjs` "player face: Mine / Not mine only while unsorted (the eye is gone)" becomes "the eye decides: verdicts shown for any rating when the eye is open, hidden when shut; never while comparing"; its "goal 1 ... no eye" check drops the `buttonsHidden|eyeSetting` line. `app/yourLines.test.mjs` line 70 expects `['Recently added', 'Most played', 'Favorites', 'Needs tags']`. The eye tests in `quickAndCool.test.mjs` / `playOrder.test.mjs` stay as they are.
- Repeat changes what plays next: add its checks to `app/playOrder.test.mjs` first (all: after the last song comes the first; one: the same song again; off: as today; Next and Previous still move on with Repeat one), see them fail, then build. Recount the `<Tap>` check in `quickAndCool.test.mjs` for the new face.
- Change files with the Edit tool; any helper script goes in a file. Run only the tests for files you touched; `/verify` once at the end.
- Controls: instant press, 44 pt, no swallowed tap, nothing shifts. Shots: only FABLE-KIT §2's list, plus `library` for the chips; a hold never fires while scrolling (`library-1395-flick` passes).
- No board, research or fresh-eyes inside this session. Two failed fixes on a goal: write it up, move on.
- Short `/wrap`; REPORT under 40 lines with "Odd in how we work:".

## Done when
Code proves:
- `playOrder.test.mjs` Repeat checks pass; `node --experimental-strip-types app/songActions.test.mjs` and `app/yourLines.test.mjs` pass (after the edits above); `/verify` all PASS.
- `library.test.mjs` checks the new chip order and that Has tags keeps exactly the songs with a tag.
- Shots from the list taken and checked; publish goes out (no rebuild).
I prove:
1. Player: `...` opens the song sheet; Versions and Compare open over the player; eye hides and shows Mine / Not mine and remembers after closing the app; Shuffle toggles as before; Repeat cycles Off / all / one (a song on Repeat one plays again) and the button row looks balanced.
2. Library: hold a row = song sheet (never while flicking); `...` has Shuffle, Order, Select; chips in the new order; Has tags shows only tagged songs.
3. Home: `...` top right (Sort, Tag songs, Settings); rows Recently added, Most played, Favorites, Needs tags; line card on top.
4. Lines: rows and the mini player show my line; hold a line in the player's Lines still opens the edit menu.

## Limits
- Goals in order; if the window runs short, goal 1 alone must ship.
- No goal 4, no stretch, no memos, no new mockups.
- Never write inside iCloud Drive, FL Studio Projects or `Vault Renders`. Repo is public: fake names in tests and shots.
- Never delete the eye's flag file; the journal and outbox carry every change.
