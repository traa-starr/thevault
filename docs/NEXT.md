# NEXT: Batch 4d, Compare versions
Written by chat, 2026-11-04.
Log: Batch 5 phone: checks 1-4 all passed; second import copied 0, Mine 314 = already in 314, taken out 0; ANY WAY copy plays and seeks (mine). Closes 1.7, 1.22. Compare streams the library copy, phone copy only offline; level match on by default with a toggle; blind mode parked (chat-default) (logged by chat)
Queue after this: Batch 6 "Offline and finish" (BATCH-PLAN). Then Phase 1 "Done when" with me.
Read: this file, `BATCH-PLAN.md` Batch 4d, DECISIONS rows "Version compare shape" and "Batch 4d defaults", `docs/board/batch-4-versions.md`, `BOARD.md`. Code of `Player.tsx`, `Library.tsx`, `versionStore.ts`, `playerStore.ts`, server importer as needed.
Session: Opus, medium effort. Board seats on Sonnet.
## Parts
0. **Board pass** (all four seats, one round, notes in `docs/board/batch-4d-compare.md`, under 60 lines). Brief: my design is fixed (A-B switch at the same second; dial picker, one version showing, swipe up/down like the iOS time wheel; opens from the full player and from a Library group). Seats answer: how a flip is triggered and shown (which version is playing, Main marked), groups of 2 vs 8, what happens at song end, that the queue is untouched, versions of different lengths. Take the board's defaults on owner questions; list them in REPORT.
a. **Compare from the full player.** A playing song that has versions gets Compare. The dial picks a version; the flip lands on the same second with no restart and no gap I can hear (load the other version ahead). Closing Compare keeps the song I'm on playing; the queue doesn't change.
b. **Compare from a Library group.** Starts on the group's Main at 0:00, same dial.
c. **Level match.** Laptop measures each Mine song's loudness (part of `import`, rerunnable); Compare evens the volume between versions. A toggle shows it and turns it off (off = real difference). Put any new laptop command line in REPORT.
**Stop line:** 0, a and b always go in. c waits if the session runs long.
## Phone check
1. Full player, a grouped song at about 1:00: Compare, dial to another version. Pass: it carries on at about the same second, no restart.
2. Flip back and forth 5 times fast. Pass: no stall, no wrong song, no freeze.
3. Library, a group of 3+: Compare. Pass: one version showing at a time, swipe up/down moves, Main marked.
4. Loud vs quiet version, level match on then off. Pass: on = about the same loudness; off = the real difference.
5. Close Compare. Pass: the song I was on keeps playing; queue unchanged.
