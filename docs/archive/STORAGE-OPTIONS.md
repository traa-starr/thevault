# Storage options (ROADMAP 1.1)

Written 2026-10-31. **Status: waiting for your pick.** Nothing is built and no folder exists. This decides how the library at
`E:\VaultLibrary` remembers songs, files, versions, tags, groups and links. It's hard to undo once tags exist, so it's your call.

Words used here:
- **Database:** one file (SQLite) that holds the lists and tags. Fast to search.
- **Journal:** a plain text file where every change you make is added as one new line, never edited. Think of a tape recorder
  for your tagging.
- **Hash:** a fingerprint of a file's exact bytes. Same bytes, same hash, whatever the name or folder.

## The three words
| Word | Means | Example |
|---|---|---|
| **File** | One audio file on a disk | `ANY WAY.wav` in `Music`; its compressed phone copy is a second file |
| **Version** | One take or render of a song | The `.wav` bounce from March; the `.mp3` BandLab export from June |
| **Song** | What you'd call "the song". Holds one or more versions | "ANY WAY" |

Every audio file starts as its own song with one version. Grouping (Phase 4) later moves versions into one song. Until you
confirm a group, nothing is merged.

**Where tags live:** on a version, not the song, because a tag says "at 1:23" and 1:23 is only true for that bounce. The song
page shows all its versions' tags together, and search finds the song. Merging songs carries the tags along.

## The options
| | A. Flat: one table of files | B. Song / Version / File in one database | C. B plus a journal of your changes (**pick**) |
|---|---|---|---|
| What it is | Every file is a song. Groups are extra links | Three linked lists as above. Scan results and your tags in the same database | Same shape as B. Anything *you* did (tags, groups, "mine", confirmed links) is also added to a journal file |
| Grouping versions | Awkward: no real "song" to hang them on | Natural | Natural |
| Re-scan safe for tags | Yes, if careful | Yes, if careful | Yes, and the journal makes it provable |
| Database lost | Tags gone unless backed up | Tags gone unless backed up | **Rebuild**: scan again, replay the journal |
| Phone sync (Phase 2.6) | Needs its own scheme | Needs its own scheme | The journal is the sync: phone sends its new lines, each with an id, so repeats do nothing |
| Extra work | Least | Some | B plus one rule: every change is written to the journal first |
| Risk | Rebuilding the model at Phase 4 | Tags are only as safe as the backup | Two records to keep in step (one function does both) |

**What a senior engineer would pick: C.** Scan results (file lists, fingerprints) can always be recomputed from your music, so
they're disposable. Tags are the only thing here you can't recompute. C keeps the two apart, so losing or corrupting the
database costs a rebuild, not your tags. The journal is also what the phone needs to sync later. A is cheaper today and
rebuilt at Phase 4, which is the expensive moment to find out. B is a fair choice if you'd rather keep it simple: the
backup alone protects tags up to the last night.

## How a re-scan finds new files without losing tags
- The scan only adds and updates the *file* list. It never touches tags, groups, "mine" choices or links.
- A file is recognised by its hash first. If that isn't known yet (cloud-only files aren't downloaded, ROADMAP 1.3), by path +
  size + modified time, and the hash is added when the file is first fetched.
- **Moved or renamed original:** same hash, so same file; the path is updated and its song and tags stay.
- **Original deleted from iCloud:** marked "missing at source", never removed. The library copy and its tags stay.
- **Edited file (new bytes):** shown as a new file. The scan proposes it as a new version of the old song; you confirm. It does
  not silently inherit tags that were timed against the old audio.
- **Rejected proposals are remembered**, so a group you said no to doesn't come back after the next scan.

## One song, many versions
- A song has a list of versions, each with a date, a source (FL, BandLab) and a "current" mark you can move.
- A version has its file(s): the library copy and the phone copy (~192 kbps, rebuildable any time from the library copy).
- **Links** (bounce to `.flp`, "Open in BandLab") are separate records pointing at a version. They never rename anything
  (DECISIONS). Proposed links wait for your tap, same as groups.
- BandLab older revisions (Phase 5) are just more versions, or "linked history" with no audio if you don't pull them.

## File layout in the library (also part of this call)
Audio is filed by hash, not by title: `audio/<first 2 letters of hash>/<hash>.<ext>`, and phone copies the same way in
`phone/`. Renaming a title or merging songs never moves a file, and two songs with the same name can't collide. Only the
database (and journal) know the names. The journal also records each file's original name, so a rebuild still knows what
`3fa9…wav` was.

## If the database is lost and restored from the C: backup
- The nightly copy (ROADMAP 1.9) brings back everything as of last night. **Up to a day of tags can be missing.**
- Those tags are very likely still on your phone (it keeps a working copy and a queue). Each tag has its own id, so when the
  phone syncs again it re-sends what the laptop lacks, and nothing is doubled. That's the restore test, ROADMAP 2.7.
- Under C the journal is backed up with the database; if the database file itself is bad, it's rebuilt from the journal.
- **Not covered:** losing laptop and phone at the same moment. Tags from the last day or two would go. (Backup option C in
  `ARCHITECTURE-OPTIONS.md` (same folder), the iCloud copy, is what would close that; G2 chose the C: copy and the phone copy instead.)

## If E: is unplugged
- The library is **offline**, because the database and audio both live there (G2). The phone keeps playing its own copies and
  keeps tags in its queue.
- The server looks for a marker file in the library, not the letter `E:`. No marker found means "library missing", said plainly.
- **It never creates a fresh empty library** in the old place. Otherwise a changed drive letter would start a second, blank
  library and your tags would seem to vanish. The scan, the import and the backup all refuse to run until the library is back.
- The nightly backup is skipped (there's nothing to copy) and the app shows the warning.
- Plugging E: back in needs no repair: the phone sends the queued tags and the scan catches up.

## Approve sheet
| Call | Options | Pick |
|---|---|---|
| **Storage shape** | A. Flat files table · B. Song / Version / File, one database · C. B plus a journal of your changes | **C** |
| **Tags attach to** | A. The version (timestamp stays true) · B. The song (simpler, timestamps can drift between bounces) | **A** |
| **Audio filing** | A. By hash in `audio/` and `phone/` · B. Readable names, `Artist/Title.ext` | **A** (B breaks on renames and name clashes) |

Reply at `Review.` in chat with your three picks (or "all the picks"). Code then builds ROADMAP 1.1 from them; the exact table
list comes to you for an OK only if your choice leaves it open.
