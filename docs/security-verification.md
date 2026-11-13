# Step 3 security implementation and verification — November 11, 2026

## Architecture

The application uses Jakarta Security 3.0 on `appSecurity-5.0`; Liberty integrates `HttpAuthenticationMechanism` through its Jakarta Authentication servlet bridge. `SecurityConfiguration` is the mechanism. It delegates credential parsing to `BasicAuthenticationCredential` and identity validation to `IdentityStoreHandler` / `TranslatorIdentityStore`. No JAX-RS authentication filter, client implementation, form login, custom password hashing or session login was added.

The demonstration account reads TRANSLATOR_USERNAME and TRANSLATOR_PASSWORD. Missing, blank or invalid username configuration fails closed. There is no default account. Temporary comparison byte arrays are cleared; the configured password necessarily remains in process environment/memory. Valid credentials establish the caller and group translators. Liberty's explicit identity-store access-ID mapping assigns translator role. The servlet descriptor protects `/*` for every HTTP method, except the exact public `/api/health` mapping. Invalid authentication returns 401 plus Basic challenge; authenticated callers lacking the role get 403.

Production Gemini classes, prompt, model-selection code, timeouts, response contract and health resource were not changed. The user reported a successful Gemini 3.5 Flash Lite translation before this step; no new live Gemini result is claimed here.

## Evidence-based compatibility work

1. Started with @BasicAuthenticationMechanismDefinition. Deployed tests showed missing challenge headers for some rejected requests and HTTP 500 for malformed Base64/missing separator cases.
2. Group names alone did not authorize custom-IdentityStore callers. Added the documented explicit `access-id="translators"` mapping; valid callers then passed and a deliberately unmapped group produced 403.
3. A standard custom HttpAuthenticationMechanism fixed consistent challenge generation, but the two 500 cases persisted outside the application. Liberty FFDC and bytecode/source inspection identified NullPointerException and StringIndexOutOfBoundsException in WebProviderAuthenticatorProxy.authenticateForOtherMechanisms while auditing malformed Basic headers after authentication returned. SEND_CONTINUE and message authType alone did not resolve the container path. Additional login metadata was rejected as conflicting, and a server-wide override also failed tests; neither remains in the final configuration.
4. Added SecurityErrorServlet as a narrow error boundary: only those exception types whose first non-JDK frame is that exact Liberty audit method become 401. Application exceptions, including an application NPE called through the container, remain 500. No identity is established by this handler. Its URL remains protected. Regression tests cover both affected headers and unrelated-error classification.

The runtime may still record internal FFDC for the audit defect. The handler addresses the HTTP contract without modifying Liberty binaries, disabling TLS, accepting bad credentials, or changing runtime version. Test log scans check for leakage of generated passwords and valid Authorization tokens. A future runtime upgrade should rerun these regressions and reassess the compatibility handler.

## Files changed

Production additions:
- backend/src/main/java/edu/miniproject/SecurityConfiguration.java
- backend/src/main/java/edu/miniproject/TranslatorIdentityStore.java
- backend/src/main/java/edu/miniproject/SecurityErrorServlet.java
- backend/src/main/webapp/WEB-INF/web.xml

Configuration/testing:
- backend/pom.xml: Failsafe 3.5.4 plus isolated Liberty test-runtime setup
- backend/src/main/liberty/config/server.xml: appSecurity-5.0, identity-store role binding, SSO disabled; loopback preserved
- backend/src/test/liberty/server.xml
- backend/src/test/java/edu/miniproject/TranslatorIdentityStoreTest.java
- backend/src/test/java/edu/miniproject/SecurityErrorServletTest.java
- backend/src/test/java/edu/miniproject/SecurityIT.java
- backend/src/test/java/edu/miniproject/SecurityTestTranslationService.java (injected only into the temporary test WAR)

Scripts/docs:
- docs/verify-security.ps1 (new)
- docs/verify-backend.ps1 (authenticated validation/live requests; original coverage preserved)
- docs/diagnose-gemini.ps1 (authenticated optional backend comparison)
- .env.example, README.md, docs/architecture.puml, docs/verification.md, this report

Existing .gitignore already excludes target, logs, .env and server.env, so it did not need changes. No secrets or client code were added.

## Verification design

The full Maven verify lifecycle includes original tests, identity-store tests, compatibility-boundary tests and real HTTP integration tests on Open Liberty 25.0.0.10. Separate runtimes/user directories and ephemeral loopback ports avoid conflicts with development port 9080. Tests generate credentials in memory, remove GEMINI_API_KEY from the child environment and inject a deterministic CDI alternative into a copied test WAR. A call counter proves failed authentication and failed validation do not invoke translation. The production WAR does not contain this alternative.

