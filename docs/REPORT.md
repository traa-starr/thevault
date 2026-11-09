**Step:** Cool, quick and rated: battery, instant taps, rating, every Mine song on the phone, 2026-11-09. Built by Fable 5 (owner's trial of a new model; see "Outside NEXT").

**Verified by running:** `/verify` 17/17 PASS in 44 s (2 new app test files, 1 new check). Shots 52/52 (12 new: rating from Library, session, eye hidden, Sort card; Library marks, Fire filter, half-word search); rated and unrated pairs: same button boxes. Locked-hour model, per minute, before: wake-ups 120, redraws 120, network 15, writes 4; after: 120, 0.3, 0, 1.0. Press look during a 2 s load: lets go at 119 ms (old: 2,000). Search per keystroke on 27,000 fake tags: typical 2.9 ms, slow end 7.4. Real library: `status` says Mine 671, phone copies made 671, and live `/status` gives the same (`on_phone` empty until the phone reports).

**Phone timings** (play-first build, judged per path; nothing from the new code yet):
```
Search: typical 7 ms, slow end 13 ms, worst 15 ms (148 times), about 23 tags
Energy while playing: none yet (the phone sends it after a minute or more of playing)
Tap to first sound, app code 2026-11-09T05:01:38 (61 of 480 samples; older code not judged)
  session: typical 278 ms, slow end 328 ms, worst 328 ms (14 times); over 1 s: 0. PASS
  library: typical 194 ms, slow end 483 ms, worst 490 ms (30 times); over 1 s: 0. PASS
  previous: typical 242 ms, slow end 295 ms, worst 295 ms (13 times); over 1 s: 0. PASS
  lockscreen: 329 ms, not enough yet (3 of 5). restore: 203 ms, not enough yet (1 of 5). sort, search: none yet
```
No FAIL, so no goal A0. Session Next was already within 15% of Previous. By source: phone mp3 279 ms vs m4a 277: the MP3 copies are not the slow part, so no re-encode.

**Phone update:** published 20261109-195617, server restarted (new routes and the ratings table).

**Needs the phone:**
1. Session and Library shuffle: Next 5 times, Previous twice, eye once, 10 more Nexts. Pass: every tap one quick press, Next as quick as Previous, the eye never moves by itself.
2. Fire 3 songs, Shelve 3, shuffle Mine 15 times, search a Shelved song's tag. Pass: no Shelved song plays, search finds it with "Shelved", the Fire chip shows the 3.
3. Type a tag word a few letters at a time. Pass: its song shows before the word is finished.
4. Library's top line reads "N of N Mine songs on this phone"; airplane mode, play 5 Mine songs. Pass: all play.
5. One hour locked from a good charge; note % before and after, then open the app. Pass: not warm. Code then reads the `timings` energy lines.
6. Board extra: airplane mode, Fire one, Shelve another, Undo it, airplane off. Pass: `ratings` on the laptop lists only the Fire.

**Changed:** app: `App, Library, Player, Tagging, Versions` (.tsx), `offline, outbox, playOrder, playerStore, search, sessionStore, tagStore, timings, versionStore` (.ts), new `Tap.tsx, pressLook.ts, energy.ts, meter.ts, ratingStore.ts, quickAndCool.test.mjs, searchTyping.test.mjs`, `search.test.mjs`. Server: `store, songs, server, timings`, `vault_cli.py`, `test_server.py`. Tools: shots entry, fakes, fixtures. `.claude/scripts/verify.py`, new `lessons.py`. Docs: BLUEPRINT, CHAT-INSTRUCTIONS, COMMANDS, DECISIONS, LESSONS, MAP, ROADMAP, STATUS, new `board/rated-and-quick.md`.

**Done when:** timings judged per path: pass. Press look during a 2 s load: pass. Next song's info ready before Next: pass. Eye across 10 shuffled songs + restart: pass. Locked hour under ceilings, before and after: pass (model; the phone's numbers are check 5). Rating save, sync, restore, Shelved out of every shuffle path and in search: pass. `titt` finds `titties`, old search tests pass: pass (one old assertion now tests a finished search, with a space). Mine count from the real library matches `/status`: pass. `/verify` under 1 min: pass. I prove 1-5: not run (for chat).

**Plan I chose:** 0 [x], A [x], B [x], C [x], D [x], E [x], F [x], reviews [x]. Stretch: none.
Battery causes found by reading, not measured: (1) with the laptop off and 10 timings waiting, the app retried the send on every player report; (2) every report redrew the bar, sheet, toast and Queue, locked or not; (3) with the laptop off each Next asked the disk about every song (~1,400 calls); (4) the outbox retried every 10 s for ever; (5) the spot file (the whole list) was rewritten every 15 s. All fixed. Ceilings (locked, per minute): wake-ups 130, redraws 6, network 2, writes 6. The 120 wake-ups are iOS's own twice-a-second reports; lowering them needs a rebuild.
Board splits (picked, change at review): two word toggles, not a cycle; Shelve keeps the song playing; the queue ahead is rebuilt at the tap. Reading of NEXT: a list played in order with shuffle off still plays a Shelved song (NEXT says "every shuffle and session").
F was mostly built already (downloads, the count line). Added: the count covers every Mine song, the phone asks again 20 s after a verdict lands, the count reaches `/status`.

**Fresh-eyes review caught (all fixed):** a steady 30 s poll of the laptop while one Mine song had no copy; the 20 s re-ask lost while downloads ran; a song list already on its way wiping a just-taken rating; the stuck-song watch staying asleep after Compare; the spot not saved when the app is swiped away from the switcher; a rating arriving in a fresh list not rebuilding the queue. **Not taken:** a new phone with an old server refuses a rating (wrap restarts the server before publishing; the "laptop refused" line shows). My review caught: the energy clock padding its minutes after an unannounced pause; Library rows redrawing every render; a finger bounce turning a rating on and off.

**Outside NEXT (owner asked this session for workflow upgrades):** LESSONS has a "Kept true by" column and `lessons.py` (in `/verify`) fails if a lesson's test or screenshot disappears; `/verify` now runs every `app/*.test.mjs` by itself; `ratings` and `status` commands.

**Not done:** Stretch (budget). Downloads still run while locked if they were already going (tester wanted none; they stop by themselves). **Decisions needed:** the three board questions, defaults in use. Goal-format trial: keep, adjust, or go back?

**Proposed next step:** read the phone's energy lines after check 5; if locked still FAILs, the next lever is fewer iOS reports (a rebuild). **Pitch:** show the last `timings` PASS/FAIL on the phone (long-press), so a session ends with a verdict and no laptop.
