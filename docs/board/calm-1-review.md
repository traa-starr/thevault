# Fresh-eyes review: Calm the app, part 1 (B, C, E), 2026-11-12

Sonnet, read-only, given NEXT, LESSONS, the diff and the changed-screen shots. 9 catches: 0 high, 3 medium, 6 low.
Copied here by Code before any fix; what was done with each is under "Outcome".

## Medium
1. **Settings' Hidden count is stale after a restore on the phone.** It's asked again only on Back, when the outbox
   may not have sent yet, so the row still says 815 after 3 restores. (app/Settings.tsx, app/App.tsx `check`)
2. **"In Library" stays even if the laptop refuses the restore.** The row is marked when the change is queued and never
   reads the outbox's refusals; the song stays hidden and reappears next open. (app/Hidden.tsx `restore`)
3. **The desk redraws on window focus and can shift under the cursor.** `loadSongs` empties `restored`, In Library rows
   vanish and rows jump; a restore still in flight gets a fresh enabled button, so a double click can send two. (desk.py)

## Low
4. E: a song with two places that both move (a kept file plus a skip copy with a different fingerprint) is split: the
   first cluster takes the song, the second gets a new one. (songs.py `have - claimed`)
5. E: a file moved while cloud-only gets a new song; after download its fingerprint matches the orphan, but the new path
   already has a sure place, so the orphan is never taken back. Two songs.
6. E: re-copying identical bytes of a deleted song brings its verdict and tags back. Arguably right; undocumented.
7. Hidden search: a song with no folder doesn't match "loose files", though its chip says Loose files. (hiddenCore.ts)
8. Desk: no Content-Security-Policy header. The gates themselves look sound (header forces a preflight never answered,
   rebinding Host 403, Tailscale 404, text via textContent). Optional: `default-src 'self'` on /desk.
9. Hidden rows that can't play (cloud only, missing) are disabled at 40% with no word on tap.

## Checked and fine (reviewer)
Chips order and the chip that's on; Restore / In Library same width; 60 rows, 44 touch; Library refetches when the
outbox empties; laptop-off shot; render folder's own move handling runs before link_songs and isn't undermined; no
audio, credentials or addresses in the diff.

## Outcome
7 fixed, 2 not taken.
1. Fixed: restores on their way come off the count at once (`restoresOnTheirWay`), and Settings asks the laptop again
   when the outbox empties. Test in `app/hidden.test.mjs`.
2. Fixed: each restore remembers its change; one that leaves the outbox without the laptop taking it gives the row its
   Restore back (`refusedRestores`, `onSent`). Test in `app/hidden.test.mjs`.
3. Fixed: back to the window, rows keep their place and In Library stays; new hides join at the top; no reload while a
   restore is on its way. `server/test_desk.py`, desk shots redrawn (no page errors).
4. Not taken. Checked on the real path: a Phase 0 duplicate's "skip" verdict belongs to its location by design, so a
   moved duplicate loses its link to the kept file whatever the song lookup does; fixing it is a change to how
   duplicates are judged, not to moves. Written into `ICLOUD-ORGANIZE.md` as a limit.
5. Taken as a memo line (`ICLOUD-ORGANIZE.md`): move only downloaded files. A code fix would join a song made in this
   scan to an older one, which is the risky kind of guess the memo's pick avoids.
6. Taken as a memo line: on purpose, now written down.
7. Fixed on the phone and the desk: the search looks at the folder as its chip says it. Tests on both.
8. Fixed: `Content-Security-Policy` (this server only, no framing) and `X-Frame-Options: DENY` on /desk. Test.
9. Not taken: the design system's rule is that a row that can't play is at 40% (Library does the same), and the row's
   second line now starts with its date and "Cloud only" / "File missing", so the reason is on screen before the tap.