HTTP tests cover public health; missing, wrong, malformed and invalid-Base64 credentials; challenge headers; valid authentication with valid/invalid JSON; protected trailing/slash/encoded/path-parameter variants and method changes; role denial; missing/blank environment configuration; security after server restart; no cookie-only authentication; and password/token leakage scans. The Windows launcher stops its test servers during cleanup.

The production WAR is separately started on 127.0.0.1:9080 with a random temporary account and no Gemini key. docs/verify-security.ps1 tests public health, rejection/challenges and all original authenticated validation cases. It sends no quota-consuming authorized valid translation request. The verification server is stopped afterward; the temporary account is not saved.

## Local IntelliJ handoff

In the IntelliJ PowerShell terminal that already has GEMINI_API_KEY and GEMINI_MODEL configured:

```powershell
cd <repository-root>
$env:TRANSLATOR_USERNAME = Read-Host 'Local API username'
$secret = Read-Host 'Local API password' -AsSecureString
$env:TRANSLATOR_PASSWORD = [Net.NetworkCredential]::new('', $secret).Password
Remove-Variable secret
# Preserve the verified Gemini model and existing key; do not print the key.
# GEMINI_MODEL should remain gemini-3.5-flash-lite in this terminal.
mvn -f backend/pom.xml liberty:create liberty:install-feature liberty:deploy liberty:start
pwsh -File docs/verify-security.ps1
# Opt in only when ready for one real provider request:
pwsh -File docs/verify-security.ps1 -Live
```

Maven must be on PATH in that terminal. Stop any prior dev mode with Ctrl+C before starting another server. Restart after changing environment configuration. `.env` is not loaded automatically. Use strong ASCII demo credentials for Basic interoperability; usernames cannot contain a colon. Basic is only Base64 encoding; HTTPS with normal certificate validation is mandatory before LAN/mobile/public access. Binding remains 127.0.0.1.

The user's persistent account and a real Gemini translation through that account remain a local final check because Codex does not inherit the user's credentials. Authentication enforcement is verified independently using temporary accounts and real container HTTP. No Chrome/PHP/Python/React Native client or publication work was performed.

## Final executed results

Final command: Maven 3.9.11 `-B -f backend/pom.xml -Dmaven.repo.local=<local-Maven-cache> clean verify` using the cached executable recorded in docs/verification.md. Result: **BUILD SUCCESS**, November 11, 2026 at 07:48:53 PST.

| Suite | Passed | Failures / errors / skips |
|---|---:|---|
| Existing GeminiTranslationServiceTest | 25 | 0 / 0 / 0 |
| Existing TranslatorResourceTest | 25 | 0 / 0 / 0 |
| TranslatorIdentityStoreTest | 11 | 0 / 0 / 0 |
| SecurityErrorServletTest | 4 | 0 / 0 / 0 |
| Deployed SecurityIT | 27 | 0 / 0 / 0 |
| **Total** | **92** | **0 / 0 / 0** |

Then executed `liberty:create liberty:install-feature liberty:deploy liberty:start`, `docs/verify-security.ps1`, and `liberty:stop`. The final production server reported readiness at 07:49:38 PST. HTTP verification passed: public health 200; no header, wrong account and malformed headers 401 with Basic challenge; valid temporary credentials with malformed/invalid JSON 400. All seven original input-validation checks passed with authentication. No new GEMINI_DIAGNOSTIC records appeared. The temporary server stopped successfully; no temporary account was saved. All generated test servers were also stopped.

Valid authenticated JSON returned HTTP 200 and the expected four-field translation structure in the deployed integration test using the isolated test alternative. Role denial returned 403. Tests confirmed no translation-service calls after authentication failure, no cookie-only bypass, and fail-closed behavior after missing/blank account configuration and restarts. Production WAR inspection confirmed WEB-INF/web.xml is present and SecurityTestTranslationService is absent.

No live Gemini call was made in Step 3. The user's persistent API credentials were unavailable, so they were not read, displayed, copied or saved. The temporary production test explicitly omitted the provider key and used the already-verified model identifier gemini-3.5-flash-lite. The remaining local check is the user-account `verify-security.ps1 -Live` invocation after starting from the configured IntelliJ terminal.

Logs/reports (ignored): docs/step3-build.log, docs/step3-server.log, docs/step3-stop.log, backend/target/surefire-reports, backend/target/failsafe-reports. PowerShell script syntax validation passed. Earlier experimental failures were fixed or removed; final configuration contains no conflicting login-config or server-wide authentication override. No known failures remain in the executed final suite.
