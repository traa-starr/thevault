# Control inventory: every screen, every control

Purpose: one list of everything you can tap, hold, swipe or type in The Vault, so the owner and chat can give each control one home in the redesign.
Date: 2026-11-12
Made by Code from the code; frequencies and homes are guesses for chat and the owner to correct.

How to read: "How often" and "Could live" are my guesses, not facts. "One gesture away" means a swipe, hold or one tap on a menu, not a full screen. Nothing here was run on a phone this session; it comes from reading `app/*.tsx` and `server/vault_server/desk.py`.

## Counts

| Screen | Controls |
|---|---|
| Home | 11 |
| Library | 17 |
| Search | 9 |
| Sort | 12 |
| Sort cards | 11 |
| Player sheet | 23 |
| Mini player and tab bar | 7 |
| Queue | 5 |
| Versions and Compare | 18 |
| Tagging | 16 |
| Settings | 9 |
| Hidden songs | 7 |
| Notices and toasts | 6 |
| Laptop desk page | 7 |
| **Total** | **158** |

Counting rules: a repeating row (a song, a card, a version) counts as one control, plus whatever sits inside it. Read-only lines (counts, build line, progress bar) are not counted. A control drawn on two screens is listed on both and counted on both, so the real number of different controls is lower.

## How the screens relate

- Bottom of the app: tabs Home and Library, plus a round Search button. Search is a full screen. Settings opens from Home's gear. Sort opens from Home and hides the tab bar. Hidden songs opens from Settings.
- The player is a sheet that slides up from the mini player. Queue opens over it, or from the mini player by swipe-up.
- Versions list and the "+ Version" picker are iOS page sheets. Tagging is not a screen: it is a text line, a list and a hold menu inside the player.
- Compare is not a screen: it is the player in a mode (a wheel replaces the Compare word).

## Home (Home.tsx)

| Control | What it does | How often | Could live |
|---|---|---|---|
| Gear (top right) | Opens Settings | rare (guess) | one gesture away (suggestion) |
| Search bar | Opens Search, keyboard up | daily (guess) | on screen (suggestion) |
| Shuffle button | Shuffles all Mine songs and starts playing | daily (guess) | on screen (suggestion) |
| Favorites button | Shuffles only Favorites | weekly (guess) | on screen (suggestion) |
| Song card in a row (7 rows: Recently played, Not played in a while, Recently added, Most played, Favorites, Needs tags, Versions) | Plays that song with the rest of the row after it; on the Versions row it opens Versions instead | daily (guess) | on screen (suggestion) |
| Row swipe sideways | Scrolls a row's cards | daily (guess) | on screen (suggestion) |
| See all (on each of the 5 lower rows) | Opens Library already on that chip and order | weekly (guess) | one gesture away (suggestion) |
| Sort songs (under More) | Opens Sort | weekly (guess) | one gesture away (suggestion) |
| Tag songs (under More) | Starts a tagging session | weekly (guess) | one gesture away (suggestion) |
| Address field and Save (first run only, before a laptop is set) | Types and saves the laptop address | rare (guess) | Settings (suggestion) |
| Notice lines at the top | See Notices | rare (guess) | on screen (suggestion) |

Unclear from code: the seven rows cannot be reordered or turned off.

## Library (Library.tsx, SongRow.tsx)

| Control | What it does | How often | Could live |
|---|---|---|---|
| Shuffle pill (header; names its pool when on) | Cycles shuffle off / Mine / Unsorted over the listed songs | weekly (guess) | on screen (suggestion) |
| Tag songs (header) | Starts a tagging session | weekly (guess) | one gesture away (suggestion) |
| Chip row: All, Mine, Favorites, Archived, Needs tags, Versions, Unsorted (Unsorted only shows when some exist) | Filters the list; tap again to clear | daily (guess) | on screen (suggestion) |
| Chip row swipe sideways | Scrolls the chips | daily (guess) | on screen (suggestion) |
| Order button (Newest / A to Z / Most played) | Cycles the order, one step per tap | weekly (guess) | one gesture away (suggestion) |
| Song row tap | Plays it with the rest of the list and opens the player | daily (guess) | on screen (suggestion) |
| Song row long-press (0.4 s) | Enters select mode with that song ticked | weekly (guess) | one gesture away (suggestion) |
| Versions chip on a row | Opens that song's Versions sheet | weekly (guess) | one gesture away (suggestion) |
| Pull down to refresh | Reloads the list from the laptop | rare (guess) | one gesture away (suggestion) |
| Offline line "Laptop not reachable... Tap to try again" | Retries the list | rare (guess) | on screen (suggestion) |
| Try again (first load failed) | Retries the list | rare (guess) | on screen (suggestion) |
| Select mode: Cancel | Leaves select mode | weekly (guess) | on screen (suggestion) |
| Select mode: row tap | Ticks or unticks it | weekly (guess) | on screen (suggestion) |
| Select mode: Group as versions | Makes the ticked songs one family (needs 2 or more) | weekly (guess) | on screen (suggestion) |
| Select mode: Mine | Marks ticked songs Mine | weekly (guess) | on screen (suggestion) |
| Select mode: Not mine | Hides ticked songs (skips version groups) | weekly (guess) | on screen (suggestion) |
| Notice lines | See Notices | rare (guess) | on screen (suggestion) |

