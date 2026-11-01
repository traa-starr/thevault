# Blueprint: how the finished Phase 1 fits together

Written 2026-11-01 by the plan session. Choices behind it are in `DECISIONS.md`; build order is in `BATCH-PLAN.md`.
Words used here:
- **Route:** one address on the laptop server that the phone can call.
- **Outbox:** a small file on the phone holding changes the laptop hasn't confirmed yet.
- **Playlist player:** the audio package's built-in player that holds a list of songs and moves through them itself.

## The whole shape
The laptop keeps the master record. The phone sends it choices and streams from it. Kept songs also get a copy on the phone, so they play with the laptop asleep. Music folders are only ever read.

## Data
**Laptop, in `E:\VaultLibrary`**
| What | Where | Can it be recomputed? |
|---|---|---|
| Every choice of mine | `journal.jsonl`, lines only added | **No.** This is the record |
| Songs, verdicts, tags, groups | `vault.db` | Yes, rebuilt from the journal |
| Scan results | `vault.db` (`files`, `sources`) | Yes, by scanning |
| Mine / not mine | `song_fields`, field `mine` | Manual values come from the journal; guesses are recomputed |
| Kept originals | `audio/<code>/<real filename>` | Yes, from the music folders while the source exists |
| Phone copies | `phone/<code>/<real filename>` | Yes, from the kept original |

- **Kept** means the song's `mine` value is "mine". "Likely mine" is not kept until I tap it.
- **Hidden** means the value is "not mine". The song stays in the database and leaves the app's main lists.
- Which originals and copies exist is read from the disk, so no new table and no schema bump. A bump deletes and rebuilds the database, so avoid one.
- Backup: nightly copy of `vault.db` and `journal.jsonl` to a folder on C:, 14 copies kept.

**Phone, in the app's own storage**
| What | Why it can be lost |
|---|---|
| Laptop address | Retyped |
| Outbox | Only changes the laptop hasn't confirmed are at risk |
| Kept manifest and song files | Downloaded again from the laptop |
| Survival stamp | Exists only to detect a wipe |

Saved paths are relative to the app's folder, because iOS can change the folder's full path. If a wipe happens, the app rebuilds from the laptop (DECISIONS). $99 is considered only if wipes recur.

## Server routes
| Route | Type | Does |
|---|---|---|
| `GET /songs` | Read | Songs, leaving out not mine; adds a `sorted` flag (my manual value exists) |
| `GET /songs?hidden=1` | Read | Only the not-mine songs, for the Hidden list |
| `GET`/`HEAD /songs/{id}/audio` | Read | Stream by id, with seeking. Prefers the library copy, then a music folder place |
| `GET /sorting/sets` | Read | Folders and repeated name patterns with their songs, for the bulk sweep |
| `GET /kept` | Read | Kept songs with a phone copy: id, title, code, size, fingerprint |
| `GET /songs/{id}/copy` | Read | The phone copy, resumable |
| `GET /health` | Read | Library present, last backup age, last scan age |
| `POST /changes` | **Write** | The only write route. Takes a list of `{id, kind, data}` |

Reads keep the read-only database connection. Laptop commands, not routes, do pulling, importing, copies and backup. The phone can never start them.

### How writes stay safe
- No route writes to a music folder, and `POST /changes` touches only the journal and database.
- Kinds are allow-listed. Today: `mine_set`, `mine_restore`. Any other kind is refused.
- Song ids and values are checked, the body size is capped, and a repeated change id does nothing.
- A required custom header stops a web page in a browser from posting across sites. The Host check and Tailscale-only listening stay.
- A lock file in the library covers each journal-and-database write, across server and laptop commands.
- The server opens a fresh `Store` for each write, so it sees what laptop commands did. Batch 1 measures how long the journal read takes.
- If the lock can't be had in 5 seconds, the server answers "busy" and the phone's outbox tries again.

## The first write path: Mine / Not mine / Undo
1. I tap Not mine. The app writes `{id, kind: mine_set, data: {song_id, value}}` to the outbox and moves to the next song at once.
2. The outbox sends it to `POST /changes`.
3. The server reads the song's current `mine` row and journals a `song_field` line (`field=mine`, `origin=manual`) that also holds the earlier value.
4. The database updates, the server answers, and the outbox drops the entry.
5. Undo, or Restore in the Hidden list, sends `mine_restore`. The server journals a new `song_field_restore` line that puts back the earlier value, guess or manual. Nothing is erased.

