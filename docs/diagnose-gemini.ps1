# Requires PowerShell 7. Sends ONE direct generateContent request; no retries.
# -CompareBackend explicitly sends one additional request through Java.
param([switch]$CompareBackend)
$ErrorActionPreference = 'Stop'
$backendAuth = @{}
if ($CompareBackend) {
    if ([string]::IsNullOrWhiteSpace($env:TRANSLATOR_USERNAME) -or [string]::IsNullOrWhiteSpace($env:TRANSLATOR_PASSWORD)) { throw 'Backend comparison requires TRANSLATOR_USERNAME and TRANSLATOR_PASSWORD.' }
    $backendAuth.Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($env:TRANSLATOR_USERNAME + ':' + $env:TRANSLATOR_PASSWORD))
}
$log = Join-Path $PSScriptRoot '../backend/target/liberty/wlp/usr/servers/darijaServer/logs/messages.log'
$config = Get-Content $log | Select-String 'GEMINI_CONFIG model=([a-zA-Z0-9._-]+)' | Select-Object -Last 1
if (-not $config) { throw 'No active-model diagnostic found. Deploy the diagnostic build first.' }
$model = $config.Matches[0].Groups[1].Value
if ($model -eq 'INVALID') { throw 'Server model configuration is invalid.' }
Write-Host "Model from latest Liberty application initialization: $model"
Write-Host 'Confirm this is the currently running server; this script does not change configuration.'
if ([string]::IsNullOrWhiteSpace($env:GEMINI_API_KEY)) { throw 'GEMINI_API_KEY is absent in this terminal. Run from your already-configured PowerShell terminal.' }
Write-Host ('Terminal model matches server: ' + ([string]::IsNullOrWhiteSpace($env:GEMINI_MODEL) -or $env:GEMINI_MODEL -eq $model))
Write-Host ('HTTPS_PROXY present: ' + [bool]$env:HTTPS_PROXY)
Write-Host ('HTTP_PROXY present: ' + [bool]$env:HTTP_PROXY)
try { Write-Host ('DNS address count: ' + [Net.Dns]::GetHostAddresses('generativelanguage.googleapis.com').Count) } catch { Write-Host ('DNS exception category: ' + $_.Exception.GetType().Name) }
$handler = [Net.Http.SocketsHttpHandler]::new()
$handler.ConnectTimeout = [TimeSpan]::FromSeconds(10)
$handler.AllowAutoRedirect = $false
$client = [Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(45)
$uri = [Uri]"https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent"
Write-Host ('PowerShell default proxy bypasses provider: ' + [Net.Http.HttpClient]::DefaultProxy.IsBypassed($uri))
$payload = @{
    systemInstruction = @{ parts = @(@{ text = 'Translate English into natural Moroccan Darija using Arabic script. Return only the translation.' }) }
    contents = @(@{ role = 'user'; parts = @(@{ text = 'How are you today?' }) })
} | ConvertTo-Json -Depth 10 -Compress
$request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Post, $uri)
$null = $request.Headers.TryAddWithoutValidation('x-goog-api-key', $env:GEMINI_API_KEY)
$request.Content = [Net.Http.StringContent]::new($payload, [Text.Encoding]::UTF8, 'application/json')
$timer = [Diagnostics.Stopwatch]::StartNew()
try {
    $response = $client.SendAsync($request).GetAwaiter().GetResult()
    try {
        Write-Host ('DIRECT Gemini upstream HTTP: ' + [int]$response.StatusCode)
        Write-Host ('DIRECT elapsedMs: ' + $timer.ElapsedMilliseconds)
        $raw = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        try {
            $parsed = $raw | ConvertFrom-Json
            # Only allow-listed enum values, never provider messages or body content.
            $allowed = @('INVALID_ARGUMENT','FAILED_PRECONDITION','PERMISSION_DENIED','UNAUTHENTICATED','NOT_FOUND','RESOURCE_EXHAUSTED','INTERNAL','UNAVAILABLE','DEADLINE_EXCEEDED')
            if ($parsed.error.status -in $allowed) { Write-Host ('DIRECT provider status enum: ' + $parsed.error.status) }
            if ($response.IsSuccessStatusCode) {
                $texts = @($parsed.candidates | ForEach-Object { $_.content.parts } | Where-Object { -not $_.thought -and $_.text } | ForEach-Object { $_.text })
                Write-Host ('DIRECT nonempty text: ' + ($texts.Count -gt 0))
                Write-Host ('DIRECT Arabic present: ' + (($texts -join '') -match '[\u0600-\u06FF]'))
            }
        } catch { Write-Host 'DIRECT response JSON could not be interpreted.' }
        $raw = $null; $parsed = $null
    } finally { $response.Dispose() }
} catch {
    Write-Host ('DIRECT no completed HTTP response; elapsedMs: ' + $timer.ElapsedMilliseconds)
    $failure = $_.Exception
    while ($null -ne $failure) {
        Write-Host ('DIRECT exception category: ' + $failure.GetType().Name)
        if ($failure -is [Net.Http.HttpRequestException]) { Write-Host ('DIRECT transport category: ' + $failure.HttpRequestError) }
        $failure = $failure.InnerException
    }
} finally { $request.Dispose(); $client.Dispose() }
if ($CompareBackend) {
    $before = @(Get-Content $log).Count
    try {
        $r = Invoke-WebRequest 'http://127.0.0.1:9080/api/translate' -Headers $backendAuth -Method Post -ContentType 'application/json' -Body '{"text":"How are you today?","sourceLanguage":"English"}' -SkipHttpErrorCheck -TimeoutSec 55
        Write-Host ('JAVA backend HTTP: ' + [int]$r.StatusCode)
        $j = $r.Content | ConvertFrom-Json
        $allowedCodes = @('CONFIGURATION_ERROR','UPSTREAM_ERROR','UPSTREAM_AUTH_ERROR','UPSTREAM_UNAVAILABLE','UPSTREAM_RATE_LIMIT','UPSTREAM_TIMEOUT','UPSTREAM_CONNECTION_ERROR','INVALID_UPSTREAM_RESPONSE','TRANSLATION_BLOCKED','INTERNAL_ERROR')
        if ($j.error -in $allowedCodes) { Write-Host ('JAVA backend code: ' + $j.error) }
        Write-Host ('JAVA nonempty translation: ' + (-not [string]::IsNullOrWhiteSpace($j.translatedText)))
    } catch { Write-Host ('JAVA diagnostic exception category: ' + $_.Exception.GetType().Name) }
    Get-Content $log | Select-Object -Skip $before | Select-String 'GEMINI_DIAGNOSTIC requestId=[a-f0-9-]+ model=[a-zA-Z0-9._-]+ upstreamStatus=(NONE|[0-9]{3}) category=[A-Z_]+ elapsedMs=[0-9]+' | ForEach-Object { $_.Matches[0].Value }
}
