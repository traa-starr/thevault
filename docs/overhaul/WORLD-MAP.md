# World map: one home for every control (ROADMAP O.6)

Drafted by Code (Opus) 2026-11-12 from `INVENTORY.md` (158 controls) and the board (`board/world-map.md`). The owner
judges it on the phone through the mockup (`spike/mockups/world/`) and corrects it at Review. Reversible until built.

**Homes:** on screen · gesture (one swipe or hold away) · sheet (a row in a sheet that opens in place) · Settings · desk
(laptop page) · gone. **⚠** = a change to something the owner likely uses daily or weekly. **NEW** = a control the map
adds (not one of the 158).

## The rules of this world
1. **The song is the centre.** Tap a song anywhere = it plays. Hold a song anywhere = its **song sheet**. The player's
   `...` opens the same sheet. One sheet, one gesture, every screen.
2. **Your lines are the song's face** (the board's one idea). Home opens on one of your tagged lines, big; tap = that
   song from that second. A song's second line (Library rows, mini player, sheet header) is one of your lines when it
   has any.
3. **Screens keep what the thumb does daily.** Rare things live in a sheet; admin lives in Settings; bulk lives on the desk.
4. **Hold = the menu for this thing:** a song (song sheet), a line (line menu), a set in Sort (set sheet), a Queue row
   (lift it), the Shuffle button (pool).
5. **One Undo toast spot** per screen; sheets close before their toast shows, never over it.

## Counts per screen (before = INVENTORY; after = on the screen without opening anything)
| Screen | Before | After (usual) | After (most it shows) | Daily? |
|---|---|---|---|---|
| Home | 11 | 6 | 8 (notice, first-run address) | yes |
| Library | 17 | 6 | 8 (+5 only in select mode) | yes |
| Player | 23 | 13 | 16 (Mine, Not mine while unsorted; Compare with 2+ versions) | yes |
| Sort | 12 | 6 | 7 (notice) | yes |
| Sort cards | 11 | 10 | 10 | in Sort |
| Search | 9 | 9 | 9 | yes, unchanged |
| Mini player and tabs | 7 | 7 | 7 | unchanged |
| Queue | 5 | 5 (grip goes, Shuffle comes) | 5 | |
| Versions and Compare | 18 | 5 (Compare mode) | 5 | |
| Tagging | 16 | 10 (inside the player) | 10 | |
| Settings | 9 | 10 (+ laptop status row) | 10 | |
| Hidden songs | 7 | 7 | 7 | |
| Notices and toasts | 6 | 5 | 5 | |
| Laptop desk | 7 | 7 | 7 | |
"After (usual)" counts NEW controls too (Home's `...` and line card, Library's `...`, the player's `...`, the set and
card holds). Daily screens: Home 55%, Library 35%, Player 57%, Sort 50% of before.

**Homes of the 158:** on screen 85 · gesture 5 · sheet 27 · Settings 18 · desk 7 · gone 16 = **158**.

## Home (11)
| # | Control | Home | Note |
|---|---|---|---|
| 1 | Gear | sheet: Home `...` > Settings | ⚠ one more tap; Settings is rare |
| 2 | Search bar | gone | ⚠ the round Search button (tab bar) is its one home |
| 3 | Shuffle | on screen | tap = Mine, as today |
| 4 | Favorites button | gesture: hold Shuffle > Favorites | ⚠ the pool sheet: Mine, Favorites, Unsorted |
| 5 | Song card | on screen | hold = song sheet (NEW gesture, same sheet) |
| 6 | Row swipe sideways | on screen | |
| 7 | See all | on screen | the row heading is the button (no separate grey link) |
| 8 | Sort songs (More) | sheet: Home `...` > Sort · N left | |
| 9 | Tag songs (More) | sheet: Home `...` > Tag songs | its one home |
| 10 | Address field (first run) | Settings | on Home only until a laptop is set |
| 11 | Notice lines | on screen | only when needed |
NEW: `...` top right (Sort · N left, Tag songs, Settings); **Your line** card at the top. Rows 7 -> 5: Recently
played, Not played in a while, Recently added, Favorites, Needs tags (⚠ Most played and Versions to compare leave Home;
both stay in Library as an order and a chip).

