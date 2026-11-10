# Every word the app can put on screen

Made by `app/labels.test.mjs` from the code; never edit by hand. `{…}` stands for a value filled in while the app runs
(a title, a count, a time). VoiceOver labels are in here too. Not in here: single lower-case words (those are stored
values like `mine`, never shown as they are), and the hidden lock-screen log.
The owner's rule (2026-11-10): plain music-app words, no slogans. The test fails on Fire, Shelve / Shelved and the mockups' slogans.

## App.tsx
- {…} songs on the laptop
- Build {…}{…}{…}
- Build: dev
- Change laptop address
- Checking the laptop…
- Close
- Copy all
- Data since
- Fresh install: type your laptop address, with the laptop on, and everything comes back.
- Home
- Laptop address
- Laptop not reachable
- Library
- Lock-screen log
- Save
- Sort

## Cards.tsx
- {…} left here
- ← not mine · mine → · up: not sure
- + Version
- All done here
- Back
- Back to Sort
- Cards
- Likely mine
- Mine
- Mine by its folder
- No sound: not on the laptop
- none left here
- not mine
- Not mine
- not sure
- Not sure
- Not sure pile done
- sorted ·
- Undo

## Frame.tsx
- Home
- Library
- Search

## Hidden.tsx
- {…} hidden songs
- 1 hidden song
- Back
- Cloud only
- File missing
- Hidden
- Laptop not reachable
- Loading…
- Nothing hidden
- On the laptop
- Restore
- Try again

## Home.tsx
- {…} days ago
- {…} months ago
- {…} years ago
- 1 month ago
- 1 year ago
- Favorites
- Mine or not mine, one card at a time
- More
- My songs one by one, to mark their lines
- No Favorites yet: tap Favorite in the player
- No Mine songs can play right now.
- Not played in a while
- Play {…}
- Recently played
- Search
- Shuffle
- Shuffle my Favorites
- Shuffle my songs
- Songs are still loading.
- Sort songs
- Tag songs
- The Vault
- Today
- Yesterday

## Library.tsx
- , so
- · {…} now Mine
- · {…} waiting on the laptop
- {…} changes
- {…} GB
- {…} MB
- {…} of {…} Mine songs on this phone · {…} of 8 GB
- {…} songs
- {…} ticked
- {…} version {…} skipped: use Versions
- {…}{…} found
- 1 change
- 8 GB limit reached: {…} Mine songs not on this phone
- Already Mine
- Already one family
- Archived
- Cancel
- Cloud only
- Favorite
- Favorites
- File missing
- Group as versions
- Grouped
- Hidden
- Hidden · {…}
- it wasn't
- Laptop not reachable
- Laptop not reachable: songs on this phone still play. Tap to try again.
- Library
- Loading songs…
- Main ·
- Mine
- more songs match: type more words to narrow
- Newest
- No Favorites yet: tap Favorite in the player
- No Mine songs yet
- No song or tag has “{…}”
- No songs yet
- No version groups yet
- not mine
- Not mine
- Nothing left unsorted
- On the laptop
- On this phone
- Phone storage full: {…} Mine songs not on this phone
- Saving to phone: {…} of {…}
- Search songs and tags
- Shuffle
- Shuffle off
- Shuffle on, {…}
- Shuffle: {…}
- Tag songs
- The laptop refused
- they weren't
- Try again
- Type a word to search
- Unsorted
- version groups
- Versions · {…}, Main: {…}{…}

## Notices.tsx
- · Laptop not reachable
- (backed up {…})
- {…}, sending now
- Also back{…}: {…}.
- Fresh install: connect to your laptop to get everything back
- Fresh install: getting your things back from the laptop…
- Laptop server is out of date: restart it (Stop the server, then Start the server). Tap to check again.
- last song and spot
- Not sure pile ({…})
- Nothing else was waiting on the old install.
- player settings
- Songs save to this phone again from 0.
- Songs, Mine, groups and Hidden come from the laptop.
- This phone's backup didn't save on the laptop. Tap to try again.
- waiting to send
- Welcome back

## Player.tsx
- + Version
- Archive
- Archived
- Archived, on
- Back
- Cancel tag
- Close
- Close player
- Compare
- Comparing versions
- Done
- Favorite
- Favorite, off
- Favorite, on
- Hidden:
- Hide lines
- Hide Mine and Not mine
- Lines · {…}
- Mine
- Mine, on
- Next
- Next song
- Not mine
- Nothing after this song
- Now playing
- Open player: {…}
- Pause
- Paused
- Play
- Playing
- Previous
- Queue
- Show lines
- Show Mine and Not mine
- Shuffle
- Shuffle off
- Shuffle on, {…}
- Shuffle:
- Sorting
- Tag
- Tag here
- Undo
- Up next

## Sort.tsx
- {…} songs
- 1 song
- All mine
- All not mine
- Back
- Cards ·
- Cloud only
- Every song has a card verdict or is in Not sure.
- File missing
- Laptop not reachable
- Likely mine
- Loading…
- Mine
- Mine by its folder
- No sets left
- not mine
- Not mine
- Not sure ·
- One by one
- Sets to sweep
- show songs
- similar names
- Sort
- Tag songs
- Try again
- Undo

## Tagging.tsx
- A line to remember
- Cancel
- Change the words
- Change words
- Delete
- Earlier
- Later
- Move to {…}
- No lines yet
- no words yet
- On {…}
- On laptop
- Saved on phone
- Undo

## Versions.tsx
- ”. Pick its Main.
- (newest)
- (your pick)
- {…} is Main now
- + Version
- Cancel
- Compare
- Done
- Hidden: {…}
- Keep as Main
- Linked to {…}
- Linking “
- Loading songs…
- Main
- Main, your pick
- Main{…}: plays in shuffle
- Make main
- No Mine song matches
- No Mine songs yet
- not mine
- Not mine
- Play
- Recently played, then the same folder
- Remove from Versions
- Removed: {…}
- Search Mine songs
- The Main plays in shuffle and holds the Library row. It's the newest version unless you pick one with Make main.
- Undo
- version picker
- Versions ·

## compareStore.ts
- Can't play
- Cloud only
- Ends {…}
- Laptop not reachable
- Not on this phone

## family.ts
- That's the same song.

## hangWatch.ts
- {…} never showed

## playOrder.ts
- Mine
- Unsorted

## playerStore.ts
- {…} now plays in shuffle
- Couldn't play this song
- Laptop not reachable
- Laptop not reachable, so this song stays Not mine. Restore it from Hidden later.
- No more songs in this list
- not mine
- Not on this phone, and the laptop isn't reachable
- Played every song in this list
- Several songs in a row wouldn't play, so it stopped
- Skipped: {…}
- Skipped: {…} isn't on this phone
- Still trying to load this song…
- This is the Main of {…} versions: make another one Main first (Versions).
- This song has versions: remove it from Versions first.
- This song is cloud only now

## pressLog.ts
- (x{…})
- Nothing logged yet.

## ratingStore.ts
- Archived:
- Favorite:
- Not a Favorite:
- Not archived:

## sessionStore.ts
- No Mine songs can play right now.
- not mine
- Not mine:
- Open Library once first, so the phone knows your songs.
- This song has versions: use Versions to take it out first.

## tagStore.ts
- Changed
- Deleted
- Moved to
- on {…}
- Tagged at

## updates.ts
- build {…}
- Update {…}, {…}

## versionStore.ts
- Already versions of each other.
- that song
