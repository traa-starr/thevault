# Board: Calm the app, part 1 (B Hidden in Settings, C laptop desk), 2026-11-12

One meeting, four seats (Sonnet), advisory. Code's calls in **bold**; what was left out and why at the end.

## Phone: Hidden songs in Settings (B)
- **Settings gets a "Songs" section** between Laptop and This phone: one 52 row, "Hidden songs", the count right in dim
  digits, the grey arrow. Count unknown (laptop off, older laptop): no number, never 0. The count comes from `/status`
  (new `hidden` field), so Settings never pulls the whole list to count.
- **Hidden screen:** header (Back, Hidden), search field 48 (`raised`, corner 12, "Search title or folder", clear x),
  one sideways chip row of folders ("All folders", then each folder biggest first with its count), the count line
  ("815 hidden songs", "12 of 815" when narrowed), then the 60 rows (fixed height, `getItemLayout`).
- **Search and filter run on the phone** over the one fetched list: case-insensitive, plain text (no regex), title or
  folder. Clearing the search keeps the folder.
- **Tap a row: it plays** through the player like Sort did (`playList` over the shown rows that can play), mini player
  only, the list stays. Rows not on the laptop (cloud only, missing) are at 40% and don't play; Restore still works.
- **Restore keeps the row in place** (nothing shifts, so a second tap can't land on the next song): the pill turns into
  a quiet "In Library", the count drops by one. The row leaves when the screen is opened again. No Undo: hiding it
  again from Library is the undo.
- **Empty states:** nothing hidden: "Nothing hidden". No match: `No hidden songs match "xyz"` (folder on: "in <folder>").
- Library loses the Hidden link and gains pull to refresh (so a desk restore shows on the phone with one pull).

## Laptop desk (C)
- **Route `/desk` (page) and `/desk-status` (counts), answered only on the laptop itself** (`127.0.0.1` both ways:
  the connection and the address typed). Over Tailscale they say 404. Relative links only, nothing from outside.
- **Counts strip:** Mine, Hidden, Unsorted (same count as Sort), Tags, Last scan, Last render click.
- **List:** search box (focused on open), a folder dropdown (30 folders read better as a select on a laptop), count
  line, rows with title and folder · date, Play and Restore buttons. Plays in one `<audio>` bar at the top; a song not
  on the laptop says so.
- **Restore = the phone's change:** `POST /changes`, kind `mine_restore`, `X-Vault-Client` header, id `desk-<uuid>`.
  The row goes only after the laptop says saved (or "nothing to do"); a refusal shows its reason on the row. The page
  asks again when the window comes back into focus.
- **Last render click** is written by `renders` into the library's settings file (`last_render`), the Vault's own file.
  Before the first click after this step: "not recorded yet".
- **`Vault Desk` icon:** runs `vault_cli.py desk`, which opens the page if the server answers and otherwise says how
  to start it and waits for a key. Doctor gets a Desk line (icon there, page answering).

## Breaks listed before building (tester), and what catches each
1. Chip on Mine/Unsorted when the last unsorted song is sorted: the chip that's on stays (`chipsFor`), test.
2. Double tap on Restore lands on the next row: rows don't move (test in `app/hidden.test.mjs`).
3. Search with `(` or `[`: plain text match, test. No match vs nothing hidden: different words, test + shot.
4. Folder + search together; clearing search keeps the folder: test.
5. Settings count unknown reads "Hidden songs", not 0 or NaN: test.
6. Desk from Tailscale: 404; random site POSTing a restore: 403 without the header (existing), test.
7. Desk page and counts carry no drive letter, no laptop name, no path: test greps the bodies.
8. Desk restore lands in the journal like the phone's; a second restore of the same song is "nothing to do": test.
9. Desk restore failing: the row stays with the reason (JS removes only after a good answer): test reads the page code.
10. Restore offline on the phone: goes through the outbox like before (unchanged path).
11. 815 hidden on the desk: one fetch, filtering in the page, rows drawn 200 at a time with "Show more".

## Left out (reasons)
- Flow seat: Undo toast when a hidden song replaces what's playing, a "Playing from Hidden" tag: Sort didn't have them
  and NEXT says "same as Sort"; owner question for the redesign.
- Screen seat: a half sheet for more than 8 folders, matched-word highlight: one sideways chip row is what NEXT named.
- Logic seat: refetch Library on every return to the foreground: pull to refresh is enough for I prove 3.
