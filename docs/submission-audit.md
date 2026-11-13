# Step 7 submission audit — 2026-11-11

Historical audit. See the [Step 8 current audit and packaging report](final-verification.md) for the final local commit/package and updated Doctor result.

This is a local readiness review, not publication or a security certification. Application source/configuration was preserved: SHA-256 comparison against the pre-documentation snapshot found no changed application files across the backend and four clients.

## Git and sensitive material

At the final audit, the project had **zero tracked files and zero staged paths**. Therefore `.gitignore` alone is not evidence of a prepared submission. Review the candidate files before a future explicit staging/publication step. No files were staged, committed or pushed during Step 7.

The candidate-file scan found no Google API key patterns, private-key blocks or literal Authorization Basic tokens. Eleven literal-credential candidates were reviewed: all were synthetic test fixtures or a randomly generated offline wire-test account. No real credentials were identified. Author-specific Windows paths and account names were removed from shareable documentation. Environment variables, SecureStore contents and live Authorization headers were not dumped. Pattern scanning cannot prove the absence of every possible secret.

No candidate file exceeded 1 MB. Both mandatory diagrams have source and compact exports. Local test logs are ignored; verification results are summarized in [verification.md](verification.md). The npm audit JSON contains dependency/advisory metadata and is retained as evidence.

| Material | Treatment |
| --- | --- |
| `.env`, `.env.*`, `server.env` | Ignored; `.env.example` intentionally included, without real credentials |
| Backend `target/`, logs | Ignored generated/runtime files |
| `node_modules/`, `.expo/`, `.test-build/`, native generated mobile directories | Ignored; restore using documented commands |
| `.venv/`, Python caches | Ignored; restore using requirements |
| `.tools/`, `.browser-testing/` | Ignored local tooling; README specifies independently installable prerequisites |
| IDE folders, private-key files | Ignored |
| Android `local.properties`, keystores, signing containers | Added ignore coverage; never part of submission |
| `submission-output/` | Ignored; no submission archive created |
| UML `.puml`, `.svg`, `.png`, lockfiles | Intentionally eligible for submission |

Safe review commands from the repository root:

```powershell
git status --short
git ls-files
git diff --cached --stat
git ls-files --others --exclude-standard
git ls-files --others --ignored --exclude-standard
git check-ignore backend/target mobile-client/node_modules python-client/.venv .tools
```

Review output locally before sharing it. Ignoring files does not remove previously committed secrets; no tracked files were present in this project audit. A future ZIP must explicitly exclude ignored/local material instead of compressing the entire working directory.

## Outstanding dependency and deployment limitations

`npm audit --json` returned **three moderate entries** in the Expo → `@expo/fingerprint` → `minimatch` advisory chain, including GHSA-g3hv-75wg-m249. These are audit entries in one dependency chain, not evidence of three independent attacks. The suggested force fix would downgrade Expo to SDK 52; it was not applied to the working SDK 58 app. Reassess an upstream compatible update separately; do not claim a vulnerability-free dependency tree.

Expo Doctor passed 20/20 checks. Physical Android Expo Go operation is user-confirmed; a standalone native APK and production HTTPS deployment remain unverified. Basic authentication is supported only on the documented local loopback/ADB development route; network deployment requires HTTPS and a separate security review.

PlantUML 1.2026.10 was downloaded from its official release, with SHA-256 checked against release metadata. Graphviz 2.44.1 was available through the Windows PlantUML runtime. Java, Maven, Node, PHP and PlantUML are external prerequisites, not vendored submission dependencies. See [UML reproduction instructions](uml/README.md).

Remaining deliverables are listed in [submission-checklist.md](submission-checklist.md). GitHub publication, final video, submission ZIP and LMS upload require the next explicitly authorized step.
