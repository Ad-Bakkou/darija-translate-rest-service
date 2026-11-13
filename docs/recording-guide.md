# Recording guide — preparation verified, capture pending

Observed 2026-11-13: Windows Snipping Tool (ScreenSketch 11.2608.41.0) and Clipchamp 4.7.10220.0 are installed. OBS, scrcpy and ffmpeg were not found on PATH; OBS was also absent from its usual Program Files directory. No packages were installed. ADB is available, but `adb get-state` reported no connected device/emulator. Therefore microphone, phone capture, final export and playback have NOT been verified in this step.

## Windows capture

Use the installed Snipping Tool: select its video mode, choose New, select only the clean demo area and enable the intended microphone. Windows+Shift+R is the documented recording shortcut. Record a ten-second rehearsal first and play it back to verify mic permission, intelligibility and capture area. Close unrelated applications and notification banners. Use a 1920×1080 desktop/capture area if the display supports it, or a smaller readable capture rather than artificially enlarging blurry text. Increase terminal/editor text size. Avoid selecting a region that includes credentials or private browser tabs. [Microsoft recording guidance](https://www.microsoft.com/en-us/windows/learning-center/how-to-record-screen-windows-11).

Use Clipchamp for simple cuts and the phone segment, with only your own recordings and no paid stock assets. Set a 16:9 project, preserve readable portrait phone footage with side margins, and export 1080p MP4 when available. A free personal account supports 1080p without premium assets; 4K is unnecessary. Sign-in availability and actual export still need checking on this machine. [Microsoft editing guide](https://support.microsoft.com/en-us/clipchamp/how-to-edit-a-video-in-clipchamp), [official 1080p/free-plan note](https://clipchamp.com/en/blog/save-4K-video-in-Clipchamp/).

## Physical Android capture — must test after reconnecting

No tested mirroring application is currently available. Use Android's documented ADB `screenrecord` for a short genuine phone clip, then import it into Clipchamp. This records the device screen rather than a simulated mobile UI. These commands are a procedure, not an executed success claim:

```powershell
# ADB must be on PATH; replace SERIAL with your authorized phone's serial.
adb devices -l
pwsh -File mobile-client/scripts/reverse-android.ps1 -Serial SERIAL
adb -s SERIAL shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8082
New-Item -ItemType Directory -Force dist/recordings | Out-Null
# First rehearse a 10-second non-sensitive clip and inspect it:
adb -s SERIAL shell screenrecord --time-limit 10 /sdcard/darija-capture-check.mp4
adb -s SERIAL pull /sdcard/darija-capture-check.mp4 dist/recordings/
# Only after rehearsal succeeds, record the actual mobile demonstration:
adb -s SERIAL shell screenrecord --time-limit 60 /sdcard/darija-mobile.mp4
adb -s SERIAL pull /sdcard/darija-mobile.mp4 dist/recordings/
```

Keep the phone portrait orientation fixed and its Settings/password fields closed. On the phone, demonstrate Online, translation and Copy during the recording. Do not request a new live translation merely for the ten-second capture rehearsal. Standard ADB screenrecord does not record audio and is limited to three minutes, sufficient for this 45-second segment. Add your spoken narration in the edit, identifying the footage as recorded on the real phone. Some device encoders may need a smaller `--size`; test rather than assuming support. [Android's official screenrecord documentation](https://developer.android.com/tools/adb#screenrecord).

If the device cannot record through ADB, try its built-in screen recorder and transfer the genuine MP4 over USB, or film the physical screen using another camera. Those alternatives are not tested here. Do not claim that a rendered mockup or emulator is this physical device.

## Security and final export

Configure credentials before capturing. Never show shell environment dumps, Authorization values, SecureStore contents, IDE environment settings or backend diagnostic captures. Hide Windows and phone notification previews; review the whole recording for accidental disclosure. If a secret appears, remove that segment and re-record; do not rely on a small blur that may miss frames. Rotate any secret that was actually shared publicly.

Save the final file as `dist/recordings/DarijaTranslate-Demo.mp4`. Open it in Windows Media Player, play from start to finish with sound, and check Explorer Properties → Details for duration and frame dimensions. Confirm about five minutes (or the professor's precise limit), MP4 playback, readable source/result text, synchronized narration and no unreviewed frames. Keep raw footage locally and out of Git. A file extension alone is not proof of a playable video.

The source packaging script intentionally excludes all MP4 files. If the professor accepts video separately, deliver the checked MP4/link separately and update submission metadata before regenerating the source ZIP. If the professor requires video inside one ZIP, first verify the real MP4 and extend the package's reviewed allowlist explicitly; the current script will not silently include it. Never add a dummy video.
