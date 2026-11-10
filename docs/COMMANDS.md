# Commands: my cheat sheet

Copy and paste these into PowerShell. Always start in the repo: `cd E:\dev\thevault`.
None of these change, move or delete my music. Chat keeps this file up to date when a command is added or changed.

| What I want | Paste this | What I should see |
|---|---|---|
| **Turn the server on** (once; also after new server code, to restart it) | `powershell -File server\server_on.ps1` | "Vault server is on and answering." No window to keep open: it starts by itself every time I log in, and comes back within seconds if it stops. It makes phone copies by itself, as before |
| **Turn the server off** (before Import or Refresh song dates) | `powershell -File server\server_off.ps1` | "Vault server is off: nothing scheduled, nothing running." It stays off, restarts included, until I turn it on again |
| **Server log**: when it started, when and why it stopped | `Get-Content E:\VaultLibrary\server-log.txt -Tail 20` | Lines like "keeper: starting the server." and "keeper: server stopped after 3 min (exit code -1). Starting it again in 2 s." It never passes about 2 MB |
| **Server in a window** (only to watch it; turn the always-on one off first) | `python server\vault_cli.py serve E:\VaultLibrary` | It keeps running; Ctrl+C stops it. With the always-on server on it says "port 8787 is already in use" and stops: that is right |
| **Doctor**: health check before phone tests | `python server\vault_cli.py doctor E:\VaultLibrary` | PASS / WARN / FAIL lines. Fixes nothing, only reports. "Server" says if it is running now; "Server stays up" says if it starts by itself (on) or only by hand (off) |
| **Verify**: every laptop check at once | `python .claude/scripts/verify.py` (or `/verify`) | One PASS/FAIL per check (with its seconds) and a total. Under 1 min (the checks run side by side). Read-only |
| **Scan**: record what's in the music folders | `python server\vault_cli.py scan E:\VaultLibrary C:\Users\illus\iCloudDrive` | A count, then a "Music fingerprint" line. FAIL there means files changed during the scan: just run it again |
| **Pull cloud songs**: download cloud-only songs | `python server\vault_cli.py pull-cloud E:\VaultLibrary C:\Users\illus\iCloudDrive` | `[12/909] songname` lines. Ctrl+C any time; rerun to carry on. Add a number at the end to only do that many |
| **Backup now** | `python server\vault_cli.py backup E:\VaultLibrary` | "Backed up to C:\VaultBackup\..." |
| **Turn on nightly backup** (once) | `powershell -File server\schedule_backup.ps1` | "Scheduled 'Vault nightly backup' daily at 3:00 AM" |
| **Turn off nightly backup** | `Unregister-ScheduledTask -TaskName 'Vault nightly backup' -Confirm:$false` | Nothing printed |
| **Quick count** of songs and mine | `python server\vault_cli.py check E:\VaultLibrary` | Files, songs, mine counts |
| **Phone copies now** (rarely needed: the server does this by itself; `/next` runs it too) | `python server\vault_cli.py copies E:\VaultLibrary` | "phone copies made now: N", then how many Mine songs still have none (cloud-only or missing files), then "Song lengths known: N of M" (it measures any song without one). Adds only; safe with the server running |
| **Import**: also takes out copies of songs no longer Mine (turn the server off first, on again after) | `python server\vault_cli.py import E:\VaultLibrary` | First run about 15 min. Only needed after un-Mining songs, to free space |
| **Refresh song dates** (after a scan; turn the server off first, on again after) | `python server\vault_cli.py songs E:\VaultLibrary` | A count of dates refreshed |
| **Reset group Mains to newest** (one-off; your hand picks stay) | `python server\vault_cli.py mains E:\VaultLibrary` | "Main changed to newest: N" |
| **Tags per song**: compare with the phone (restore check) | `python server\vault_cli.py tags E:\VaultLibrary` (add title words to show one song) | Each song's title, then its tags as `1:42.300  words`, and a total. Read-only |
| **Phone timings**: how fast search and Next are on the real phone | `python server\vault_cli.py timings E:\VaultLibrary` | "Search: typical N ms, slow end N ms", then one line per play path (session, sort, library, previous, lockscreen, search, restore): typical, slow end, worst, count, over 1 s, and PASS / FAIL (typical within 2x Sort, none over 1 s; "not enough yet" under 5). Under each: where the time went (load, seek, start, app) and by source (phone mp3 / m4a, stream). Newest app code only. The phone sends them when it goes to the background. `/wrap` pastes this into REPORT. Read-only |
| **Ratings**: every Favorite and Archived song (restore check) | `python server\vault_cli.py ratings E:\VaultLibrary` | One line per rated song, then "N Favorite, N Archived." Read-only |
| **Plays**: the play log (what Home's rows are made from) | `python server\vault_cli.py plays E:\VaultLibrary` | "N plays of N songs.", the 10 most played, then the 20 latest plays with time (UTC), length heard and title. A play counts after 30 s heard. Read-only |
| **Counts**: what `/status` tells the phone | `python server\vault_cli.py status E:\VaultLibrary` | Songs listed, Mine, phone copies made, how many the phone says it holds, ratings, plays. Read-only |
| **Search acceptance test** (3.7): my searches, each with the song I expect | `node --experimental-strip-types tools\search\accept.mjs my-searches.txt E:\VaultLibrary` | One PASS/FAIL per line (pass = that song in the top 3), then "N of M passed". Write the file like `tools\search\example-searches.txt`: `what I'd type => Song title`. Keep it outside the repo (it holds my lyrics). Read-only |
| **Screenshots** of the app's screens with fake songs (Code's eyes; first time: `npm --prefix tools/shots install`) | `npm --prefix tools/shots run shots` | `ok  player-30-tags` lines and "N of N screens drawn"; PNGs in `spike\output\shots\`. Laptop only, nothing reaches the phone |
| **App next to its mockup** (after the screenshots) | `npm --prefix tools/shots run side` | `side-home.png`, `side-library.png`, `side-player.png`, `side-player-lines.png` in `spike\output\shots\`: mockup left, app right |
| **Every word on screen**, rewritten after a label changes | `node --experimental-strip-types app\labels.test.mjs --write` | "wrote N labels", and the list in `docs\overhaul\LABELS.md`. `/verify` fails if the list is out of date or a ruled-out word is back |
| **Publish an app update** (app-code changes only: no GitHub build, no SideStore) | `python server\vault_cli.py publish E:\VaultLibrary` | About 30 s of build lines, then "Published update 2026...". With the server running, close and reopen the app: the bottom line of its home screen changes to "Update <date>, <time>". "Stopped: the app code didn't build" means nothing changed on the phone |
| **Mockups on the phone** (the three overhaul directions, fake songs; leave the window open while I tap) | `python -m http.server 8790 --directory E:\dev\thevault\spike\mockups` | "Serving HTTP on ..." and it stays open. On the phone, Safari: `http://<the laptop address I typed in the app>:8790`. Pick a direction, then Share, Add to Home Screen, open it from there. Ctrl+C in the window stops it. If Windows asks about the firewall the first time: allow private networks |
| **Check the mockups** (Code's eyes: every direction opens, survives 150 taps, no control under 44 pt) | `node spike\mockups\check.mjs` | `ok   wall`, `ok   line`, `ok   deal`; PNGs in `spike\output\mockups\`. Laptop only |
| **Full rebuild** (native pieces: GitHub build + SideStore) | Steps in `docs\overhaul\REBUILD.md` | GitHub > Actions > "Build iOS (unsigned)" > Run workflow; the `.ipa` goes on the phone with SideStore |

## In Claude Code (type these in the Code chat, not PowerShell)
| What I want | Type this | What I should see |
|---|---|---|
| **Set how hard Fable thinks**, before `/next` (NEXT's `Effort:` line says which) | `/effort high` (or `medium`, `xhigh`) | A line confirming the level. low, medium, high and xhigh stick until changed; `max` lasts one session |
| **Check the level** | `/effort` | The picker, showing the current level |

## Checkpoints (backups that never get auto-deleted)
Nightly backups keep only 14. To keep one forever, make a backup, then copy it to a named folder:
```
python server\vault_cli.py backup E:\VaultLibrary
$n=(Get-ChildItem C:\VaultBackup -Directory | ? Name -match '^\d{8}-\d{6}$' | sort Name | select -Last 1).FullName; Copy-Item $n "C:\VaultBackup\checkpoint-NAME" -Recurse
```
Change `NAME` (e.g. `sort-2026-11-01`). First make sure the phone has nothing waiting to send (server running, Library open).

## Usual order after a pull
Pull, then Turn the server off, then Scan, then Refresh song dates, then Import, then Turn the server on, then Doctor, then phone checks.

## From the phone (Termius over Tailscale)
These run in the SSH terminal (Command Prompt). Saved as Termius snippets. The server runs with no window and keeps running after I close Termius.

| What I want | Paste this | What I should see |
|---|---|---|
| **Turn the server on** (or restart it) | `powershell -File E:\dev\thevault\server\server_on.ps1` | "Vault server is on and answering." No window opens; it also starts by itself at log-in |
| **Is it running?** | `powershell -c "if (Get-CimInstance Win32_Process \| ? { $_.Name -like 'python*' -and $_.CommandLine -match 'vault_cli.py serv[e]' }) {'RUNNING'} else {'STOPPED'}"` | RUNNING or STOPPED |
| **Turn the server off** | `powershell -File E:\dev\thevault\server\server_off.ps1` | "Vault server is off: nothing scheduled, nothing running." Check with "Is it running?" |
| **Open the Claude app** (backup, if it's closed) | `schtasks /run /tn StartClaude` | SUCCESS, Claude opens on the PC in a few seconds |
| **Doctor** | `cd /d E:\dev\thevault && python server\vault_cli.py doctor E:\VaultLibrary` | PASS / WARN / FAIL lines, right in Termius |
| **Commit and push** (after a step) | `cd /d E:\dev\thevault && python .claude\scripts\check_repo.py && git add -A && git commit -m "MESSAGE" && git push` | "Repo check: clean", then a commit line, then the push. Swap MESSAGE for chat's commit message. Stops before committing if the check fails |
| **Quick count** | `cd /d E:\dev\thevault && python server\vault_cli.py check E:\VaultLibrary` | Files, songs, mine counts |
| **Backup now** | `cd /d E:\dev\thevault && python server\vault_cli.py backup E:\VaultLibrary` | "Backed up to C:\VaultBackup\..." |
| **Scan** | `cd /d E:\dev\thevault && python server\vault_cli.py scan E:\VaultLibrary C:\Users\illus\iCloudDrive` | A count, then "Music fingerprint". FAIL there: run again |
| **Make the pull launcher** (once) | `schtasks /create /tn PullCloud /tr "cmd /k cd /d E:\dev\thevault && python server\vault_cli.py pull-cloud E:\VaultLibrary C:\Users\illus\iCloudDrive" /sc once /st 00:00 /it /f` | SUCCESS |
| **Pull cloud songs** | `schtasks /run /tn PullCloud` | Runs in a window on the PC, so it keeps going if Termius disconnects. Rerun to carry on |
| **Stop the pull** | `powershell -c "Get-CimInstance Win32_Process \| ? { $_.Name -like 'python*' -and $_.CommandLine -match 'vault_cli.py pull-clou[d]' } \| % { Stop-Process -Id $_.ProcessId -Force }"` | Nothing printed |
| **Tags per song** (restore check) | `cd /d E:\dev\thevault && python server\vault_cli.py tags E:\VaultLibrary` | Each song's tags and a total. Read-only |
| **Publish an app update** (backup only: Code's `/wrap` publishes on its own) | `cd /d E:\dev\thevault && python server\vault_cli.py publish E:\VaultLibrary` | "Published update ...". Server must be running. Then close and reopen the app |
