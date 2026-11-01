# Commands: my cheat sheet

Copy and paste these into PowerShell. Always start in the repo: `cd E:\dev\thevault`.
None of these change, move or delete my music. Chat keeps this file up to date when a command is added or changed.

| What I want | Paste this | What I should see |
|---|---|---|
| **Start the server** (phone needs this to play and sort) | `python server\vault_cli.py serve E:\VaultLibrary` | It keeps running. Leave the window open; Ctrl+C stops it |
| **Doctor**: health check before phone tests | `python server\vault_cli.py doctor E:\VaultLibrary` | PASS / WARN / FAIL lines. Fixes nothing, only reports |
| **Scan**: record what's in the music folders | `python server\vault_cli.py scan E:\VaultLibrary C:\Users\illus\iCloudDrive` | A count, then a "Music fingerprint" line. FAIL there means files changed during the scan: just run it again |
| **Pull cloud songs**: download cloud-only songs | `python server\vault_cli.py pull-cloud E:\VaultLibrary C:\Users\illus\iCloudDrive` | `[12/909] songname` lines. Ctrl+C any time; rerun to carry on. Add a number at the end to only do that many |
| **Backup now** | `python server\vault_cli.py backup E:\VaultLibrary` | "Backed up to C:\VaultBackup\..." |
| **Turn on nightly backup** (once) | `powershell -File server\schedule_backup.ps1` | "Scheduled 'Vault nightly backup' daily at 3:00 AM" |
| **Turn off nightly backup** | `Unregister-ScheduledTask -TaskName 'Vault nightly backup' -Confirm:$false` | Nothing printed |
| **Quick count** of songs and mine | `python server\vault_cli.py check E:\VaultLibrary` | Files, songs, mine counts |

## Checkpoints (backups that never get auto-deleted)
Nightly backups keep only 14. To keep one forever, make a backup, then copy it to a named folder:
```
python server\vault_cli.py backup E:\VaultLibrary
$n=(Get-ChildItem C:\VaultBackup -Directory | ? Name -match '^\d{8}-\d{6}$' | sort Name | select -Last 1).FullName; Copy-Item $n "C:\VaultBackup\checkpoint-NAME" -Recurse
```
Change `NAME` (e.g. `sort-2026-11-01`). First make sure the phone has nothing waiting to send (server running, Library open).

## Usual order after a pull
Pull, then Scan, then Doctor, then Start the server, then phone checks.
