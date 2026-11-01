# Architecture options

**Status: decided 2026-10-31.** See the G2 rows in `DECISIONS.md`. The library went to option A (everything on `E:\VaultLibrary`), not this memo's pick (C, split). The rest below is the reasoning as written before the decision.

Spike results are in `SPIKE-RESULTS.md`.

## Approve sheet
| Call | Options | Pick (also what a senior engineer would choose) |
|---|---|---|
| **Client** | A. Expo app, streams from laptop · B. Capacitor-wrapped web app · C. Expo app, songs on phone | **C.** Listening shouldn't depend on a laptop being awake |
| **Library location** | A. All on `E:\VaultLibrary` · B. All on `C:\VaultLibrary` · C. Split: database on `C:\VaultData`, audio on `E:\VaultLibrary` | **C.** E: is a USB drive that can be unplugged, and C: is too full for the audio. Your tags stay on the drive that's always there |
| **Database backup** | A. Nightly copy to the other drive · B. Copy to the phone at each sync · C. Nightly copy into an iCloud folder | **A now, B when sync exists.** No rule change. C is the only one that needs your exception, see below |
| **BandLab method** | A. Hand export in the app · B. Browser automation with your session · C. Data request to BandLab | **A.** About 2-3 hours by hand isn't worth risking the account that holds unexported songs (`BANDLAB-OPTIONS.md`) |

**The backup call touches rule 1.** iCloud is a new write location, and the rules forbid it today: "never write inside iCloud Drive". Option C would need your explicit exception and a narrow opening in the music guard. Options A and B need neither.

## Client
| | A. Expo app, streams from laptop | B. Capacitor-wrapped web app | C. Expo app, songs on phone (**pick**) |
|---|---|---|---|
| What it is | Native app; every play comes from the laptop | Web page in a native shell | Native app; compressed copies stored on the phone; laptop syncs |
| Laptop awake to listen? | **Yes** | Yes, unless more is built | **No.** Only for new songs, syncing, Open in FL |
| Works offline, plane, bad signal | No | With work | **Yes** |
| Background/lock-screen audio | **Proven** (D4c) | Not tested; web audio in a shell is the known weak spot | Proven for streaming (D4c); **open** for stored files |
| Native feel, Liquid Glass | Good, via Expo UI | Weakest | Good |
| Siri/Shortcuts/deep links later | Yes | Yes, more plugin work | Yes |
| Build without a Mac | **Proven** (GitHub Actions) | Should work, not tested | **Proven** (GitHub Actions) |
| Extra work | Least | Some | Sync: downloads, offline tag queue |
| Phone storage | Almost none | Almost none | Estimate: 3-4 GB at ~192 kbps for ~570 songs; can limit to favorites |

**Why C**
- **iCloud placeholders:** 982 of 1,718 files are cloud-only. Streaming those from the laptop means waiting on a download first, so A also needs copies. C makes them anyway.
- **Laptop sleep:** a laptop closes, sleeps, travels. A would fail in exactly the moments you want music.
- **Later:** C can start as A. Checkpoint 1 can stream; the on-phone store comes next without a rewrite.

## What must be running
- **Listening and tagging:** nothing. Tags save on the phone, then sync when the laptop is reachable. *(Design; not built yet.)*
- **New songs, sync, Open in FL Studio:** laptop on and awake, server + Tailscale running. New songs and sync also need the E: drive plugged in if the audio lives there.
- **Source of truth:** the laptop's database, backed up as files. The phone holds a working copy.

## Laptop
- Python + SQLite with FTS5 (the built-in search): **proven on the laptop** with made-up tags (D6). Running it on the phone is **open**.
- Tailscale, the private network between your devices: **proven** on home Wi-Fi and on cellular (D4a).
- Open in FL Studio from the phone: **proven** with one fixed test project (D5).
- The server binds to localhost and only serves known songs by id, never a path from the phone.

## Library location
**Checked 2026-10-31, read-only:**
| Drive | What it is | Total | Free |
|---|---|---|---|
| E: | **External** 1 TB SSD on USB (Windows lists it as "fixed", but it's a USB drive) | 930 GB | 564 GB |
| C: | Internal NVMe SSD | 476 GB | 30 GB |

**Space needed, estimate:** about 15 GB. That's 7.7 GB of scanned songs, 3-4 GB of phone copies and 2-4 GB of BandLab WAVs (assuming ~40 MB a song). Originals stay where they are; the library holds copies.

| | A. All on E: | B. All on C: | C. Database on C:, audio on E: (**pick**) |
|---|---|---|---|
| Room | Plenty | **About half of what's free** | Plenty; the database is tiny |
| E: unplugged | Everything offline, and new tags can't reach the laptop | No effect | Tags and sync of tags still work; only new audio waits |
| Pulled mid-write | Database at risk | Safe | Database safe; a file copy is just redone |
| Backup target | C: | E: | E: |
| Simplicity | **One folder** | **One folder** | Two folders |

- **USB gotcha:** a USB drive's letter can change. The app should find the library by a marker file, not trust `E:`, and say so plainly when it's missing.
- **Rejected:** an iCloud folder. Sync fights a live database, a known corruption risk, and rule 1 forbids it.
- **My earlier pick was `E:\VaultLibrary`,** written before I knew E: is external. That's why this changed.
- **Your repo is on E: too,** which is fine: it's also on GitHub.

## Database backup
Tags are hand-typed and irreplaceable. I know of no backup for either drive.

| | A. Nightly copy to the other drive (**pick now**) | B. Copy to the phone at each sync (**add later**) | C. Nightly copy into an iCloud folder |
|---|---|---|---|
| Rule change | None | None | **Exception to rule 1 + guard change** |
| Survives a dead drive | Yes | Yes | Yes |
| Survives a lost or stolen laptop | **No,** if E: is with it | Yes | Yes |
| Survives a lost phone | Yes | Laptop copy remains | Yes |
| Catch | Skipped while E: is unplugged, so the app must warn you | Needs sync built; whether app data survives a re-sign is **open**, so it can't be the only copy | A snapshot file, not the live database, so no corruption risk, but it opens a write path in the locked area |

Without C there's no copy away from your own devices. Phone + laptop together are the gap: losing both at once loses recent tags. If that worries you, take C, limited to one new folder.

**Separate from this:** your 155 FL projects aren't in iCloud and have no backup. E: has room for a copy, but that's its own decision.

## Signing and install
- **Proven (D4c):** an unsigned `.ipa` from GitHub Actions, sideloaded with iTunes + iloader + SideStore on a spare free Apple account, leaving iCloud alone. Plays with the phone locked and in another app; lock-screen controls show; Refresh works.
- **Expo Go is for screens only.** The list, playback and tags worked there (D4b); background audio was proven on the `.ipa`.
- **Free limits:** 7-day expiry: refresh in SideStore within 7 days, on Wi-Fi with LocalDevVPN connected. 3 apps: **2 used** (SideStore counts as one, Vault Spike is the other). 10 App IDs remaining.
- **Still open:**
  - Does app data survive a SideStore re-sign? Tags were in memory only in the spike, so this needs the real app. Until it's answered, the laptop stays the source of truth.
  - Do tags survive a force-quit? Same reason.
  - Do widgets and extensions work on a free account? Untested; may not.
- **$99 is worth it if:** re-signing fails more than about once a month, or you want widgets, Siri extensions, or TestFlight. Nothing in the code depends on it. Build identifiers stay in one setting.

## Later: always-on home server
Same Python server and same library moved to a small always-on box; Tailscale means the phone's address barely changes. Option C reduces the need, since the server only matters for sync.
