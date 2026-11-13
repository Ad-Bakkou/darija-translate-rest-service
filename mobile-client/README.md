# DarijaTranslate Mobile

Expo + TypeScript Android client for the authenticated Jakarta REST service. The app sends requests only to `http://127.0.0.1:9080`; it never calls Gemini directly. Physical Android reaches the Windows backend through USB ADB reverse forwarding.

The project owner previously verified real translation, Arabic RTL output, Copy and account persistence on a Xiaomi Redmi Note 11 Pro using Expo Go. Standalone APK compilation/launch, native release-policy enforcement and production HTTPS remain unverified. See the [testing summary](../docs/testing.md) for automated results and limitations.

## Prerequisites and versions

Use Node 24 LTS with npm, an SDK-58-compatible [Expo Go](https://expo.dev/go), Android platform-tools/ADB, and an authorized USB-debugging device. Install Node independently from its [official distribution](https://nodejs.org/en/download); local tool binaries are not included. Android Studio/SDK build tools are needed only for an emulator or native build.

| Package | Pinned version |
| --- | --- |
| Expo | 58.0.24 |
| React Native / React | 0.88.1 / 19.3.0 |
| TypeScript / React types | 6.0.3 / 19.3.0 |
| expo-secure-store | 58.0.3 |
| expo-clipboard | 58.0.4 |
| expo-status-bar / expo-system-ui | 58.0.5 / 58.0.7 |
| react-native-safe-area-context | 5.11.1 |
| expo-doctor | 1.21.8 |

The package-lock preserves dependency resolution. Expo Doctor currently reports one patch expectation mismatch: installed Expo 58.0.24 versus expected ~58.0.25. Three moderate npm advisory entries remain; no forced downgrade or compatibility-check suppression was applied.

## Install and run with Expo Go

Keep Liberty running on Windows `127.0.0.1:9080` with its Gemini and translator account environment configured. Do not put credentials in app.json, EXPO_PUBLIC variables or source code.

From the repository root:

```powershell
cd mobile-client
npm ci
npm start -- --go
```

In another terminal, select an authorized phone and configure both reverse routes:

```powershell
adb devices -l
# From mobile-client; replace SERIAL with the authorized device serial.
pwsh -File scripts/reverse-android.ps1 -Serial SERIAL
adb -s SERIAL reverse --list
adb -s SERIAL shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8082
```

The helper checks the device state, establishes 9080→9080 for the API and 8082→8082 for Metro, and verifies the route listings. Reapply after reconnection or restart. The individual reverse routes were used in the verified physical-phone setup. A listed route alone does not prove connectivity: the app must show **Local service online**. Health checks contain no credentials and do not establish Gemini readiness.

Open app Settings, enter the existing translator account, tap Save and wait for confirmation. Enter English text and tap Translate. The app supports up to 5,000 Unicode code points, displays Arabic output right to left, and provides Copy, Clear and Forget account. New translations cancel or ignore older requests. There are no automatic retries.

Expo Go is the verified runtime. Its own networking policy applies; it does not apply this project's native configuration plugin. Keep the Java service bound to loopback; do not expose it through LAN HTTP or public tunnels. Remove only this project's mappings when finished:

```powershell
adb -s SERIAL reverse --remove tcp:9080
adb -s SERIAL reverse --remove tcp:8082
```

## Optional native debug build — not verified

Install the Android SDK/toolchain following [Expo's Android guide](https://docs.expo.dev/workflow/android-studio-emulator/), then run from mobile-client:

```powershell
npx expo prebuild --platform android --no-install
npm run android
# For multiple devices:
# npx expo run:android --device --port 8082
```

Use the same ADB routes. Avoid starting duplicate Metro processes. `plugins/withLoopbackNetwork.cjs` generates a main/release policy denying cleartext HTTP and a debug-only policy permitting localhost/127.0.0.1. Application code fixes the API port to 9080; Metro uses 8082. Generated resource contents were inspected, but native runtime enforcement and APK execution have not been verified. The release configuration requires a separately reviewed HTTPS deployment design before translation can work remotely.

## Security and transport

The native adapter uses [Expo Fetch](https://docs.expo.dev/versions/latest/sdk/expo/) with redirect rejection, omitted cookies and a fixed local destination. Requests have a 55-second deadline, allowing margin for the backend's 45-second provider timeout. HTTP status, malformed responses and missing/invalid credentials produce safe messages. Actual native redirect behavior has not been exhaustively tested.

SecureStore keeps the account in device-protected storage when available. The masked password field is not prefilled and is cleared after saving/backgrounding. If SecureStore is unavailable, the UI explicitly identifies a session-memory fallback. Storage errors are reported; writes are serialized so Forget cannot race Save. No AsyncStorage, plaintext credential files or credential logs are used. Privileged device/debugger access remains a limitation. See [SecureStore documentation](https://docs.expo.dev/versions/latest/sdk/securestore/).

Native configuration removes unnecessary microphone, overlay, shared-storage and vibration permissions. These build-time settings do not change Expo Go's permissions. The application has no microphone or speech-to-speech feature.

## Tests and troubleshooting

From mobile-client:

```powershell
npm test
npm run typecheck
npm run doctor
npm audit
```

Tests cover validation, UTF-8 Basic encoding, safe HTTP errors, timeout/cancellation, response validation, account storage operations and native configuration generation. Mocked tests do not replace physical-device verification.

- Offline: check Liberty health, USB authorization and both ADB routes. Only one Metro instance should occupy 8082.
- HTTP 401: check exact, case-sensitive account values and wait for Save confirmation. Re-save if needed. An earlier 401 could no longer be reproduced after account re-saving; its original cause was not established.
- HTTP 403: check the backend role mapping; never disable authentication.
- HTTP 502/503/504: inspect safe backend diagnostics for provider/network/quota/timeouts.
- Wrong Expo runtime: install a compatible Expo Go version; a web preview is not equivalent to the tested Android runtime.

Further manual checks include incorrect credentials, backend offline state, app restart, rapid submissions, failed storage and clipboard denial. These are recommended regression scenarios, not a claim that every device/error path was observed.