## Library (17)
| # | Control | Home | Note |
|---|---|---|---|
| 1 | Shuffle pill | sheet: Library `...` > Shuffle | ⚠ weekly |
| 2 | Tag songs (header) | gone | Home `...` |
| 3 | Chip row | on screen | All, Favorites, Needs tags, Versions, Archived (+ Unsorted, Mine while any unsorted) |
| 4 | Chip row swipe | on screen | |
| 5 | Order button | sheet: Library `...` > Order | ⚠ weekly |
| 6 | Row tap | on screen | plays, as today |
| 7 | Row hold | gesture: song sheet | ⚠ was select mode; Select is the sheet's last row and in `...` |
| 8 | Versions chip on a row | gone | ⚠ the row's second line says "3 versions"; Versions in the song sheet |
| 9 | Pull to refresh | gesture | |
| 10 | Laptop-off line | on screen | only when off |
| 11 | Try again (first load) | gone | the laptop-off line does it |
| 12-16 | Select mode: Cancel, row tick, Group as versions, Mine, Not mine | on screen | only in select mode |
| 17 | Notice lines | on screen | only when needed |
NEW: `...` in the header (Shuffle, Order, Select songs).

## Search (9)
All 9 stay **on screen**: field, clear x, Cancel, recent row, Clear recent, line-match row, title row, scroll, laptop-off
line. NEW path: hold a result = song sheet.

## Sort (12)
| # | Control | Home | Note |
|---|---|---|---|
| 1 | Back | on screen | |
| 2 | Cards button | on screen | the big button: "Swipe through N songs" |
| 3 | Tag songs | gone | Home `...` |
| 4 | Not sure · N | on screen | only when any |
| 5 | Set row | on screen | ⚠ tap = that set's cards (was open / close) |
| 6 | All mine | sheet: hold a set | ⚠ set sheet |
| 7 | All not mine | sheet: hold a set | ⚠ set sheet |
| 8 | One by one | gone | the set row's tap does it |
| 9 | Song row in a set | sheet: hold a set | the set sheet lists its songs; tap plays |
| 10 | Sweep Undo toast | on screen | |
| 11 | Try again | gone | the notice line does it |
| 12 | Notice line | on screen | only when needed |
NEW: hold a set = set sheet.

