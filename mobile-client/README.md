# DarijaTranslate Mobile — Step 6

Expo + TypeScript Android client for the existing authenticated Jakarta REST service. The app never calls Gemini directly. Its destination is fixed to `http://127.0.0.1:9080`, which requires Android-to-Windows ADB reverse forwarding. Existing Java and other client source code is unchanged.

**Current verification:** automated tests (47), TypeScript and Expo Doctor (20/20) pass. The user verified Expo Go on a physical Xiaomi Redmi Note 11 Pro (2201116TG): app rendering, Online status, real authenticated Gemini translation, Arabic RTL, Copy and account persistence after reload. Codex confirmed the USB device/reverse mappings and observed a relayed HTTP 200, followed by user-confirmed direct translation. The earlier 401 is no longer reproducible and its original cause remains unproven. Native APK compilation/launch, release policy enforcement and production HTTPS remain unverified. See [verification provenance](../docs/verification.md).

## Versions and setup

Chosen from the official SDK 58 template and Expo's compatibility resolver, then pinned exactly with package-lock.json:

| Package | Version |
| --- | --- |
| Expo | 58.0.24 |
| React Native / React | 0.88.1 / 19.3.0 |
| TypeScript / React types | 6.0.3 / 19.3.0 |
| expo-secure-store | 58.0.3 |
| expo-clipboard | 58.0.4 |
| expo-status-bar / expo-system-ui | 58.0.5 / 58.0.7 |
| react-native-safe-area-context | 5.11.1 |
| expo-doctor | 1.21.8 |

