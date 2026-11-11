# Fresh-eyes review: wave 4 (2026-11-11)

Run by the `fresh-eyes` agent (Sonnet) on NEXT, LESSONS, the wave's diff (A-C, 2,377 lines) and the changed-screen
shots, after the build and before any fix. Written here as received, then Code's call on each (**Fixed**, **Proved**,
**Left**, **For chat**). A second Sonnet pass checked 42 changed-screen shots; its catches are S1-S13. Fake names only.

## Wrong (would misbehave)
2. **The "Laptop not reachable" line can stay up to 5 min after the laptop is back**, if two automatic tries failed
   first: the failure count only resets when a list comes. Unsure, 65%.
   **Left:** two failed automatic tries need the probe to pass while the list fails, which is catch 4's own case (a
   plain "off, then on" never gets past the first, instant retry: tested). A tap on the line asks at once.
3. **A fresh install whose backup fetch times out now says "backup didn't save"**, though nothing was sent yet (it
   used to stay quiet). Unsure, 60%. **Fixed:** a timeout while a fresh install is still waiting stays quiet (tested).
5. **A changed address reaches the outbox, backup and tags but not the song already queued**: the player keeps the old
   address for songs it streams until the next list is played. Unsure, 50% (as built before this wave too).
   **Fixed:** the player takes the new address at once for whatever it loads next; the song sounding isn't touched.
7. **The Versions paragraph is gone** ("The Main plays in shuffle and holds the Library row…"): a word change in a
   look-only goal. Sure. **Left, for chat:** the board's call (TEARDOWN: "if it needs a paragraph, the layout isn't
   saying it"); the Main's own menu still says "Main (newest): plays in shuffle". One line to put back if wanted.

## Test gaps
1. **Catch 4's "no loop" test ran a copy of Library's rule, not the rule** (a simulation in the test file; the real
   wiring only matched by text). Sure. **Fixed:** the rule is now one piece of plain code (`listRetrier`) that Library
   calls and the test drives with a pretend clock: the same code on the phone and in the test.
4. **The extra `/health` call after a backup timeout held the backup busy another 10 s**, and nothing proved the path
   end to end. Sure. **Fixed:** that one call gives up after 3 s. **Left:** the path is still proved by its rule
   (`backupDidntSave`) plus a text match on the wiring; phoneBackup can't load in a laptop test (it needs the phone's files).
9. **Nothing proves the new half-sheet menu shows and takes taps inside an iOS sheet** (web shots only). 25% worried.
   **Left:** the Versions toast already sits in that same sheet the same way and works on the phone; phone check 2 is the proof.
14. **The address rules are proved on a pretend file and Keychain**, not on the phone's file system. Low.
    **Left:** the calls into the phone's files are the same lines as before, only moved.
15. **Not in the diff:** the `timings` open line and the two card shots. **Proved:** `cards-start` and
    `cards-after-throw` each run a check in the shot tool (first card up; then the next song up and the first one's
    date gone) and both passed. `timings`: no open-screen line yet on this code (REPORT).

## Rough
6. Sort: "All mine" and "All not mine" are now the same grey pill side by side. **For chat:** amber is the one
   accent (board, wave 3) and a sweep has Undo; a gap or an order change if it mis-taps on the phone.
8. Queue's words changed ("Now playing" label gone; Playing / Paused / Sorting under the pinned row).
   **Proved:** `LABELS.md` was rebuilt from the code and its test passes; the words are the mini player's own.
10. Swiping the Versions sheet down with a menu open closes the whole sheet. **Left:** that is where Done goes.
11. In a session the left-aligned version row might overflow (+ Version, the chip and the 168 slot together).
    **Proved not so:** "+ Version" is hidden once a song has versions, so the row is the chip and the slot (about 270
    of 350 pt); shot `session-version-row`.
12. The notice lines lost their centring. **Proved:** shots `library-changes-waiting`, `home-laptop-off`,
    `home-backup-didnt-save` (left-aligned like "Laptop not reachable", same warm colour).
13. Opening Settings flashes "Checking the laptop…" over the last answer. **Fixed:** the last answer stays until the
    new one comes; "Checking…" only shows when there is nothing yet.
16. LESSONS: none repeated.

## The shot check (S)
Confirmed in the drawn frames: every "meant to change" item of A-C (Queue rows, pinned row, grips, mid-close from both
openers; Versions rows, Main pill, menu order; the wheel with no blue; the gear, Settings, first run with no gear; no
blue, green or red left in Sort and Hidden; pill and "+ Version" on one left edge; Delete, gap, Cancel; a different
card after a throw).
- S1. **The Compare wheel cuts a long version name at the end** ("Midnight Run (… 1/3"), so two versions read the
  same. **Fixed:** the name is cut in the middle, so its ending shows (iOS only: the laptop's shots can't draw it).
- S2. "Laptop not reachable" in Settings, Sort and Hidden was plain grey. **Fixed:** the warn colour, as in Library.
- S10. Settings' two tappable rows looked like plain text. **Fixed:** a small grey arrow at the right of each.
- "versions-menu-main shows the player": the shot's tap landed on the mini player. **Fixed:** the fixture; redrawn.
- "versions-chip-in-player shows no chip": **Proved not so** (the frame shows "Versions · 3" and Compare).
- S9. Hidden's Restore pills are 36 high. **Proved:** their touch reaches 44 (as chips do).
- S3, S4, S6, S8, S11, S12 (Home's amber Shuffle, see-through bars, no tabs on Sort, Compare's empty action slots, the
  card buttons, Library's header): **Left:** waves 1-3 as built and passed on the phone.
- S5, S7, S13 (Sort's set rows have no tiles; the held line's highlight has no inner padding; the Welcome back text is
  long): **For chat:** small, look-only, not asked for here.

## Verdicts as given
A ready with notes (7, 8, 9, 10, 11) · B ready with notes (5, 13, 14) · C ready with notes (1 and 3 before relying on
the catch 4 and 5 tests: both fixed).
