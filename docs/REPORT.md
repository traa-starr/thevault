**Step:** Fast session Next, centred player everywhere, search on the phone, 2026-11-08.

**Verified by running:** `/verify` 14/14 PASS on the final code (new: nextTiming test, search test). nextTiming (fake player on a pretend clock, fresh load 800 ms, seek 300 ms, queued song loaded): session Next first sound 300 ms at 0:15, Sort card Next 300 ms at 0:30, old full reload 1,100 ms; 3 fast Nexts 300 ms, volume back. search: 16 checks, spike ladder ported; 1,363 songs / 27,372 fake tags offline (fetch throws): index 73 ms, typical 4.2 ms, slow end 11.5 ms (laptop). test_server timings: fake phone report kept, text dropped, command prints. Acceptance runner on its example: 5 of 5. Real library: `search-data` 6 tags; `timings` "No timings from the phone yet". Shots 33/33.

**Phone update:** published 20261108-192607, server restarted (new `/timings` route).

**Needs the phone:**
1. Library, Tag songs: tap Next 5 times fast, then 3 slowly, then lock and use lock-screen Next twice. Pass: each song starts about 0:15 within about a second, the time reads 0:15 (never 0:00), volume always comes back.
2. Sort: tap a card to open the player; then open the player from Library. Pass: Play sits dead centre both times, Previous and Next the same size.
3. Library: type 2-3 words from a tag you wrote. Pass: that song near the top, your words bold, its time on the right; tap it: plays from that moment. Type nonsense: "No song or tag has …", no crash.
4. Airplane mode, search again. Pass: same results. Airplane off, swipe the app to the background once. Then tell chat the numbers from `python server\vault_cli.py timings E:\VaultLibrary`.

**Changed:** `.claude/scripts/verify.py`, `app/{App,Library,Player}.tsx`, `app/{engine,playOrder,playerStore,playlistCore}.ts`, `app/playOrder.test.mjs`, new `app/{search,timings}.ts`, `app/{nextTiming,search}.test.mjs`; `server/vault_cli.py`, `server/vault_server/server.py`, new `server/vault_server/timings.py`, `server/test_server.py`; `tools/shots/{entry.tsx,fixtures.mjs}`, new `tools/search/` (accept.mjs, fake.mjs, example files); `docs/{COMMANDS,DECISIONS,REPORT,ROADMAP,STATUS}.md`, new `docs/board/phase-3-search.md`.

**Done when:**
- Timing test, session and Sort Next within 1 s, no 0:00: pass (model, not the phone; the phone's own numbers come from check 4).
- Screenshots centred from Library, Sort card, session, restored session: pass (`centre-*`).
- Ladder tests ported and passing in the app: pass. Search shots empty / no match / many / keyboard up: pass.
- 1,400 fake songs offline: pass. Acceptance runner passes its example: pass. Timings command after a fake report: pass. `/verify` all PASS: pass.
- E taken: no (see Decisions). I prove 1-4: not run (for chat).

**Plan I chose:** board [x], A [x], B [x], C [x], D [x], E [ ] (yours first), reviews + `/verify` [x].
Cause of the slow Next: every session Next threw away the player's list and rebuilt it (to avoid the 0:00 beat). Now it takes the already-loaded queued song, muted until it reaches 0:15. The 0:00 on screen was just "length not known yet". Sort cards use the same path when the next card is the queued song. Previous still rebuilds one song (expo-audio does that natively): about as slow as before.
Guessed (board splits, in `board/phase-3-search.md`): result tap plays the Library list, not the results; one letter is searched; x only, no Cancel; chips still narrow a search; titles matched by word too.

**Fresh-eyes review caught (fixed):** two fast Nexts moved once then reloaded slowly (taps now move on from where the last tap went); a move the player never reported could make a later lock-screen Next play from 0:00 (moves now matched by song); Previous onto the queue's first song restarted audibly (fresh load there); a version's tag played its Main at the wrong second (plays the version now); title search was whole-phrase only and could hide a song sharing a word (word-based now); rows could keep stale tag lines (`extraData`); search timing logged inside a memo (effect now). **Not taken:** jump-via-queue bookkeeping differs from a full load (onTrack does the same bookkeeping on arrival; low risk, checked in code). My own review caught the 0.5 s timing lag (now stops at the moment play starts).

**Not done:** E (3.4, 3.5): it writes to the journal forever, so its shape is yours. Stretch: none.

**Decisions needed:** E's shape. Logic seat's pick: each pick saved as an event {search words, song, tag, time}, boost from the latest, above all tiers, never hiding anything; slang spellings applied to the search, not the index. Hard to undo: no default.

**Proposed next step:** my 20 searches once ~50 tags exist (3.7), plus E if you say yes.

**Pitch:** a "Search" link on the lock screen via an iOS Shortcut that opens the app on the field: "rap a line" from anywhere.
