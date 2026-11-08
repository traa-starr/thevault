**Step:** Phase 2 batch 1 (tag from the player), 2026-11-07.

**Verified by running:** `/verify` 11/11 PASS (server tests incl. 30 new tag checks, playOrder test incl. 3 new tag-overlay checks, typecheck, music guard, check_repo). Repo check: clean.

**Phone update:** publish, server restart. Restart the server FIRST (the app now needs laptop level 4; an old server makes it say "out of date"), then run the publish line, then close and reopen the app.

**Needs the phone:**
1. Playing a kept song, open the player, tap **Tag here** (right of the eye), wait 30 s typing, tap Return. Pass: the row shows the tap's second (the field showed it as "1:42.3"); tapping the row later jumps there; an amber tick sits on the seek bar.
2. Airplane mode: tag, then start a second tag and kill the app mid-typing; reopen and open the player. Pass: the half-typed line is back in the field; both rows say "Saved on phone".
3. Airplane off at home: Pass: both rows turn "On laptop" within a minute.
4. Taste: does the player still fit your screen? The tag list sits between Back and the Mine/Not mine buttons. Tell chat what's cramped.

**Changed:** `app/App.tsx`, `app/Player.tsx`, `app/outbox.ts`, `app/phoneBackup.ts`, `app/playOrder.ts`, `app/playOrder.test.mjs`, `app/playerStore.ts`, `app/sortData.ts`, new `app/Tagging.tsx`, new `app/tagStore.ts`, `server/vault_server/server.py`, `server/vault_server/store.py`, new `server/vault_server/tags.py`, `server/test_server.py`, `.claude/skills/next/SKILL.md`, `.claude/skills/wrap/SKILL.md`, `docs/pending-skills/` deleted, `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/STATUS.md`, `docs/REPORT.md`.

**Differed from NEXT.md:**
- The real player had no spare height for a tag list (about one row on a 6.1" iPhone). So: the grey status line ("not on laptop yet" etc.) now shows in the reserved line when no tag is being typed, the empty space above the title is gone, and swipe-up to Queue is the blank space under the tags. Reversible; check 4 asks about it.
- "Tag here" sits right of the eye, in the bottom row, not on its own line (no room).
- The phone doesn't know version ids, so the laptop fills in the song's current version.
- Tapping a tick: a tap within half a finger of one jumps to its exact second and shows its words; a drag still seeks.
- A song change mid-typing saves the draft to the song it was tapped on (seen while the player is open). If the player was closed, the field comes back next time and Return saves it to its own song ("Tagged at 1:42 on <title>").

**Not done:** nothing in batch 1. Hold-a-row actions (Change words, Move to now, Delete) are batch 2.

**Decisions needed:** none. Build calls logged in DECISIONS (reversible).

**Proposed next step:** chat walks the 4 checks; then Phase 2 batch 2 (change tags, tagging session).

**Pitch:** a `/tags` count in doctor (tags, songs tagged, any on a missing song) so the restore test (2.7) has a number to compare.
