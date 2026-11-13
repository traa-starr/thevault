# Organizing iCloud safely (ROADMAP 5.0b, 5.0c)

Memo, 2026-11-12. Read-only: nothing listed or opened for it; counts from `ICLOUD-OPTIONS.md`. Your call on each pick.

## 1. A second copy of your songs' audio first (5.0c)
Your 731 songs live as the Vault's own copies on E: (3.2 GB, `audio/` in the library). E: is a USB drive; the only
other copy is iCloud, and organizing iCloud is exactly what puts that copy at risk. The nightly backup holds the
database and journal, not audio.
- **A. Add the audio to the nightly backup on C:** (`C:\VaultBackup`): a different physical drive, automatic, free.
  It only adds new files (never mirrors a delete), so a mistake on E: can't wipe it. Costs ~3.2 GB on C:.
- **B. A second USB drive** you plug in now and then: survives the laptop dying, but only as fresh as your last plug-in.
- **C. The one you didn't ask about: the phone.** It already holds a copy of every Mine song (smaller, for listening).
  Fine for "I can still hear it", not for mixing or a release: not a real backup of the masters.

**Senior pick: A now** (one step, automatic), and B later if you want a copy that leaves the laptop. iCloud stays the
copy that leaves the house. Nothing in iCloud moves until A has run once and doctor shows it.

## 2. How you organize iCloud, with the music guard exactly as it is
- **A. Your hands, from a move list.** The Vault prints a plan (song, now in, suggested folder) to `spike/output/`
  (not the repo). You drag files in File Explorer, a batch at a time, then click scan. Code never moves anything.
- **B. A mover script in `spike/` that only you run.** Code writes it (the music folders come in as arguments, so the
  guard allows writing it); you run it in your own window: a dry run first, then the moves, plus an undo list it writes
  to `spike/output/`. Code can't run it (the guard blocks a move command that names a music folder).
- **C. The one you didn't ask about: organize the Vault, not iCloud.** Leave iCloud as the untouched archive and let
  the Vault be the tidy view (Library, versions, Hidden, the desk). Zero risk; iCloud just stays messy.

**Senior pick: A, in small batches, after section 1.** No new tool with move power over your only originals, and
each batch is checked by a scan. B only if the list runs to hundreds of moves; C if, once you see the list, the mess
stops mattering.

**Guard rules that stay exactly as they are:** iCloud Drive, FL Studio Projects and `Vault Renders` stay locked for
Code (the hook and the settings deny list); a script that names a locked folder and writes stays blocked; a command
mentioning a locked folder with a write verb stays blocked; Code never runs a move, a rename or a delete there.

## 3. What the moved-file test (E) means for each
Tested today on made-up files: a file **renamed**, **moved into a subfolder**, or **moved to another scanned folder**
keeps its song, Mine verdict, tags, rating, versions and phone copy after a scan. The first run failed (each moved
file became a new song, its history left behind); the scanner was fixed the same day and the test now passes. A dry run
on a copy of the real database changed nothing.
- **Limits, for any way:** a **cloud-only** file has no fingerprint, so move only downloaded files (342 were cloud-only
  in the last count). A file moved **out of the scanned folders** (into another artist's subfolder of Session Music)
  reads as gone. A **re-exported** file is a different file: that's the render folder's job, not a move. A file moved
  while cloud-only stays a new song even once downloaded. A Phase 0 duplicate copy moved with its kept file can split
  off. A song whose file you delete, then copy back identical later, gets its history back (on purpose).
- **A:** safe now; scan after each batch and read doctor's Songs line. **B:** same, and its undo list is a second net.
  **C:** nothing moves, so E doesn't come into it.
