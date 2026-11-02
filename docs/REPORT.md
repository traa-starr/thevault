# Report

**Step:** Batch 3, the real player, 2026-11-01. Parts 0, a, b, c and d built, including d after the stop line. None of it has run on a phone yet.

## Verified by running
- Play-order self-test: ALL PASSED. Typecheck: no errors. iOS bundle export: succeeded. Repo check: clean.
- Not tested by running: playlist player, lock screen, seek on Undo. They need the phone. I read the audio package's iOS source to design around them.
- **Board seats loaded by name this session: no.** The four files are in `.claude/agents/`, but this session's agent list doesn't show them.

## Needs the phone
Install the new build first.
1. Play a song, Back to Home, reopen Library. Pass: music never stops, bar shows the same song, its Pause works.
2. Lock the phone near a song's end. Pass: next song starts by itself, title shows, lock-screen next and previous work.
3. At about 1:30 tap Not mine, then Undo within 5 seconds. Pass: same song at about 1:30. Repeat with the server stopped. Pass: a plain message, song stays Not mine.
4. Play a Library song, Back to Home, Sorting prototype, One by one on any set, tap Mine on one card, Back. Pass: the library song is back at its spot, paused.
5. Open the full player, Queue, tap a song in Up next. Back, then tap the time on the right. Pass: it jumps; time flips `3:41` / `-2:10`.

## Changed
- New: `app/engine.ts` (the sound, playlist and single player behind one set of commands), `app/playerStore.ts` (the one player and its queue).
- `app/Player.tsx` (bar, sheet, queue, toast), `app/playOrder.ts` + `app/playOrder.test.mjs` (song ids), `app/App.tsx`, `app/Library.tsx`, `app/Prototype.tsx`.
- `docs/REPORT.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`.

## Differed from NEXT.md
- NEXT wanted Undo and seek tested on the playlist player before building on it. That needs the phone, so check 3 is that test. If it fails, set `ENGINE` to `'single'` in `app/playerStore.ts`: bar and keep-playing still work, lock-screen next and previous don't.
- The prototype's cards were silent, so check 4 had nothing to borrow the player for. Each card now plays a real unsorted song and names it. Verdicts stay made up and unsent.
- Shuffle order is now fixed when it starts, which is what lets Up next show it.
- Swipe-back isn't built on screens, since they've never had it. The player sheet does swipe down to close.
- Tapping a Library song during Sort replaces the saved spot in code, but no screen can reach it until batch 4.

- Risks to watch: iOS may freeze the app while a stuck song plays no sound, so a locked skip may wait until you open it. Three fast lock-screen nexts on unloaded songs can stop playback with the "several songs" message; Play resumes it.

## Not done
Nothing in NEXT left out.
## Decisions needed
None.
## Proposed next step
Batch 4, Real sorting, once these checks pass.
## Pitch
Show the stuck-song message on the bar too: today only the full player shows it.
