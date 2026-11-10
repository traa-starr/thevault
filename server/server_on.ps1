# Keeps the Vault server running by itself: starts it now and at every log-in, with no window to keep open, and starts
# it again if it ever stops. Also the way to restart it after new server code.
# Run:       powershell -File server\server_on.ps1
# Turn off:  powershell -File server\server_off.ps1
# What it does is written to server-log.txt in the library folder.
param([string]$Library = 'E:\VaultLibrary')
$ErrorActionPreference = 'Stop'

$name = 'Vault server'
if (-not (Test-Path (Join-Path $Library 'VAULT-LIBRARY-MARKER.json'))) {
    Write-Host "No library at $Library. Wrong drive letter, or the drive is unplugged? Nothing was changed."
    exit 2
}
$python = (Get-Command python).Source
$pythonw = Join-Path (Split-Path $python) 'pythonw.exe'   # the Python with no window
if (-not (Test-Path $pythonw)) { $pythonw = $python }
$script = Join-Path $PSScriptRoot 'keep_serving.py'

# stop whatever is running first: an older job, or a server started by hand
& (Join-Path $PSScriptRoot 'server_off.ps1') -Quiet

$action = New-ScheduledTaskAction -Execute $pythonw -Argument "`"$script`" `"$Library`"" -WorkingDirectory (Split-Path $PSScriptRoot)
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
# a laptop: run on battery too, never stop after 3 days (Windows' default), start again if the job itself dies
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $name

# say when it really answers, not just that it was asked to start
$up = $false
foreach ($try in 1..30) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8787/health' -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $up = $true; break }
    } catch { }
}
if ($up) { Write-Host "Vault server is on and answering. It starts by itself at log-in and comes back if it stops. Log: $Library\server-log.txt" }
else { Write-Host "Vault server is scheduled, but it isn't answering yet. Look at $Library\server-log.txt, or run doctor."; exit 2 }
