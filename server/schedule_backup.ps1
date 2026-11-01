# Sets up the nightly backup as a Windows scheduled task (3:00; if the laptop was asleep, it runs when it wakes).
# Run once:  powershell -File server\schedule_backup.ps1
# Remove:    Unregister-ScheduledTask -TaskName 'Vault nightly backup' -Confirm:$false
param([string]$Library = 'E:\VaultLibrary')

$python = (Get-Command python).Source
$cli = Join-Path $PSScriptRoot 'vault_cli.py'
$action = New-ScheduledTaskAction -Execute $python -Argument "`"$cli`" backup `"$Library`""
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable
Register-ScheduledTask -TaskName 'Vault nightly backup' -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "Scheduled 'Vault nightly backup' daily at 3:00 AM: $python $cli backup $Library"
