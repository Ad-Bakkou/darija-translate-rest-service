# REST API reference

Base URL for local development: `http://127.0.0.1:9080`. WAR context root is `/`; JAX-RS application path is `/api`. Android uses this same URL only with USB ADB reverse forwarding. No client calls Gemini directly.

## GET /api/health

Public; no Authorization header required. Returns HTTP **200**, `Content-Type: application/json`:

```json
{"status":"UP"}
```

This checks that the application is responding, not translator credentials, Gemini configuration, model availability or quota.

```powershell
curl.exe http://127.0.0.1:9080/api/health
```

## POST /api/translate

Requires valid HTTP Basic credentials and the `translator` role. Send UTF-8 JSON with `Content-Type: application/json`. A valid IdentityStore account belongs to `translators`, mapped to `translator` in server.xml. All application paths/methods are protected by default except the exact health URL. The internal compatibility servlet is not a public API endpoint.

Request schema:

| Property | Type / requirement |
| --- | --- |
| `text` | Required string; nonblank, well-formed Unicode, at most 5,000 Unicode code points. Original text is preserved, not trimmed. |
| `sourceLanguage` | Optional string. Defaults to `English`; if present, surrounding whitespace is stripped for validation and comparison is case-insensitive. Only English is supported. |

The top-level value must be one JSON object. Invalid JSON, trailing content, wrong field types, null/missing text, whitespace-only input, unpaired surrogates and excessive length return 400. Unknown properties are ignored. Target language is fixed; there is no targetLanguage/model option in the request.

Illustrative request:

```json
{"text":"How are you today?","sourceLanguage":"English"}
```

HTTP **200**, `Content-Type: application/json; charset=UTF-8`. Response contains four string properties:

| Property | Meaning |
| --- | --- |
| `originalText` | Exact submitted text |
| `translatedText` | Nonempty Gemini-generated Darija in Arabic script; may vary between calls |
| `sourceLanguage` | `English` |
| `targetLanguage` | `Moroccan Darija` |

Illustrative response, not a new test observation or guaranteed wording:

```json
{"originalText":"How are you today?","translatedText":"كيف داير اليوم؟","sourceLanguage":"English","targetLanguage":"Moroccan Darija"}
```

Use the Python client for a safe example that prompts for credentials when missing (no password in command-line arguments):

```powershell
python-client/.venv/Scripts/python.exe python-client/main.py --text "How are you today?" --json
```

Basic headers have the protocol form `Authorization: Basic <base64-of-UTF-8-username:password>`; the angle-bracket text is a placeholder, not a usable token. Base64 does not encrypt credentials. Username/password matching is exact and case-sensitive; usernames cannot contain a colon. Missing/blank backend account configuration disables the account. Credentials are supplied through the backend process environment; `.env` is not loaded automatically.

## Status and error contract

Authentication/authorization occurs before resource input validation and before Gemini is called. Application-mapped errors use JSON `{ "error": "CODE", "message": "safe message" }`. Container-generated 401/403 responses are **not guaranteed to have that JSON shape**; clients must handle status independently of the body. Invalid credentials produce a Basic challenge (`WWW-Authenticate: Basic realm="Darija Translator"`).

| HTTP | Actual behavior / application error codes |
| --- | --- |
| 200 | Public health or successful translation |
| 400 | `VALIDATION_ERROR`: request/input rejected |
| 401 | Missing, malformed or invalid Basic credentials; recognized Liberty malformed-header audit failure is normalized by SecurityErrorServlet to `UNAUTHORIZED` |
| 403 | Authenticated caller lacks the required role; tested with an intentionally unmapped group |
| 415 | JAX-RS rejects an unsupported request media type for authenticated POST; mapper uses `HTTP_ERROR` when handled by JAX-RS |
| 422 | `TRANSLATION_BLOCKED`: provider prompt/candidate safety/content rejection |
| 500 | `INTERNAL_ERROR`: unexpected application failure; unrelated servlet failures remain 500 |
| 502 | `UPSTREAM_AUTH_ERROR` (provider 401/403), `UPSTREAM_ERROR` (other non-2xx except mapped 429/5xx), `UPSTREAM_CONNECTION_ERROR` (I/O/network), or `INVALID_UPSTREAM_RESPONSE` (unusable JSON/result) |
| 503 | `CONFIGURATION_ERROR` (missing/invalid Gemini configuration), `UPSTREAM_RATE_LIMIT` (provider 429), or `UPSTREAM_UNAVAILABLE` (provider 5xx/interruption) |
| 504 | `UPSTREAM_TIMEOUT`: Java HttpClient timeout |

The backend does **not** implement its own HTTP 429 rate limiter: Google's 429 becomes client-facing **503**. Clients defensively recognize 429, but it is not a guaranteed backend status. Other routing/method errors may be produced by JAX-RS/container; they are not new business endpoints.

Illustrative application validation error:

```json
{"error":"VALIDATION_ERROR","message":"Text must not be empty."}
```

Java HttpClient uses a 10-second connection timeout and 45-second request timeout, with redirects disabled. There are no automatic Gemini retries. Provider bodies/keys and user text are excluded from application diagnostic logs; safe diagnostics record provider status/category and timing. Translation quality and model/quota availability depend on Gemini. The verified environment selected `gemini-3.5-flash-lite`; source fallback remains `gemini-2.5-flash`, so set GEMINI_MODEL explicitly. Only the Java process needs GEMINI_API_KEY.

Remote deployment is not verified. Keep local Basic authentication on loopback/USB forwarding; any remote production deployment requires HTTPS and a separately reviewed access/configuration model.
