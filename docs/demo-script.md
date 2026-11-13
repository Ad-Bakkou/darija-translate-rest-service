# Five-minute demo script — actual recording pending

Use this script with [recording guidance](recording-guide.md). Timings total five minutes and include provider waiting time. Narration is a script, not a claim that this recording already exists. Say success statements only after a real successful response is visible.

## Prepare off-camera

Start the existing Java, PHP and Metro processes following the root README; do not start duplicates. Configure secrets off-camera using secure prompts. Open Chrome with the extension already configured, PHP at http://127.0.0.1:8081, the Python terminal, both UML SVGs, and the phone app. Close Settings, IDE run configurations, logs, browser developer tools and unrelated tabs. Clear the terminal display without printing its environment or history. Disable notification previews on Windows and the phone. Turn off terminal transcription. Do not type passwords into command lines.

For Python, use an already-configured process environment or enter its hidden password prompt before the portion you record. Rehearse screen switching without making unnecessary provider calls. Use a short sentence for each client. A public health response alone is not proof of translation readiness.

## 00:00–00:30 — Introduction

**Screen:** root README overview, then deployment SVG zoomed to clients → Liberty → Gemini.

**Say:** “This is my individual mini project, DarijaTranslate. It translates English into Moroccan Darija through a Java 21 Jakarta REST service on Open Liberty. Chrome, Python, PHP and React Native use the same authenticated endpoint. Only the backend holds the Gemini key. The mobile demonstration uses Expo Go on a physical Android phone.”

**Transition:** “First, I will show the API boundary and authentication.”

## 00:30–01:15 — Java REST, Gemini and security

**Screen:** a clean terminal. From the repository root:

```powershell
curl.exe -i http://127.0.0.1:9080/api/health
curl.exe -i -X POST http://127.0.0.1:9080/api/translate -H 'Content-Type: application/json' --data-raw '{}'
```

**Expected, only if observed:** health HTTP 200 with `{"status":"UP"}`; unauthenticated POST HTTP 401 and Basic challenge. This POST contains no credentials and should not call Gemini. Do not show a valid Authorization header or use curl verbose mode with credentials.

**Say:** “Health is public. Translation requires Basic authentication and the translator role. Jakarta Security validates the account through an IdentityStore and Liberty's Jakarta Authentication integration. The service validates JSON and text before calling Gemini over HTTPS. The selected runtime model is gemini-3.5-flash-lite. Provider timeouts and errors become safe HTTP responses. Local HTTP is restricted to loopback; remote deployment would require HTTPS.”

**Transition:** “Now I will make a real request from Chrome.”

## 01:15–02:15 — Chrome selection workflow

**Screen:** a normal HTTP/HTTPS page containing selectable English. Select “How are you today?” or another brief visible sentence. Right-click → Translate to Darija. Do not open Settings.

**Say:** “The Manifest V3 context menu receives the selected text without injecting a page script. It opens the side panel, transfers the selection and begins translation using the configured account. The request goes to the local Java service, which calls Gemini.”

**Expected:** selected source appears automatically; a loading state is followed by actual Arabic Darija. After success, click Copy. Optionally use Read aloud if a local Arabic voice has already been checked; otherwise omit speech to preserve time.

**Say after success:** “This is the provider's response. Copy uses the translated text. The Gemini key is never stored in this extension.”

**Transition:** “The same endpoint also supports a command-line client.”

## 02:15–03:00 — Python

**Screen:** clean Arabic-capable terminal, repository root, credentials already configured privately.

```powershell
python-client/.venv/Scripts/python.exe python-client/main.py --text "Thank you for your help." --json
```

**Say:** “The Python client uses Requests and UTF-8 Basic authentication. This command sends English text and prints the API response as JSON. It validates input and reports authentication, network and provider failures without revealing credentials.”

**Expected:** originalText, translatedText, sourceLanguage and targetLanguage from a real response; do not promise particular Darija wording.

**Transition:** “The PHP interface uses the same service from its server process.”

## 03:00–03:45 — PHP

**Screen:** http://127.0.0.1:8081. Enter “Where is the train station?” and submit once.

**Say:** “This PHP client sends the authenticated request using server-side cURL. The browser receives the rendered page, not the backend password. The form includes CSRF protection, and output is escaped before display.”

**Expected:** actual RTL translation after loading. Show the original and translated text together.

**Transition:** “Finally, the Android client reaches the same loopback service over USB.”

## 03:45–04:30 — Android

**Screen:** connected physical Redmi Note 11 Pro with DarijaTranslate in Expo Go, or a clearly identified genuine phone capture inserted into the edit. Follow the recording guide; capture method still needs testing on the reconnected device.

**Say:** “This is Expo Go, not a standalone APK. USB ADB reverse forwards phone port 9080 to the Windows API and port 8082 to Metro. The app displays connectivity status and stores the configured account with SecureStore.”

Enter “Good morning.”, tap Translate once, wait for the real result, then Copy. Keep account settings closed. If showing a paste, use an empty local note, not a messaging application.

**Say after success:** “The output is displayed right to left, and Copy places the translation on the device clipboard. Account persistence after reload was verified previously.”

**Transition:** “I will finish with the structure and verification evidence.”

## 04:30–05:00 — UML and close

**Screen:** class SVG focused on resource → TranslationService → GeminiTranslationService; briefly switch to deployment SVG and verification table.

**Say:** “The class diagram shows the REST boundary, translation service, configuration and security components. The deployment diagram shows all four clients and the backend-only Gemini connection. The latest checks passed 92 Java tests, 51 Chrome tests, 13 Python tests, 40 PHP assertions and 47 mobile tests. Expo Doctor reports one patch-version mismatch. Native APK and production HTTPS are not verified. Setup instructions, API details and limitations are documented.”

## Slow provider / failure backup

Leave enough waiting time within the client slots. If a call is slow, explain that provider latency is external while keeping its real loading state visible. If a request fails, show the safe error and say what happened; do not replace it with hard-coded output. Stop and re-record after recovery, or label a genuine earlier recording with its date and “previously recorded live request.” Any edit that shortens waiting should be disclosed. Never present test fixtures as live Gemini responses. A timeout can take 45 seconds at the backend, so a single uninterrupted five-minute take cannot be guaranteed.

## Final review

Replay the entire MP4 with sound. Check every success statement against visible output, readable Arabic, all four clients, UML visibility, approximate five-minute duration and no secret/notification exposure. No final MP4 has yet been recorded or included in the source ZIP. Confirm the course's exact duration, attribution and video delivery requirements before submission.
