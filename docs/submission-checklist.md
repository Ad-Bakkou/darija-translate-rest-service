# Submission checklist and deliverables matrix — Step 8

VERIFIED = checked in the current local preparation; READY = prepared for a later manual action; PENDING = not performed; NOT APPLICABLE = outside this source/Expo Go submission. Previous live results are distinguished from fresh automated tests.

| Required item | Present | Verified | Remaining action / status |
| --- | --- | --- | --- |
| Complete Java Maven project/backend source | Yes | 92 tests, build success | VERIFIED |
| Chrome extension/source/icons | Yes | 51 tests; live workflow historically user-confirmed | VERIFIED source; record demo |
| Python client/requirements | Yes | 13 tests; live translation historically user-confirmed | VERIFIED source; record demo |
| PHP client | Yes | 40 assertions + six syntax checks; live translation historically user-confirmed | VERIFIED source; record demo |
| React Native client | Yes | 47 tests + TypeScript; physical Expo Go historically user-confirmed | VERIFIED source; Doctor patch warning remains |
| UML class source/PNG/SVG | Yes | Syntax/export structure and visual review | VERIFIED |
| UML deployment source/PNG/SVG | Yes | Syntax/export structure and visual review | VERIFIED |
| README/API/setup/verification docs | Yes | Source consistency and relative links reviewed | VERIFIED |
| Git repository | Yes | Local initial commit and index audit; inspect `git log -1` | VERIFIED after final local preparation; never pushed |
| Published GitHub URL | No verified URL | No publication performed | PENDING approval + Ad-Bakkou authentication |
| Actual MP4 demonstration | No | Not recorded | PENDING; detailed script READY |
| Clean source ZIP | Prepared locally under dist | Inventory, CRC, extraction and hashes recorded by packaging script | VERIFIED local package; regenerate after final metadata |
| Final university submission | Not performed | No | PENDING; user only |
| Native APK / production hosting | No | No | NOT APPLICABLE to the current Expo Go/local scope; not verified |

The complete original instructor rubric was not independently supplied in this step. This matrix covers the deliverables explicitly supplied by the student; confirm any required report cover, student identifier, license, video hosting, ZIP naming/size or exact upload format against the actual course rubric. A native APK is not silently substituted for Expo Go or claimed complete.

## Local handoff artifacts

- [Final test/security report](final-verification.md), [API reference](api-reference.md), [historical verification](verification.md).
- [UML sources and exports](uml/README.md).
- [Five-minute narration and screen script](demo-script.md), [recording guide](recording-guide.md).
- [GitHub destination and exact prepared commands](github-publication.md).
- `dist/DarijaTranslate-MiniProject2-Submission.zip`, adjacent `.sha256`, `dist/submission-manifest.json`, and `dist/staged-inventory.json` remain local and ignored by Git. No dummy video exists.

## Final sequence requiring the student

1. Review the actual committed inventory, audit, known limitations and proposed public destination Ad-Bakkou/darija-translate-rest-service. Approve publication explicitly, then authenticate to that account through the approved workflow.
2. After publication succeeds, verify the actual URL and professor access; add that verified URL to submission metadata and commit the documentation update.
3. Reconnect the Android phone, test screen capture and microphone, and record the real five-minute demo. Watch the complete exported MP4 and check privacy, duration, audio and readability.
4. Confirm whether video is delivered separately or inside the archive. The current source ZIP deliberately excludes video. Update metadata and regenerate the ZIP after the verified URL/video status changes; extend the reviewed packaging allowlist only if a real MP4 must be included.
5. Check final checksum, extraction and required files, then personally upload the required ZIP/link/video to the course platform and save the submission receipt. The assistant does not submit to the university.

Known limitations: three moderate npm advisory entries; Expo Doctor 19/20 (58.0.24 vs expected ~58.0.25); native APK/production HTTPS untested; original mobile 401 cause unproven. No working code/model/authentication was changed. The supplied November 12 deadline has passed in the current local timezone; confirm course timezone and late-submission rules without assuming an extension.
