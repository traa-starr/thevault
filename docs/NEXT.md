# NEXT: Cool, quick and rated: battery, instant taps, rating, every Mine song on the phone
Format: goal
Written by chat, 2026-11-09.
Log: Play first review: checks 4 of 4 pass, 5 owner notes (owner + chat); sort finished (owner); rating 3 levels Fire / Unrated / Shelved (owner); eye keeps the owner's choice, press look lets go at once, next song's info kept ready, tag search matches the word being typed, battery measured before fixing (chat) (logged by chat)
Size: My real sessions + wipe check (2.7, ship line 2026-11-15) run alongside. Five owner notes plus rating (2.8, small, not a new phase) and Mine-on-phone now that sort is done: all code can do without me, one session. 3.7 still waits for ~50 tags.
Queue after this: my 20 acceptance searches (3.7) at ~50 tags; revisit E (3.4, 3.5) then; Phase 2 closes when I pass 2.7.
Read: `docs/LESSONS.md` (every line a check in your plan), the last 4 DECISIONS rows, `docs/PHASE-2-RESULTS.md` last section, `docs/board/playback-feel.md`, `docs/BLUEPRINT.md` player + sync sections, `docs/BOARD.md`, the files you touch.

## Part 0: first, two things
1. Run `timings` and judge the play-first build per path (my check 4). Any FAIL becomes goal A0, before everything else.
2. Board meeting (test lines 1, 2, 3: a new control, press feel, a synced field): rating control and where it lives, press look, what Shelved does in each list. Notes in `docs/board/rated-and-quick.md`. Taste calls the board splits on: pick one, say it in REPORT, I change it at review.

## Goal
The app should feel like one quick tap and run cool through an hour of listening. I can rate songs as I go so shuffle stops landing on stuff I don't want.
A. **Instant taps, Next = Previous.** Every control's pressed look lets go about 100 ms after the tap, never waiting on a load. The next song's info (tags, versions, length, start spot) is ready before I tap Next, the way Previous already is; lock-screen Next too. Phone timings: Next within ~20% of Previous.
B. **Eye keeps my choice.** Hide/show buttons stays where I last left it on every song, every screen, after a kill. No per-song reset (the sorted-song rule goes).
C. **Battery and heat.** Measure first: count wake-ups, redraws and network calls per minute while playing, screen on and locked, and how many plays come from a phone copy vs a stream. Find the causes and fix them: nothing redraws while locked or in the background, timers sleep when not needed, a song with a phone copy never streams. The counts go to `timings` with PASS/FAIL against ceilings you set and justify in REPORT.
D. **Rating (2.8).** One tap on the player (and the tagging card if the board agrees): Fire / Unrated / Shelved. Shelved leaves every shuffle and session but stays in Library and search, marked. A Library filter for Fire. Saved phone-first and synced like tags; the restore test brings ratings back (add them to the `tags` command or its own).
E. **Search as I type.** The last word I'm typing also matches the start of tag words (`titt` finds a tag with `titties`); finished words keep today's ladder. Still fast on the phone (typical under 20 ms).
F. **Every Mine song on the phone.** Sort is done: the phone downloads a copy of every Mine song by itself, with a count ("670 of 671 on the phone"), within the storage limit; a verdict I change later adds or removes the copy. The count shows in the app and in `/status`.

## The bar (how to work)
- Part 0 first. Plan in STATUS "In progress", one line per goal.
- Before each goal, list how it could break and make each a test or screenshot: fast double tap during a slow load, Next while the next song's info is still loading, lock-screen Next while paused, eye across 10 shuffled songs and after a kill, rating offline then laptop back, Shelved song as the only search hit, a phone-copy download cut off, phone storage near the limit, a verdict flipped back. LESSONS lines are part of the list.
- Tests first. The model can't stand in for the phone: energy and Next/Previous claims are proven by the phone's `timings`.
- Controls: instant pressed look, 44 pt, no swallowed tap, nothing shifts. Screenshot every changed screen from every place it opens.
- Hostile self-review of the whole diff, then one fresh-eyes review (new control, sync rule, timing). List its catches in REPORT.
- Two failed fixes on a goal: write it up, move on. Don't stop the session.

## Done when
Code proves: play-first `timings` judged per path in REPORT; a test taps during a 2 s load and the pressed look lets go in time; a test shows the next song's info is ready before Next; eye test across 10 shuffled songs + restart keeps the choice; model test of a locked hour shows wake-ups and redraws under your ceilings (before and after numbers); rating save/sync/restore tests, and Shelved missing from every shuffle path but present in search; search test `titt` finds `titties`, finished words unchanged (old search tests still pass); Mine-on-phone count printed from the real library and checked against `/status`; `/verify` all PASS under 1 min.
I prove:
1. Session and Library shuffle: Next 5 times, Previous twice, toggle the eye once, then 10 more Nexts. Pass: every tap feels like one quick press, Next as quick as Previous, the eye never changes by itself.
2. Rate 3 songs Fire and 3 Shelved, then shuffle Mine 15 times and search a Shelved song's tag. Pass: no Shelved song plays on shuffle, the search finds it (marked), the Fire filter shows my 3.
3. Search: type a tag word a few letters at a time. Pass: the tag's song shows up before I finish the word.
4. Library shows "N of N Mine songs on the phone"; airplane mode, play 5 random Mine songs. Pass: all play.
5. Listen for an hour, screen locked, from a good charge; note the battery % before and after. Pass: phone not warm, and the drop is about the same as an hour of Apple Music (say so if you don't know Apple Music's number; Code's REPORT gives the counts).

## Stretch (only if every goal is met and budget is left)
A-Z jump strip in Library (board notes first); split the 638-song folder set; the timings long-press line on the phone (REPORT pitch). Say in REPORT which you took.

## Limits
- Order: Part 0, then A and B, then C, D, E, F.
- No change to tag, journal or outbox rules beyond adding rating as a synced field the same way. Search ladder unchanged except the typed-word prefix. No new phase (ship line).
- No native modules, no full rebuild: publish only. If something needs a rebuild, stop that part and write it up.
- Music read-only, no git, public-repo rules as always. My sessions keep running on the published app.
