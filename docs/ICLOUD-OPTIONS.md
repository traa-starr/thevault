# iCloud tidy: options (ROADMAP 5.0b)

Memo, 2026-11-11. Read-only: counted from the Vault's database and a listing (names and sizes), nothing opened. Song
names are in `spike/output/cloud-tally.txt` (not in the repo). The Vault never writes in iCloud; any change is your hands.

## What's there
- **iCloud Drive:** 2,082 audio files, 11.3 GB (342 are already cloud-only on the laptop).
- **Scanned by the Vault:** 1,546 files, 6.7 GB. **Yours: 731 files, 3.2 GB, and every one has a Vault library copy.**
  Not yours (hidden): 815 files, 3.5 GB. Unsorted: 0.
- **Never scanned:** ~536 files, ~4.6 GB, in other artists' subfolders of Session Music (not yours, by design).
- **So nothing of yours lives only in iCloud.** Everything only in iCloud is someone else's song.

## If the iCloud copies go cloud-only, does the Vault break?
- **Playing your songs (phone or laptop): no.** They play from the phone copy or the library copy on E:, never from iCloud.
- **Phone copies: no.** Made from the library copy. **Restore: no.** It's the database and journal, not iCloud.
- **Scan: no.** It lists names and sizes; a known file keeps its fingerprint. A *new* cloud-only file can't be
  fingerprinted, but new songs now come through `Vault Renders`, not iCloud.
- **One catch, laptop only:** a hidden (not yours) song played from the Hidden list streams from iCloud, so the laptop
  downloads it first. Never run `pull-cloud` after this: it exists to download them all.

## Options
1. **Phone only (the one you asked for).** On the iPhone, remove the downloads of the iCloud music folders. The laptop
   keeps its full copies. Frees phone space, no double copies, the Vault doesn't notice. Undo: tap Download.
2. **Phone and laptop.** Also make the music folders "Free up space" on the laptop (right-click in File Explorer).
   Frees ~6 GB on C:. Costs: the hidden-song catch above; the library copy on E: becomes your only offline copy.
3. **The one you didn't ask about: move the not-yours files out.** Put the 815 + 536 other artists' files in one
   `Other artists` folder (your hands) and make only that cloud-only. Clean folders, but the Vault loses the hidden
   songs' places and every path changes: hard to undo, and nothing you need gets better.

## What a senior engineer would pick
**Option 1 now.** All upside, nothing in the Vault changes, undo is one tap. Option 2 only if C: runs short. Keep the
iCloud copies either way: your library copy on E: has no second copy except iCloud (the nightly backup is the
database, not the audio). That gap is worth its own step (not on the ROADMAP yet).

## Your taps (iPhone, option 1)
1. Open **Files**, tap **Browse**, tap **iCloud Drive**.
2. Press and hold **Music**, tap **Remove Download**. (No such button: it isn't downloaded. Nothing to do.)
3. Same for **Session Music** and **tape**.
4. Check: the folders show a cloud icon. The Vault still plays a song with the laptop off (phone copy).
