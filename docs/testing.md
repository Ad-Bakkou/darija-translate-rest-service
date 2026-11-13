# Testing and verification

Latest automated run: **November 13, 2026**, during the documentation-only cleanup. Java 21/Maven 3.9.11, Node 24.22.3, Python 3.12.8 and PHP 8.4.27 were used. These results are from executed checks, not expected counts.

| Check | Result |
| --- | --- |
| Java Maven verify | 92 passed: 65 unit + 27 Open Liberty HTTP integration tests |
| Chrome extension | 51 passed |
| Python client | 13 passed |
| PHP client | 40 assertions passed; all six PHP files passed syntax checks |
| Mobile client | 47 passed |
| TypeScript | Passed |
| Expo Doctor | 19/20 checks passed; one patch-version mismatch |
| npm audit | Three moderate entries; no high or critical entries |

All listed application test suites completed with zero failures and zero skipped tests. Expo Doctor and npm audit return nonzero exit status for the findings described below. They are not reported as clean checks.

## Reproduce the automated checks

Install the prerequisites and dependencies from the [root README](../README.md). From the repository root in PowerShell:

```powershell
mvn -B -f backend/pom.xml verify
node --test chrome-extension/tests/*.test.js
python-client/.venv/Scripts/python.exe -m unittest discover -s python-client/tests -v
php php-client/tests/run.php
Get-ChildItem php-client -Recurse -Filter *.php | ForEach-Object { php -l $_.FullName }
cd mobile-client
npm test
npm run typecheck
npm run doctor
npm audit
```

Maven uses a separate Liberty test runtime, temporary accounts and an ephemeral loopback port. Its translation implementation is replaced only inside the copied test WAR; the production WAR does not include the test alternative. The integration launcher uses Windows `server.bat`. Test reports are generated under backend/target/surefire-reports and failsafe-reports.

Ordinary automated tests do **not** call Gemini. They cover request validation, provider-response/error mapping, authentication and roles, client UTF-8 credentials, safe response handling and mobile storage/cancellation. Optional Requests/cURL wire tests are documented in [client setup](client-setup.md#repeatable-integration-checks-without-gemini-credits). The tests need permission to bind/connect to loopback; Doctor/audit need network access for metadata.

## Dependency findings

The latest Expo Doctor check expects Expo `~58.0.25`, while the application and lockfile pin `58.0.24`. This accounts for the 19/20 result. The installed application was retained; the check was not suppressed. Any dependency update should be followed by automated and physical-device regression testing.

npm reports three moderate advisory entries in the Expo → @expo/fingerprint → minimatch dependency chain (GHSA-g3hv-75wg-m249). These are entries in one transitive chain, not three independently demonstrated exploits. No incompatible forced Expo downgrade was applied. Run `npm audit` for current details because advisory metadata changes over time.

## Previously verified live behavior

The project owner previously reported successful authenticated Gemini translations through the Chrome extension, Python CLI, PHP web application and physical Xiaomi Redmi Note 11 Pro using Expo Go. Chrome checks included side-panel opening, manual translation, right-click selection transfer, automatic translation, Copy and Read aloud. Android checks included real translation, Arabic RTL, Copy and account persistence after an Expo Go reload, using USB ADB reverse forwarding for API port 9080 and Metro port 8082.

These are historical manual observations. No new live provider, browser or phone acceptance run was performed during the documentation cleanup. Automated fixtures do not establish translation quality or current Gemini availability.

## Scope and limitations

- Both UML diagrams have PlantUML source and validated PNG/SVG exports; see [UML documentation](uml/README.md).
- Standalone Android APK execution, native release-policy enforcement and production HTTPS deployment are not verified.
- The original intermittent mobile 401 cause was not established; direct authenticated translation later succeeded.
- Exhaustive accessibility, device, speech-engine and manual error-path coverage is not claimed.
- Health UP indicates local process availability, not provider credentials/quota/readiness.
