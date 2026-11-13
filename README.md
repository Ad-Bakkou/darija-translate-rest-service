# DarijaTranslate — LLM-powered RESTful Web Service

An individual university mini project that translates English into Moroccan Darija using a Java/Jakarta REST service and Google Gemini. Four clients share the same authenticated API: a Chrome side panel, Python CLI, PHP web application and Expo React Native Android app.

**Status:** real translations through all four clients are user-confirmed. The physical Android test used Expo Go on a Xiaomi Redmi Note 11 Pro, with USB ADB forwarding; Arabic RTL, Copy and account persistence were confirmed. Native APK and production HTTPS deployment are not verified. See the [current verification report](docs/verification.md) for evidence and limitations.

## Features and technologies

- Java 21, Maven 3.9.11, Jakarta REST 3.1, CDI, JSON-P and Open Liberty 25.0.0.10.
- Jakarta Security mechanism integrated through Liberty's Jakarta Authentication bridge; HTTP Basic plus a translator role.
- Gemini REST generateContent through Java HttpClient; environment-selected model, validation, safe errors and timeouts.
- Chrome Manifest V3: selection context menu, side panel, automatic translation, copy and local Arabic speech.
- Python 3.12 / Requests; PHP 8.4 / cURL with a server-rendered, CSRF-protected form.
- Expo 58.0.24 / React Native 0.88.1 / TypeScript, SecureStore and Clipboard; Node 24 LTS.
- PlantUML class/deployment source, SVG and PNG exports.

## Architecture and UML

Clients → authenticated loopback Jakarta REST endpoint → Gemini over HTTPS. The Gemini key belongs only to the Java backend. Android reaches Windows loopback through USB ADB reverse; it does not access a publicly exposed Java server.

| Diagram | Source | Browser-friendly vector | PNG |
| --- | --- | --- | --- |
| Backend UML class diagram | [PlantUML](docs/uml/class-diagram.puml) | [SVG](docs/uml/class-diagram.svg) | [PNG](docs/uml/class-diagram.png) |
| UML deployment diagram | [PlantUML](docs/uml/deployment-diagram.puml) | [SVG](docs/uml/deployment-diagram.svg) | [PNG](docs/uml/deployment-diagram.png) |

[Rendering instructions and source mapping](docs/uml/README.md) explain the actual classes, relationships and local rendering tools.

```text
backend/             Maven WAR, Jakarta resources/security/Gemini, Java tests
chrome-extension/    Load-unpacked MV3 extension and Node tests
python-client/       Interactive/one-shot CLI and unittest suite
php-client/          public/ web root, src/ implementation, tests/
mobile-client/       Expo/TypeScript app, native config plugin and tests
docs/uml/            Mandatory class/deployment diagrams and exports
docs/                API reference, setup guides, verification and submission audit
```

## Prerequisites

Use JDK 21 and Maven 3.9.x on PATH, Node 24 LTS/npm, Python 3.12, PHP 8.x with cURL/JSON/session support, and Chrome 116+. For Android install platform-tools/ADB and use an authorized USB-debugging device or an emulator with an SDK-compatible Expo Go. Android Studio/SDK build tools are needed only for an emulator or native build. Network access is required for initial dependencies and Gemini.

