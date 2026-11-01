# Status

**Phase 1 started.** Updated 2026-11-01 by Code. How we work: `WORKFLOW.md`. Build order: `ROADMAP.md`.

**In progress:** nothing.
**Next up:** me: commit, phone check, then Review.
**Current task:** `NEXT.md` "Server, stream a song by id" (ROADMAP 1.8), built, phone check pending.

## Done
- Phase 0 closed: details in `DECISIONS.md` and `SPIKE-RESULTS.md`.
- ROADMAP 1.11 built: full Xcode log saved on a failed build. Not proven until a build fails.
- Duplicate names done: 1,395 files, no repeats (`flip` kept on purpose).
- ROADMAP 1.1 built and accepted: library at `E:\VaultLibrary`.
- ROADMAP 1.2 built and accepted: 1,546 places, 1,537 files, 217 verdicts, 1,327 unsorted. Music folders unchanged.
- ROADMAP 1.4 + 1.6 built and accepted: 1,395 songs, 64 in more than one place, 0 likely links.
- ROADMAP 1.5 built and accepted: mine 68 + 5, likely 115, unknown 1,207.
- ROADMAP 1.8 built: `serve` command, 589 songs playable, 806 cloud-only.

## Queue
1. ROADMAP 1.10 `doctor`: Tailscale, server, guard, library marker, `test_library.py`, music fingerprint before/after a scan, songs with no present place, stops test servers after. fast-lane OK.
2. ROADMAP 1.12 real app built and sideloaded.

## Open questions
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
- Phone, 1.8: the steps in `REPORT.md`.
- Laptop, 1.2 + 1.4 + 1.5 + 1.6: `python server/vault_cli.py check E:\VaultLibrary` shows 1537 files, 1395 songs, and the Scanned, Songs and Mine lines (mine 68 + 5, likely 115, unknown 1,207). Tell chat if it doesn't.
