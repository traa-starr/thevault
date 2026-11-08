# Board: Phase 2 tagging (2026-11-07)
All four seats, one brief (ROADMAP 2.1-2.7, owner questions from `../archive/PLAN-SESSION.md`). Advisory. Owner's answers: DECISIONS.

## Agreed
- **The tap is the moment.** The second is read from the player at the tap and frozen, however long typing takes. Shown on the field ("at 1:42") so I can nudge it.
- **Music keeps playing** on "Tag here". Pausing would shift the moment and break rap-along recall.
- **Dictation = the iPhone keyboard mic.** Free, already known, works offline. No in-app mic.
- **One-line field, Return saves.** No confirm step, no haptics. A reserved line shows "Saved · Undo" for ~5-8 s, so nothing jumps.
- **Tags list under the player:** "1:42  line". Tap = jump. Hold or swipe = change words, move to now, delete. All undoable.
- **Seek bar ticks:** thin marks with a big invisible tap area; tap jumps. Close ticks merge.
- **Same "Tag here" in the normal player.** The session card is the player plus a counter, Not mine and Next.
- **Pool = Mine songs only.** They play offline; others need the laptop.
- **Undo is a real new journal line**, never a quiet erase. Tag ids are made on the phone and never change.
- **Double tap guard:** a second tap within ~1 s doesn't start a second tag.
- **Draft kept on every keystroke** (song, second, text), offered again after a kill or lock. Drafts never sync.
- **Sync state:** one small grey word, "Saved on phone" then "On laptop". Nothing waits on sync.
- **Phone backup file** includes tags still in the outbox, so a wipe before sync loses nothing.
- **Naming Untitled / date-only songs:** a display name only (database title, origin manual, existing `song_field` + `song_field_restore`). Files never renamed.
- **Search (Phase 3) stays open:** plain text + song + second, nothing phone-only, so either side can search.

## Disagreed
- **Lead-in:** tester: store the tap minus ~1 s (I rap after hearing the line). Flow/logic: store the tap exactly, nudge if needed. Owner call.
- **Edit/delete records:** logic: new `tag_edit` + `tag_restore`, delete becomes "mark deleted" (needs a database schema bump). Tester/flow: `tag_edit` with only the changed fields, undo-delete = re-add same id. Owner call (hard to undo).
- **Naming on the card:** UI/logic: yes, a quiet "Name this song" line. Tester: separate batch. Code: put it in a later batch, card only shows the line.
- **What counts as tagged:** logic: a tag or a verdict. Code: at least one live tag (the counter is about tags; every pool song is already Mine).
- **Field opens at once** after the tap (flow, UI) vs only on "Add words". Owner call.

## Must handle in the build
- `POST /changes` allows tag kinds and `song_field` (title only); `test_server.py` flips its "tags refused" check.
- Every tag change carries `song_id` (the allow-list needs it). A tag for a merged-away song follows the merge, never retries forever.
- Ship the laptop before the phone, so an old server never sees new kinds.
- Text capped (~500 characters), any language and emoji safe.
- Rebuild-from-journal test compares tags row for row, including an old-style line.

## Owner questions (defaults first)
1. Journal shape for a tag and its edits/deletes (hard to undo). 2. Lead-in or exact tap. 3. Field opens at once or on a tap.
4. Seek bar ticks only, or ticks plus the nearest tag's words while playing.

## Proposed phone checks
Mockup: tag at a moment, wait 30 s, save: the time is the tap's · double tap: one draft · Not mine then Undo: back, nothing jumps.
Real: airplane mode, tag, lock, kill, reopen: tag and draft still there, "Saved on phone" · laptop back: "On laptop" within a minute; same tag edited twice offline, second text wins · restore with one unsynced tag: all back, jump lands on the same second.