Install tools independently from their official distributions: [JDK](https://adoptium.net/temurin/releases/?version=21), [Maven](https://maven.apache.org/download.cgi), [Node](https://nodejs.org/en/download), [Python](https://www.python.org/downloads/), [PHP Windows](https://www.php.net/downloads.php?os=windows), [Android](https://developer.android.com/studio). No `.tools/` binaries, virtual environments or author-specific caches are included or required. [Client setup](docs/client-setup.md) includes a reproducible standalone PHP installation.

Ports: **9080** Java, **8081** PHP, **8082** Expo Metro. Do not start duplicate servers. Commands below use PowerShell from the repository root unless stated otherwise. The deployed Java integration-test launcher currently uses Windows `server.bat`.

## Backend configuration and startup

Configure the environment in the terminal that will launch Liberty. `.env.example` documents variable names; `.env` is **not automatically loaded**. Do not enter secrets as literal shell commands or commit them.

```powershell
$secret = Read-Host 'Gemini API key' -AsSecureString
$env:GEMINI_API_KEY = [Net.NetworkCredential]::new('', $secret).Password
Remove-Variable secret
$env:GEMINI_MODEL = 'gemini-3.5-flash-lite'
$env:TRANSLATOR_USERNAME = Read-Host 'Translator username'
$secret = Read-Host 'Translator password' -AsSecureString
$env:TRANSLATOR_PASSWORD = [Net.NetworkCredential]::new('', $secret).Password
Remove-Variable secret
mvn -B -f backend/pom.xml verify
mvn -f backend/pom.xml liberty:create liberty:install-feature liberty:deploy liberty:start
curl.exe http://127.0.0.1:9080/api/health
```

The model above is user-verified in this environment; provider availability/quota may change. Set it explicitly: the unchanged source fallback and historical `.env.example` value are `gemini-2.5-flash`. Neither is an instruction to change a working running server. The translator account is separate from the Gemini key; no default account exists. Matching is case-sensitive, and usernames cannot contain `:`. Missing/blank account variables disable authentication.

Use `mvn -f backend/pom.xml liberty:dev` for development instead of starting a second server. Stop standalone Liberty with `mvn -f backend/pom.xml liberty:stop`. Restart from the configured terminal after environment changes. Do not run `clean` while Liberty holds files under `backend/target`. The server binds only to `127.0.0.1:9080`; WAR name is `darija-backend.war`, context root `/`. Logs remain under ignored `backend/target/liberty/wlp/usr/servers/darijaServer/logs/`.

## API

| Method/path | Authentication | Result |
| --- | --- | --- |
| GET `/api/health` | Public | `{"status":"UP"}`; process health only |
| POST `/api/translate` | Basic + translator role | Original text and actual Darija translation |

Illustrative request (Content-Type: application/json):

```json
{"text":"How are you today?","sourceLanguage":"English"}
```

Illustrative successful response; generated wording may vary:

```json
{"originalText":"How are you today?","translatedText":"كيف داير اليوم؟","sourceLanguage":"English","targetLanguage":"Moroccan Darija"}
```

Input is limited to 5,000 Unicode code points. [API reference](docs/api-reference.md) documents default language, validation, auth/media-type errors and exact provider-status mappings. In particular, Google's 429 becomes backend 503; container auth errors are not guaranteed JSON.

## Run the clients

**Chrome:** open `chrome://extensions`, enable Developer mode, Load unpacked → `chrome-extension/`, then pin DarijaTranslate. Save the local account in Settings. Use the toolbar for manual text or select webpage text → right-click → Translate to Darija. [Extension guide](chrome-extension/README.md).

**Python:** environment credentials are optional in an interactive terminal; missing credentials are prompted securely.

```powershell
python -m venv python-client/.venv
python-client/.venv/Scripts/python.exe -m pip install -r python-client/requirements.txt
python-client/.venv/Scripts/python.exe python-client/main.py --health
python-client/.venv/Scripts/python.exe python-client/main.py
# One live translation:
python-client/.venv/Scripts/python.exe python-client/main.py --text "How are you today?" --json
```

[Python guide](python-client/README.md): `:quit` exits; `:account` changes the in-memory account. Use an Arabic-capable terminal font.

**PHP:** in a separate terminal, securely set the same TRANSLATOR_USERNAME/PASSWORD variables as above (not the Gemini key). Verify `php -m` lists curl and json, check port availability, then:

```powershell
Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
php -S 127.0.0.1:8081 -t php-client/public
```

Open `http://127.0.0.1:8081`. Only `public/` is served; REST calls and account credentials stay server-side. [PHP guide](php-client/README.md) and [independent runtime installation](docs/client-setup.md).

**Android / Expo Go:** use Node 24 LTS. In the Metro terminal:

```powershell
cd mobile-client
npm ci
npm start -- --go
```

In another terminal with ADB on PATH, select the authorized device's serial:

```powershell
adb devices -l
# Replace SERIAL; from the repository root:
pwsh -File mobile-client/scripts/reverse-android.ps1 -Serial SERIAL
adb -s SERIAL reverse --list
adb -s SERIAL shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8082
```

The script confirms 9080→9080 and 8082→8082. Install a [compatible Expo Go](https://expo.dev/go) for SDK 58. Enter the existing account in app Settings, wait for Save success, then Translate. A route listing alone is not connectivity proof; check Online in the app. [Mobile guide](mobile-client/README.md) covers full setup and the untested native-debug alternative. No LAN binding, public tunnel or unverified emulator alias is needed.

## Tests and evidence

From repository root:

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
```

Fresh Step 8 results (2026-11-13): **Java 92; Chrome 51; Python 13; PHP 40 assertions plus six syntax checks; mobile 47; TypeScript passed; Expo Doctor 19/20 (expects Expo ~58.0.25, pinned 58.0.24)**. Ordinary tests do not call Gemini. Maven's real Liberty HTTP tests use an isolated test-only translation implementation and generated accounts. User-confirmed live results are recorded separately in [verification](docs/verification.md). Optional [client wire tests](docs/client-setup.md#repeatable-integration-checks-without-gemini-credits) use local fixtures, not Gemini.

## Security, troubleshooting and limitations

- Basic is Base64, not encryption. Development uses loopback/USB forwarding. Remote production use requires HTTPS and a reviewed access model; no production deployment is claimed.
- Gemini keys are backend-only. Chrome credentials are trusted-extension session scoped; Python holds credentials in memory/environment; PHP keeps them server-side; mobile uses SecureStore where available, with a labeled session-memory fallback. Local privileged/debugger access remains a risk.
- Never log/publish passwords, Authorization values, keys, environments or raw provider responses. PHP escapes HTML and validates CSRF; clients render returned text safely.
- Offline: check the correct server terminal, ports and (Android) ADB routes. Health UP does not establish provider readiness. 401 means check exact account values; 403 means role mapping. 502/503/504 indicate provider/configuration/network/timeout failures. No client automatically retries a translation.
- The historical mobile 401 is no longer reproducible; its original cause is **unproven**. Both relayed and direct real requests succeeded during investigation; no authentication/transport change was needed.
- npm audit still reports **three moderate Expo-related findings**. No incompatible SDK downgrade was forced. A clean dependency/security audit is not claimed.
- Native Android APK, production HTTPS, exhaustive accessibility/device testing and all offline/edge-case UI paths remain unverified. Expo Go does not apply the custom native debug-build network policy.
- Liberty 25.0.0.10 has a narrowly handled malformed-Basic audit failure; see [security implementation notes](docs/security-verification.md). Internal FFDC may still be generated and stays ignored.

## Presentation and academic notice

Use the [demo script](docs/demo-script.md), [recording guide](docs/recording-guide.md), [submission checklist](docs/submission-checklist.md) and [final verification/audit](docs/final-verification.md). Local Git and source ZIP preparation are complete; GitHub publication and the actual MP4 are **pending**. The intended destination is Ad-Bakkou/darija-translate-rest-service, pending explicit public-publication approval and correct-account authentication; no published URL is claimed. See [publication instructions](docs/github-publication.md).

After a clean reviewed commit, run `python docs/package-submission.py` to produce `dist/DarijaTranslate-MiniProject2-Submission.zip` and its checksum/inventory. The archive contains committed source/docs/UML only, with no video, dependencies, secrets or local tools. Regenerate after adding a verified repository URL or final video delivery metadata. The package is prepared locally; it has not been submitted to the university.

This is an individual academic assignment. Third-party components retain their respective licenses; no project-wide open-source license has been selected. Follow the course's attribution and assistance-disclosure requirements. Submission deadline supplied by the student: November 12, 2026, 11:59 PM (confirm the course's deadline timezone).