Not controls: the "671 Mine" count, the "N of M songs on this phone" line.
Unclear from code: no select-all; no Favorite or Archive from select mode (only in the player).

## Search (SearchScreen.tsx)

| Control | What it does | How often | Could live |
|---|---|---|---|
| Search field (type) | Finds tagged lines first, then titles, as you type; works with the laptop off | daily (guess) | on screen (suggestion) |
| Clear x inside the field | Empties the field | daily (guess) | on screen (suggestion) |
| Cancel | Closes Search, back to the tab you came from | daily (guess) | on screen (suggestion) |
| Recent search row | Puts those words back in the field | weekly (guess) | on screen (suggestion) |
| Clear (Recent heading) | Forgets recent searches | rare (guess) | on screen (suggestion) |
| Result: line-match row | Plays the song at the tagged second | daily (guess) | on screen (suggestion) |
| Result: title row | Plays the song | daily (guess) | on screen (suggestion) |
| Scroll the list | Dragging drops the keyboard | daily (guess) | on screen (suggestion) |
| Laptop-off line / failed-load block | Tap to try again | rare (guess) | on screen (suggestion) |

Also reached from: the tab bar's round Search button, Home's search bar, and a link from outside the app (a Siri or Shortcuts bridge).

## Sort (Sort.tsx)

| Control | What it does | How often | Could live |
|---|---|---|---|
| Back | Leaves Sort | weekly (guess) | on screen (suggestion) |
| Cards button ("Cards · N left") | Opens the swipe cards for the unsorted songs | weekly (guess) | on screen (suggestion) |
| Tag songs | Starts a tagging session (also on Home and Library) | rare (guess) | gone from here (suggestion) |
| Not sure button ("Not sure · N") | Opens cards for songs set aside as Not sure | weekly (guess) | on screen (suggestion) |
| Set row (a set is songs sharing a name) | Opens or closes that set | weekly (guess) | on screen (suggestion) |
| All mine (inside a set) | Marks the whole set Mine | weekly (guess) | on screen (suggestion) |
| All not mine (inside a set) | Hides the whole set | weekly (guess) | on screen (suggestion) |
| One by one (inside a set) | Opens cards for just that set | weekly (guess) | on screen (suggestion) |
| Song row inside an open set | Plays it | weekly (guess) | on screen (suggestion) |
| Sweep Undo toast | Takes the sweep back | weekly (guess) | on screen (suggestion) |
| Try again (load failed) | Retries | rare (guess) | on screen (suggestion) |
| Notice line | See Notices | rare (guess) | on screen (suggestion) |

Unclear from code: how long the sweep Undo stays. The tab bar is hidden while Sort is open.

## Sort cards (Cards.tsx, inside Sort)

| Control | What it does | How often | Could live |
|---|---|---|---|
| Swipe card right | Mine | daily (guess) | on screen (suggestion) |
| Swipe card left | Not mine (hides it) | daily (guess) | on screen (suggestion) |
| Swipe card up | Not sure (sets it aside) | weekly (guess) | on screen (suggestion) |
| Mine button | Same as swipe right | daily (guess) | on screen (suggestion) |
| Not mine button | Same as swipe left | daily (guess) | on screen (suggestion) |
| Not sure button | Same as swipe up | weekly (guess) | on screen (suggestion) |
| + Version (hidden if already in a group) | Opens the picker to link this card to a Main, then moves on as Mine | weekly (guess) | one gesture away (suggestion) |
| Undo toast | Takes back the last verdict and returns to that card and spot | daily (guess) | on screen (suggestion) |
| Back | Leaves cards, back to Sort | weekly (guess) | on screen (suggestion) |
| Back to Sort (end screen) | Same | weekly (guess) | on screen (suggestion) |
| The player on a card | Plays the card's song; shows no Mine, Not mine or rating (see Player) | daily (guess) | on screen (suggestion) |

