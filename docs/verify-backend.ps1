param([string]$BaseUrl = 'http://127.0.0.1:9080', [switch]$Live)
$ErrorActionPreference = 'Stop'
$uri = [Uri]$BaseUrl
if ($uri.Scheme -ne 'https' -and -not $uri.IsLoopback) { throw 'Basic authentication requires HTTPS outside loopback.' }
if ([string]::IsNullOrWhiteSpace($env:TRANSLATOR_USERNAME) -or [string]::IsNullOrWhiteSpace($env:TRANSLATOR_PASSWORD)) { throw 'Set TRANSLATOR_USERNAME and TRANSLATOR_PASSWORD in this terminal.' }
$auth = @{ Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($env:TRANSLATOR_USERNAME + ':' + $env:TRANSLATOR_PASSWORD)) }
function Check-Request([string]$Body, [int]$Expected, [string]$Code) {
    $r = Invoke-WebRequest "$BaseUrl/api/translate" -Headers $auth -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($Body)) -SkipHttpErrorCheck -TimeoutSec 60
    if ([int]$r.StatusCode -ne $Expected) { throw "Expected HTTP $Expected; received $($r.StatusCode)." }
    if ($r.Headers['Content-Type'] -notmatch 'application/json') { throw 'Expected JSON media type.' }
    $json = $r.Content | ConvertFrom-Json
    if ($Code -and $json.error -ne $Code) { throw "Expected error code $Code." }
    Write-Host "PASS HTTP $Expected $Code"
    return $json
}
$health = Invoke-RestMethod "$BaseUrl/api/health"
if ($health.status -ne 'UP') { throw 'Health check failed.' }
Write-Host 'PASS health UP'
$null = Check-Request '{}' 400 'VALIDATION_ERROR'
$null = Check-Request '{' 400 'VALIDATION_ERROR'
$null = Check-Request '{"text":123}' 400 'VALIDATION_ERROR'
$null = Check-Request '{"text":null}' 400 'VALIDATION_ERROR'
$null = Check-Request '{"text":"   "}' 400 'VALIDATION_ERROR'
$null = Check-Request '{"text":"hello","sourceLanguage":"French"}' 400 'VALIDATION_ERROR'
$null = Check-Request ('{"text":"' + ('a' * 5001) + '"}') 400 'VALIDATION_ERROR'
if ($Live) {
    $json = Check-Request '{"text":"How are you today?","sourceLanguage":"English"}' 200 ''
    if ($json.originalText -ne 'How are you today?' -or $json.sourceLanguage -ne 'English' -or $json.targetLanguage -ne 'Moroccan Darija' -or [string]::IsNullOrWhiteSpace($json.translatedText) -or $json.translatedText -notmatch '[\u0600-\u06FF]') { throw 'Live response structure or Arabic text check failed.' }
    Write-Host ('LIVE GEMINI OUTPUT: ' + $json.translatedText)
} else {
    Write-Host 'Live translation not requested; no valid translation request sent.'
}
