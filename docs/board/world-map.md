# Board: world map (ROADMAP O.6), 2026-11-12

Seats: flow, screen, logic, tester (Sonnet, advisory). Input: `overhaul/INVENTORY.md`, `DESIGN-SYSTEM.md`, VISION, LESSONS.
Result: `overhaul/WORLD-MAP.md`. Code's calls where seats differed are marked **Pick**; the owner can flip any at Review.

## Where the seats agreed
- **One song sheet.** Every song has one sheet of rare actions: `...` on the player, hold a song anywhere (Library row,
  Home card, Search result, Sort card). Same gesture, same sheet, everywhere. The Versions list and the "+ Version"
  picker become pages inside it (removes their separate Done / Cancel / swipe-down twins).
- **Hold = the menu for this thing.** Hold a song = song sheet; hold a line = line menu (as today); hold a Queue row = lift it.
- **Rows decided by one pure function** (logic): `songActions(ctx)` in a new `app/songActions.ts`, built on `versionMenu`
  (`family.ts`), so old tests stay green. Inputs: rating, favorite, archived, family size / Main, playing, session,
  Compare, on phone, where it opened.
- **Eye goes.** Mine / Not mine show on the player only while the song is unsorted (the catalogue is sorted, so most days
  they're gone). A sorted song's Not mine is in the sheet.
- **Tag songs gets one home** (it is in 3 places today). Grip icon, time-left tap, the second Queue swipe are cut.
- **Stays on screen** (tester): Play / Pause / Next / Previous, seek bar with tag dots, Tag, Favorite, Home Shuffle,
  Library chips, the round Search button, Undo on Cards and Sort, the laptop-off line.

## Where they differed, and the pick
| Question | Seats | Pick |
|---|---|---|
| Library row hold | screen, logic: opens the song sheet, Select is a row in it. Flow: same. Tester: risk of firing while scrolling | **Song sheet**, with "Select" as its last row and in Library `...`. Hold keeps today's 0.4 s and cancels on movement (test) |
| Compare on the player | screen: swipe the art sideways (no mode). Flow, tester: keep the word, one tap | **Keep the Compare word** (only with 2+ versions). Art swipe sideways is new gesture work and fights swipe-up; parked |
| Swipe a Library row right / left = Mine / Not mine | flow: yes. Tester: top risk while scrolling 1,395 rows | **Not now.** Sorting is done; the sheet holds Not mine. Parked as an owner question |
| Queue button on the player | flow: keep. Screen: art swipe-up + sheet | **Art swipe-up + a sheet row.** The action row drops to 4 slots: Favorite, Tag, Lines, `...` |
| Sort | flow: Home opens the cards straight away; sets list a pill on the cards. Screen: keep Sort, hero Cards button, set swipes | **Keep Sort as a screen** (smaller build); Home's `...` has Sort with its count. A set: tap = its cards (one by one), hold = set sheet (All mine, All not mine). Set swipes parked (same scroll risk) |
| Home rows | flow, screen: 7 -> 5, drop Most played and Versions | **5 rows** (Most played = Library order, Versions = Library chip). Owner question |
| Tag songs home | Library `...` / Home `...` / Home button | **Home `...`** only (with Sort and Settings). In a song sheet: "Tag this song" is the Tag button, not a session |
| Favorites shuffle | screen: hold Shuffle | **Hold Shuffle** = pool sheet (Mine, Favorites, Unsorted). Tap Shuffle = Mine, as today |

## The one idea: your lines are the song's face
Flow, screen and logic each landed on the same data: the lines he tagged. A streaming app has titles and cover art; The
Vault has the bars he wrote at the second he said them. So:
1. **Home opens on one of his lines**, big type, the song small under it; tap = that song plays from that second. A new
   line each time the app opens. No lines yet: "Tag your first line".
2. **A song's second line is one of his lines** (the first tagged, or the one a search matched) on Library rows, the
   mini player and the song sheet header; no lines: the quiet meta as today.
Cheap: the phone already holds every tag (search uses them); no native work. Pure functions: `lineFor(songId, tags)`
and `homeLine(tags, seed)`.

## Risks the build must test (tester, logic)
1. A hold firing while flick-scrolling 1,395 rows (test: drag 2 s, zero holds; shot: select still reachable).
2. The sheet over the player hiding the Undo toast or the seek bar (shot: sheet open over the player; Undo after close).
3. Two notices at once (LESSONS 2026-11-08), now with the sheet's actions (shot `player-two-notices` still passes).
4. Double tap on a sheet row (Archive toggles back): the sheet closes on the first tap (rapid-tap test).
5. Stale sheet: rows read the same pending-adjusted state as the screens (`withPending`), test after a verdict.
6. Nested sheets: pull-down on a sheet page closes to where Back goes (LESSONS 2026-11-09, `sheetCore` tests).
7. Laptop off: sheet actions queue in the outbox, survive a kill (shot `library-laptop-off` with the sheet).
8. Not mine from the sheet on the playing song keeps today's behaviour (Undo toast; what plays next unchanged).
9. Old flag file of the eye: ignored, never deleted; restore after reinstall unaffected.
10. `labels.test.mjs`, `quickAndCool.test.mjs` (eye, 18 taps in Player.tsx) pin what moves: listed in FABLE-KIT.

## Owner questions (Review)
1. Library row hold opens the song sheet (Select is inside it), as built in the mockup?
2. Home rows 7 -> 5 (drop Most played, Versions to compare)?
3. Mine / Not mine buttons only on unsorted songs (the eye goes)?
4. Later, not in this build: swipe a Library row for Mine / Not mine; Compare by swiping the art.