Unclear from code: tapping the card itself does nothing.

## Player sheet (Player.tsx)

| Control | What it does | How often | Could live |
|---|---|---|---|
| Down arrow (top left) | Closes the player (says Done in Compare) | daily (guess) | on screen (suggestion) |
| Pull down on the grab bar | Closes the player | daily (guess) | on screen (suggestion) |
| Swipe up on the art | Opens Queue | weekly (guess) | one gesture away (suggestion) |
| Eye | Hides or shows the Mine / Not mine buttons (keeps the choice) | rare (guess) | Settings (suggestion) |
| Mine | Marks the song Mine (lit when it is) | daily (guess) | on screen (suggestion) |
| Not mine | Hides the song | daily (guess) | on screen (suggestion) |
| Shuffle icon | Cycles Off / Mine / Unsorted | weekly (guess) | on screen (suggestion) |
| + Version (hidden if already in a group) | Closes the player, opens Library select with this song ticked | weekly (guess) | one gesture away (suggestion) |
| Versions chip ("Versions · 3") | Closes the player, opens the Versions sheet | weekly (guess) | one gesture away (suggestion) |
| Compare (pulses; only with 2 or more versions) | Starts Compare mode | weekly (guess) | one gesture away (suggestion) |
| Seek bar: drag or tap | Moves through the song | daily (guess) | on screen (suggestion) |
| Seek bar: tap a tag dot | Jumps to that line and shows its words | weekly (guess) | on screen (suggestion) |
| Right-hand time (tap) | Switches total length and time left | rare (guess) | Settings (suggestion) |
| Previous | Back a song | daily (guess) | on screen (suggestion) |
| Play / Pause | Toggles sound | daily (guess) | on screen (suggestion) |
| Next | Next song | daily (guess) | on screen (suggestion) |
| Favorite | Toggles Favorite | daily (guess) | on screen (suggestion) |
| Archive | Toggles Archived | weekly (guess) | one gesture away (suggestion) |
| Tag (middle, amber) | Starts a tag at this second; cancels while typing | daily (guess) | on screen (suggestion) |
| Lines · N | Shows or hides the song's lines in place of the art | weekly (guess) | on screen (suggestion) |
| Queue | Opens Queue (in a session this slot is Next song) | weekly (guess) | one gesture away (suggestion) |
| Hidden-song Undo toast | Takes back a Not mine | weekly (guess) | on screen (suggestion) |
| Versions toast (Undo or an action) | Takes back a versions change | rare (guess) | on screen (suggestion) |

Tag typing, the lines list and the hold menu are under Tagging; the Compare wheel is under Versions and Compare.
Unclear from code: no speed, AirPlay or sleep-timer control exists. Volume is the phone's own.

## Mini player and tab bar (Player.tsx MiniPlayer, Frame.tsx TabBar)

| Control | What it does | How often | Could live |
|---|---|---|---|
| Mini player: tap the song area | Opens the player sheet | daily (guess) | on screen (suggestion) |
| Mini player: Play / Pause | Toggles sound | daily (guess) | on screen (suggestion) |
| Mini player: Next | Next song | daily (guess) | on screen (suggestion) |
| Mini player: swipe up | Opens Queue | rare (guess) | one gesture away (suggestion) |
| Tab: Home | Goes Home (also leaves Sort or Settings) | daily (guess) | on screen (suggestion) |
| Tab: Library | Goes to Library | daily (guess) | on screen (suggestion) |
| Round Search button | Opens Search, keyboard up | daily (guess) | on screen (suggestion) |

Hidden while Sort is open: the tab bar. Home, Library and Search keep their place while you are elsewhere.

## Queue (Player.tsx)

| Control | What it does | How often | Could live |
|---|---|---|---|
| Back | Closes Queue (back to the player when opened from it) | weekly (guess) | on screen (suggestion) |
| Pull down on the grab bar | Same as Back | weekly (guess) | on screen (suggestion) |
| Up-next row tap | Jumps to that song | weekly (guess) | on screen (suggestion) |
| Up-next row hold, then drag | Lifts the row and moves it; list edges auto-scroll | rare (guess) | on screen (suggestion) |
| Grip icon on each row | Only a hint that rows move; the whole row lifts | rare (guess) | gone (suggestion) |