Why it holds:
- `fill_mine` skips manual values, and a guess can't overwrite one, so re-scans leave a verdict alone.
- `song_merge` carries manual values along when songs join.
- A verdict on the song survives a cloud file's key changing when it gets its fingerprint.
- Replaying the journal gives the same result, because each line holds what it needs.

**Bulk sweep** sends one change per song in one list, sharing a batch id. Undo restores each one. **Phase 2 tags** use this same route and outbox: add `tag_add` and `tag_remove` to the allow-list. Tags save to the outbox first, which is also the "saved on the phone, synced when reachable" of ROADMAP 2.6.

## Cloud-only songs
`vault_cli.py pull-cloud` reads each cloud-only place one at a time, read-only, so iCloud downloads it to its usual spot on C:. It shows a progress count, stops under 10 GB free on C:, and can be stopped and rerun. A scan then records the fingerprints. Measured 2026-11-01: 864 places, 2.9 GB, 45 GB free.

- The Vault writes nothing in iCloud; iCloud does its own download.
- Files may later return to cloud-only. The server's live check still says "not on laptop yet" and a rerun fixes it. Kept songs stop depending on this once imported.

## Import and phone copies
`vault_cli.py import` handles songs kept so far and can be rerun as sorting goes on.
1. Copy the original to `audio/<code>/<real filename>`, checking the fingerprint.
2. Make the phone copy. A wav or high-bitrate file becomes AAC at about 192 kbps. A compressed file already at or under that is copied as is, so it isn't compressed twice.
3. Report sizes.

Not-mine songs are never imported.

## App
```
Library (root) ── tap song ──> Player (full screen)
   │  now-playing bar on every screen ──> Player
   ├── Sorting: bulk sweep ──> cards
   └── Settings: laptop address, Hidden songs, storage, backup warning
```
- **Shared player:** one player above all screens, so Back no longer stops the music. It holds the current song, play order, queue, position and whether a song plays from the phone or the laptop. Sorting cards and the Phase 2 tagging card use it too.
- **Playlist player:** lock-screen next and previous only exist on it. It holds a moving window of upcoming songs, fed by `playOrder.ts`, so songs should keep advancing while locked.
- **Lock screen:** title, seek, next, previous.
- **Sorting:** likely mine first, then the bulk sweep with contents shown before confirming, then one card per song starting about 30% in. Big buttons plus swipe (right Keep, left Not mine), 5-second Undo, progress counter.
- **Song source:** a downloaded copy if the phone has one, else the laptop stream.

## What works where
| | Laptop on, home or away | Laptop asleep or off | E: unplugged, laptop on |
|---|---|---|---|
| Play a kept song on the phone | Yes | **Yes** | Yes |
| Stream any other song | Yes | No | Only if its music folder file is local (server must start without E:: not built, so today no) |
| Sort | Yes | No | No: "library missing" |
| Mine / Not mine tap | Yes | Waits in the outbox | Waits in the outbox |
| Tags (Phase 2) | Yes | Saved on the phone, sent later | Saved on the phone, sent later |
| New downloads to the phone | Yes | No | No |
| Nightly backup | Yes | Runs when next awake | Skipped, with a warning |

"Away" needs Tailscale on the phone and internet at both ends.

## Left open for Phase 2
- `tags` table and journal kinds already exist. Tags attach to the song and quietly record the version.
- The outbox and `POST /changes` carry tags with no new route.
- The shared player exposes current time and seeking, which tap-a-moment and jump-to-tag need.
- The sorting card's frame is built to take a tagging card.
- 1.18 must pass before real tagging.

## Proposals and risks
- **Pull-all (chosen):** 2.9 GB on C:, including songs I'll reject, in exchange for instant sorting cards. Hard to reverse in one sense: the Vault won't push files back to cloud-only, since that would change the locked folder. iCloud or Windows can free them.
- **Playlist switch: the biggest build risk.** Streaming and seeking in the playlist player are unproven, and so is a moving window of 1,000+ songs. If it fails twice: stop, report, keep the single player, and bring me options.
- **Doctor's music fingerprint:** pulling must not read as a "music changed" failure. Batch 2 checks this before the real pull.
- **Hard to change later:** journal line shapes (old lines must always replay), the bundle ID, and the `POST /changes` format once tags use it.
- **Shuffle:** it skips songs marked Mine only while sorting. Batch 4 adds a choice so it can play Mine, or the main player would run out of songs.
