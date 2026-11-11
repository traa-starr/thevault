# Fresh-eyes review: wave 3 (2026-11-11)

Run by the `fresh-eyes` agent (Sonnet) on NEXT, LESSONS, the wave's diff (A-D) and the changed-screen shots, after
the build and before any fix. Written here as received, then Code's call on each (**Fixed**, **Proved**, **Left**,
**For chat**). Fake names only.

## Wrong (would misbehave)
1. **A's changed-screen shots were never regenerated.** `library-all`, `library-laptop-off`, `home-full`, `search-laptop-off`
   are from 11-10, before this wave's code: rows still say "On this phone", no shot of a row with heart + Versions +
   plays + the icon, Home's no-repeat shot is the old Home. The laptop-off fixtures still set a flag instead of
   failing the fetch (NEXT catch 16, LESSONS 2026-11-11). Sure.
   **Fixed:** shots redrawn this session; the laptop-off fixtures now fail every laptop fetch like a real phone
   (`tools/shots/entry.tsx`), and the line shown is the app's own.
2. **Cards: a double verdict on one song.** `decide` reads the card from the last render; two judgements before a
   re-render (a release right after a button) would judge the same song twice, and the second Undo hides the first.
   Narrow window. Unsure, 30%.
   **Fixed:** a verdict for the song already judged this render is ignored until the next card is up.
3. **Cards: a fast second swipe cuts the first throw short.** The one ghost is reused: the first card jumps to the new
   finger spot and swaps its song mid-air. Verdicts stay right. Sure.
   **Fixed:** each throw has its own ghost; they land on their own.
4. **Library list refetch could loop** if the probe says reachable while the song-list fetch itself times out (a slow
   link, 1,395 songs): the "Laptop not reachable" line flickers and the list refetches every probe. Unsure, 35%.
   **Left:** needs a test with the fetch failing while the probe passes; for chat (wave 4 or a fix-up).
5. **Backup errors other than "Server said…" are now treated as laptop off** (`phoneBackup.ts`), so a timeout on a big
   body never shows "backup didn't save". Unsure, 40%. **Left:** for chat; the backup retries within the minute.
6. **Open-screen ceilings are held by a calibrated model with thin margins** (skipping under 125 of 130, 5.5 of 6
   network calls); session Next and heavy tagging are not modelled. Medium. **Left as designed:** the phone's own
   `timings` "open" line is the proof (REPORT); the model only guards the rules.
7. **Hold menu could outlive its row** after Next with it open: the new song's rows need an extra tap. Unsure, 40%.
   **Proved not so:** `TagList` closes the menu on every song change (effect on `songId`, runs even while the list is
   closed), and the player draws the menu only for a tag of the shown song.

## Test gaps
8. A: no proof of "StartVault absent" or "off then on run for real". **Partly:** StartVault is still there (Windows
   refused the delete without an admin window: owner deletes it); off then on run for real this session (REPORT).
9. C: `cards-after-throw` uses the fake player, which saves no verdict, so it shows the same song back; the clean next
   card is proved by the model only. **Left:** the fake player can't judge; the phone check covers it.
10. C and D tests are partly regex on source text. **Left:** the rules themselves are pure functions under test; the
    text checks only pin the wiring.
11. D: the hold menu has one shot from one opener; LESSONS 2026-11-08 asks for every opener. **Fixed:** a shot from the
    Sort-card player added (`hold-menu-sort-card`); the negative margins the review saw are gone.
12. D: no shot of tag edit with the keyboard up (board break 13). **Left:** Change words closes the sheet before the
    field opens; `session-field-open` covers the field.

## Rough
13. Cards: the card is about 300 pt tall against the mockup's 520; about 190 pt of black under "+ Version" (the toast's
    reserved room plus the mini player). **Fixed:** the Undo toast now takes the "+ Version" row's spot (still always
    the same spot), its reserved room is gone, and the card grows into it.
14. Cards: the card behind reads as a slab touching the buttons. **Fixed:** a smaller offset and air above the buttons.
15. Cards: an up-lift puts the card's top at the header's bottom edge, not "never under the header". **Left:** the words
    and the progress line are drawn over it; the comment now says so.
16. Search: the "Laptop not reachable" line appears above the results, so the list jumps about 25 pt (the "nothing
    shifts" rule). **For chat:** a reserved line would cost 25 pt always; owner's call.
17. Session: the Not mine pill sits left while "+ Version" is centred under it; the amber track hugs the art.
    **Left:** the pill sits where Mine / Not mine sit outside a session; for chat if it reads wrong on the phone.
18. Hold menu: Delete in plain white at the bottom, beside Cancel; a slip deletes a line (6 s Undo). **Left:** the
    board's own call (Delete last, plain white).
19. Backup within 60 s: a force-quit inside that minute loses only the backup, not the choice. Low. **Left.**
20. Home's Not played in a while shuffles inside its own 12 songs, so a new day changes the order, not the songs. Low.
    **For chat:** matches NEXT's wording.

## Verdicts as given
A not ready (stale shots, fixtures, proofs: now fixed or stated) · B ready for the phone check (timings in REPORT) ·
C not ready (2, 3, 13, 14: fixed) · D ready with notes (7 proved, 11 fixed).
