# Architecture options

**Status: draft. The phone tests haven't run, so nothing here is proven on the iPhone.** Lines marked *(test)* depend on them.

**Recommendation: Option C.** A native Expo app that keeps songs on the phone, with the laptop as hub. It's what a senior engineer would pick, because
your most common use is listening, and that shouldn't depend on a laptop being awake.

| | A. Expo app, streams from laptop | B. Capacitor-wrapped web app | C. Expo app, songs on phone (**pick**) |
|---|---|---|---|
| What it is | Native app; every play comes from the laptop | Web page in a native shell | Native app; compressed copies stored on the phone; laptop syncs |
| Laptop awake to listen? | **Yes** | Yes, unless more is built | **No.** Only for new songs, syncing, Open in FL |
| Works offline, plane, bad signal | No | With work | **Yes** |
| Background/lock-screen audio | Built in via expo-audio *(test)* | Needs a native plugin; web audio in a shell is the known weak spot | Built in *(test)* |
| Native feel, Liquid Glass | Good, via Expo UI | Weakest | Good |
| Siri/Shortcuts/deep links later | Yes | Yes, more plugin work | Yes |
| Build without a Mac | GitHub Actions | GitHub Actions | GitHub Actions |
| Extra work | Least | Some | Sync: downloads, offline tag queue |
| Phone storage | Almost none | Almost none | Est. 3-4 GB at ~192 kbps for ~570 songs; can limit to favorites |

## Why C
- **iCloud placeholders:** 982 of 1,718 files are cloud-only. Streaming those from the laptop means waiting on a download first, so A also needs copies. C makes them anyway.
- **Laptop sleep:** a laptop closes, sleeps, travels. A would fail silently in exactly the moments you want music.
- **Later:** C can start as A. Checkpoint 1 can stream; the on-phone store comes next without a rewrite.

## What must be running
- **Listening and tagging:** nothing. Tags save on the phone, then sync when the laptop is reachable.
- **New songs, sync, Open in FL Studio:** laptop on, awake, server + Tailscale running.
- **Source of truth:** the laptop's database, backed up as files. Phone holds a working copy. If sideload signing ever loses phone data, little is lost.

## Laptop
- Python + SQLite with FTS5 (works; see `SPIKE-RESULTS.md`). Tailscale: private network between your devices with HTTPS, no public exposure.
- The server binds to localhost and only serves known songs by id, never a path from the phone.

## Vault library folder (pick one when you approve)
**Pick: `E:\VaultLibrary`.** Holds its database, WAV/original copies of songs you've pulled in, and compressed phone copies. Outside iCloud and outside FL, so rule 1 stays simple.
- Alternative: an iCloud folder. Backed up automatically, but sync fights a live database, so a database there is a known corruption risk.
- Alternative: an external drive. Portable, but unplugged means offline.
- **Backup gap:** I don't know of any backup for E:, and **your 155 FL projects aren't in iCloud**. Tags are irreplaceable, so I'd add a nightly copy of the database (not audio) into iCloud through the app, with your OK since that's a new write location. Project backup is a separate decision.

## Signing and install (*test*, not yet lived)
- **Expo Go is for screens only.** Its docs point to background audio needing a real build, so the lock-screen test must be on the `.ipa`.
- **Sideload route, your pick:** iTunes + iloader + SideStore, leaving iCloud alone. iloader's docs list iTunes as the Windows requirement. If that fails, AltStore's documented steps, which temporarily remove iCloud; I'd ask first.
- **Why SideStore:** after setup it should re-sign on the phone without the laptop, which suits a phone-first life. AltStore needs AltServer on the laptop for each refresh; Sideloadly needs a daemon and its own iCloud version.
- **Free limits:** 7-day expiry, 3 apps, and SideStore itself counts as one. Widgets/extensions may not work.
- **$99 is worth it if:** re-signing fails more than about once a month, or you want widgets, Siri extensions, or TestFlight. Nothing in the code depends on it. Build identifiers stay in one setting.

## Later: always-on home server
Same Python server and same library folder moved to a small always-on box; Tailscale means the phone's address barely changes. Option C reduces the need, since the server only matters for sync.

## Decisions waiting on you
Client option · library location · database backup into iCloud · BandLab method. Approve in DECISIONS.md after the phone tests.
