# Roadmap

The whole route, in build order. `VISION.md` says what the app is; `NEXT.md` says the one current step. Written 2026-10-31.

**How to follow it**
- NEXT cites IDs ("Does 2.2 and 2.3"). One NEXT = one phone check.
- Code ticks built items at `/wrap`; chat ticks phone-verified items at `Review.` A phase closes only when I've passed its "Done when".
- New ideas go into Parked unless I promote them. A reorder is logged in DECISIONS. Chat flags any NEXT that isn't next here.
- Short on purpose: no how-to here. Design stays in the options memos.

**Why this order:** each phase needs the one before it. I sort mine from not mine first, by streaming, so nothing that isn't mine is ever stored on the phone. I can't tag songs I can't play. Search needs tags. Grouping relies on
songs being known. Sources and BandLab complete the library. Finishing songs only works once they're all in one place.

## Gate: before any app code
- [x] G1 Finish the architecture memo (`ARCHITECTURE-OPTIONS.md`)
- [x] G2 I approve 4 calls: client option, library location, database backup, BandLab method
- [x] G3 Close Phase 0: fold its DECISIONS rows into a summary, start `app/` and `server/`

## Phase 1: Sort, then play (Checkpoint 1). "My catalogue is sorted, and it's my music player"
**Order inside Phase 1:** batches in `BATCH-PLAN.md`: first write + 1.18 stamp · 1.9, 1.3, 1.19 · 1.15, 1.16 · 1.21 · 1.23 · 1.22, 1.7 · 1.17, 1.18 final. Reordered 2026-11-01 (DECISIONS).
*Laptop*
- [x] 1.1 Library folder and database (songs, files, versions, tags, groups, links) *(built and self-tested; my check: open `E:\VaultLibrary`)*
- [x] 1.2 Read-only scanner: `Music`, `Session Music` (loose files + `#FREEMONEY THE MIXTAPE` only), `tape`, iCloud root; re-scan finds new files
- [x] 1.3 Cloud-only files (864 places, 2.9 GB, 2026-11-01): all pulled to the laptop once, up front, one at a time, with a progress count, stopping under 10 GB free on C: *(laptop-verified 2026-11-01)*
- [x] 1.4 Duplicates: the same file in two folders is one song
- [x] 1.5 Auto "mine" detection, unknown by default
- [x] 1.6 Source tag (FL), title and date filled in from the file
- [ ] 1.7 Compressed phone copies (~192 kbps), kept songs only
- [x] 1.8 Server: serves known songs by id only, over Tailscale; streams with seeking, so the phone keeps no copy *(phone-verified 2026-11-01 in Safari)*
- [x] 1.9 Nightly database backup to C: (G2), with a warning when it is skipped *(laptop-verified 2026-11-01)*
- [x] 1.10 `doctor` script: checks Tailscale, server and guard before phone tests, stops test servers after; warns when the scan is old *(phone-verified 2026-11-01)*
- [x] 1.11 Build upkeep: full Xcode log saved on a failed build *(built, unproven until a build fails)*

*Phone*
- [x] 1.12 Real app, built and sideloaded *(phone-verified 2026-11-01)*
- [x] 1.13 Prototype: player screen, tappable with fake data *(phone-verified 2026-11-01)*
- [x] 1.14 Library list: scroll, sort, basic title filter *(phone-verified 2026-11-01)*
- [x] 1.15 Player: play, pause, seek, next, previous, shuffle, queue *(phone-verified 2026-11-01, batch 3)*
- [x] 1.16 Background and lock-screen playback *(phone-verified 2026-11-01, batch 3)*
- [ ] 1.17 Kept songs stored on the phone: downloads with progress, storage limit, offline play
- [ ] 1.18 Survival test: app data survives a SideStore re-sign. **Must pass before real tagging (Phase 2); tags can't be replaced.** Sorting verdicts and quick tags save straight to the laptop, so they don't wait on it *(first half passed 2026-11-01: stamp kept across a refresh)*

*Stream and sort (needs the laptop on and reachable)*
- [x] 1.19 Prototype: sorting card, tappable with fake data *(phone-verified 2026-11-01)*
- [x] 1.20 Stream any song from the laptop: tap and it plays, nothing saved to the phone, seeking works *(phone-verified 2026-11-01)*
- [x] 1.21 Sorting session: card for a random unsorted song, one-tap Keep / Not mine, optional quick tag, progress counter. Verdicts save to the laptop. Mine filter; my manual choice always wins. First pass is getting songs out. Never shows a song I already sorted anywhere *(Hidden list + Restore phone-verified 2026-11-01; phone-verified Batch 4 2026-11-04)*
- [ ] 1.22 Import list: only kept songs are imported; not-mine songs stay out of the library and the app
- [x] 1.23 Versions, manual (phone-verified 2026-11-04; select mode in Batch 4c): "this is another version of song X" from library, player or sort, any time; versions as a second layer of sort. Pulled forward from 4.1/4.7 (DECISIONS 2026-11-01); name and fingerprint proposals stay in Phase 4

**Done when:** I've sorted my catalogue from the phone without downloading it, then play a kept song at home and away with the screen locked and the laptop asleep, and app data survives a re-sign.

