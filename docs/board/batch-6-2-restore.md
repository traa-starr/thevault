# Board notes: batch 6.2, Restore and inline Compare
Meeting 5, 2026-11-06, part 1 of the build session. Two briefs: the inline Compare dial (owner's design) and restore
after a wipe. Words: **On this phone**, **waiting to send**, **laptop** (never server, sync, cache).

## Agreed: inline dial
1. The dial is one row right under the Compare button, about 48 pt tall (taps need 44). No sheet, no new screen.
2. The full player's own seek bar and Play/Pause drive Compare while it's open; Compare's separate ones go. Seek moves
   every version together. Compare owns the sound (one owner at a time, as 4d).
3. The row shows: version title (one line, cut with "…"), "Main" tag on the Main, "2 of 5", and a state: Playing,
   Loading…, Not on this phone (dimmed). Date and length leave the line.
4. While open, the Compare button reads **Done** (filled). Closing the player sheet also counts as Done.
5. "Back to <name>" sits left, under the version button, only after you've moved off the first version.
6. Lock screen names the sounding version, changes on each flip; no Next/Prev there while open.
7. Swipes that start on the dial belong to the dial: the sheet must not close from them.
8. App killed mid-Compare: reopens on the queue's song, Compare closed (as now).

## Agreed: restore
1. Once the address is known, list, Mine, groups and Hidden come back by themselves; copies download from 0 in the
   existing line ("Saving to phone: 0 of 314").
2. **Unsent changes** show as one line at the top of Library (and Sort): "3 changes waiting to send", with "Laptop not
   reachable" when it's off. Stays until the count is 0. The laptop already ignores a change it has seen (same id).
3. The app names anything it lost, once, in plain words, and only what was really lost.
4. Laptop off on a fresh install: a clear "Connect to your laptop to restore", never a blank Library.
5. A typed address is tested and says pass or fail.
6. Per item, re-sign / reinstall: address kept / lost · outbox kept / **lost (the only real loss)** · Not sure pile
   kept / lost · last song and spot, 2 display settings kept / lost (harmless) · song list cache and phone copies kept /
   rebuilt · survival stamp kept / lost (it's the signal).

## Disagreed
- **Swipe direction.** Screen, flow: sideways (no fight with the sheet's swipe-down, matches Back on the left, arrow
  taps as a fallback). Owner's brief said "dial" (today's is up/down).
- **Library group entry.** Flow, screen: the dial opens inline under the group row with its own Play. Logic: open the
  full player with the dial open (one path, reuses 4d's Library rules). Tester: either, but it needs its own Play.
- **Next/Prev while open.** Logic: greyed out, Done is the way back. Flow: Next closes Compare and plays on.
- **Song end.** Logic: stops at 0:00 (4d rule). Flow: closes Compare and the queue moves on.
- **Backing up phone-only bits** (Not sure pile, outbox copy, settings). Logic, flow: one "phone backup" file on the
  laptop, outside the journal, overwritten each time. Screen, tester: accept the loss and say so.
- **Telling a wipe from a first install.** Logic: the laptop remembers the install stamp. Flow: Keychain note (new
  native module, new build) that also keeps the address.

## Owner answers (2026-11-06, DECISIONS)
Phone backup file on the laptop: yes. Swipe: sideways. Library: opens the full player with the dial open. Next/Prev: greyed.

## Proposed phone checks
1. Compare open, swipe 10 times fast and slow. Pass: the player never closes, every flip at the same second.
2. Compare open, tap Next and Prev. Pass: greyed, or Compare closes cleanly, never a stale title.
3. Lock mid-Compare, unlock. Pass: lock screen names the version heard; only one audible.
4. Re-sign twice, nothing waiting, airplane mode, Library. Pass: "On this phone: 314" both times, nothing downloads.
5. Laptop off, make 2 changes. Pass: "2 changes waiting to send", still there after force-close; laptop on: goes to 0.
6. Delete, reinstall, laptop on, type the address. Pass: same Mine, groups, Hidden; downloads 0 to 314. Laptop off:
   "Connect to your laptop to restore", not a blank Library.
