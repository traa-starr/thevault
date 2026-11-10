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

## Left for the overhaul's own rebuild (O.5)

| Piece | Gain | Risk | Notes |
|---|---|---|---|
| SF Symbols (Apple's own icons) | Controls read as iPhone-native at once; symbols replace words on the transport. Biggest look-per-effort win | Low | One Expo package (`expo-symbols`). Icons need a fallback picture in the screenshot kit |
| Native tab bar | Real iOS tabs: the system's press feel, the tab bar that shrinks on scroll, Search as the round button (iOS 26) | Medium | The app has no tab navigation today (screens are swapped by hand in `App.tsx`), so this is the shell wave of O.4, not a drop-in. The player and mini player must sit above it without reloading: test with the steady-screen spam test |
| Liquid Glass (tab bar, mini player, transport) | The iOS 26 look the mockups fake with blur | Medium | Needs iOS 26 on the phone and a build made with Xcode 26; on older iOS it must fall back to a solid bar. Glass under text hurts reading: lists stay solid (board) |
| Live Activity (lock screen / Dynamic Island card) | Now-playing with my own buttons (Tag, Fire) on the lock screen | High | It's a second mini-app inside the app (a widget target). A free Apple ID gets few app slots and SideStore must sign both parts every 7 days; may not work sideloaded at all. The lock-screen controls I have already work. Try last, on a throwaway build first |

Order a senior engineer would pick: SF Symbols with the shell wave, native tabs + glass together (one rebuild), Live
Activity as its own experiment after the overhaul ships. Each mockup's "Design system and native pieces" page says
which of these that direction needs.
