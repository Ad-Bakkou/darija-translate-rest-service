param([string]$BaseUrl = "http://127.0.0.1:9080")
$ErrorActionPreference = "Stop"
$response = Invoke-WebRequest -Uri "$BaseUrl/api/health" -TimeoutSec 15
if ($response.StatusCode -ne 200) { throw "Expected HTTP 200" }
if ($response.Headers['Content-Type'] -notmatch 'application/json') { throw "Expected JSON content type" }
$body = $response.Content | ConvertFrom-Json
if ($body.status -ne 'UP') { throw "Expected status UP" }
Write-Output "PASS: GET /api/health HTTP 200, application/json, status UP"
