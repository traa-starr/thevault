# New songs by themselves: options

Wave 4 memo (D1), 2026-11-11. Nothing built. Pick one, then it becomes a NEXT.

**Today:** a new export reaches the Vault only after five laptop commands by hand (off, scan, dates, import, on).
The server is already always on and makes phone copies by itself (`autocopy.py`): the missing piece is the looking.
**True in every option:** the music folders are only ever read. Listing names and sizes downloads nothing; a
cloud-only file is listed, never opened. All writes go to the Vault's own database and library folder.

## Options
1. **The server looks on a timer.** Every 30 minutes (and once at start) it lists the folders: names and sizes only.
   If nothing changed, it stops there. If something did, it runs the same scan, dates and copy steps the commands run
   now, in the background, with the server still up. New songs are in Sort within half an hour.
   Cost: about one session. One new thing to store: where the music folders are, kept in the Vault library's own
   settings (never in the repo). Laptop work when idle: one folder listing per half hour.
2. **The laptop watches the folders.** Windows tells the server the moment a file lands (a "file watcher": a hook that
   fires on every change). New songs in Sort within a minute.
   Cost: about two sessions and a new package. Exports land in pieces, so it fires many times per song and must wait
   for quiet; it misses what happened while the laptop slept, so it still needs option 1's timer behind it.
3. **The phone asks (the one you didn't ask about).** Opening Sort, or pulling down on it, tells the server "look
   now". The server scans what's new and answers "3 new songs". No timer: the laptop works only when you sort.
   Cost: about one session, plus a small app change (ships by publish, no rebuild). Nothing arrives unless you open
   Sort, so Home's "Recently added" stays stale until then.

## What a senior engineer would pick
**Option 1, with option 3's "look now" added on top.** The timer is the same shape as the phone-copy job that
already runs and has a test, so it's the least new machinery. "Look now" from Sort covers the one time half an hour is
too slow: you just exported and want to sort it. Skip the watcher: it adds a package and edge cases to win minutes.

## How it could go wrong, and the guard for each
- **A file still being exported.** Only take a file whose size was the same on two looks in a row.
- **Scan and a phone write at once.** The scan takes the same one-writer lock every other job takes and waits its turn.
- **A big batch (100 songs).** Fingerprinting reads each new file: low priority, songs appear in Sort one by one.
- **A cloud-only export from another device.** Listed, never downloaded by the Vault; plays once iCloud brings it down.
- **Folder moved or drive missing.** The look fails quietly, `doctor` says "music folder not found". Nothing is removed.

## Still open
- **Not measured:** how long one listing of all 1,395 songs takes here. The build times it first; slow means hourly.
- **Hard to undo (rule 3):** where the folder locations are stored. Proposed: the library's settings file, by the database.