## Sort cards (11)
| # | Control | Home | Note |
|---|---|---|---|
| 1-3 | Swipe right / left / up | on screen | |
| 4-6 | Mine / Not mine / Not sure buttons | on screen | big controls stay (owner's taste) |
| 7 | + Version | sheet: hold the card > Add as a version of... | ⚠ weekly |
| 8 | Undo toast | on screen | |
| 9 | Back | on screen | |
| 10 | Back to Sort (end screen) | gone | the end screen has the one Back |
| 11 | The player on a card | on screen | |
NEW: hold the card = song sheet.

## Player (23)
| # | Control | Home | Note |
|---|---|---|---|
| 1 | Down arrow | on screen | |
| 2 | Pull down | on screen | |
| 3 | Swipe up on the art | on screen | opens Queue (its main way now) |
| 4 | Eye | gone | ⚠ Mine / Not mine show only while the song is unsorted |
| 5 | Mine | on screen while unsorted | ⚠ else in the song sheet |
| 6 | Not mine | on screen while unsorted | ⚠ else in the song sheet |
| 7 | Shuffle icon | gesture: Queue (swipe up) > Shuffle | ⚠ order lives with the queue |
| 8 | + Version | sheet: Add as a version of... | opens in place, never leaves the player |
| 9 | Versions chip | sheet: Versions (3) | ⚠ the meta line says "3 versions" |
| 10 | Compare | on screen with 2+ versions | also a sheet row |
| 11 | Seek bar drag / tap | on screen | |
| 12 | Tag dot tap | on screen | |
| 13 | Right-hand time tap | gone | shows the length, always |
| 14-16 | Previous, Play / Pause, Next | on screen | |
| 17 | Favorite | on screen | |
| 18 | Archive | sheet | ⚠ weekly |
| 19 | Tag | on screen | amber, middle |
| 20 | Lines · N | on screen | |
| 21 | Queue | sheet: Queue (and swipe up) | ⚠ |
| 22 | Hidden-song Undo toast | on screen | the one Undo toast |
| 23 | Versions toast | gone | uses the same Undo toast (22) |
NEW: `...` in the action row. Action row: **Favorite, Tag, Lines, `...`** (4 slots, wider). In a tagging session the
`...` slot is Next song, as Queue's slot is today.

## The song sheet (NEW; the 27 "sheet" homes above mostly land here)
Header: tile, title, one of your lines (or meta). Rows by `songActions(ctx)`, top to bottom:
Favorite / Unfavorite · Mine (unsorted or not mine) · Not mine (Mine or unsorted) · Versions (n) > (in a family) ·
Compare (2+ versions, not already comparing) · Add as a version of... > (not in a family) · Archive / Unarchive ·
Queue (player only) · Select (Library and Home only). In a session: no Queue, no Compare. In Compare: Favorite only.
**Versions page** (inside the sheet): tap a version = plays it; hold = Make main / Keep as Main, Remove from Versions,
Not mine, Cancel (today's `versionMenu`). **Add as a version page:** search field, rows; tap = link. Back arrow top left;
pull down closes the whole sheet to where it opened.

## Mini player and tab bar (7)
All 7 **on screen**: tap, Play / Pause, Next, swipe up (Queue), Home, Library, round Search. Its second line shows one of
your lines when the song has any.

## Queue (5)
Back, pull down, row tap, hold-drag: **on screen**. Grip icon: **gone** (the whole row lifts; a one-time hint line).
NEW: Shuffle (Off / Mine / Unsorted) in Queue's header, moved from the player.

## Versions and Compare (18)
| # | Control | Home |
|---|---|---|
| 1, 2 | Versions sheet Done, swipe down | gone (the song sheet's own Back and pull down) |
| 3 | Versions sheet Compare | sheet (song sheet row) |
| 4 | Version row tap | sheet (plays it ⚠ was a menu) |
| 5 | Menu: Play | gone (row tap plays) |
| 6-9 | Menu: Make main, Remove, Not mine, Cancel | sheet (hold a version) |
| 10-12 | Picker Cancel, search, row tap | sheet (Add as a version page) |
| 13 | Picker swipe down | gone (the sheet's pull down) |
| 14-17 | Compare wheel, Done, Play / Pause, Previous / Next / pull | on screen (Compare mode, unchanged) |
| 18 | Versions toast | on screen (the one Undo toast) |

## Tagging (16)
On screen (inside the player, unchanged): Tag, line field, Earlier, Later, Cancel, Undo note, Lines row tap, session
Close, session Not mine pill, Next song (10). Gesture: Lines row hold (1). Sheet: hold menu Change words, Move to now,
Delete, Cancel (4, the line menu as today); session start "Tag songs" (1, Home `...`).

## Settings (9) and Hidden songs (7)
All 16 stay in **Settings** (Hidden songs is a Settings page). NEW row: **Laptop** status with a dot when the server is
out of date or the backup didn't save (moved from the notice lines); a small dot on Home's `...` while it needs a look.

## Notices and toasts (6)
| # | Control | Home |
|---|---|---|
| 1 | N changes waiting to send | on screen |
| 2 | Server out of date / backup didn't save | Settings (Laptop row) |
| 3 | Welcome back: OK | on screen (once) |
| 4 | Hidden-song Undo | on screen (one Undo toast) |
| 5 | Versions toast | on screen (one Undo toast) |
| 6 | Sort / Cards Undo | on screen |

## Laptop desk (7)
All 7 stay on the **desk**: search, folder, Play, Restore, Show more, audio bar, refresh on return. The desk is the
home for bulk restores; the phone's Hidden songs is the quick path.

## Daily-use moves to confirm on the phone (⚠ above, in one list)
Home: gear into `...`; search bar gone (round button stays); Favorites shuffle = hold Shuffle; 2 rows leave Home.
Library: Shuffle and Order into `...`; hold opens the song sheet (Select inside it); Versions chip on rows gone.
Player: eye gone, Mine / Not mine only while unsorted; Archive, Queue, Versions, + Version into the sheet; Shuffle into
Queue; time-left tap gone. Sort: a set's tap opens its cards, All mine / All not mine on hold. Cards: + Version on hold.
Versions: tapping a version plays it (its menu is on hold).
