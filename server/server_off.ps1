# Turns off the always-on Vault server: removes the Windows job and stops the server. Nothing stays scheduled or running.
# Run:  powershell -File server\server_off.ps1
# Turn it back on:  powershell -File server\server_on.ps1
param([switch]$Quiet)

$name = 'Vault server'
$had = $false
if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
    $had = $true
    Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
}
# the keeper first (or it would start the server again), then the server itself, however it was started
$keepers = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'python*' -and $_.CommandLine -match 'keep_serving\.py' })
$keepers | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
$servers = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'python*' -and $_.CommandLine -match 'vault_cli\.py"?\s+serve\s' })
$servers | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
if (-not $Quiet) {
    if ($had -or $keepers.Count -or $servers.Count) { Write-Host "Vault server is off: nothing scheduled, nothing running. Turn it on again: powershell -File server\server_on.ps1" }
    else { Write-Host "Vault server was already off: nothing scheduled, nothing running." }
}
