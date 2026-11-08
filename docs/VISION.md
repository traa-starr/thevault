# The Vault: vision

One place where all my songs from two DAWs on two devices end up, and where finality happens.

**Ship line:** Phase 2 closes when I have tagged 50 songs in real sessions and passed the wipe check (2.7), by 2026-11-15. No new phase starts before that.

## Sources (last ~4 years, gigabytes not terabytes)
- **FL Studio on the laptop:** bounces (wav/mp3/m4a) in iCloud Drive; `.flp` projects on the laptop only.
- **BandLab on the iPhone:** 50-100 songs, many never rendered. Titles, cover art, dated revisions.
- Reaper: ignored.
- **Mine vs not mine:** other artists' work is mixed in. Only my songs matter, with a manual override. My artist names:
  `l1`, `L1`, `l1ghtxfluv`, `MOJO`, `traa`, in the title or the file's tags. A match means mine; no match means unknown,
  because not all my songs are labeled.

## How I use it
- **The phone is primary.** I listen and tag on the iPhone, never the laptop. The Vault becomes my main music player, so
  background and lock-screen playback are musts. The laptop builds, hosts files and index, and serves the phone.
- **Titles don't help.** I freestyle and name projects generically. I recall songs by rapping a line from mid-verse.
- **Whisper is unreliable** on my slang and autotune. Tags are human-entered; Whisper is at most an optional draft later.

## Features
- **Tagging sessions:** flashcard-style, random songs favoring untagged, progress counter, normal player controls. Tap at a
  moment, type or dictate a quotable line, and it becomes a timestamped tag. Tapping a tag jumps to that moment.
- **Search:** never excludes, only reorders. Exact phrase > same words in order with gaps > all words > some words weighted
  by rarity. Common words count ~0 (down-weighted, not banned, so "has to" works). Tolerates misspellings and word endings,
  learns my slang spellings, boosts the result I pick for that search. Shows the matched tag and timestamp. Runs on the phone, so it works
  offline (DECISIONS 2026-11-08); the database's own search index stays in reserve. Later: a separate "similar meaning" section that can't pollute main results.
- **Acceptance test:** after ~50 tags I write 20 searches with known answers; re-run after every search change.
- **Groups:** "Add to group / New group" button, not "same as last", since random play won't put versions back to back.
  Auto-name from title; strip a trailing number only when other files share the base ("Dome 1/2/3" → "Dome"; "Has 2" stays).
  Always propose, I confirm with one tap; remember corrections; groups can merge and split.
- **Every song gets BandLab-level fields:** title, cover art, dated versions, source tag (FL / BandLab). The source tag also
  lets me compare phone-made and PC-made songs.
- **Source status cards** (should look cool, iCloud-style): "Linked to FL project: Project 61 · path · confidence ·
  confirmed" with a link, or "Open in BandLab". Bounce→`.flp` matches are proposed by timestamp proximity, with confidence;
  I confirm on the phone. Links are database records, never file renames.
- **BandLab audio gets pulled in,** not just linked. As long as a song only lives in BandLab, The Vault can't be final.
- **"Open in FL Studio" bridge:** tap on the phone → the laptop opens that `.flp`.

## Design
Leading-edge and future-proof. Apple-level intuitive and native-feeling, but original, not copied. Polish the screens I touch
daily (tagging card, player, source cards). Prototype feel before real code.

## Checkpoints
1. Spike: laptop indexes read-only; phone plays a song at home and away, screen locked
2. Phone tagging sessions
3. Search
4. Groups
5. Source status cards + BandLab import
6. Release pipeline and extras

## Later
Release pipeline (perfectionism-breaking sprint: master, art, metadata, distribution), fast rating to surface my best songs,
idea/lyrics notebook, optional BPM/key, optional rename feature (confirm step + undo log), lock-screen/Siri/Shortcuts bridges
("play the song with that line"). Parked: an always-on home server / iCloud replacement.
