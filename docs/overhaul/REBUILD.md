# Rebuilds: what this one carries, what the overhaul's own rebuild still needs

Written by Code, 2026-11-10 (NEXT 2026-11-09 F, ROADMAP O.3 and O.5). A "full rebuild" is the GitHub build plus a
SideStore install: the only way native pieces (code that talks to iOS itself) reach the phone. Everything else goes by
publish.

## This rebuild (ready now, waiting for me)

| Piece | What I get | How it was made safe |
|---|---|---|
| Fewer player reports while locked | The player wakes the app 30 times a minute when locked, not 120. Full rate the moment the screen is on, and while a song is finding its start spot | A 12-line patch on expo-audio (`app/patches/`), applied by the build itself. Tested on a pretend player; the phone's `timings` energy line is the proof |
| Search link `thevault://search` | A lock-screen Shortcut or Siri opens the app straight on the search box, keyboard up. `thevault://search?q=cold hands` fills the box too | The link's rule is tested (other links ignored). Opening from cold and from the background both handled |
| Laptop address in the Keychain | After a reinstall the app finds the laptop without typing. Today's install seeds the Keychain the first time the new build opens | The address file stays the first source; the Keychain is only read when the file is gone. Any Keychain error falls back to typing it, like today |
| Haptics | A light tick on today's controls | Already on the phone since the last build (it needed no new native piece) |

The same app code runs on the build I have now and on the new one (each new piece checks it's there before using it), so
publishes keep working before and after the rebuild. Nothing is lost if I rebuild late.

**Steps (mine):**
1. Commit and push (VS Code buttons).
2. GitHub, the repo's Actions tab, "Build iOS (unsigned)", Run workflow. Standard runner, about 15-20 min. Download the `.ipa` it makes.
3. SideStore on the phone: install that `.ipa` over the app (don't delete the app first: songs on the phone stay).
4. Open the app: it should connect by itself. Then the Shortcut: Shortcuts app, new shortcut, "Open URLs", `thevault://search`,
   add it to the lock screen or the Action button.
5. One locked listen of 10+ min, app to the background, then `python server\vault_cli.py timings E:\VaultLibrary`:
   the locked line should read about 30 wake-ups, not 123.

**Not proven until the phone has it:** that the patch compiles on GitHub's Mac (it can't be compiled on Windows; it
copies the shape of the lines next to it), and that SideStore's signing gives the app its Keychain (if not: the app
behaves as today, nothing breaks). If the build fails on the patch: delete `app/patches/expo-audio+58.0.11.patch`,
rebuild, and the other two pieces still ship.

## The overhaul's rebuild, wave 1 (ready now, waiting for me)

Written by Code, 2026-11-10 (NEXT 2026-11-10 E). The new look already runs on the build I have, by publish, with its own
drawn icons and solid bars. This rebuild swaps in the real things; nothing else changes and nothing moves.

| Piece | What I get | How it was made safe |
|---|---|---|
| Apple's icons (SF Symbols) | Play, Next, Home, Search, Favorite, Archive and the rest drawn by iOS itself, sharp at any size | `app/Icon.tsx` asks whether this build has them. It does: Apple's. It doesn't (today's build, the laptop's screenshots): the app's own drawn ones, in the same box. Tested both ways (`app/frame.test.mjs`) |
| Liquid Glass | Real glass on the tab bar, the search button, the mini player and the transport pill | Needs this rebuild and iOS 26. Anything less: the solid dark bar I see today. Lists and text never sit on glass |

**Steps (mine):** the same four as above: commit and push; GitHub, Actions, "Build iOS (unsigned)", Run workflow; download
the `.ipa`; SideStore, install it over the app (don't delete the app first). Then phone check 4 in NEXT.
The build's log now starts with the Xcode version it used: glass needs Xcode 26 or newer on GitHub's Mac. If the log
says older, the app still builds and runs, with icons but solid bars.

**Not proven until the phone has it:** that the two new packages compile on GitHub's Mac (they are stock Expo packages,
so this is the usual risk), and what real glass looks like behind the mini player's text. If a build fails on one:
take that one line out of `app/package.json` (`expo-symbols` or `expo-glass-effect`), run `npm install` in `app`,
rebuild. The app code needs no change: it already copes with a missing piece.

**Not in this rebuild (Code's call, reasons in REPORT 2026-11-10):** the native tab bar. The tab bar is drawn by the
app (`app/Frame.tsx`), so it looks and works the same on the build I have and the new one, and it can't reload the
player. iOS's own tab bar would need the whole app moved onto a navigation package first.

## Left for a later rebuild (O.5)

| Piece | Gain | Risk | Notes |
|---|---|---|---|
| Native tab bar | Real iOS tabs: the system's press feel, the tab bar that shrinks on scroll | Medium | Not taken in wave 1 (above). Worth another look only if the drawn tab bar feels wrong in the hand |
| Live Activity (lock screen / Dynamic Island card) | Now-playing with my own buttons (Tag, Favorite) on the lock screen | High | It's a second mini-app inside the app (a widget target). A free Apple ID gets few app slots and SideStore must sign both parts every 7 days; may not work sideloaded at all. The lock-screen controls I have already work. Try last, on a throwaway build first |

Order a senior engineer would pick: Live Activity as its own experiment after the overhaul ships, on a throwaway build. Each mockup's "Design system and native pieces" page says
which of these that direction needs.
