param([Parameter(Mandatory=$true)][string]$Serial)
$ErrorActionPreference = 'Stop'
$adbCommand = Get-Command adb -ErrorAction Stop
$targetState = & $adbCommand.Source -s $Serial get-state 2>$null
if ($LASTEXITCODE -ne 0 -or $targetState -ne 'device') { throw 'The selected Android target is not connected and authorized.' }
foreach ($port in 9080,8082) {
    & $adbCommand.Source -s $Serial reverse "tcp:$port" "tcp:$port"
    if ($LASTEXITCODE -ne 0) { throw "ADB reverse failed for port $port" }
}
$routes = & $adbCommand.Source -s $Serial reverse --list
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect ADB reverse routes.' }
foreach ($port in 9080,8082) {
    if (($routes -join "`n") -notmatch "tcp:$port\s+tcp:$port") { throw "Route for port $port was not confirmed." }
}
Write-Output 'Reverse routes confirmed: 9080 (Java), 8082 (Metro). Now verify Online inside the Android app.'
# Listing a route alone does not prove the app can reach the Java backend.
