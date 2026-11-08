# Search: on the phone or on the laptop? (Phase 3's big call)

Written 2026-11-08 by Code for the owner to pick at review. Spike: `spike/search/` (no app code). Hard to undo: it decides
where search code, the slang spelling table (3.4) and "boost what I picked" (3.5) live.

## What was measured
- **The ladder (3.1-3.3)** as plain functions, `spike/search/rank.mjs`, 10 tests pass (`node spike/search/rank.test.mjs`):
  exact phrase > words in order with gaps > all words > some words by rarity. It never drops a tag that shares a word.
  Common words count less but still count, so "has to" works. drip / drips / dripped / drippin / drippin' / dripping all match.
- **Fake library at my size:** 1,363 songs with tags (of 1,395), 27,372 tags (about 20 each), 2 to 10 words each, with slang,
  misspellings and filler words. **300 searches** like mine: half-remembered bits of real tags, single words, common-word
  searches, a few that match nothing.
- Same data, same ranking everywhere: the Python copy gave the **same top 20 as the JS one on 300 of 300 searches.**
- Numbers are from this laptop. For the phone, `node --jitless` stands in for Hermes (the phone's JavaScript engine has no
  JIT, a speed-up trick). A real phone run is the first step of Phase 3 either way.

| | A. Phone (JS, its own tag copy) | B. Laptop (Python, `GET /search`) | C. SQLite full-text index + ladder |
|---|---|---|---|
| One search, typical | 10 ms (4.6 ms with a JIT) | 14 ms, plus the trip to the phone | 15 ms |
| One search, slow end (95th of 100) | 28 ms | 41 ms, plus the trip | 41 ms |
| Worst of 300 | 34 ms | 57 ms, plus the trip | 56 ms |
| Get ready (once, and when tags change) | 170 ms | 260 ms, at server start | 100 ms to build a 1.8 MB index |
| Memory / size | about 15 MB while the app runs; the tags are already on the phone | none on the phone | 1.8 MB file |
| Laptop off, no signal | **works** | **no search** | works if on the phone |
| What it takes to ship | an over-the-air publish | server restart + publish | a native module: **full rebuild + SideStore** if on the phone |

"The trip": phone to laptop over Tailscale. Not measured here (it needs the phone). Usually tens of ms at home on Wi-Fi,
more on cellular, and nothing at all with the laptop asleep.

## The options
**A. On the phone.** The phone already keeps a copy of every tag (Phase 2: tags show offline), so search reads that.
Fast enough to search as I type. Works on a walk with the laptop asleep. The ladder is plain JavaScript, so the laptop
can run the same file for the 20-search acceptance test (3.7). Picks I boost (3.5) and learned slang spellings (3.4)
travel through the outbox like tags do, so the laptop keeps them in the journal.

**B. On the laptop.** One copy of the code, next to the database. Slower by the trip, and search stops whenever the
laptop or the connection does. Only worth it if the library grew far past what a phone holds, which 27,000 short lines isn't.

**C. SQLite's full-text index (the one I didn't ask about).** The database's own search index finds candidate tags, the
ladder ranks them. It would scale to hundreds of thousands of tags, and its "trigram" mode can help with misspellings.
At my size it's no faster: most searches contain a common word, so the ranking step dominates either way. On the phone
it needs `expo-sqlite`, a native module: a full rebuild and a SideStore install, not a publish.

## What a senior engineer would pick
**A, on the phone.** The phone is the main device and the laptop is often asleep; search is the one feature I'll use
away from home ("rap a line, find the song"). The numbers leave plenty of room (28 ms at the slow end vs about 100 ms
before typing feels laggy), the tags are already there, and it ships with a publish. Keep C in the back pocket: if a
real phone run is ever slow, or misspellings (3.4) need more than a spelling table, the same ladder sits on top of it.

**Watch:** 15 MB of memory while the app runs is fine on a modern iPhone; build the index once and update it as tags
change, not per search. Check the real phone's numbers in Phase 3's first step.

## Rerun
`node --expose-gc spike/search/bench.mjs`, then `node --jitless --expose-gc spike/search/bench.mjs`, then
`python spike/search/bench.py`. Results land in `spike/output/search/` (gitignored).