## Phase 2: Tagging (Checkpoint 2). "My songs start having memory"
- [ ] 2.1 Prototype: tagging card, tappable with fake data
- [ ] 2.2 Tagging session: flashcards, random songs favoring untagged, progress counter, normal player controls
- [ ] 2.3 Tap at a moment, type or dictate a line; it saves as a timestamped tag
- [ ] 2.4 Tap a tag to jump to that moment; edit and delete tags
- [ ] 2.5 "Not mine" stays one tap on the tagging card and the Mine filter works everywhere; the main sorting is done in 1.21
- [ ] 2.6 Tags save on the phone first, sync to the laptop when reachable, show sync state
- [ ] 2.7 Restore test: wipe the phone's copy, get all tags back from the laptop

**Done when:** I've done real sessions, and a restore test loses nothing.

## Phase 3: Search (Checkpoint 3). "Rap a line, find the song"
- [ ] 3.1 Ranking ladder: exact phrase > words in order with gaps > all words > some words by rarity; never excludes
- [ ] 3.2 Common words down-weighted, not banned, so "has to" works
- [ ] 3.3 Slang word endings (`drip`/`drippin`), which the standard tool misses
- [ ] 3.4 Misspelling tolerance and a learned slang spelling table
- [ ] 3.5 Boost the result I pick for that search
- [ ] 3.6 Results show the matched tag and timestamp; tap to jump there
- [ ] 3.7 Acceptance test: at ~50 tags I write 20 searches with known answers; a script re-runs them after every search change

**Done when:** the 20 searches pass and I find a song from a half-remembered line.

## Phase 4: Groups (Checkpoint 4). "Versions live together"
- [ ] 4.1 "Add to group / New group" button on player and card *(manual linking moved to 1.23)*
- [ ] 4.2 Name proposals, with the two D3 bugs fixed: FL's `-001` numbering; generic names like `Project_N` never grouped by name alone
- [ ] 4.3 Audio fingerprint proposals: 0.8+ high confidence, 0.65-0.8 "maybe"
- [ ] 4.4 Auto-name from the title; strip a trailing number only when other files share the base
- [ ] 4.5 One-tap confirm; corrections are remembered
- [ ] 4.6 Merge and split groups
- [ ] 4.7 Group view: dated versions, and which one is current

**Done when:** I group real versions in one tap, and a correction stays corrected after a re-scan.

## Phase 5: Sources and BandLab (Checkpoint 5). "Everything is in here"
*BandLab*
- [ ] 5.1 Test one export: format, title, revision access (method from G2)
- [ ] 5.2 Watch the `BandLab Exports` folder and copy into the library, leaving the original alone
- [ ] 5.3 Import card: title, optional revision date, source tag (BandLab)
- [ ] 5.4 Checklist ("47 of 83 pulled in"); no song is final until checked
- [ ] 5.5 Older revisions for songs I choose; same title and newer proposes a new version
- [ ] 5.6 Tag the BandLab exports already in `Music` by hand
- [ ] 5.7 Optional Shortcut to cut export taps

*FL and cards*
- [ ] 5.8 Bounce-to-`.flp` proposals by time and name, with confidence; autosaves count as signal
- [ ] 5.9 Confirm on the phone; links are database records, never renames
- [ ] 5.10 Prototype: source cards, tappable with fake data
- [ ] 5.11 Source status cards: "Linked to FL project" and "Open in BandLab"
- [ ] 5.12 Open in FL Studio, for real: tap on the phone, that `.flp` opens on the laptop, id only
- [ ] 5.13 Cover art on every song
- [ ] 5.14 Compare phone-made and PC-made songs by source tag

**Done when:** the checklist is finished, and every song shows a card.

## Phase 6: Release pipeline (Checkpoint 6). "Songs get finished"
- [ ] 6.1 Interview first: what my release sprint really looks like, what's in-app and what's a checklist
- [ ] 6.2 "Final" status on a song or version
- [ ] 6.3 Sprint flow: pick a song, then master, art, metadata, distribution, with deadlines that push against perfectionism
- [ ] 6.4 Release history

**Done when:** one real song goes through the sprint and gets released.

## Parked, no date (I can promote any of these)
Fast rating · lyrics notebook · BPM/key · optional rename (confirm + undo log) · Siri, Shortcuts, lock-screen "play the song
with that line" · widgets · Whisper draft tags · "similar meaning" search section · always-on home server · paid Apple account.

## Decisions to raise, one step before each blocks
| Before | Call | Note |
|---|---|---|
| 1.1 | Audio filing: fingerprint folder (C), mirrored names (D), or C plus a browse folder (E) | Shape C and tags-on-song decided. Report done: 1,395 files, names unique except `flip`. Mine to choose, no default |
| Phase 3 | Does search run on the phone or the laptop? | The spike tested search on the laptop only; offline search needs it on the phone. Test before building |
| Phase 5 | FL project backup | Declined 2026-10-31. Parked; don't raise unless I do |

**Known cost of keeping BandLab late:** those songs miss tagging until Phase 5, and the acceptance test won't cover them until they're tagged.
