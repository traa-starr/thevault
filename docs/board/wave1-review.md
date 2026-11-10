# Wave 1 fresh-eyes review

Read: playLog, playStore, outbox, phoneBackup, playerStore hooks, App, nav, sheetCore, Frame, Player, Home, Library diff, Notices, native pieces, server store/songs/server diffs. Ran: playData, frame, labels tests, server/test_server.py (all pass), app typecheck (clean). Nothing edited.

1. **wrong** - `playerStore.ts` `finished()` / `playLog.ts` `stop`. When the last song of a list ends, `plays.stop()` closes the tracker and nothing reopens it. Press Play on that same song again (it sits paused at 0:00) and the replay is never counted: `plays.start` only runs on a new load. Sure.
2. **wrong** - `playLog.ts` `report` + `playerStore.ts` `onSound`. While Compare is open, reports are ignored, but the tracker still thinks the song was "playing". When Compare ends, the first report can be a big jump forward, and the clock allowance (time since the last report) is large, so minutes of Compare listening can be credited to the song as one play. Trigger: play a song, open Compare for 2+ minutes, Done. Likely.
3. **wrong** - `server.py` `list_songs` + `playLog.ts` `ms()`. The laptop sends `last_heard` with 6 decimals ("...00.000000Z"). If the phone's JS engine reads that as "not a date", every laptop-side play looks "never played": Recently played empty, Not played in a while full of songs you did play. Node accepts it, so the tests can't tell; only the phone can. Cheap fix: send 3 decimals. Maybe.
4. **rough** - `Notices.tsx` `WaitingLine` on Home. Each counted play joins the outbox, so a "1 play waiting to send" line appears at the top of Home (pushing Search, Shuffle and the rows down) until the laptop answers. With the laptop off it stays. Breaks "nothing shifts". Likely.
5. **rough** - `App.tsx` + `Frame.tsx`. With no laptop address yet (first install), tapping the Library tab or the search button leaves a blank screen: Home is hidden and Library is not drawn without an address. Tapping Home gets out. Sure.
6. **rough** - `Home.tsx` rows. Start Shuffle on Home and stay there: at 0:30 the play counts, so "Recently played" gains a card at the front and "Not played in a while" loses one. The rows move under your thumb. Likely.
7. **rough** - `Home.tsx` `recent`. Built from `all`, not `mains`, so a played non-Main version gets its own card beside its Main (other rows show one per family). Likely.
8. **rough** - `Home.tsx` `busy()`. During Compare, Shuffle, Favorites and every card tap silently do nothing (no message). Old Library taps played during Compare. Sure.
9. **rough** - `playStore.ts` `onSent` + `setBase`. If a song list is asked while a play is on its way, the laptop can have counted it already, and `onSent` adds it again: count +1 until the next list. Narrow window. Maybe.
10. **rough** - `Player.tsx` `lift`. Typing a tag raises the page by the art's height only. On a short phone (SE size) the field and the cancel button may still sit under the keyboard. Maybe.
11. **rough** - `Player.tsx` `useSongDate` (memo keyed on id only). If the song list isn't loaded when a song first shows (cold start, restore), the date is cached as "none": its tile colour in the mini player and player differs from its Home card until the song changes. Maybe.
12. **nit** - `playLog.ts` `report`. A late report from the old song (still "playing") after `start` for the new one can set `startedAt` a moment early and credit under a second. Maybe.
13. **nit** - `playLog.ts`. The full-length second line is sent only when you move to another song or the list ends. Pause on the last song and quit: the play stays at 30 s. By design, but worth knowing. Sure.
14. **nit** - `App.tsx`. "N songs on the laptop" no longer refreshes after leaving Library (the old Back did). Only on app open. Sure.
15. **nit** - tests. `playStore.ts` (`onSent`, `taken`, `setBase`) has no test; "sent, then listed" tests the pure maths, not that code (see 9). `sheetCore.reachable()` and `plays.now()` are tested or kept but unused by the app. Several checks match source text with a regex, which proves a line exists, not that it works.

Looked at and found fine:
- Server `add_play`: validation, future-clock clamp, same-id longer line, merge follow, rebuild from journal, and `/status`; the SQL join in `list_songs` is correct.
- Tracker: pause, seek, scrub-back loops, 0:15 session start, 20 s idea, locked 2 s reports, Sort card (never counts), auto-advance (report before or after `onTrack`).
- Outbox/backup flags: `paused` and `away` are cleared on return to front; locked plays only save to the file, no network call or timer.
- Overlay maths: normal send, lost answer then resend, wipe and restore. Cache key keeps one Map until a play changes.
- Sheet: one shared value, travel changing while open, pointerEvents, swipe-down lands where Back goes (player out; Queue back to player or out), reset after close, hooks order in MiniPlayer/FullPlayer/PlayerSheet.
- Taps unchanged vs old player: rating, Tag, Mine/Not mine, eye, shuffle, Queue, Compare, session Not mine/Next, "+ Version". Address editing, restore notices, deep link and fresh-install line survived the App rewrite.
- Native pieces are looked up inside try/catch, so an old build gets the drawn icons and solid bars.
