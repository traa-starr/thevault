# NEXT: Opus: car autoplay fix, Previous restarts, fresh-eyes, world map goal 4, mockups from the server
Format: goal
Written by chat, 2026-11-20.
Model: opus
Clear between goals: yes. After each goal: checkpoint (tick STATUS plan, 2 lines), stop; I type `/clear` then `/next`.
Effort: high
Log: Review 4 of 4 pass (owner). Previous restarts after 3 s, goes back within 3 s (owner; 3 s chat-default). Next on Repeat one moves on and Repeat one stays on (chat-default, Apple Music's way). Car / Bluetooth autoplay is a bug; rule in DECISIONS (chat-default). Line card sideways swipe parked (chat) (logged by chat)
Size: 5 goals, all Code can do before my next phone walk: the bug I hit daily first, then the player fix, the fresh-eyes pass on goals 1-3, kit goal 4, and the mockup server. Each ships on its own.
Queue after this: my phone walk of this + the 4 render checks + the heat listen. Then 3.7 (my 20 searches).
Read: DECISIONS last 4 rows; `docs/LESSONS.md`; `docs/overhaul/FABLE-KIT.md` §1 rows for Versions / Settings, §2 goal 4 shots, §4 goal 4 only; files you edit. Nothing else.

## Goal
1. **Car autoplay bug.** Find the cause first (how iOS wakes the app and why it plays: expo-audio lock-screen / now-playing, audio session, remote commands), write it in REPORT, then fix. The rule (DECISIONS): the Vault never starts by itself after being swiped closed or woken in the background, never takes over another app's paused audio (YouTube), and a car or headphone "play" resumes it only if it was the last thing I played and is still in the app switcher.
2. **Previous restarts first** (lock screen, car and headphones too): over 3 s in = back to 0:00; within 3 s = the song before. Next on Repeat one moves to the next song and Repeat one stays on.
3. **Fresh-eyes on the goals 1-3 diff** (`git diff 62626f4 5d4a9dd -- app`), then fix what it catches. Also: search rows use `lineFor` like Library rows (REPORT "Not done").
4. **FABLE-KIT goal 4:** Versions list and picker as pages inside the sheet; Settings Laptop status row (O.6).
5. **Mockups served by the Vault server:** `spike/mockups` opens on the phone from the address it already knows, no typed `http.server`. Add the phone address to `COMMANDS.md`.

## The bar
- List how each goal could break (LESSONS included) and turn each into a test before building. Goal 1: a test or logged check that a play command with no play from me since launch is ignored; if it can only be proved on the phone, say exactly what in REPORT.
- Goal 2: add the restart / back / Repeat-one-Next checks to `app/playOrder.test.mjs` first, see them fail, then build.
- Controls: instant press, 44 pt, no swallowed tap, nothing shifts. Shots only of changed screens (goal 4: kit §2's list), checked by a subagent.
- Fresh-eyes: the `fresh-eyes` agent (Sonnet), given only this NEXT, LESSONS, the diff and the shots; catches written down before any fix.
- Change files with the Edit tool; helper scripts go in a file. Run only the tests for files you touched; `/verify` once at the end.
- Two failed fixes on a goal: write it up, move on. If goal 1 needs a full rebuild (native change), say so in REPORT; don't do it without asking.
- Short `/wrap`; REPORT under 40 lines with "Odd in how we work:".

## Done when
Code proves:
- Goal 1: cause written in REPORT; the cold-start / no-takeover test passes.
- `playOrder.test.mjs` restart, back-within-3 s and Repeat-one-Next checks pass; `/verify` all PASS.
- Fresh-eyes catches listed in REPORT with fixed / left (why).
- Goal 4 shots taken and checked; the server answers the mockup address with 200 (curl from the laptop); publish goes out.
I prove:
1. Car: swipe the Vault closed, play a YouTube video and pause it, connect to the car or Bluetooth: the Vault stays silent and YouTube is still the one waiting. Then play a Vault song, pause, reconnect: it resumes.
2. Player: Previous 10 s into a song restarts it; Previous twice fast goes back a song. On Repeat one, Next plays the next song and Repeat one is still lit.
3. Versions open as pages inside the song sheet; Settings shows a Laptop status row.
4. The mockup page opens on the phone from the address in COMMANDS.md with the laptop server running, no command typed.

## Limits
- Goals in order; if the window runs short, goal 1 alone must ship.
- No new mockups or redesigns; no line card swipe (parked).
- Never write inside iCloud Drive, FL Studio Projects or `Vault Renders`. Repo is public: fake names in tests and shots; no Tailscale names or IPs in COMMANDS.md (write "the Vault address").
- Never delete the eye's flag file; the journal and outbox carry every change.
