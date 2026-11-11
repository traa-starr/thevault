# Live Activity on a sideloaded build: can it work?

Wave 4 memo (D2), 2026-11-11. Research only: nothing built, nothing installed. Row: `overhaul/REBUILD.md`.

**What it is:** the now-playing card on the lock screen and Dynamic Island, with my own buttons (Tag, Favorite).
It is a "widget extension": a second mini-app inside the app that iOS runs for lock-screen pieces.

**Short answer: probably yes, not proven.** Nothing found says a free Apple ID blocks it; nothing confirms it works
through SideStore. Only a throwaway build can tell. It needs a full rebuild, so it can't ship by publish.

## What is known
- **No paid-only permission for the kind we want.** The app runs while a song plays and updates the card itself; only server-pushed cards need a paid account.
- **The card must be started while the app is open** (fine: playback starts there). Its buttons need iOS 17 or later.
- **Expo has an official piece for this** (`expo-widgets`): it creates the mini-app during the build and an "App
  Group" (a shared box between app and mini-app). Free accounts are allowed App Groups.

## What is not known (the three risks)
1. **App slots.** A free Apple ID runs 3 sideloaded apps and SideStore is one. The mini-app is a second App ID
   (10 per 7 days: fine). Whether it also takes one of the 3 slots is unclear; if so, Vault plus card fill them all.
2. **SideStore signing both parts every 7 days**, App Group included. No source confirms it for a Live Activity.
3. **The card's limits.** iOS ends a card after 8 hours and can drop it sooner; today's lock-screen controls don't.

## Options
1. **One throwaway build, then decide.** A copy of the app under a different name and ID with one bare card (title,
   Favorite button), installed next to the real Vault. The real app is never touched. Cost: one session plus one
   install by me. Answers risks 1 and 2 for real.
2. **Don't do it.** The lock screen already has play, skip and the "Tag this" link. Cost: none.
3. **Wait for a paid account** ($99 a year; the one you didn't ask about): no 7-day signing or slot limit, so no risk 1 or 2.

## What a senior engineer would pick
**Option 1, after the ship line (2.7), not before.** Cheap, can't hurt the real app, and turns three guesses into
one answer. If the install refuses or the card never shows, stop and take option 2.

## My steps for the throwaway build (only after I say go)
1. Code makes the copy in `spike/` ("Vault card test", its own ID) with a build job; I download its `unsigned-ipa`
   from GitHub like the real one (`SIDELOAD-GUIDE.md` step 7).
2. In SideStore: My Apps > + > pick it. If asked about app extensions: **Keep**. Note any "3 apps" message word for word.
3. Open it, press Play, lock the phone. Is the card there? Tap its button. Does it answer?
4. Seven days later: refresh in SideStore, repeat step 3. Then delete the test app.
