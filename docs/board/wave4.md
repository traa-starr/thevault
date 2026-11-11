# Board: wave 4 (2026-11-11)

Seats: flow, screen, logic, tester. Brief: NEXT goals A (Queue, Versions, Compare in the new style) and B (Settings in
one quiet place). What each does stays as built; this is look and movement only. No code.

## Agreed
- **Queue (A).** The list row every other screen uses: 60 high, a 44 tile, title 17, a quiet second line. The playing
  song is one pinned row on top with its title in amber, no grip and no drag. "Up next" is a heading with the count.
  Back is a 44 target top-left; swipe down still lands where Back goes. A lifted row turns `raised`. Hold-to-drag, the
  tick and the frozen rows stay as built. Empty: "Nothing after this song", centred, grey.
- **Versions (A).** The paragraph goes: the Main's second line says it ("Main · newest" / "Main · your pick"). Rows
  are the same 60 row with a tile; the version playing has an amber title (the ♪ goes). Done left, Compare a quiet
  pill right. The row's menu is drawn by the app in the half-sheet style (as the tag hold menu), same choices and
  words, not an iOS alert box. The toast is the same toast as everywhere (Undo in amber). "+ Version" picker: the
  search field and rows in the same style.
- **Compare (A).** Theme colours instead of blue: `raised` pill with a faint edge, name white, "2/3" grey. Same width,
  same wheel.
- **Settings (B).** One screen opened over the tabs like Sort (a place in `nav.tsx`, not a fourth tab, not a pop-up),
  reached from one small grey gear in Home's header. Back returns to Home. Order: Laptop (address, "N songs on the
  laptop", Change laptop address), then Data since, then the build line. No amber on it. First run with no address:
  Home shows the box as today and there is no gear yet.
- **The address rules move to plain code** a test can run: save, then load as a restarted app would (file first, the
  Keychain if the file is gone).

## Disagreed
- **Versions as a half sheet with an action strip (screen) or the full sheet with a row menu (flow).** Built: the full
  iOS sheet stays (its own swipe-down already lands where Done goes, and one sheet at a time is a rule we paid for);
  the row menu becomes a half sheet inside it.
- **Wheel 36 high (screen) or 32 (flow).** Built: 32, because the wheel's height is also its snap distance, which is
  behaviour.
- **"Playing from Library" line in Queue (flow).** Not built: a new feature, not look (Pitch if wanted).
- **Gear turns warn-coloured when the laptop is off (screen).** Not built: Library and search already say so.

## Owner questions (defaults in use)
1. The gear on Home only, or on every tab? Default: Home only.
2. "Data since" and the build line: Settings only, or a footer on Home too? Default: Settings only.

## How A-C could break, and what catches each
| # | Break | Caught by |
|---|---|---|
| 1 | The address isn't kept after the move (saved to the screen only) | test: save, restart, load; file gone, Keychain gives it back (`laptop.test.mjs`) |
| 2 | First run: no box to type the address in, or a gear leading nowhere | shot `home-no-address`; test: no address means no Settings place |
| 3 | Address typed with spaces, `http://`, a port, a trailing `/` | test table for the address rules |
| 4 | Changing the address stops the song or drops unsent choices | as built (the same save path as Home's old box); shot `settings-mini-player` |
| 5 | Library: probe passes, list fetch times out, so it refetches and flickers for ever (catch 4) | test: at most one automatic retry, then waits longer each time; no loop |
| 6 | A backup that times out reads as "laptop off" and never says it didn't save (catch 5) | test: timeout + laptop answering = "didn't save"; laptop silent = quiet |
| 7 | Swipe down on Queue lands somewhere Back doesn't (LESSONS 2026-11-09) | tests in `steadyScreen` / `frame`; mid-close shots from the player and the mini player |
| 8 | Restyle changes what a tap does: reorder, set Main, compare | tests: reorder slot, Main after Make main, Compare's two (`wave4.test.mjs`) |
| 9 | A control under 44 pt, or rows that shift when info arrives | test: sizes from the styles; shots of Queue (with and without a date) |
| 10 | Queue at 1,395 songs: the tile lookup per row stalls a drag | test: 1,395 rows' info in under 50 ms |
| 11 | Not played in a while: same songs every day, or a day that turns at UTC midnight, or too few songs | test: day N and N+1 differ, same within a day, small lists hold (catch 20) |
| 12 | Hold menu: Delete mis-tapped beside Cancel; session pill and "+ Version" out of line (18, 17) | shots `player-hold-menu`, `session-card`; test: Delete still gives Undo |
| 13 | Settings left open under a tab tap or a search link | test: a tab, Sort or search closes it |
| 14 | A laptop check a phone copy would pass (LESSONS 2026-11-11) | Settings' "N songs on the laptop" comes only from the laptop's `/status` |

## Proposed phone checks
1. Queue from the player and from the mini player: looks like the rest, drag a song (one tick), swipe down lands back.
2. Versions: play two, compare, Make main; the row menu is the app's own sheet.
3. Settings: the gear on Home, the address is right; close and reopen the app, still connected.
4. Hold a line: Delete sits apart from Cancel. Home, Library, search, player: nothing looks older than the rest.
