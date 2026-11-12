# Fresh-eyes review: guard fix (a) and render folder (c), 2026-11-11

Reviewer ran `test_guard_music.py` (75/75) and `test_renders.py` (all pass) first. 8 catches, saved before any fix.

1. **HIGH, guard: the narrowed `-e` rule lets inline-script writes through.** `perl -pi -e`, `ruby -e 'File.write(..)'`,
   `node -e "..createWriteStream(..)"`, `node -e "..openSync(..,'w')"`, `sed -n -e 's/a/b/w <file>'` aimed at a locked
   folder all passed. The old blanket `-e` block covered them. Fix: a `-e` passes only when it belongs to a known
   read-only tool (grep, rg, echo, Select-String...).
2. **HIGH, renaming a render makes the song vanish for good.** `Mix 1.wav` renamed `Mix 1 final.wav`: the old path is
   still "present" during the check, so the new name is called "already in the Vault", remembered and never recorded;
   the old place is then marked gone. Moving it into a subfolder does the same. Fix: work out the gone places first; a
   match only in a gone place is a rename or move, so the new place joins the same song.
3. **MED, a run cut off half-way is never repaired.** Power cut after the file is recorded, before songs are linked: the
   next click sees nothing new and never links it, so it never reaches Sort. Fix: also link when any render place has no
   song.
4. **MED, the window can close with no message.** An import error or bad argument happens before the pause. Fix: the
   icon runs through `cmd /c ... || pause`, and a handled stop exits 0 after its own pause.
5. **MED, a failed phone-copy step hides a good import.** If the copy step raises (not Busy), the window says "Stopped"
   and never shows "N new songs"; the next click says "Nothing new". Fix: guard only the copy step, print the count first.
6. **LOW, an empty render folder marks every render song gone.** Fix suggested: skip marking when the folder is empty.
7. **LOW, a touched file (same bytes, new time) is reported "re-exported, updated".** Fix: nothing to report when the
   fingerprint is unchanged.
8. **LOW, guard over-blocks a `>` inside a quoted pattern** (`grep -E '(a|b)>' f`). Fix: ignore quoted text when looking
   for output into a file.

Checked, no catch: the new sed `-i` pattern stops at pipes; `.unlinkSync(` blocks; the render folder is only listed and
opened read-only; a music scan's `under=root` matches resolved paths; two writers are safe (all writes under the lock);
growing files wait; cloud-only files are skipped unopened.

## Taken / not taken (Code, after the review)
- 1, 2, 3, 4, 5, 7, 8: fixed, each with a test.
- 6 not taken: the Desktop isn't synced (checked: plain `%USERPROFILE%\Desktop`), so there's no sync hiccup to empty it.
  Clearing the folder after sending is a normal habit; the places are marked gone truthfully, and Mine songs already
  have their library copy, so they keep playing.
