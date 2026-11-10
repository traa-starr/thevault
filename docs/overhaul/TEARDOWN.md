# Teardown: every screen against my bar (ROADMAP O.1)

Written by Code, 2026-11-09, from screenshots of the real app code drawn with fake songs (`npm --prefix tools/shots run
shots`; PNGs in `spike/output/shots/`, named below). The bar is the owner's, in `DESIGN-NOTES.md`: someone used to
Spotify, Apple Music, Instagram, YouTube or X should not feel a step down. Each screen is scored 1-5 on its four
questions: **Smooth** (finishing an action feels smooth), **Fits** (the layout fits how I really use it), **iPhone**
(friendly to the hardware: one hand, lock screen, haptics), **Listen** (a better place to listen than Files or Apple
Music; feels like my 12 years). 5 = level with the benchmark apps, 3 = works but plain, 1 = a clear step down.
The screenshots can't show motion, sound or heat: motion notes come from the code.

## The short version
The logic is ahead of the look. What the app does (tags on the exact second, search by a line, versions, Compare,
Fire / Shelve, offline copies) none of the benchmark apps do. What it looks like is a developer's test screen: grey on
grey, text links, no pictures, no icons, no tab bar, every screen its own island. The same five problems repeat:

1. **Nothing to look at.** No cover art, no colour, no waveform. Spotify and Apple Music are 60% picture. Here every
   song looks like every other song, so 12 years of work reads as a file list.
2. **Words where every other app has symbols.** Previous, Pause, Next, Back, Home, Shelve, Fire are words in boxes. Words
   are slower to hit, wider, and make the player look like a form. (The Compare word is the right weight; the transport
   row isn't.)
3. **No sense of place.** No tab bar. Home is a menu of three links. Getting from the player to search is Back, Back,
   tap, tap. The benchmark apps are one thumb-tap from anywhere to anywhere.
4. **Everything is the same size and the same grey.** Little says "this is the main thing here". On the player the
   title, the transport, Mine / Not mine and the tags all shout equally.
5. **Motion is on or off.** Screens swap instantly; only the sheet slides. No shared movement between the bar and
   the player, nothing that follows the finger except the sheet's grab bar and the Sort card.

## Screen by screen
| Screen | Shot | Smooth | Fits | iPhone | Listen | Overall |
|---|---|---|---|---|---|---|
| Home | `home`, `home-mini-player` | 3 | 1 | 2 | 1 | **1.5** |
| Library | `library`, `library-rated`, `library-mini-player` | 3 | 3 | 2 | 2 | **2.5** |
| Search | `search-match`, `search-typing-half-word`, `search-many-keyboard` | 4 | 3 | 3 | 4 | **3.5** |
| Full player | `player-over-library`, `rate-fire-library` | 3 | 3 | 3 | 2 | **2.5** |
| Mini player (the bar) | `library-mini-player`, `sort-mini-player` | 3 | 3 | 2 | 2 | **2.5** |
| Queue | `queue-from-player`, `queue-from-mini-library` | 3 | 3 | 3 | 2 | **2.5** |
| Sort card | `cards` | 4 | 4 | 3 | 3 | **3.5** |
| Tagging session | `session-card`, `session-tagged-list` | 3 | 4 | 3 | 3 | **3** |
| Tagging in the player | `player-field-open`, `player-30-tags`, `player-hold-menu` | 4 | 4 | 3 | 4 | **3.5** |
| Versions | `versions-sheet`, `versions-chip-in-player` | 3 | 3 | 3 | 2 | **2.5** |
| Compare | `compare-in-player` | 4 | 4 | 3 | 4 | **3.5** |

**Home (1.5).** A title, a song count and three blue links in the middle of an empty screen. Spotify's and Apple
Music's first screen offers something to play within one tap; this one offers a menu. It also carries the laptop
address, which is a settings job. Nothing of mine is on it: no recent songs, no "search a line", no Fire songs.
Keep: the quiet build line at the bottom.

**Library (2.5).** It works at 1,395 songs and search is in the right place. But each row is a title and a date with
"On the laptop", which is plumbing, not music. The chip row mixes four different jobs in one scrolling line (Shuffle
is an action; Mine / Fire / Unsorted / Grouped are filters; A-Z / Newest are sort orders; Hidden is another screen), and
half of it is cut off the right edge. "Tag songs" and "Home" sit in the header as text. Apple Music's library has art
on every row, a clear Play and Shuffle pair, and an index strip. Keep: one fixed row height, the "N of N on this phone"
line, Fire / Shelved as words.

**Search (3.5).** The strongest idea in the app: type half a word and the line I rapped shows with its second. That's
ahead of every benchmark. What holds it back is that it's hidden inside Library instead of being the front door, and
results are plain text rows. Keep: bold matched words, the time on the right, tap plays from that second.

**Full player (2.5).** The most-used screen and the furthest from the bar. Top third: a title and a seek bar. Then a
row of five boxes (a word, two words, a filled word, a word, a drawn icon), then a row of text links, then Back /
Shelve / a tag icon, then an eye, then two very large Mine / Not mine buttons that matter least now that sorting is
done. In Apple Music the eye lands on the art, the thumb on Play. Here the biggest things on screen are Mine / Not
mine. Three accent colours compete (blue, amber, white). No art, so no feeling of "this song". Keep: nothing moves
when info arrives; tag ticks on the bar; the reserved line; Fire and Shuffle balancing the row.

**Mini player (2.5).** Right place, right idea, but it's a grey slab with two text buttons and the word "Playing". No
progress, no art, no way to feel it's the same object as the player (it doesn't grow into it; the sheet slides up
over it). Swipe-up for Queue is hidden: nothing hints at it. Spotify's bar shows progress, art and a play glyph.