Not controls: the Now playing row. Unclear from code: no remove-from-queue, no clear-queue, no "play next" from elsewhere.

## Versions and Compare (Versions.tsx, Compare.tsx)

| Control | What it does | How often | Could live |
|---|---|---|---|
| Versions sheet: Done | Closes the sheet | weekly (guess) | on screen (suggestion) |
| Versions sheet: swipe down | Closes it (iOS page sheet) | weekly (guess) | on screen (suggestion) |
| Versions sheet: Compare | Closes it and opens Compare on this family | weekly (guess) | on screen (suggestion) |
| Version row tap | Opens that version's menu | weekly (guess) | on screen (suggestion) |
| Menu: Play | Plays that version now | weekly (guess) | a sheet (suggestion) |
| Menu: Make main / Keep as Main | Picks the Main (the one shuffle plays) | rare (guess) | a sheet (suggestion) |
| Menu: Remove from Versions | Takes it out of the family | rare (guess) | a sheet (suggestion) |
| Menu: Not mine | Takes it out of the family and hides it | rare (guess) | a sheet (suggestion) |
| Menu: Cancel, or tap outside | Closes the menu | weekly (guess) | a sheet (suggestion) |
| Picker sheet ("+ Version"): Cancel | Closes without linking | weekly (guess) | a sheet (suggestion) |
| Picker: search field (type) | Filters Mine songs by title | weekly (guess) | a sheet (suggestion) |
| Picker: song row tap | Picks that song as the Main to link to | weekly (guess) | a sheet (suggestion) |
| Picker: swipe down | Closes it (iOS page sheet) | weekly (guess) | a sheet (suggestion) |
| Compare wheel (replaces the Compare word): swipe up or down | Switches which version you hear, at the same spot | weekly (guess) | one gesture away (suggestion) |
| Compare: Done (replaces the down arrow) | Ends Compare; sound stays as left | weekly (guess) | on screen (suggestion) |
| Compare: Play / Pause | Works the version being heard | weekly (guess) | on screen (suggestion) |
| Compare: Previous / Next / pull the sheet down | End Compare first, then act | rare (guess) | on screen (suggestion) |
| Versions toast (Undo or an action) | Takes back Make main, Remove or Group | weekly (guess) | on screen (suggestion) |

Ways into Compare: the player's Compare word, and the Versions sheet's Compare. Ways to make a family: "+ Version" (player, Cards) and Group as versions (Library select).
Unclear from code: which menu items show per row follows `versionMenu()` in `app/family.ts` (Play, Make main or Keep as Main, Remove from Versions, Not mine, Cancel; Make main only on non-Main rows).

## Tagging (Tagging.tsx; inside the player)

| Control | What it does | How often | Could live |
|---|---|---|---|
| Tag button (see Player) | Opens the line field at the current second | daily (guess) | on screen (suggestion) |
| Line text field (type, Done on keyboard) | Saves the words as a tag | daily (guess) | on screen (suggestion) |
| Earlier ‹ | Moves the tag's second back | weekly (guess) | on screen (suggestion) |
| Later › | Moves the tag's second forward | weekly (guess) | on screen (suggestion) |
| Cancel (beside the field) | Drops the tag being typed | weekly (guess) | on screen (suggestion) |
| Undo (note line after a save or delete) | Takes the last tag action back | weekly (guess) | on screen (suggestion) |
| Lines list row tap | Jumps to that second (list stays open) | weekly (guess) | on screen (suggestion) |
| Lines list row hold | Opens the hold menu for that line | weekly (guess) | one gesture away (suggestion) |
| Hold menu: Change words | Reopens the field with the old words | weekly (guess) | a sheet (suggestion) |
| Hold menu: Move to (time) | Moves the line to the current second | rare (guess) | a sheet (suggestion) |
| Hold menu: Delete | Deletes the line | rare (guess) | a sheet (suggestion) |
| Hold menu: Cancel, or tap outside | Closes the menu | weekly (guess) | a sheet (suggestion) |
| Session start: Tag songs (Home, Library, Sort) | Plays Mine songs one by one for tagging | weekly (guess) | one gesture away (suggestion) |
| Session bar: Close | Ends the session | weekly (guess) | on screen (suggestion) |
| Session bar: Not mine pill | Hides the song and moves on | weekly (guess) | on screen (suggestion) |
| Session: Next song (the lit Queue slot) | Next song to tag | weekly (guess) | on screen (suggestion) |

