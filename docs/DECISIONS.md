# Decisions

Newest at the bottom. Hard-to-undo entries list options, choice and why.

## Phase 0 summary (closed 2026-10-31)
The short version. Full rows with options and reasons are below; nothing was deleted.
- **Safety:** my music is read-only. Locked: all of iCloud Drive and FL Studio Projects, enforced by settings plus a hook. Repo is public, standard runners only, no credentials.
- **Scope:** iCloud `Music`, `Session Music`, `tape`, plus loose files. "Mine" = my artist names in title or tags, my override wins. `Downloads\CHE` excluded. Reaper ignored.
- **Phone app:** native iOS app with Expo, songs stored on the phone, laptop syncs (G2, option C). Sideload works (D4c passed), free spare Apple account.
- **Laptop:** Python server + SQLite (FTS5), reached over Tailscale.
- **Library:** one folder, `E:\VaultLibrary`, database and audio together (G2, option A). Found by a marker file, not the drive letter.
- **Backup:** nightly copy to C:, later a copy to the phone at each sync. No iCloud (G2).
- **BandLab:** pulled in, not just linked. Method is hand export in the app (G2, option A). Comes late, Phase 5.
- **Product rules:** tags typed by me, search reorders and never excludes, groups are a button with one-tap confirm, links are database records and never file renames.
- **Workflow:** chat manages, Code builds, I commit. Route is `ROADMAP.md`. Tappable fake-data prototype before each daily screen.

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
| Sideload Apple account (2026-10-31) | Spare free Apple account for iloader and SideStore. Options were: spare / main / decide at sign-in | Keeps the main account and its iCloud away from third-party tools |
| BandLab preferences | Some songs need older revisions; cover art is low priority | Interview. Method still needs approval: `BANDLAB-OPTIONS.md` |
| Workflow | Chat manages, Code builds, I type `/next` (`WORKFLOW.md`). Same as Untethered: chat writes `docs/NEXT.md` straight to the laptop. No map, board, lanes or inbox | I asked for chat to run Code's work so I don't get lost. Pasted-block version dropped 2026-10-31: chat can write to the laptop, and I asked for the Untethered loop |
| D4a, D4b, D5 | Passed on the phone | My test results |
| Log results before the build run | Yes (chat-default) | Results are fresh; cheap to write first |
| `doctor` script | Deferred until after D4c (chat-default) | Not blocking; parked in STATUS queue |
| Who writes what | Chat at review writes NEXT, STATUS, DECISIONS and my phone results; Code at `/wrap` writes REPORT, STATUS, DECISIONS, measured results. STATUS has a `Next up` line for whose move it is | I asked for docs that never go stale and a seamless loop. Before this, chat's Log lines only reached DECISIONS on a pasted brief, and STATUS went stale after review |
| Chat instructions | The Project box only points to `docs/CHAT-INSTRUCTIONS.md`; chat keeps that file current | One source of truth, no re-pasting when the loop changes |
| Full Xcode log on build failure | Save it as a run artifact if the first build fails (chat-default) | Workflow only shows the last 40 lines; cheap, reversible |
| First build run | Accepted: green on `macos-latest`, `.ipa` from bb0e498 is current (chat) | Only docs/skills changed since |
| Xcode log on failure | Make it permanent for every failed build; fast-lane queue item (chat-default) | Code's pitch; first build passed so the earlier rule never kicked in |
| D4c sideload | Accepted: all four phone checks passed (chat) | Logged in SPIKE-RESULTS |
| `spike/stop` script | Folded into the queued `doctor` script, not built now (chat-default) | Same job; one tool instead of two |
| iCloud backup in memo | Must be flagged as needing my exception to the read-only rule, with a non-iCloud option (chat) | Rule 1 says never write inside iCloud Drive |
| Commit message from chat | Every review ends with a one-line commit message for the files chat wrote (and Code's, if uncommitted) | I asked; one commit per review, no guessing |
| Build order | `ROADMAP.md` is the route: player, tagging, search, groups, sources + BandLab, release | I asked for every feature in a build order chat and Code both follow |
| BandLab timing | Late, at Phase 5. Options were: right after player / late / before anything | My call, same as VISION. Those songs miss tagging until then |
| Mine / not mine sorting | During tagging: one-tap "not mine" and a Mine filter. Options were: during tagging / sorting pass first / folder rules plus tap | No separate chore; only ~17% can be auto-detected |
| "Later" items in the roadmap | Only the release pipeline gets a phase; the rest stay parked with no date | My call |
| Prototypes | Tappable fake-data version on the phone before each daily screen is built. Options were: per screen / one pass up front / skip | VISION: prototype feel before real code |
| Client (G2, 2026-10-31) | C: Expo app, compressed songs stored on the phone, laptop syncs. Options were: A stream from laptop / B Capacitor web app / C songs on phone | My call. Matches the pick: listening works offline and with the laptop asleep |
| Library location (G2, 2026-10-31) | A: everything (database + audio) in one folder on E:, `E:\VaultLibrary`. Options were: A all on E: / B all on C: / C split, database on C: | My call, against the memo's pick (C). One folder. Known cost: E: unplugged = library offline and tags wait on the phone; app finds the library by a marker file, not the letter E:, and says plainly when it's missing |
| Database backup (G2, 2026-10-31) | A now: nightly copy to C:. B later: copy to the phone at each sync. No iCloud. Options were: A / B / C iCloud folder | My call. No change to rule 1. Backup skipped while E: is unplugged, so the app must warn |
| BandLab method (G2, 2026-10-31) | A: hand export in the BandLab app. Options were: A hand export / B browser automation / C data request | My call. Protects the account holding unexported songs. Unlocks rule 7 for hand export only |
