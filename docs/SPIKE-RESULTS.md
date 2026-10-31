# Spike results (2026-10-31)

Scripts are in `spike/`. Output with song names stays in `spike/output/` (gitignored).

## D1 Inventory
| Folder | Files | Size | Cloud-only |
|---|---|---|---|
| Music | 442 | 1.94 GB | 180 |
| Session Music | 1,232 | 5.53 GB | 801 |
| tape | 23 | 0.13 GB | 1 |
| iCloud root | 21 | 0.07 GB | 0 |

- Mostly mp3 (1,496 of 1,718), then wav (135) and m4a (87). Dates run 2021-2026.
- **Artist names don't decide much.** Name in the path: 16 of 1,718. Among the 736 files on the laptop, ~18% of Session Music
  and ~16% of Music match by name or tag, and most files have no artist tag at all. Expect lots of manual "mine / not mine".
- Tags on cloud-only files weren't read, because that downloads each file (roughly 3.5 GB+ for Session Music).
- Cloud-only files didn't crash anything.

## D2 Bounce → .flp matching
- **155 real projects + 787 FL autosaves**, not 942 projects. All from 2025-2026. Older songs were made in Reaper or on another
  PC, so they correctly match nothing (your call: this PC only for now). `Downloads\CHE` is another artist's, excluded.
- Of 569 bounces considered, 204 are from the period these projects cover:

| Nearest within | Projects only | Projects + autosaves |
|---|---|---|
| 5 min | 36% | 47% |
| 15 min | 45% | 54% |
| 1 h | 50% | 58% |
| 24 h | 70% | 75% |

- Name matches: 59. Time alone picks the same project as the name for 39 of them (66%). No true answer key exists beyond names,
  so these are estimates. The remainder of the 204 may be non-FL songs, so the real hit rate is probably higher.
- **Autosaves help**: they add ~10 points, and they show when a project was being worked on.
- Timestamps look trustworthy: only 29 of 569 bounces look bulk-copied, 0 of 155 projects.
- **Failure cases:** generic names (41 projects are "Project..."/"Untitled"), one project with many bounces, bounces rendered
  long after the last save, projects re-saved later, and bulk-copied files.
- **Verdict:** works as a proposal with confidence levels, as planned. Not safe without your one-tap confirm.

## D3 Version grouping
- Name rule: 49 groups covering 131 files; 95 numbered files correctly left alone.
- **Two rule bugs found:** FL's `-001` export numbering creates fake bases like `mmmm-0`, and generic `Project_N` groups unrelated
  songs (fingerprint scores ~0.51). Fix: treat `-NNN` as a number, never group generic names by name alone.
- Fingerprints (Chromaprint, already in your ffmpeg, no install), 50 files, 33 MB downloaded, 1,225 pairs:
  unrelated audio ~0.53, same-name groups median 0.85. At a score ≥0.8: 22 of 43 same-name pairs, 5 of 1,182 different-name.
- **Fingerprints find what names miss:** `ANY WAY.wav` ↔ `any way.mp3` ↔ `ANY WAY new limit.wav` (~0.95+), `TOXICBRATuhhh` ↔
  `TOXICBRAT new joint` (0.96), `Project_12` ↔ `phone ft slatt` (0.89), which puts a real title on a generic name.
- Only the first 2 minutes were compared, so a new intro or a different section could lower a score.
- **Verdict:** use both, names + fingerprints, suggestions only. Threshold ~0.8 high confidence; 0.65-0.8 "maybe".

## D4 Phone reachability
- **D4a Safari: PASS (2026-10-31).** Over Tailscale, on home Wi-Fi and on cellular: the list loads, a song plays, seeking works.
- **D4b Expo Go: PASS (2026-10-31).** On the phone: the list loads, a song plays, a tag saves, and the tag was still there after reopening.
  The spike keeps tags in memory only, so this does not show tags surviving a force-quit. The real app needs a database for that.
- Laptop side works locally: list, seeking (correct partial responses), bad requests refused.
- Expo app type-checks, passes 20/20 Expo checks, and its config includes the background-audio setting.
- The build workflow is written but has never run.

## D5 Open in FL Studio: PASS (2026-10-31)
The server opens one fixed `.flp`, nothing taken from the phone. Tapping the button on the phone opened the test project on the laptop.

## D6 Search: FTS5 fits
In-memory test on made-up tags:
- Phrase queries, "near", "all words" and "any word" all work and merge into one ladder without excluding anything. `has to` works.
- bm25 ranks within each rung, and word counts for rarity are available (`fts5vocab`).
- **Gaps:** NEAR ignores word order, so "same order with gaps" needs a small check in Python. The standard word-ending handling
  (Porter) gets `youngin`/`youngins` but misses `drip`/`drippin`, so slang endings need our own normalizing step.
- Misspellings: a trigram index (matches on 3-letter chunks) finds candidates.
- **Where fuzzy/slang sits:** a step before FTS that rewrites the query using a learned spelling table and trigram suggestions. Only
  my original tag text is stored; variants live in the table. Boost-the-picked-result is a separate small table added at ranking.