Not controls: the "N of M tagged" count and amber progress line; the passed-tag words shown while playing.
Unclear from code: how a session picks its order, and what it does to shuffle (see `sessionStore.ts`).

## Settings (Settings.tsx)

| Control | What it does | How often | Could live |
|---|---|---|---|
| Back | Closes Settings, back to Home | rare (guess) | on screen (suggestion) |
| Change laptop address | Opens the address field | rare (guess) | Settings (suggestion) |
| Address field (type) | Types the new address | rare (guess) | Settings (suggestion) |
| Save | Saves it to the phone and the Keychain | rare (guess) | Settings (suggestion) |
| Cancel | Drops the edit | rare (guess) | Settings (suggestion) |
| Hidden songs row (shows the count) | Opens Hidden songs | weekly (guess) | Settings (suggestion) |
| Lock-screen log row | Shows the last log lines in a popup | rare (guess) | Settings (suggestion) |
| Lock-screen log popup: Close | Closes it | rare (guess) | Settings (suggestion) |
| Lock-screen log popup: Copy all | Opens the share sheet with the full log | rare (guess) | Settings (suggestion) |

Not controls: the laptop status line, "Data since", the build line.
Unclear from code: Settings has no toggles. The eye (Mine / Not mine buttons), the time-left switch and the 8 GB phone limit have no setting today.

## Hidden songs (Hidden.tsx, opened from Settings)

| Control | What it does | How often | Could live |
|---|---|---|---|
| Back | Back to Settings (recounts hidden) | weekly (guess) | on screen (suggestion) |
| Search field (type) | Filters by title or folder | weekly (guess) | on screen (suggestion) |
| Folder chip: All folders, or one per folder with its count | Filters to one folder | weekly (guess) | on screen (suggestion) |
| Chip row swipe sideways | Scrolls the folder chips | weekly (guess) | on screen (suggestion) |
| Song row tap | Plays that hidden song so you can judge it | weekly (guess) | on screen (suggestion) |
| Restore (per row; becomes "In Library") | Puts the song back in the library | weekly (guess) | on screen (suggestion) |
| Try again (load failed) | Retries | rare (guess) | on screen (suggestion) |

Unclear from code: no multi-select and no "restore all". The laptop desk does the same job, see Desk.

## Notices and toasts (Notices.tsx, plus toasts in Player.tsx, Versions.tsx, Sort.tsx, Cards.tsx)

| Control | What it does | How often | Could live |
|---|---|---|---|
| "N changes waiting to send" line (Home, Library, Sort) | Tap sends them now | rare (guess) | on screen (suggestion) |
| "Laptop server is out of date" / "backup didn't save" line | Tap asks the laptop again | rare (guess) | Settings (suggestion) |
| Welcome back card: OK | Dismisses the one-time restore message | rare (guess) | on screen (suggestion) |
| Hidden-song Undo toast | Takes back a Not mine | weekly (guess) | on screen (suggestion) |
| Versions toast (Undo or an action) | Takes back a versions change | weekly (guess) | on screen (suggestion) |
| Sort sweep toast and Cards toast: Undo | Takes the last sort verdict back (also listed under those screens) | daily (guess) | on screen (suggestion) |

Text only, not tappable: fresh-install waiting lines, player message toast (for example "not on this phone"), Library's "laptop refused N changes" line.
Unclear from code: how long each toast stays; timers sit in the stores and `UNDO_MS` in Cards.tsx.

## Laptop desk page (server/vault_server/desk.py, a browser page)

| Control | What it does | How often | Could live |
|---|---|---|---|
| Search box (type, autofocus) | Filters hidden songs by title or folder | weekly (guess) | desk (suggestion) |
| Folder dropdown | Filters to one folder | weekly (guess) | desk (suggestion) |
| Play (per row; greyed if the file is not on the laptop) | Plays the song in the page's audio player | weekly (guess) | desk (suggestion) |
| Restore (per row; becomes "In Library") | Sends the same change the phone sends, putting the song back | weekly (guess) | desk (suggestion) |
| Show more (200 rows at a time) | Draws the next 200 | weekly (guess) | desk (suggestion) |
| Audio bar (the browser's own: play, seek, volume) | Controls the song being played | weekly (guess) | desk (suggestion) |
| Coming back to the browser tab | Reloads counts and songs by itself | weekly (guess) | desk (suggestion) |

Not controls: the counts line and "as of" line. Today the desk does only Hidden songs, the same job as the phone's Hidden screen, so which of the two is the home is chat's call.
