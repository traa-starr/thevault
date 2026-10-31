# Decisions

Newest at the bottom. Hard-to-undo entries list options, choice and why.

## 2026-10-31, from planning chats
| Topic | Choice | Why | State |
|---|---|---|---|
| Phone client | Native iOS app with Expo (React Native + TypeScript), Expo UI for a native look | Home-screen web apps lose audio in background/lock; native unlocks lock-screen controls, widgets, Siri/Shortcuts, deep links; builds without a Mac | **Lean, pending spike** |
| Rejected main app | Add-to-Home-Screen web app | Audio dies in background. Capacitor-wrapped web app remains the middle option | Pending spike |
| Install path | Expo Go via QR day to day; unsigned `.ipa` from GitHub Actions macOS; sideload with free Apple ID | No Mac, no paid account. 7-day expiry, 3 sideloaded apps max; widgets/share extensions may not work. Pay $99 only if re-signing gets annoying; code must not depend on that | Lean, pending spike |
| Laptop | Python server + SQLite (FTS5 for search) | Simple, local | Lean, pending spike |
| Connection | Tailscale from phone to laptop | Private network, works away from home | Lean, pending spike |
| Repo | Public, standard GitHub runners only | macOS runners free and unlimited on public repos; larger runners are billed. Code and docs may be seen; credentials never | Decided |
| Music safety | Read-only, enforced by settings and a hook, never by a note | Rule 1 | Decided |
| Tags | Human-entered; Whisper at most an optional draft later | Unreliable on slang/autotune | Decided |
| Search | Never exclude, only reorder; built-in database search where possible | Songs are recalled by half-remembered lines | Decided |
| Groups | Button, always propose, one-tap confirm | Random play separates versions | Decided |
| Links | Database records, never file renames | Rule 1 | Decided |
| BandLab audio | Pulled in, not just linked. Lean: latest version imported, others listed as linked history | Vault can't be final otherwise | Method pending |
| Reaper | Ignored | | Decided |

## 2026-10-31, Phase 0
| Topic | Choice | Why |
|---|---|---|
| Locked folders | All of iCloud Drive + FL Studio Projects | Simple; covers songs in the wrong folder. Options were: all iCloud + FL / only Music, Session, FL / those plus named music folders |
| Scan scope | iCloud `Music`, `Session Music`, `tape`, plus loose files in the iCloud root | Where my songs mostly are |
| "Mine" rule | Artist name in title or tags (`l1`, `L1`, `l1ghtxfluv`, `MOJO`, `traa`) = mine; otherwise unknown; manual override wins | Not all my songs are labeled, and many of mine are in Session Music |
| Guard design | Permission deny rules + Python hook on shell commands, failing closed. Windows write-deny permissions rejected | Permissions could break iCloud sync and FL Studio |
| FL project scope | Only this PC's Projects folder for now; older bounces show "no project found" | Older songs were made in Reaper or on another PC |
| `Downloads\CHE` | Excluded | Another artist's projects |
| Sideload route to try | iTunes + iloader + SideStore, leaving Microsoft Store iCloud alone. Options were: this / AltStore's documented steps (temporarily removes iCloud) / wait. If it fails, ask again before touching iCloud | Avoid any risk to music sync |
| BandLab preferences | Some songs need older revisions; cover art is low priority | Interview. Method still needs approval: `BANDLAB-OPTIONS.md` |
| Workflow | Chat manages, Code builds, I type `/next` (`WORKFLOW.md`). Same as Untethered: chat writes `docs/NEXT.md` straight to the laptop. No map, board, lanes or inbox | I asked for chat to run Code's work so I don't get lost. Pasted-block version dropped 2026-10-31: chat can write to the laptop, and I asked for the Untethered loop |

## Waiting for approval
Client option C, library at `E:\VaultLibrary`, database backup into iCloud, BandLab method A. See `ARCHITECTURE-OPTIONS.md`, `BANDLAB-OPTIONS.md`. No app scaffold until approved.
