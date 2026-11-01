# Status

**Phase 1 started.** Updated 2026-11-01 by Code. How we work: `WORKFLOW.md`. Build order: `ROADMAP.md`.

**In progress:** nothing.
**Next up:** me: phone checks, then Review.
**Current task:** `NEXT.md` "Library list" (ROADMAP 1.14).

## Done
- Phase 0 closed: details in `DECISIONS.md` and `SPIKE-RESULTS.md`.
- ROADMAP 1.1 accepted: library at `E:\VaultLibrary`. 1.11 built (Xcode log on failed build), unproven.
- ROADMAP 1.2 built and accepted: 1,546 places, 1,537 files, 217 verdicts, 1,327 unsorted. Music folders unchanged.
- ROADMAP 1.4 + 1.6 built and accepted: 1,395 songs, 64 in more than one place, 0 likely links.
- ROADMAP 1.5 built and accepted: mine 68 + 5, likely 115, unknown 1,207.
- ROADMAP 1.8 built and phone-verified: 589 songs playable, 806 cloud-only.
- ROADMAP 1.10 built and phone-verified: doctor.
- ROADMAP 1.12 phone-verified: The Vault installed, shows 1,395 songs and "not reachable".
- ROADMAP 1.13 phone-verified: prototype player.
- ROADMAP 1.14 built, phone check pending: library list.

## Queue
1. ROADMAP 1.15 real player (needs songs on the phone or streaming; see open question).
2. Parked: server `/status` count-only answer (Code's pitch).
3. Parked for 1.15: tap the time to show remaining (Code's pitch).
4. Parked: doctor's fail line names the files that changed during a scan (Code's pitch).

## Open questions
- 1.15 vs 1.20 order: real player needs audio. Raise options at the next review.
- How sorting mine / not mine works on the phone (swipe each, bulk by folder first, short previews): options before ROADMAP 1.19. Default: likely mine shown first.
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
- ROADMAP 1.14: library list phone check (after build).
