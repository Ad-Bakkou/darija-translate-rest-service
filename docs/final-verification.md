# Step 8 local submission preparation — 2026-11-13

## Results and provenance

Application source and configuration were left unchanged. No Gemini call was made during this step. Prior live successes across all four clients, Android RTL/Copy and SecureStore persistence are historical user-confirmed observations, not fresh Step 8 device tests. No phone was connected during this inspection.

| Check | Fresh result | Exit code |
| --- | --- | --- |
| Maven verify | 92 passed: 65 unit + 27 isolated Liberty HTTP integration; 0 failures/errors/skips | 0 |
| Chrome Node tests | 51 passed; 0 failed/skipped | 0 |
| Python unittest | 13 passed; 0 failed/skipped | 0 |
| PHP assertions | 40 passed | 0 |
| PHP lint | Six files, no syntax errors | 0 each |
| Mobile Node tests / test compilation | 47 passed; 0 failed/skipped | 0 |
| TypeScript | No type errors | 0 |
| Expo Doctor | **19/20 passed**, one patch mismatch: expects ~58.0.25, installed 58.0.24 | 1 |
| npm audit | 3 moderate; 0 high/critical | 1 |

The earlier Step 7 20/20 Doctor result remains historical. Online package expectations changed. No dependency upgrade, force downgrade or exclusion was applied to hide the new finding. Native APK and production HTTPS remain unverified; the original mobile 401 cause remains unproven.

Maven's first sandbox attempt failed with socket permission errors (25 fixture-test errors); rerunning with approved local socket/process access succeeded. Doctor's first sandbox run passed 18/20 with DNS/metadata access failures; its approved online run produced the authoritative 19/20 result above. These environment failures are not omitted or presented as application passes. The successful Maven run took 1 minute 16 seconds and completed at 14:01:34 America/Los_Angeles.

## Exact commands and local tool resolution

Commands ran from the repository root, except npm commands in mobile-client. PowerShell variable resolution avoided copying private machine paths into submission documentation:

```powershell
$mvn = Get-ChildItem "$env:USERPROFILE\.m2\wrapper\dists\apache-maven-3.9.11" -Recurse -Filter mvn.cmd | Select-Object -First 1 -ExpandProperty FullName
# Local cache was the .maven-repository directory alongside this repository.
$cache = Join-Path (Split-Path $PWD) '.maven-repository'
& $mvn -B -f backend/pom.xml "-Dmaven.repo.local=$cache" verify
$env:PATH = "$PWD\.tools\node-v24.22.3-win-x64;$env:PATH"
node --test chrome-extension/tests/*.test.js
& python-client/.venv/Scripts/python.exe -m unittest discover -s python-client/tests -v
& .tools/php/php.exe php-client/tests/run.php
Get-ChildItem php-client -Recurse -Filter *.php | ForEach-Object { & .tools/php/php.exe -l $_.FullName }
Push-Location mobile-client
npm.cmd test
npm.cmd run typecheck
npm.cmd run doctor
npm.cmd audit --json
Pop-Location
```

Raw output is retained locally in ignored `docs/step8-*.log`, including initial sandbox failures. `step8-npm-audit.json` is shareable dependency metadata. The README gives equivalent commands with independently installed tools on PATH; ignored .tools binaries and dependency directories are not required package contents. Tests use fixture servers and generated test accounts, never live Gemini. Maven uses a separate security-runtime/user directory and ephemeral HTTP port; the existing production server was not stopped or reconfigured.

## Artifact validation and review

Both UML PNGs were opened and visually inspected again; class 2980×1422, deployment 3306×1532. SVG XML parsing and image signatures passed. All 14 Java type names remain represented. The API reference was rechecked against TranslationRequest, GeminiTranslationService, SecurityConfiguration, TranslatorIdentityStore and server.xml: Unicode limit, exact account matching, loopback binding and upstream HTTP mappings match. Mandatory source directories contain implementation files, not placeholders.

The root README and supporting Markdown relative links were checked. A fresh-machine dependency installation and complete live replay were not performed, so reproducibility is supported by source/manifests/setup instructions, not claimed as a fresh-device test.

## Security and file review

The pre-stage candidate inventory contained the application, tests, documentation, UML and icons. Pattern scanning covered API keys, Basic tokens, private keys, GitHub tokens and embedded URL credentials. Manual review included environment examples, production server configuration, credential loading/storage in all clients, authentication, helper scripts and documentation. Literal test credentials are deliberately synthetic fixtures; the Basic value in the malformed-header test encodes no account. .env.example has empty key/username/password fields. No suspected real credential was found in submission candidates.

Image review found only four generated Chrome icons and two UML PNGs; no screenshots/browser dumps. Icons have no text/EXIF metadata. UML metadata contains renderer attribution and the public diagram source, reviewed and scanned after decompression. There is no private-path metadata in those exports. No candidate file is over 1 MB.

Ignored local material includes the temporary mobile-auth relay, tool downloads, caches, runtime logs/configuration, IDE settings and generated builds. These were excluded by path rather than printed or archived. No values from real environment variables, browser storage or SecureStore were read. Ignore rules additionally cover root dist, MP4 recordings, packet/browser captures and certificate files. The archive script also uses an allowlist and committed Git blobs, so ignored directories cannot be pulled in by recursively zipping the working tree.

This is a reviewed submission-content audit, not a claim that every ignored local file or every possible secret format is safe. No external secret-scanning SaaS was used. Git author identity remains the existing configured identity; review its email locally before public publication.

## Git, package and pending external work

The starting branch was master with no commits and no remotes. Step 8 authorizes an accurate initial local commit after index audit. Use `git log -1 --oneline` for the resulting commit, and `dist/staged-inventory.json` for the reviewed index inventory. The package script reads that committed snapshot, validates required/excluded paths and credential patterns, writes a deterministic source ZIP, checks CRCs, extracts to a temporary local directory and compares every byte. `dist/submission-manifest.json` records the actual commit, file inventory, ZIP size and SHA256 after execution; the adjacent .sha256 file records the digest without a self-referential checksum in these source documents.

Reproduction after a clean reviewed commit:

```powershell
python docs/package-submission.py --audit-index
python docs/package-submission.py
Get-FileHash dist/DarijaTranslate-MiniProject2-Submission.zip -Algorithm SHA256
```

The source-only package intentionally has no MP4 or verified published repository URL. Publishing is blocked pending explicit approval for Ad-Bakkou/darija-translate-rest-service, proposed public visibility, and authentication to Ad-Bakkou. GitHub CLI is not installed at its usual path or on PATH; the connected GitHub integration is a different account and will not be used. See [publication instructions](github-publication.md).

The supplied deadline was November 12, 2026 at 11:59 PM; this preparation is dated November 13 in America/Los_Angeles. Confirm the course timezone and late-submission policy yourself. No university upload or extension request was made.