Official [SDK compatibility table](https://docs.expo.dev/versions/latest/) maps SDK 58 to RN 0.88 / React 19.3 and requires Node 22.13 or newer. This project standardizes on Node 24 LTS. The machine's global Node 23.5.0/npm 10.9.2 were not used for mobile builds. A checksum-verified official Node 24.22.3 Windows x64 runtime is installed at `../.tools/node-v24.22.3-win-x64`, ignored by Git. No system PATH or environment was changed. For another checkout install Node 24 LTS from [Node's official distributions](https://nodejs.org/dist/), verifying its SHASUMS256.txt.

In IntelliJ PowerShell, from the repository root:

```powershell
# Process-local PATH only; use your installed Node 24 instead in another checkout.
$env:Path = (Resolve-Path .tools/node-v24.22.3-win-x64).Path + ';' + $env:Path
node --version
npm --version
cd mobile-client
npm ci
npm run typecheck
npm test
npm run doctor
npm run export:android
```

No credentials belong in app.json, .env, EXPO_PUBLIC variables or source code. Enter the existing translator account only in the app's Settings. The backend keeps its existing environment/model configuration (user-verified gemini-3.5-flash-lite).

## Android setup and networking

1. Install Android Studio and the SDK/emulator prerequisites using [Expo's official Android environment guide](https://docs.expo.dev/workflow/android-studio-emulator/). SDK images/build tools can consume several GB; none were installed automatically in this step. Alternatively use an authorized USB-debugging Android device with platform-tools installed. Keep Java/Liberty in its existing terminal.
2. Start one emulator from Android Studio Device Manager, or connect your Android USB device and accept its debugging prompt. Resolve `adb` from your actual SDK platform-tools path; do not invent a directory or expose ADB over a public network.
3. Inspect devices and select its exact serial:

```powershell
adb devices -l
# From mobile-client; replace SERIAL with a device showing state 'device':
pwsh -File scripts/reverse-android.ps1 -Serial SERIAL
adb -s SERIAL reverse --list
```

The script verifies the target state, establishes `adb -s SERIAL reverse tcp:9080 tcp:9080` and `tcp:8082 tcp:8082`, and confirms both listings. The individual ADB device/reverse commands were verified during the phone investigation; the helper script itself is supplied for reproducibility. Reapply after device/emulator restart or reconnection. Port 8082 avoids the PHP client's port 8081. A listed route is necessary but not sufficient: the Android app must show Local service online. Its health request uses the same transport as translation and contains no account credentials.

4. Preferred route for explicitly controlled cleartext policy: build the local native **debug** app (requires installed Android SDK/toolchain):

```powershell
npx expo prebuild --platform android --no-install
npm run android
```

The Android run command builds/installs the debug application and starts Metro on 8082. With multiple devices, use `npx expo run:android --device --port 8082` to select the same target. If Metro is already running, use the existing server rather than starting a duplicate. The generated Gradle wrapper/toolchain comes from SDK 58; follow build diagnostics and the official environment guide for Java/SDK requirements. APK compilation was not run here.

5. Optional Expo Go route: install an SDK-58-compatible Android Expo Go from [Expo Go downloads](https://expo.dev/go). Then:

```powershell
npm start -- --go
# In a second terminal with the verified ADB routes:
adb -s SERIAL shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8082
```

The exact host runtime must support SDK 58. The user successfully ran this project in Expo Go on the physical phone. Expo Go ignores this project's native config plugin; its host app determines cleartext policy and permissions. Do not claim the debug-build restriction applies to Expo Go. If local HTTP is blocked there, use the native debug build above. Expo Go is the verified runtime; the custom native debug build remains untested. A web preview is not a substitute and is not configured as an acceptance target.

Keep Liberty bound to 127.0.0.1. Do not use 0.0.0.0, LAN/public HTTP, a public tunnel or an unverified 10.0.2.2 alias. After testing remove only these mappings:

```powershell
adb -s SERIAL reverse --remove tcp:9080
adb -s SERIAL reverse --remove tcp:8082
```

## Native cleartext and authentication security

`plugins/withLoopbackNetwork.cjs` generates Android Network Security Configuration. The main/release resource denies HTTP, explicitly including localhost/127.0.0.1. Only the debug resource permits those two exact loopback destinations; all other cleartext hosts remain denied. Native configuration cannot restrict the loopback port, so the API code fixes it to 9080. Metro uses loopback 8082. Generated resource and manifest contents were inspected after prebuild, but actual enforcement still requires an Android runtime. The local-only application intentionally cannot translate in a release build without a separately reviewed HTTPS deployment design.

App configuration removes microphone, overlay, shared-storage and vibration permissions inherited from templates; Clipboard needs no added permission. Config plugins affect native builds, not Expo Go. SecureStore uses the SDK's backup-exclusion rules. Basic encoding is UTF-8 Base64, not encryption. Remote deployment needs HTTPS and a reviewed endpoint/access policy; never relax the local backend binding to work around connectivity.

`expo-secure-store` stores the account in device-protected storage when available (Android Keystore-backed encryption). The password field is masked, not prefilled and cleared after saving/backgrounding. If SecureStore reports unavailable, credentials are session-only in memory and the UI says so. Storage failures are reported rather than silently claiming a successful save/deletion. Forget clears memory and deletes the stored entry, with serialized writes to prevent a Save/Forget race. No AsyncStorage, plain files, client environment secrets or logs hold passwords. Device/debugger/root access can still expose credentials or process memory. See [SecureStore limitations](https://docs.expo.dev/versions/latest/sdk/securestore/).

The app uses [Expo Fetch](https://docs.expo.dev/versions/latest/sdk/expo/) through `nativeApi.ts`. Installed SDK Android NativeRequest.kt disables `followRedirects` when redirect mode is not FOLLOW, and NativeResponse.kt rejects redirect:error. This avoids [legacy React Native fetch redirect limitations](https://reactnative.dev/docs/network). Responses also check status/redirected/URL defensively. Actual Android redirect behavior is not yet runtime-tested; do not infer that mocks prove native transport behavior.

## Features and source map

- App.tsx: safe-area/keyboard-aware scrollable light UI, English input, code-point counter, Settings, connection checks, loading/cancel, RTL selectable output and Copy confirmation. No sample result is displayed as generated text.
- src/services/api.ts: fixed contract, 55-second AbortController deadline, safe status messages, strict JSON schema/Unicode checks, no retries. Health has a 5-second timeout and remains public.
- src/services/nativeApi.ts: Expo native fetch adapter; account.ts: serialized secure-storage operations.
- src/utils/validation.ts: nonblank/5,000-code-point validation, unpaired-surrogate rejection, UTF-8 Basic encoding; latest.ts: cancellation and stale-response guard.
- src/config/environment.ts and src/types/translation.ts: fixed endpoint/deadline and shared types.
- plugins/, scripts/, tests/: native loopback policy, verified ADB setup script and Node built-in tests of TypeScript compiled into ignored .test-build/.

Only the Translate button submits text. A synchronous request flag prevents duplicate taps. Source edits, Clear, account Save/Forget, backgrounding and unmount cancel requests; stale completions cannot overwrite newer results. Save does not submit automatically. Translate can be pressed again explicitly after a recoverable error. User text remains unchanged. React Native Text renders data as text, not HTML. Optional speech was deliberately left out of this step.

## Troubleshooting and manual acceptance

- Offline: verify Java health from Windows, selected device state, both reverse routes, Metro port 8082 and Android HTTP policy. Generic network errors cannot reliably distinguish a disconnected route from OS cleartext rejection; the UI does not pretend otherwise.
- 401: re-enter the local account in Settings. 403: account needs the translator role; do not weaken backend authentication.
- 400: invalid input; 422: content blocked; 429: quota; 502/503: provider error/unavailability; 504/55-second deadline: timeout. No automatic retry. Health Online does not prove Gemini readiness.
- Missing/invalid JSON or empty translation: safe error with no provider payload/stack trace. Copy failure offers selectable text as fallback.
- Native build connection fails but Metro starts: verify the Android debug resource merge and ADB target, not just Windows connectivity. Never disable TLS verification.
- npm audit currently reports 3 moderate findings in the Expo → @expo/fingerprint → minimatch toolchain. Its suggested forced fix downgrades Expo to 52, so it was not applied. Review an SDK-compatible upstream patch before wider distribution. This does not represent a clean audit.

Remaining manual regression checklist (some cases below exceed the confirmed happy path): launch the native app; confirm Online; save valid credentials; translate one English sentence through real Gemini; verify Arabic RTL and exact original text; Copy/paste the result; try wrong credentials (401), blank/overlength input, rapid repeated taps, edits/cancellation, backgrounding, Forget and restart. Check keyboard/scrolling/touch targets on a narrow screen. Test offline feedback by temporarily removing only the 9080 reverse mapping, then restore it; do not stop or reconfigure the user's Liberty server. Verify secure-store persistence/deletion on-device and confirm no stale results after cancellation. Record the exact device/runtime and observed results before calling Step 6 fully verified.

Official networking references: [ADB](https://developer.android.com/tools/adb), [ADB reverse command reference](https://android.googlesource.com/platform/packages/modules/adb/+/refs/heads/main/docs/user/adb.1.md), [Android network security configuration](https://developer.android.com/privacy-and-security/security-config).
