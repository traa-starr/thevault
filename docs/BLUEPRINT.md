# Blueprint: how Phases 1 and 2 fit together

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

## Phase 2: tagging
Added 2026-11-07 by the Phase 2 plan session. Board notes: `board/phase-2-tagging.md`. Mockup: `spike/mockups/tagging-card.html`.

**A tag** is a short typed line pinned to an exact second of a song. It attaches to the song and records the version that was playing.

**Journal lines (whole-tag lines, DECISIONS 2026-11-07).** No new kinds and no schema bump: today's replay already does this.
| I do | Line written |
|---|---|
| Add | `tag_add {tag_id, song_id, version_id, text, at_sec, made_at}` |
| Edit words or time | `tag_add`, same `tag_id` and `made_at`, the new full values. Latest line wins |
| Delete | `tag_remove {tag_id, song_id}` |
| Undo | The line that puts the old full tag back (`tag_add`), or `tag_remove` for a new tag |
- `tag_id` is made on the phone and never changes; it is also how a resend is spotted. `at_sec` keeps 3 decimals. `made_at` is set once.
- Text: trimmed, up to 500 characters, any language and emoji. Empty text is allowed (a mark to fill in later).
- `POST /changes` allows `tag_add` and `tag_remove`. A tag for a song that was merged away follows the merge to the surviving song; a tag for an unknown song is refused once, never retried forever.
- Laptop ships before the phone, so an old server never meets a tag.

**Reading tags.** New read route `GET /tags`: every live tag (id, song, version, text, second). The phone keeps a copy in its own storage, so tags show offline, and lays its outbox on top. That copy also keeps Phase 3 search open on either side.

**Sync state (2.6).** A tag is "Saved on phone" while its change is in the outbox, "On laptop" once the laptop answered. One small grey word; nothing waits on it. The phone backup file already carries the outbox, so unsent tags survive a wipe.

**Screens.** The shared player gets "Tag here" (thumb zone), the tag list under the seek bar, and ticks on the seek bar.
- Tap "Tag here": the second is read from the player at the tap and frozen; the music keeps playing; a one-line field opens at once in a reserved line under the seek bar (above the keyboard) showing "‹ 1:42.3 ›" to nudge. Return saves, Cancel drops it. A second tap within 1 s doesn't start a second tag.
- The draft (song, second, text) is saved on every keystroke and comes back after a kill or lock. Drafts never sync. Next or a song change saves the draft to the song it was tapped on.
- List rows "1:42  line". Tap = jump. Hold = Change words · Move to now · Delete. Every change shows "· Undo" for 6 s in the reserved line. Rows never reorder while playing.
- **Tagging session:** Library header link "Tag songs" (and the Sort tab). The player plus "N of M tagged", Not mine (with Undo) and Next. Pool: Mine songs that can play now; untagged 3x as likely; no repeats until the pool runs out. "Tagged" = at least one live tag. Cards start about 30% in. Close returns to where I came from, same song playing. Borrows the shared player like the sorting cards.
- Taste: small text-like controls, no haptics, fixed-height rows so nothing moves.

**Restore (2.7).** Wipe the phone; it restores from the laptop: `GET /tags` plus the outbox from the phone backup file. Pass = same tags, same seconds, deleted ones stay gone, unsent ones come back. Laptop side: delete the database, rebuild from the journal, compare tags row for row (an old-style `tag_add` without `made_at` included).

## Rating (2.8) and energy
Added 2026-11-09. Board notes: `board/rated-and-quick.md`.
- **Rating:** Fire, Shelved, or nothing. Journal line `song_rating {song_id, value}` (`none` clears it), latest wins; table `song_ratings`; phone change kind `rating_set`; `/songs` carries `rating`. The phone lays unsent taps on top (`ratingStore.ts`).
- **Shelved** is skipped by every shuffle and never dealt by a tagging session (`avoid()` in `playerStore.ts`, the one place). It stays in Library and search, marked with the word, and plays when I pick it.
- **`GET /status`:** songs, mine, copies (made on the laptop), fire, shelved, `on_phone` (what the phone last said it holds).
- **Energy:** the phone counts wake-ups, redraws, network calls and file writes per minute of playing, screen open and locked apart (`energy.ts`), and sends them with its timings. `timings` prints PASS/FAIL against the ceilings in `timings.py`. Locked, the screens aren't redrawn for the clock; network retries back off.

## Proposals and risks
- **Pull-all (chosen):** 2.9 GB on C:, including songs I'll reject, in exchange for instant sorting cards. Hard to reverse in one sense: the Vault won't push files back to cloud-only, since that would change the locked folder. iCloud or Windows can free them.
- **Playlist switch: the biggest build risk.** Streaming and seeking in the playlist player are unproven, and so is a moving window of 1,000+ songs. If it fails twice: stop, report, keep the single player, and bring me options.
- **Doctor's music fingerprint:** pulling must not read as a "music changed" failure. Batch 2 checks this before the real pull.
- **Hard to change later:** journal line shapes (old lines must always replay), the bundle ID, and the `POST /changes` format once tags use it.
- **Shuffle:** it skips songs marked Mine only while sorting. Batch 4 adds a choice so it can play Mine, or the main player would run out of songs.
