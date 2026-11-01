# Map: where everything lives

From the interview and read-only scans, 2026-10-31. No Tailscale hostnames or IPs here (public repo).

## Laptop (Windows 11, drives C: and E:)
| What | Where | Notes |
|---|---|---|
| This repo | `E:\dev\thevault` | Remote: `github.com/traa-starr/thevault` (public) |
| iCloud Drive | `C:\Users\illus\iCloudDrive` | **Locked.** ~2,240 files |
| My songs (mostly) | `iCloudDrive\Music` | 443 audio files, ~1.9 GB. FL bounces and BandLab exports land here together |
| Mixed: mine + other artists | `iCloudDrive\Session Music` | 1,233 audio files, ~5.2 GB, in artist subfolders. More of mine than expected |
| Mine | `iCloudDrive\tape` | 23 audio files, ~0.1 GB |
| Loose files | `iCloudDrive\` root | Included in the scan |
| Not in the main scan | `iCloudDrive\Beats`, `traa stems`, `Wreck 2`, `Jazz`, `SILENT FLEX` | Beats and stems. Locked anyway |
| FL projects | `C:\Users\illus\Documents\Image-Line\FL Studio\Projects` | **Locked.** 155 projects + 787 autosaves in `Backup`, 42k+ wavs, 65 GB, all 2025-26. **Laptop only, no iCloud backup** |
| Older songs' projects | Reaper / another PC | Out of scope for now |
| Other artist's projects | `C:\Users\illus\Downloads\CHE` | Excluded |
| Dummy lock-test folder | `E:\vault-dummy-protected` | Safe to delete, but the guard test expects the path |
| Untethered (other project) | `C:\Users\illus\Desktop\untethered\Untethered` | Read-only reference |
| Vault library + database | `E:\VaultLibrary` (created 2026-10-31) | One folder, database and audio together; marker `VAULT-LIBRARY-MARKER.json`, `audio/`, `phone/`, `vault.db`, `journal.jsonl`, my sorting file. Found by a marker file, not the drive letter. E: is an external USB drive |
| Nightly database backup | A folder on C: (planned, not created; exact path set when built, ROADMAP 1.9) | Skipped while E: is unplugged |

Installed: Python 3.13, SQLite 3.50 (FTS5 works), Node, ffmpeg (includes Chromaprint), Microsoft Store iCloud, Tailscale (not on PATH), iTunes (Apple's installer), iloader. Missing: gh.

## iPhone
| What | Where | Notes |
|---|---|---|
| BandLab | App, Google sign-in (mine only) | 50-100 songs, many only as projects, not exported |
| BandLab exports | Downloaded in the app, saved to iCloud `Music` | Same folder as FL bounces |
| Vault Spike | Installed through SideStore, spare Apple account | Refresh within 7 days. Steps: `SIDELOAD-GUIDE.md` |

## Accounts
GitHub: `traa-starr`. Apple: free Apple ID, no developer account. Passwords are never stored or handled here.
