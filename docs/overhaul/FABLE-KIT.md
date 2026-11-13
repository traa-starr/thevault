# Fable kit: build the world map (ROADMAP O.6)

Written by Code (Opus) 2026-11-12. Everything Fable needs for ONE build session, so it reads this file and the files it
edits, nothing else. Spec: `overhaul/WORLD-MAP.md` (homes), the mockup `spike/mockups/world/` (the owner's pick, with
Review's corrections). Rules quoted where needed; don't open the board notes.

## 1. Code map (what holds each thing the map changes)
| File (lines) | What changes |
|---|---|
| `app/songActions.ts` NEW | `songActions`, `actionLabel`, `playerFace`, `holdFires`, `HOLD_MS`, `HOLD_SLOP`, `HOME_MENU`, `LIBRARY_MENU`, `SHUFFLE_POOLS`, `SET_ACTIONS` (shape fixed by `app/songActions.test.mjs`) |
| `app/yourLines.ts` NEW | `lineFor`, `homeLine`, `secondLine` (fixed by `app/yourLines.test.mjs`); tags come from the phone's tag copy (`TagLine` / `Tag`, `playOrder.ts:150`) |
| `app/SongSheet.tsx` NEW | the half sheet: header (tile, title, `lineFor`), rows from `songActions`, words from `actionLabel`. Draw it like the tagging hold menu (a half sheet the app draws; `Tagging.tsx`), never `Alert` |
| `app/Player.tsx` (795) | face from `playerFace`: drop the eye (`buttonsHidden`), Archive, the Shuffle icon, + Version, Versions chip, Queue slot, the time-left tap; action row 4 slots (Favorite, Tag, Lines, `...`; session: Next song); Compare word stays when `compare`; `MiniPlayer` (line 193) second line = `lineFor` |
| `app/playerStore.ts` | the eye's state (`buttonsHidden`, `eyeSetting` file at line ~139): stop reading it; leave the old flag file on disk (never delete it) |
| `app/playOrder.ts` | `eyeSetting` (line 272) goes with its tests, or stays unused; your call, say which in REPORT |
| `app/Versions.tsx` (385), `app/Compare.tsx` | goal 1: opened from the sheet row **over** the player (today the chip closes the player first). Pages inside the sheet are goal 4 |
| `app/family.ts` | `versionMenu` (line 170) unchanged: the Versions rows still use it |
| `app/Library.tsx` (506), `app/SongRow.tsx` (118) | header `...` (Shuffle, Order, Select songs) replaces the Shuffle pill, Tag songs and the Order button; row hold (`holdRow`) opens the song sheet with `delayLongPress={HOLD_MS}`; Select = sheet row; row second line = `secondLine`; the Versions chip on a row goes |
| `app/Home.tsx` (278) | `...` top right (Sort · N left, Tag songs, Settings) replaces the gear and More; search bar goes; Favorites button goes (hold Shuffle = pool sheet); line card on top (`homeLine`, "Tag your first line"); "See all" = the row heading |
| `app/libraryCore.ts` | `HOME_ROWS` (line 97): drop `most` and `versions` |
| `app/SearchScreen.tsx`, `app/Cards.tsx` (331) | hold a result / the card = song sheet; Cards' "+ Version" button and the end screen's second Back go |
| `app/Sort.tsx` (220) | Tag songs goes; set row tap = that set's cards; hold a set = set sheet (All mine, All not mine, its songs) |
| `app/Settings.tsx` (181), `app/Notices.tsx` (96) | goal 4: Laptop status row takes the out-of-date / backup lines |
| Queue (in `Player.tsx`) | Shuffle (Off / Mine / Unsorted) in its header; grip icon goes |
| `docs/overhaul/LABELS.md` | regenerate: `node --experimental-strip-types app/labels.test.mjs --write` after label changes |
Rules to keep (quoted): every change goes through the journal and outbox; the owner's choice beats automatic; no dialogs
inside the player; a sheet closes by pull-down to the same place its Back goes (`sheetCore.ts`); a control's pressed look
is its own (`Tap.tsx`), never tied to a load; sheets close before their Undo toast shows.

## 2. Shot list (changed screens only; `npm --prefix tools/shots run shots -- <name>`)
Add fixtures for the new states; re-shoot only these:
- `player`, `player-0-tags`, `player-two-notices`, `player-undo-and-shuffle`, `compare-in-player`, `centre-library`, `centre-sort-card`, `centre-session` (face changed)
- NEW `sheet-from-player`, `sheet-from-player-unsorted`, `sheet-family`, `sheet-from-library-hold`, `sheet-in-session`, `sheet-closed-undo` (the toast after the sheet closes)
- `home`, `home-full`, `home-no-address`, NEW `home-menu`, `home-line-card`, `home-no-lines`, `home-shuffle-pool`
- `library`, `library-select-mode`, `library-laptop-off`, NEW `library-menu`, `library-row-lines`
- `queue`, `queue-from-player` (Shuffle in the header, no grip)
- `sort`, NEW `sort-set-sheet`; `cards-start` (no + Version)
- goal 4 only: `versions-sheet`, `versions-picker`, `settings`, `settings-laptop-status`
`library-1395-flick` stays as is: it must still pass (a hold never fires while scrolling).

## 3. How it could break, and what catches it
| Break | Caught by |
|---|---|
| A hold fires while flick-scrolling 1,395 rows | `holdFires` in `songActions.test.mjs`; `delayLongPress={HOLD_MS}`; shot `library-1395-flick` |
| Sheet covers the seek bar or hides the Undo toast | shots `sheet-from-player`, `sheet-closed-undo` |
| Two notices at once (LESSONS 2026-11-08) | shot `player-two-notices` |
| Double tap on a sheet row toggles back (Archive, Favorite) | the sheet closes on the first tap; rapid-tap rule in `app/quickAndCool.test.mjs` (add the sheet's rows) |
| Pull-down on a sheet over the player lands elsewhere (LESSONS 2026-11-09) | `app/steadyScreen.test.mjs` / `sheetCore` tests; add the sheet as a layer without changing existing returns |
| Stale rows after a verdict | the sheet reads `withPending` / `ratingsWithPending` like the screens (`app/hidden.test.mjs` pattern) |
| Laptop off: sheet actions lost | they go through the outbox like today's buttons; shot `library-laptop-off` |
| Not mine from the sheet on the playing song changes what plays next | same call as today's player Not mine; `app/playOrder.test.mjs` |
| Eye removed, old flag file read by restore | leave `buttonsHidden` file alone; `app/laptop.test.mjs` restore tests stay green |
| A label moved breaks the label list | `app/labels.test.mjs --write` |
| Tap-to-sound slows (anything new before first sound) | nothing new on the play path; `app/nextTiming.test.mjs`; phone `timings` |
| Player redraws more often (heat) | `lineFor` and `playerFace` computed from song id and family, not time; `usePlayerPick` for new parts; `app/quickAndCool.test.mjs` energy model |

## 4. The build, in goals (each ships on its own; most important first)
**Goal 1: song sheet + calm player.** `songActions.ts`, `SongSheet.tsx`, Player face from `playerFace`, Queue gets
Shuffle. Versions / Compare / + Version open from the sheet over the player. Done: `songActions.test.mjs` passes up to
"goal 2"; old tests updated (list below); shots: player, sheet-*, queue.
**Goal 2: holds and menus everywhere.** Library, Home, Search, Cards holds; Library and Home `...`; Home rows 3; Sort
set tap / hold; Shuffle hold pool. Done: `songActions.test.mjs` all pass; `library.test.mjs` updated; shots: home-*,
library-*, sort-*, cards-start.
**Goal 3: your lines.** `yourLines.ts`, Home line card, row second lines, mini player line. Done: `yourLines.test.mjs`
passes; shots: home-line-card, home-no-lines, library-row-lines.
**Goal 4 (only if the session has room):** Versions list and picker as pages inside the sheet; Settings Laptop status
row. Otherwise it is the next Opus step.
Then `/verify` once, `/wrap`, publish (no rebuild: no native module is added).

## 5. Tests
**New, failing on purpose now** (module not built): `app/songActions.test.mjs` (16 checks), `app/yourLines.test.mjs` (9).
Checked passable 2026-11-12 against a throwaway reference: every rule check passed; only the "screens use it" checks
failed, as they should until the screens are built. `/verify` shows these two as FAIL until Fable's session.
**Old tests that pin what moves** (update to the map, don't fight them):
- `app/quickAndCool.test.mjs:59`: the player's words include Archive and Queue (they move to the sheet's file).
- `app/quickAndCool.test.mjs:62`: at least 18 `<Tap>`/`<Action>` in Player.tsx, naming eye, Archive, Shuffle, Queue. Recount after.
- `app/quickAndCool.test.mjs` ~90-115 and `app/playOrder.test.mjs:149`: the eye keeps its choice (`eyeSetting`). Goes with the eye; the LESSONS row (2026-11-09 eye) keeps its file.
- `app/library.test.mjs:216, 224, 227, 256-261, 272, 328`: Home rows with Most played and Versions to compare. Drop those rows' checks.
- `app/library.test.mjs:187`: Library row `onLongPress={holdRow}` (stays if `holdRow` now opens the sheet).
- `app/laptop.test.mjs:113-117`: the gear on Home. Becomes the `...` (Settings is in it once a laptop is set).
- `app/labels.test.mjs:99-109`: the named words still on screen (Archive stays, in the sheet). Run `--write`.
- `app/wave4.test.mjs`: `versionMenu`, queue moves: stay green (unchanged rules).

## 6. Heat (found 2026-11-12, NEXT goal D)
**Evidence** (`python server/vault_cli.py timings E:/VaultLibrary`, raw `timings.jsonl`): the failing "open" sample
(177 wake-ups, 162 redraws, 8.4 writes a minute) was 39 song starts in 5 minutes, 36 of them streamed from the laptop:
skimming (calm part 1's Hidden songs, which never have a phone copy), not listening. A steady open listen on
2026-11-11 measured 67 wake-ups and 67 redraws a minute, 4.2 writes, under 1 network call: under every ceiling.
**What runs while open and playing:** the player's report once a second (`REPORT_MS.open`, `playlistCore.ts`), the
redraw it causes on the player only (other screens use `usePlayerPick`), the hang watch's beat once a second
(`hangWatch.ts`, on screen only), the playing spot saved every 15 s (`SPOT_EVERY_MS`), the stuck-song watch every few
10 s while playing (`playerStore.ts` `startStallWatch`). No keep-awake, no looping animation except Compare's pulse
while it prepares, no polling.
**Changed now:** the timings report shows skims apart ("open, skimming ... Not judged"), so the owner's 15-minute
steady listen gives a clean verdict (`server/vault_server/timings.py` `SKIM_STARTS`, test in `server/test_server.py`).
**If the steady listen is still warm** (JS work is already low, so the rest is screen and GPU, which the app can't
count): suspects in order, each a small change for an Opus step, not Fable: (1) the mini player's moving amber line and
the player's seek bar redraw inside glass (`Frame.tsx` GlassView) every second: test with the line drawn outside the
glass; (2) the hang watch beat: 2 s instead of 1 s still catches a 2 s stall late by at most 2 s; (3) skimming hidden
songs streams over the VPN: nothing to fix, it's the job.
