# NEXT: Batch 6.2, Restore, survival and inline Compare
Written by chat, 2026-11-06.
Log: 6.1 checks 1-6 passed, closes 1.17 (mine). Inline Compare dial inside 6.2, Back moves left (mine). "Another version of" becomes "+ Version", hidden on grouped songs (mine). Offline Compare skip bug fixed here. No separate plan session for 6.2; full plan session opens Phase 2 (chat-default) (logged by chat)
Queue after this: Phase 1 "Done when" with me (away from home, screen locked, laptop asleep). Then the Phase 2 plan session.
Read: this file, `BATCH-PLAN.md` Batch 6, ROADMAP 1.18, `BOARD.md`, `board/batch-6-offline.md`, last 5 rows of `DECISIONS.md`. Code of `compareEngine.ts`, `compareStore.ts`, `offline.ts`, the full player and Library group view as needed.
Session: Opus, medium effort. Board seats on Sonnet.
## Parts
0. **Small fixes.** (a) Offline Compare: a swipe lands on the nearest version that's on the phone, never 2 places on, both directions; versions not on the phone are skipped or plainly marked, never a dead stop. (b) "Another version of" reads "+ Version" everywhere and is hidden on a song already in a group.
1. **Board pass** (all four seats, one round, notes in `docs/board/batch-6-2-restore.md`, under 60 lines). Two briefs. *Inline dial:* Compare opens a slim dial right under the Compare button, about one text line tall, no new screen or sheet; Back moves left under the version button. Seats answer: how it opens and closes, what the line shows, how it fits the full player and the Library group view, lock screen while it's open. *Restore:* list everything the app keeps only on the phone (phone copies, song list, last song and spot, unsent changes, settings, anything else) and what happens to each after a SideStore re-sign and after delete-and-reinstall. Take the board's defaults; list them in REPORT.
a. **Restore after a wipe.** A fresh install with the laptop on gets everything back by itself: list, Mine, groups, Hidden, then phone copies download from 0. Nothing that lives only on the phone is lost without the app saying so. Unsent changes never vanish quietly: if any exist, the app shows it until they're sent.
b. **Inline Compare dial**, as the board lays it out, replacing the Compare screen. All 4d behaviour stays: same-second flip, true levels, Done/Back rules, lock screen naming the version.
**Stop line:** if the session runs long, b waits for its own NEXT. 0, 1 and a go in: they close Phase 1.
## Phone check (new build first)
1. Compare offline (airplane mode) on a group with a version not on the phone. Swipe both ways. Pass: lands on the nearest on-phone version each time.
2. A song not in a group shows "+ Version"; a grouped song doesn't.
3. Laptop on, open the app once so nothing is waiting to send. Then refresh the app in SideStore (re-sign). Airplane mode, open Library. Pass: "On this phone: 314" still, songs play, nothing downloads again.
4. Delete the app, reinstall from SideStore, laptop on, open Library. Pass: same Mine count, groups and Hidden list as before; downloads count up from 0 to 314.
5. Full player, tap Compare. Pass: the slim dial opens under the button, no new screen; flips land at the same second; Back sits left under the version button.
