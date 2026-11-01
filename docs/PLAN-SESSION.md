# Plan session brief (Opus, Plan mode)
Written by chat, 2026-11-01. For one Claude Code session on Opus in Plan mode. **No app or server code this session.**
Only docs. The owner is an audio engineer, not a developer: plain words, one line per jargon term.

## Objective
Produce the blueprint and the build plan for **the rest of Phase 1**, so the next Code sessions can build bigger batches
without stopping to design. Then write the first batch into `NEXT.md`.

## Read first
`VISION.md`, `ROADMAP.md` (Phase 1 order, "Decisions to raise"), `DECISIONS.md` (settled, never re-ask), `STATUS.md`
(queue, open questions), `WORKFLOW.md`, `CHAT-INSTRUCTIONS.md` (rules every task must respect), `ARCHITECTURE-OPTIONS.md`,
`STORAGE-OPTIONS.md`, `SPIKE-RESULTS.md`, then the code as it is: `server/` (database, verdict journal, routes) and `app/`.

## What is left in Phase 1
1.15 queue (+ parked remaining-time tap) · Not mine buttons in the player (STATUS queue 1) · 1.16 background and lock
screen (+ parked now-playing bar) · 1.19 sorting card prototype · 1.21 sorting session · 1.22 import list · 1.3 cloud-only
downloads · 1.7 phone copies · 1.17 offline kept songs · 1.18 re-sign survival test · 1.9 nightly backup.
"Done when": sort the catalogue from the phone without downloading it, play a kept song at home and away with the screen
locked and the laptop asleep, app data survives a re-sign.

## Deliverables (all in `docs/`)
1. **`BLUEPRINT.md`** (under ~150 lines): how the finished Phase 1 fits together.
   - Data: what the laptop stores (songs, verdicts, journal, kept list, phone copies) and what the phone stores.
   - Server: every route needed, read vs write, and how writes stay safe (music files read-only always).
   - App: screens and how you move between them (Library, Player, Sorting, Settings), shared player state.
   - The first write path: Not mine / Mine / Undo, built on the existing verdict journal if it fits (Code's proposal in
     the last REPORT). Show it so Phase 2 tags can reuse the same pattern.
   - Offline and "laptop asleep": what works where.
   - Shape left open for Phase 2 (tags) so nothing has to be rebuilt.
2. **`BATCH-PLAN.md`**: the remaining Phase 1 items grouped into batches. Each batch = one Code session, **2-3 phone
   checks**, ROADMAP IDs cited, parts small and checkable, a stop line, and the calls it needs from the owner marked
   "blocks batch N". Order follows ROADMAP; reorders need a reason line for DECISIONS.
3. **`NEXT.md`**: batch 1 in the usual NEXT format (see `CHAT-INSTRUCTIONS.md`), with a numbered phone check per part.
4. **`WORKFLOW.md` Sizing**: proposed new rule ("one NEXT = one batch, 2-3 phone checks") as a draft line marked
   *pending owner OK*. Don't change the loop otherwise.
5. **`DECISIONS.md`**: one row per answer the owner gives, and one per plan call you make. **`STATUS.md`**: Next up,
   current task, open questions closed or added. **`REPORT.md`**: what was planned, open risks, commit message.

## Asking the owner (survey style)
Use multiple-choice questions (AskUserQuestion) when a call is truly the owner's. Max ~8 total, grouped in rounds of up to
4. Each: 2-4 options, a recommendation first marked (Recommended), a one-line why, "other" always allowed.
- **Must ask (hard to undo, never default):** where Not mine / Mine verdicts are saved and how undo works; where pulled
  cloud-only audio lives and the disk limit (ROADMAP "Decisions to raise" 1.3); how sorting works on the phone (1.19
  options: swipe each, bulk by folder/name first, short preview clips); plan if data doesn't survive a re-sign (1.18).
- **Taste:** sorting card look and gestures, Undo toast timing, what the lock screen shows.
- **Decide yourself and log:** anything reversible and technical.
- Don't re-ask anything settled in DECISIONS. Don't ask about the open questions STATUS marks as waiting for later.

## Freedom to innovate
Follow the framework that exists (laptop server + Tailscale + Expo app + SideStore, journal-first saves, read-only music).
Improve where you see a better path, but name it as a proposal with the trade-off, and prefer bridges (Shortcuts, deep
links, lock-screen controls) over fighting the platform. Flag anything that would be hard to change later.

## Limits
No code, no installs, no builds. No git (owner commits). Repo is public: no addresses, names, audio or credentials in docs.
Music folders and BandLab untouched. Docs stay short; STATUS and REPORT under 40 lines.
