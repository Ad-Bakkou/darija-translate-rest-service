param([string]$BaseUrl = 'http://127.0.0.1:9080', [switch]$AnonymousOnly, [switch]$Live)
$ErrorActionPreference = 'Stop'
$uri=[Uri]$BaseUrl
if ($uri.Scheme -ne 'https' -and -not $uri.IsLoopback) { throw 'Use HTTPS outside loopback.' }
if ($AnonymousOnly -and $Live) { throw 'Live requires configured credentials.' }
function Check([string]$Header, [string]$Body, [int]$Expected) {
    $headers=@{}
    if ($Header) { $headers.Authorization=$Header }
    $r=Invoke-WebRequest "$BaseUrl/api/translate" -Method Post -Headers $headers -ContentType 'application/json' -Body $Body -SkipHttpErrorCheck -TimeoutSec 60
    if ([int]$r.StatusCode -ne $Expected) { throw "Expected $Expected; got $($r.StatusCode)." }
    if ($Expected -eq 401 -and ($r.Headers['WWW-Authenticate'] -join ',') -notmatch '^Basic') { throw 'Missing Basic challenge.' }
    if ($env:TRANSLATOR_PASSWORD -and $r.Content.Contains($env:TRANSLATOR_PASSWORD)) { throw 'Credential leakage detected.' }
    Write-Host "PASS HTTP $Expected"
}
$health=Invoke-RestMethod "$BaseUrl/api/health"
if ($health.status -ne 'UP') { throw 'Public health failed.' }
Write-Host 'PASS public health'
$log=Join-Path $PSScriptRoot '../backend/target/liberty/wlp/usr/servers/darijaServer/logs/messages.log'
$before=if (Test-Path $log) { @(Select-String -Path $log -Pattern 'GEMINI_DIAGNOSTIC').Count } else { -1 }
Check '' '{"text":"How are you today?"}' 401
Check 'Basic !!!' '{}' 401
Check 'Basic bm9jb2xvbg==' '{}' 401
Check 'Bearer invalid' '{}' 401
$wrong='Basic '+[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('invalid-'+[guid]::NewGuid()+':invalid-'+[guid]::NewGuid()))
Check $wrong '{"text":"How are you today?"}' 401
if (-not $AnonymousOnly) {
    if ([string]::IsNullOrWhiteSpace($env:TRANSLATOR_USERNAME) -or [string]::IsNullOrWhiteSpace($env:TRANSLATOR_PASSWORD)) { throw 'Set TRANSLATOR_USERNAME and TRANSLATOR_PASSWORD in this terminal; use -AnonymousOnly for fail-closed checks.' }
    $auth='Basic '+[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($env:TRANSLATOR_USERNAME+':'+$env:TRANSLATOR_PASSWORD))
    Check $auth '{' 400
    & (Join-Path $PSScriptRoot 'verify-backend.ps1') -BaseUrl $BaseUrl
}
if ($before -ge 0) {
    $after=@(Select-String -Path $log -Pattern 'GEMINI_DIAGNOSTIC').Count
    if ($before -ne $after) { throw 'Unexpected provider diagnostics during no-quota verification (also check concurrent activity).' }
    Write-Host 'PASS no new provider diagnostics; deployed Maven tests separately assert zero service calls'
}
if ($Live) { & (Join-Path $PSScriptRoot 'verify-backend.ps1') -BaseUrl $BaseUrl -Live }
