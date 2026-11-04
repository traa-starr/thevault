# Report

**Step:** Batch 4b, Versions (manual), 2026-11-04. Parts 0, a, b, c built, plus 4 owner extras asked mid-session. Nothing has run on a phone yet.

## Verified by running
- `npx tsc --noEmit` (app): clean. `playOrder.test.mjs`: 43 PASS, ALL PASSED (11 new: versions rules, play-a-version).
- `server/test_server.py`: ALL PASSED, incl. 20 new versions checks (link, Make main, Remove, Undo, refusals, rebuild from journal). 300-song sweep 7.0 s, Undo 6.9 s.
- Repo check: clean. Music guard: 39/39.

## Needs the phone
0. Open Queue on a long list, lift a song straight away and hold it near the bottom edge. Pass: the list scrolls without first scrolling to the end by hand.
1. Full player > "Another version of…" > pick a song. Pass: music never stops; Library shows one row with "Versions · 2". Undo on the toast within 5 seconds splits them.
2. Library: hold a third song's row > "Another version of…" > pick the Main of that family. Pass: it joins, "Versions · 3".
3. Laptop off (or server stopped), link another song. Pass: the Library shows it linked at once; it sends when the laptop is back (no "refused" line).
4. Tap "Versions · 3" > tap a non-Main > Make main > kill and reopen the app. Pass: the new Main holds the Library row, shuffle Mine plays it, the old one is in Versions.
5. Versions view > tap a non-Main > Not mine. Pass: it leaves the family and is hidden; Undo puts it back in the family.
6. Extras: home screen bottom shows "Build N · commit · date". Play a song, pause at 1:00, kill the app, reopen. Pass: the bar is on the home screen with that song, Play resumes near 1:00, Next plays the next song of the same list.
7. Extras: Library filter row (Shuffle, Mine, A-Z, Newest, Hidden) scrolls sideways; Home (top right) works on Library, Hidden, Sort, Cards, full player and Queue, music keeps playing.

## Changed
`.github/workflows/build-ios.yml`, `app/App.tsx`, `Cards.tsx`, `Hidden.tsx`, `Library.tsx`, `Player.tsx`, `Sort.tsx`, `outbox.ts`, `patches/react-native-reorderable-list+0.18.3.patch`, `playOrder.ts`, `playOrder.test.mjs`, `playerStore.ts`, `sortData.ts`; new `app/Versions.tsx`, `versionStore.ts`, `family.ts`, `nav.tsx`, `build-info.json`; `server/vault_server/server.py`, `store.py`, new `family.py`; `server/test_server.py`; docs.

## Differed from NEXT.md
- No schema bump: `song_family` is added by "create if missing", so no rescan. The server opens the library once at start to add it.
- One change kind, `family_set`: the phone works out each song's new Main plus what it was before; the laptop checks it (no chains, no lone Main, Mine songs only, "before" must match) and journals it. Undo = the same change reversed, or dropped if still unsent.
- Picker rows show title, folder, date: no length (the laptop doesn't know song lengths yet).
- Library row action is a long-press menu. Card "Another version of…" marks the card Mine and moves on; the card's Undo takes back both.
- Make main moves no Mine verdict: every version is already Mine. Laptop refuses Not mine on a family member; the phone takes it out first.
- "Play" in Versions inserts that version right after the current song and plays it; what came after stays.
- A queued non-Main is skipped in shuffle only; list order shows only Mains anyway.
- Not mine on a Main with 3+ versions is refused with a plain line ("make another one Main first"); with exactly one other, that one becomes plain, with a toast.

**Not done:** Not-mine-on-Main picker (part c, allowed by the stop line): a plain refusal stands in.

**Decisions needed:** none. Owner extras logged as yours (reversible).

## Proposed next step
Phone checks 0-7, then Batch 5.

**Pitch:** Store each song's length on the laptop at scan time (from tags, read-only), so the picker and lists can show it.
