# Gemini failure diagnosis — 2026-11-10

## Observed results

- The latest running Liberty process uses **gemini-flash-latest**, not the source-code default gemini-2.5-flash. After hot deployment, the service initialized inside that same process and logged `credentialsPresent=true`, connect timeout 10000 ms, request timeout 45000 ms, `systemProxies=false`, `httpsProxyConfigured=false`.
- Codex's terminal does not have GEMINI_API_KEY, even with approved execution access. No environment/key was extracted from the server. The server's existing environment was preserved by hot deployment rather than restart.
- Exactly **one** live request was sent through Java: `How are you today?`. At 18:29:29 PST, request ID `cdf51424-a5e6-4fe1-8710-09b367bd84e7` logged `upstreamStatus=NONE category=REQUEST_TIMEOUT elapsedMs=45007`. The backend returned **504 UPSTREAM_TIMEOUT** after 45292 ms. No completed Gemini response/status was available for this attempt. This is not an upstream HTTP 504.
- No direct authenticated Gemini request was made because the key is unavailable to this terminal. A one-shot script is provided below.
- GET /api/health still returned **200** after deployment.
- A separate credential-free Java 21 probe resolved 8 addresses, connected directly to TCP 443, and completed a hostname-verified TLS 1.3 handshake with Google's host using the default Java trust store. The temporary probe initially had a factory-cast compile error; after correction it ran successfully. Source is in ignored backend/target/NetworkProbe.java. This probe does not prove generation availability or that every connection takes the same route.
- Codex environment has neither HTTP_PROXY nor HTTPS_PROXY. Server JVM reports no https.proxyHost or java.net.useSystemProxies configuration. This does not rule out transparent interception, alternate JVM settings or transient network faults.

## Interpretation of earlier responses

The previous code did not log upstream status, so historical exact statuses cannot be recovered from existing Liberty logs:

| Backend result | What the source mapping establishes |
|---|---|
| 502 UPSTREAM_ERROR | Non-2xx Google response excluding 401/403/429 and 5xx; exact code unknown (e.g. 400 or 404 possible) |
| 504 UPSTREAM_TIMEOUT | Java connection/request deadline exception; no completed HTTP response available |
| 503 UPSTREAM_UNAVAILABLE with “Translation provider is temporarily unavailable.” | An upstream 5xx response; exact 500/503/etc. was lost |

The reported model-list success demonstrates listing access, not generation capacity, model access, generation quota or payload acceptance. Quota is not proven: an observed 429 would map to UPSTREAM_RATE_LIMIT, which is different from the supplied latest error. No evidence justifies changing timeouts, model, prompt, retry behavior, TLS validation or proxy settings yet.

The confirmed defect was missing diagnostic evidence. There is also a confirmed configuration difference: the running process uses an alias instead of the default documented model. Whether that alias causes the generation failures remains unknown. The observed request deadline could reflect provider latency, capacity, or a network-path problem after connection establishment; the probe rules out a persistent basic DNS/TCP/TLS failure in the tested Java environment, not all network failures.

## API contract review

The payload uses a systemInstruction object with text parts, contents with user role and text parts, UTF-8 JSON, POST to `/v1beta/models/{model}:generateContent`, and the x-goog-api-key header. These match the [official generateContent contract](https://ai.google.dev/api/generate-content). No unsupported generation options are present. The model alias's account eligibility and actual resolved model version have not been independently verified. [Google troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting) distinguishes model/API errors, quota and transient capacity failures; it also notes thinking-model latency. None alone establishes the cause of this request.

## Changes and tests

- GeminiConfiguration.java: safe model label and credential-presence accessors.
- GeminiTranslationService.java: startup configuration diagnostics; request ID, model, exact HTTP status (or NONE), elapsed time and allow-listed transport categories. Logs never include exception messages/stack traces, credentials, user text or response bodies. HTTP mappings and timeouts are unchanged.
- GeminiTranslationServiceTest.java: regression coverage for status logging, no secret/body/text leakage, transport categorization and invalid-model sanitization.
- docs/diagnose-gemini.ps1: one direct request, optional one backend comparison; no retry, no key output, no raw response body output.
- README.md, docs/verification.md and this report updated.

Executed Maven `verify liberty:deploy` using the cached Maven 3.9.11 executable and existing workspace Maven repository. **BUILD SUCCESS: 50 tests, 0 failures, 0 errors, 0 skipped**. The final suite includes all previous 47 tests. Deployment preserved the running server environment; GEMINI_CONFIG confirms the new code initialized. No clean/server restart was needed. PowerShell diagnostic script passed parser validation; its live path remains unexecuted due to absent terminal credentials.

## One-shot local direct comparison

In the already-configured PowerShell 7 terminal, from the project root:

```powershell
[bool]$env:GEMINI_API_KEY
pwsh -File docs/diagnose-gemini.ps1
```

The script reads the latest server model diagnostic, uses that model with the terminal key, and sends exactly one minimal generateContent request (same payload structure, shorter translator system instruction). It uses 10-second connect and 45-second request limits. It reports HTTP status, elapsed time, allow-listed provider error enum, and success booleans; never credentials, user text or raw response content. PowerShell's default proxy behavior can differ from Java's; the script reports proxy bypass/presence without addresses or credentials.

The Java comparison above is already recorded. Only if a fresh paired comparison is necessary, invoke **once instead**:

```powershell
pwsh -File docs/diagnose-gemini.ps1 -CompareBackend
```

This makes one direct call plus one Java call, then prints the new safe Java diagnostic entry. Avoid running both variants repeatedly. The terminal key and server key must be the same for a controlled comparison; the script deliberately cannot prove key identity or read another process's secret. Ensure no concurrent requests are made while comparing.

Next decisions must follow the result: 400 suggests request/model constraints; 404 model availability; 401/403 authentication/permissions; 429 quota/rate limit; 5xx provider/path availability. If direct succeeds while Java times out, compare proxy route, JVM configuration and the longer production instruction before changing limits. If both time out or return 5xx, retain evidence and investigate provider/service status or network path rather than guessing. No client or authentication implementation was added.
