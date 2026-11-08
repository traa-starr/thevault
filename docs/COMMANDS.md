# Commands: my cheat sheet

Copy and paste these into PowerShell. Always start in the repo: `cd E:\dev\thevault`.
None of these change, move or delete my music. Chat keeps this file up to date when a command is added or changed.

| What I want | Paste this | What I should see |
|---|---|---|
| **Start the server** (phone needs this to play and sort) | `python server\vault_cli.py serve E:\VaultLibrary` | It keeps running. Leave the window open; Ctrl+C stops it |
| **Doctor**: health check before phone tests | `python server\vault_cli.py doctor E:\VaultLibrary` | PASS / WARN / FAIL lines. Fixes nothing, only reports |
| **Verify**: every laptop check at once | `python .claude/scripts/verify.py` (or `/verify`) | One PASS/FAIL per check and a total. About 6 min (server test is slow). Read-only |
| **Scan**: record what's in the music folders | `python server\vault_cli.py scan E:\VaultLibrary C:\Users\illus\iCloudDrive` | A count, then a "Music fingerprint" line. FAIL there means files changed during the scan: just run it again |
| **Pull cloud songs**: download cloud-only songs | `python server\vault_cli.py pull-cloud E:\VaultLibrary C:\Users\illus\iCloudDrive` | `[12/909] songname` lines. Ctrl+C any time; rerun to carry on. Add a number at the end to only do that many |
| **Backup now** | `python server\vault_cli.py backup E:\VaultLibrary` | "Backed up to C:\VaultBackup\..." |
| **Turn on nightly backup** (once) | `powershell -File server\schedule_backup.ps1` | "Scheduled 'Vault nightly backup' daily at 3:00 AM" |
| **Turn off nightly backup** | `Unregister-ScheduledTask -TaskName 'Vault nightly backup' -Confirm:$false` | Nothing printed |
| **Quick count** of songs and mine | `python server\vault_cli.py check E:\VaultLibrary` | Files, songs, mine counts |
| **Import**: copy Mine songs into the library and make phone copies (stop the server first) | `python server\vault_cli.py import E:\VaultLibrary` | First run about 15 min. Rerun: "copied now: 0" and "Mine songs" = "already in". Run after marking new songs Mine |
| **Refresh song dates** (after a scan, stop the server first) | `python server\vault_cli.py songs E:\VaultLibrary` | A count of dates refreshed |
| **Reset group Mains to newest** (one-off; your hand picks stay) | `python server\vault_cli.py mains E:\VaultLibrary` | "Main changed to newest: N" |
| **Publish an app update** (app-code changes only: no GitHub build, no SideStore) | `python server\vault_cli.py publish E:\VaultLibrary` | About 30 s of build lines, then "Published update 2026...". With the server running, close and reopen the app: the bottom line of its home screen changes to "Update <date>, <time>". "Stopped: the app code didn't build" means nothing changed on the phone |

## Checkpoints (backups that never get auto-deleted)
Nightly backups keep only 14. To keep one forever, make a backup, then copy it to a named folder:
```
python server\vault_cli.py backup E:\VaultLibrary
$n=(Get-ChildItem C:\VaultBackup -Directory | ? Name -match '^\d{8}-\d{6}$' | sort Name | select -Last 1).FullName; Copy-Item $n "C:\VaultBackup\checkpoint-NAME" -Recurse
```
Change `NAME` (e.g. `sort-2026-11-01`). First make sure the phone has nothing waiting to send (server running, Library open).

## Usual order after a pull
Pull, then Scan, then Refresh song dates, then Import, then Doctor, then Start the server, then phone checks.

## From the phone (Termius over Tailscale)
These run in the SSH terminal (Command Prompt). Saved as Termius snippets. The server opens in a window on the PC and keeps running after I close Termius.

| What I want | Paste this | What I should see |
|---|---|---|
| **Make the server launcher** (once) | `schtasks /create /tn StartVault /tr "cmd /k cd /d E:\dev\thevault && python server\vault_cli.py serve E:\VaultLibrary" /sc once /st 00:00 /it /f` | SUCCESS |
| **Start the server** | `schtasks /run /tn StartVault` | SUCCESS, then the server window opens on the PC |
| **Is it running?** | `powershell -c "if (Get-CimInstance Win32_Process \| ? CommandLine -match 'vault_cli.py serve') {'RUNNING'} else {'STOPPED'}"` | RUNNING or STOPPED |
| **Stop the server** | `powershell -c "Get-CimInstance Win32_Process \| ? CommandLine -match 'vault_cli.py serve' \| % { Stop-Process -Id $_.ProcessId -Force }"` | Nothing printed. Check with "Is it running?" |
| **Open the Claude app** (backup, if it's closed) | `schtasks /run /tn StartClaude` | SUCCESS, Claude opens on the PC in a few seconds |
| **Doctor** | `cd /d E:\dev\thevault && python server\vault_cli.py doctor E:\VaultLibrary` | PASS / WARN / FAIL lines, right in Termius |
| **Commit and push** (after a step) | `cd /d E:\dev\thevault && python .claude\scripts\check_repo.py && git add -A && git commit -m "MESSAGE" && git push` | "Repo check: clean", then a commit line, then the push. Swap MESSAGE for chat's commit message. Stops before committing if the check fails |
| **Quick count** | `cd /d E:\dev\thevault && python server\vault_cli.py check E:\VaultLibrary` | Files, songs, mine counts |
| **Backup now** | `cd /d E:\dev\thevault && python server\vault_cli.py backup E:\VaultLibrary` | "Backed up to C:\VaultBackup\..." |
| **Scan** | `cd /d E:\dev\thevault && python server\vault_cli.py scan E:\VaultLibrary C:\Users\illus\iCloudDrive` | A count, then "Music fingerprint". FAIL there: run again |
| **Make the pull launcher** (once) | `schtasks /create /tn PullCloud /tr "cmd /k cd /d E:\dev\thevault && python server\vault_cli.py pull-cloud E:\VaultLibrary C:\Users\illus\iCloudDrive" /sc once /st 00:00 /it /f` | SUCCESS |
| **Pull cloud songs** | `schtasks /run /tn PullCloud` | Runs in a window on the PC, so it keeps going if Termius disconnects. Rerun to carry on |
| **Stop the pull** | `powershell -c "Get-CimInstance Win32_Process \| ? CommandLine -match 'vault_cli.py pull-cloud' \| % { Stop-Process -Id $_.ProcessId -Force }"` | Nothing printed |