**Queue (2.5).** Clean and it reorders with haptics (good, and physical). But it's a bare list: no art, no "playing
from Mine shuffle", the now-playing row looks like a label. From today, opened from the player, it slides over the
player and pulls back down to it (this step). Keep: drag feel, frozen rows while dragging.

**Sort card (3.5).** The best-feeling screen: a card that follows the finger, colour on the border, big clear
choices. It is the one place the app already feels like an app. Step down only in look: the card is an empty grey box
(a title and a date) and the buttons are heavy blocks of dark red and green that don't appear anywhere else.
Keep: the swipe, the Undo, the progress line.

**Tagging session (3).** The right flow (one song, Next, a count), but it's the player with two buttons swapped, so it
inherits the player's crowding and adds "1 of 10 tagged" as small grey text. It should feel like the Sort card:
one song, one job. Keep: Not mine with Undo, the count.

**Tagging in the player (3.5).** Fast and exact: tap, type, Return, with the second frozen at the tap. The field
appears in a reserved line, so nothing jumps. Looks plain, and the amber tag icon is the only icon in the app, which
makes it read as a warning. Keep: all of the behaviour.

**Versions (2.5).** An iOS sheet with a paragraph of explanation at the top. If it needs a paragraph, the layout isn't
saying it. The Main isn't visibly different from the others beyond a small grey word. DESIGN-NOTES idea 4 (a stack of
cards) would say "these are one song" without words. Keep: the menu's choices.

**Compare (3.5).** Clever and it works: a small wheel in place of the Compare word, sound flips on rest. Hard to
discover (a pill of dim text), and nothing on screen shows the two versions side by side. Keep: the wheel's
behaviour, the title following what's sounding.

## What the redesign must fix first (in order)
1. A picture for every song (a generated tile until real art exists), used on every screen.
2. A tab bar and a real Home: search a line, recently played, Fire, forgotten songs.
3. The player rebuilt around one hierarchy: art, title, seek, transport as symbols; everything else one level down.
4. One accent colour, one type scale, one spacing unit, used everywhere (the design system file).
5. The mini player and the player as one object that grows, with progress on the bar.
6. Icons for the transport and tabs (SF Symbols), words kept for the things that are mine (Fire, Shelve, Tags).

## What must survive the redesign
Nothing shifts when info arrives. Play first, info after. Every tap answered at once. The exact-second tag. Search by
half a word. Undo on every verdict. Fixed row heights. Words, not colour alone, for Fire and Shelved.
