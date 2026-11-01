# Status

**Phase 1 started.** Updated 2026-11-01 by chat. How we work: `WORKFLOW.md`. Build order: `ROADMAP.md`.

**In progress:** nothing.
**Next up:** me: new Code session, `/next`.
**Current task:** `NEXT.md` "Stream real songs into the player" (ROADMAP 1.20 + 1.15 core).

## Done
- Phase 0 closed: details in `DECISIONS.md` and `SPIKE-RESULTS.md`.
- ROADMAP 1.1 accepted: library at `E:\VaultLibrary`. 1.11 built (Xcode log on failed build), unproven.
- ROADMAP 1.2 built and accepted: 1,546 places, 1,537 files, 217 verdicts, 1,327 unsorted. Music folders unchanged.
- ROADMAP 1.4 + 1.6 built and accepted: 1,395 songs, 64 in more than one place, 0 likely links.
- ROADMAP 1.5 built and accepted: mine 68 + 5, likely 115, unknown 1,207.
- ROADMAP 1.8, 1.10, 1.12, 1.13 phone-verified: playable count, doctor, app installed, prototype player.
- ROADMAP 1.14 phone-verified: library list.

## Queue
1. Not mine in the player: Mine / Not mine buttons. Not mine skips to the next song and hides it from the app for good; 5-second Undo toast. Saved on the laptop, music files never deleted or moved. Needs the server's first write (Code proposes how). Shuffle then skips songs already marked Mine, so it only lands on unsorted ones.
2. Parked: server `/status` count-only answer (Code's pitch).
3. Parked for 1.15: tap the time to show remaining (Code's pitch).
4. Parked: A-Z jump strip on the library list (Code's pitch).
5. Parked: doctor's fail line names the files that changed during a scan (Code's pitch).

## Open questions
- How sorting mine / not mine works on the phone (swipe each, bulk by folder first, short previews): options before ROADMAP 1.19. Partly answered: buttons in the player come first. Default: likely mine shown first.
- Does SideStore keep app data across re-signs? (ROADMAP 1.18)
- Does BandLab export keep the title, and what formats? (ROADMAP 5.1)
- `SAVE ME` stays in for now: not sure it's mine.
- `ANY WAY new limit.wav` is the newest version but wav only: needs a compressed render (ROADMAP 1.7).
- The 8 same-render copies keep the `Music` copy (chat-default): say if wrong.
- `Session Music` top-level loose files kept in the scan (chat-default): say if they should go.
- 26 date-only names and the `Untitled...` files wait for later.
- Known gap: a song stays counted if its file later becomes not mine or vanishes (0 today).
- Known gap for 1.3: a kept file that goes back to cloud-only shows unsorted after a rebuild until local again (journal keeps the verdict).

## Checks pending
- none
