# Design notes: for the overhaul after the logic is built

A running file. Not a plan and not a decision: ideas to pick from when the design overhaul starts (after Phases 1-2).
Anyone can add (me, chat, Code, the board). Mark each: **QoL** (small comfort), **UX** (how it feels), **Tech** (under
the hood). Started 2026-11-06.

## Where the app is now
A plain file explorer with a good player: dark grey, white text, blue links. It works; nothing about it says "my music".
That's fine until the logic is done. Every screen built so far keeps its logic in a store file, apart from the drawing,
so the overhaul can redraw screens without rewriting how they work.

## What others do (research, 2026-11-06)
- **Apple Music, iOS 26 "Liquid Glass":** see-through controls floating over the cover art, art that moves with the
  music, a tab bar that floats and shrinks as you scroll, search as its own round button bottom right. Shazam's redesign
  copies the same pattern. Lesson: the cover art *is* the screen; controls sit on glass above it.
- **Samply, Highnote, Fasttrak (tools for artists' unreleased songs):** timestamped comments on the waveform, a "Mix
  Lab"/A-B switch between versions, voice-note comments. This is our Compare plus Phase 2 tags. Users say timing of
  comments is often off on phones: our tags must land on the exact second.
- **SoundCloud:** comments drawn on the waveform itself, so you see where the talk is. Our tags could show the same way:
  dots on the seek bar where a line was tagged.
- Nobody found does "search by a line I rapped". That's The Vault's own thing; make it the hero of the home screen.

## Ideas: look and feel (UX)
1. **Seek bar becomes a waveform** with tag dots. Tap a dot: jump to the line. Same bar in Compare shows where versions differ.
2. **Cover art everywhere.** Songs have none yet: generate a plain tile per song from its title and date (colour from
   the group), replaced by real art later. A wall of tiles looks like a catalogue, not a folder.
3. **Home = search box first** ("rap a line"), then Recently played, Not sure pile, Unsorted count. Library becomes a tab.
4. **Versions as a stack:** a grouped song shows as a card with the others peeking behind it; swipe the stack = Compare.
5. **Sort card feels like a game:** big art, Keep/Not mine as swipe right/left with haptics, a streak counter.
6. **Mini-player** that floats above the tab bar and grows into the full player, like Apple Music.
7. **One accent colour** of my choosing (not system blue), used only for "this is playing" and the main action.
8. Dark by default, true black behind art so it's easy on the eyes at night in the studio.

## Ideas: comfort (QoL)
1. A-Z jump strip on the Library (parked). 2. Recently played row. 3. Long-press a song: Play next, + Version, Hide,
Compare. 4. "Waiting to send: N" always visible until sent (6.2). 5. Sleep timer. 6. Play count and "last heard" per
song, to surface forgotten songs. 7. Pull to refresh on Library. 8. Shake to undo the last verdict.

## Ideas: under the hood (Tech)
1. Store song length and a small waveform picture at scan time on the laptop (one job, used by many screens).
2. Phone backup of phone-only bits on the laptop (6.2 board), so a reinstall loses nothing.
3. Siri / Shortcuts: "Play the song with <line>" once search exists (VISION "Later").
4. Widgets: lock-screen widget with the last song and a Play button.
5. A design system file (colours, sizes, spacing) in one place before the overhaul, so the redraw is one change.

## Sources
[Apple Music iOS 26](https://www.whathifi.com/smartphones-tablets/apple-announces-ios-26-with-a-new-liquid-glass-design-and-an-upgraded-apple-music-app) ·
[Shazam Liquid Glass](https://www.engadget.com/apps/shazam-for-ios-just-got-a-liquid-glass-makeover-194954181.html) ·
[Samply](https://mwm.ai/apps/samply-listen-share/6463439253) · [Highnote](https://highnote.fm) ·
[SoundCloud waveform comments](https://community.soundcloud.com/playbook-articles/soundcloud-brings-comments-to-the-waveform-on-mobile)
