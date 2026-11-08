# Decisions

Newest at the bottom. Hard-to-undo entries list options, choice and why.

## Phase 0 summary (closed 2026-10-31)
The short version. Full rows with options and reasons are in `decisions/phase-0-1.md`; nothing was deleted.
- **Safety:** my music is read-only. Locked: all of iCloud Drive and FL Studio Projects, enforced by settings plus a hook. Repo is public, standard runners only, no credentials.
- **Scope:** iCloud `Music`, `Session Music`, `tape`, plus loose files. "Mine" = my artist names in title or tags, my override wins. `Downloads\CHE` excluded. Reaper ignored.
- **Phone app:** native iOS app with Expo, songs stored on the phone, laptop syncs (G2, option C). Sideload works (D4c passed), free spare Apple account.
- **Laptop:** Python server + SQLite (FTS5), reached over Tailscale.
- **Library:** one folder, `E:\VaultLibrary`, database and audio together (G2, option A). Found by a marker file, not the drive letter.
- **Backup:** nightly copy to C:, later a copy to the phone at each sync. No iCloud (G2).
- **BandLab:** pulled in, not just linked. Method is hand export in the app (G2, option A). Comes late, Phase 5.
- **Product rules:** tags typed by me, search reorders and never excludes, groups are a button with one-tap confirm, links are database records and never file renames.
- **Workflow:** chat manages, Code builds, I commit. Route is `ROADMAP.md`. Tappable fake-data prototype before each daily screen.

## Phase 1 summary (closed 2026-11-07)
The short version. Full rows are in `decisions/phase-0-1.md`.
- **Done when met:** sorted from the phone without downloading, kept songs play at home and away with the screen locked and the laptop asleep, data survives a SideStore re-sign (away test 2026-11-07).
- **Library:** 1,395 songs, 314 Mine, all imported with phone copies. Audio filed as `audio/<short code>/<real filename>`, phone copies under `phone/`. Short code = 7 characters from the file's hash.
- **Records:** Song / Version / File database plus a journal of my changes; the database rebuilds from the journal. Tags attach to the song. Verdicts save per song in the journal; Undo adds a line, nothing erased.
- **Writes:** one route, `POST /changes`, kinds allow-listed, write lock in the library, phone keeps an outbox and retries.
- **Mine rules:** my verdict wins; `tape` and `#FREEMONEY THE MIXTAPE` are mine; else artist name as a whole word = likely mine. Not mine hides a song from the app for good (Hidden list can restore it); original files are never touched.
- **Server:** laptop only, Tailscale or local, plays songs by id never by path. Reports a server version; the app says when it's out of date.
- **Safety nets:** nightly backup to `C:\VaultBackup`, 14 kept. One phone backup file on the laptop restores the phone after a wipe or reinstall. `doctor` checks Tailscale, server, guard, music fingerprint and scan age.
- **Phone copies:** AAC about 192 kbps, all Mine songs download by themselves, 8 GB limit, offline play.
- **Versions:** called "Versions", only my songs, select mode groups them. Main = newest by date unless I picked one by hand.
- **Compare:** lives inside the normal player; the Compare word becomes a small scroll wheel in place, nothing moves. Borrows the queue's player for the playing song, flips are a hard cut at the same second, one sound at a time, no level match. Streams full quality from the laptop, phone copy offline.
- **Lock screen:** title, seek, next, previous; pause and play work first press, in Compare too. Hidden lock-screen log (long press on the home Update line).
- **Updates:** over the air, hosted by the laptop (expo-updates). Build 22 is the last full build for now. Small fixes ride along in the next batch.
- **Work rules:** one NEXT = one batch of 2-3 phone checks. Board meets only when NEXT or I call it, by the yes/no test in `BOARD.md`. Two failed fixes on the same thing: stop and write it up.
- **Waiting for tagging:** `SAVE ME`, 26 date-only names and `Untitled...` files don't block anything.

Older rows: `decisions/phase-0-1.md` (Phase 0 and Phase 1, word for word).

## From Phase 2 on
| Topic | Choice | Why |
|---|---|---|
| Fold pass, /verify started (2026-11-07) | Fold passed (fast-lane `/next pass`); `/verify` next | Queue item 1 marked fast-lane OK |
