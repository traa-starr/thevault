# Roadmap

The whole route, in build order. `VISION.md` says what the app is; `NEXT.md` says the one current step. Written 2026-10-31.

**How to follow it**
- NEXT cites IDs ("Does 2.2 and 2.3"). One NEXT = one phone check.
- Code ticks built items at `/wrap`; chat ticks phone-verified items at `Review.` A phase closes only when I've passed its "Done when".
- New ideas go into Parked unless I promote them. A reorder is logged in DECISIONS. Chat flags any NEXT that isn't next here.
- Short on purpose: no how-to here. Design stays in the options memos.

**Why this order:** each phase needs the one before it. I can't tag songs I can't play. Search needs tags. Grouping relies on
songs being known. Sources and BandLab complete the library. Finishing songs only works once they're all in one place.

## Gate: before any app code
- [x] G1 Finish the architecture memo (`ARCHITECTURE-OPTIONS.md`)
- [x] G2 I approve 4 calls: client option, library location, database backup, BandLab method
- [x] G3 Close Phase 0: fold its DECISIONS rows into a summary, start `app/` and `server/`

## Phase 1: Player (Checkpoint 1). "It's my music player now"
*Laptop*
- [ ] 1.1 Library folder and database (songs, files, versions, tags, groups, links)
- [ ] 1.2 Read-only scanner: `Music`, `Session Music`, `tape`, iCloud root; re-scan finds new files
- [ ] 1.3 Handle cloud-only files (982 of 1,718): fetch gradually, with a progress count and a disk space check
- [ ] 1.4 Duplicates: the same file in two folders is one song
- [ ] 1.5 Auto "mine" detection, unknown by default
- [ ] 1.6 Source tag (FL), title and date filled in from the file
- [ ] 1.7 Compressed phone copies (~192 kbps)
- [ ] 1.8 Server: serves known songs by id only, over Tailscale
- [ ] 1.9 Nightly database backup to C: (G2), with a warning when it is skipped
- [ ] 1.10 `doctor` script: checks Tailscale, server and guard before phone tests, stops test servers after
- [ ] 1.11 Build upkeep: full Xcode log saved on a failed build

*Phone*
- [ ] 1.12 Real app, built and sideloaded
- [ ] 1.13 Prototype: player screen, tappable with fake data
- [ ] 1.14 Library list: scroll, sort, basic title filter
- [ ] 1.15 Player: play, pause, seek, next, previous, shuffle, queue
- [ ] 1.16 Background and lock-screen playback
- [ ] 1.17 Songs stored on the phone: downloads with progress, storage limit, offline play
- [ ] 1.18 Survival test: app data survives a SideStore re-sign. **Must pass before tagging starts; tags can't be replaced**

**Done when:** I play a song at home and away with the screen locked and the laptop asleep, and app data survives a re-sign.

## Phase 2: Tagging (Checkpoint 2). "My songs start having memory"
- [ ] 2.1 Prototype: tagging card, tappable with fake data
- [ ] 2.2 Tagging session: flashcards, random songs favoring untagged, progress counter, normal player controls
- [ ] 2.3 Tap at a moment, type or dictate a line; it saves as a timestamped tag
- [ ] 2.4 Tap a tag to jump to that moment; edit and delete tags
- [ ] 2.5 One-tap "not mine" on the card, Mine filter everywhere, manual choice always wins
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
- [ ] 4.1 "Add to group / New group" button on player and card
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
| 1.1 | How songs, files and versions are stored | Hard to undo; Code brings options |
| 1.3 | How many cloud-only songs to pull down | ~7.7 GB scanned in total, and many aren't mine |
| 1.18 | What to do if data doesn't survive a re-sign | Restore from laptop, or pay $99 |
| Phase 3 | Does search run on the phone or the laptop? | The spike tested search on the laptop only; offline search needs it on the phone. Test before building |
| Phase 5 | FL project backup | 155 projects have no backup. Can be decided sooner |

**Known cost of keeping BandLab late:** those songs miss tagging until Phase 5, and the acceptance test won't cover them until they're tagged.
