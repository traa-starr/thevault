# NEXT: Render folder button, guard fix, iCloud plan
Format: recipe (near the music folders and a loop change)
Written by chat, 2026-11-11.
Effort: high
Log: Wave 4 review 6 of 6 pass. New songs: owner's own pick, a Desktop render folder plus a desktop icon, no timer (5.0a). iCloud tidy memo (5.0b). Live Activity dropped. Guard lets read-only lines through, with tests (owner OK). `/verify` side by side (chat). Catches 6, 7 as built (chat-default) (logged by chat)
Size: the render-folder button is the one thing I'll use next; guard fix first because it saves tokens for the rest; then the open line, `/verify` and a memo for my next call. Ships by publish, no rebuild. 5 parts.
Queue after this: my 3.7 searches at ~50 tags, then revisit E (3.4, 3.5); then whatever I pick from the iCloud memo (5.0b).
Read: `docs/LESSONS.md`; `docs/NEW-SONGS-OPTIONS.md` (guards list still applies); last 6 DECISIONS rows; ROADMAP 5.0a, 5.0b; files you touch.

## Parts
a. **Guard fix.** `.claude/hooks/guard_music.py` lets a line through when it has no write command and no output into a file (a read-only search piped into a filter). Add the new `Vault Renders` folder to the locked list. Tests first: every line blocked today still blocks (add cases for each), plus the lines from wave 4's "Odd in how we work" now pass. Rule 1 doesn't change.
b. **Open-screen line.** Read `timings` first: the open line on wave 4's code must PASS (130 / 135 / 6, from wave 4's NEXT). If not, fix that before c.
c. **Render folder + desktop icon (5.0a).** A folder `Vault Renders` on my Desktop (the one I actually see; if Desktop is synced somewhere, say so in REPORT and use it anyway) and a desktop icon, `Send to Vault`. One double-click brings in what's new there: phone copies made, and the songs show up in Sort on the phone and in Recently added. A small window says "3 new songs, in Sort on your phone" or "Nothing new" and closes when I press a key. No off/on commands by me; the server is answering again within seconds. Folder location saved in the library's settings file, never the repo.
   - The Vault only reads the render folder: never moves, renames or deletes my renders.
   - A file still exporting (size changing) waits for the next click, and the window says so.
   - The same song already in the Vault (same fingerprint) says "already in the Vault", not a new song.
   - `doctor` says whether the render folder is found.
d. **`/verify` back under 1 min:** run the two slow items (playlistCore, tsc) side by side.
e. **iCloud tidy memo (5.0b), `docs/ICLOUD-OPTIONS.md`, under 40 lines, read-only (names and sizes only, nothing opened).** Now that the Vault knows which songs are mine: 2-3 ways to store the iCloud copies, what a senior engineer would pick. Must answer: if I make iCloud files cloud-only on the phone (and/or the laptop), does anything in the Vault break (scan, phone copies, play, restore)? Which songs live only in iCloud and not in the Vault library? My exact taps to make them cloud-only on the iPhone. Counts and sizes of mine / not mine in iCloud (to `spike/output/`, gitignored, if it names songs).

**Stop line:** a-c done = publish and wrap even if d-e didn't fit. Two failed fixes on a part: write it up, move on.

## The bar
- List how c could break before building (LESSONS included); each a test with fake files in a temp folder, never my real folders.
- Screenshots only of changed screens, checked by a subagent. One `fresh-eyes` review of a and c (risky logic): catches to `docs/board/render-review.md` before any fix.
- REPORT under 40 lines with "Odd in how we work:".

## Done when
Code proves:
- a: guard tests pass, every old block case still blocks, the new read-only cases pass; `test_guard_music.py` PASS.
- b: `timings` open line quoted, PASS.
- c: tests with fake renders: new file in, count right; same file again: "Nothing new"; growing file waits; duplicate says "already in the Vault"; render folder untouched after (same names, sizes, times). Icon on the Desktop. `doctor` render line.
- d: `/verify` all PASS under 60 s. e: memo exists, under 40 lines, with a pick.
- `check_repo.py` clean; publish goes out.
I prove:
1. Put 3 or more new mixdowns in `Vault Renders`, double-click `Send to Vault`: the window says the right count.
2. On the phone, Sort shows them as cards: throw each (stamps, buzz), Undo one. (Also closes wave 3's Sort cards check.)
3. Play one of them from Recently added on Home.
4. Double-click the icon again: "Nothing new", nothing changes on the phone.

## Stretch (only if every part is done and budget is left)
1. 3.7 groundwork: the script that re-runs my 20 searches, with an empty 20-line file for me to fill in later. No search changes.

## Limits
- Never write inside iCloud Drive, FL Studio Projects or `Vault Renders`. No timer, no folder watcher, no Live Activity.
- Search, rating, tagging, Sort rules stay as built. No rebuild; if one is needed, write it in `overhaul/REBUILD.md` and stop.
- The repo is public: fake names in tests and shots, no laptop address, no real song names in docs.
