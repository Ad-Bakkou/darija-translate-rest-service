# DarijaTranslate — Chrome side panel

Plain JavaScript Manifest V3 extension for the authenticated local Jakarta REST backend. No build, bundler, remote dependencies, injected scripts or Gemini key in the extension.

## Installation and usage

1. Start the existing backend from a terminal with its Gemini and translator environment configuration. Keep it bound to 127.0.0.1:9080. Health UP does not establish Gemini readiness.
2. Use Chrome 116 or newer. Open chrome://extensions, enable Developer mode, choose Load unpacked, and select this chrome-extension directory.
3. Pin DarijaTranslate from Chrome's Extensions menu. Click the toolbar icon to open the panel.
4. In Settings enter the backend translator username/password (never the Gemini key), then save for this session.
5. Enter English text and click Translate, or press Ctrl+Enter (Cmd+Enter on macOS).
6. On a normal HTTP/HTTPS webpage, select English text, right-click and choose Translate to Darija. The panel opens and translates automatically. If credentials are missing, saving them resumes the selected text automatically.
7. Copy the RTL result or use Read aloud and Stop. Clear removes source/result. Forget account removes session credentials.

Restricted Chrome pages/Web Store may not offer the context menu; manual input remains available. Selection alone never triggers translation. Input is preserved and limited to 5,000 Unicode code points.

## Architecture and permissions

- background.js installs the selection menu, configures toolbar behavior and opens the panel immediately during the context-menu gesture.
- pending.js serializes a per-window session mailbox. Selections are consumed once, replaced by newer pending selections and rejected after five minutes when consumed. Window closure clears pending state.
- sidepanel.html/css/js provide the interface, settings, manual/automatic translation, status, copy and speech.
- api.js fixes the loopback destination, encodes UTF-8 Basic authentication, validates responses and enforces a 55-second deadline (45-second backend timeout plus margin).
- settings.js manages trusted-context session credentials. controller.js handles cancellation/stale results, safe rendering and local voice choice.
- icons/ contains real bundled PNG assets; tests/ uses Node's built-in runner.

| Permission | Purpose |
| --- | --- |
| sidePanel | Toolbar/context-menu side panel |
| contextMenus | Explicit selection command using selectionText |
| storage | Session credentials and pending selections |
| http://127.0.0.1/* | Privileged extension fetch to local backend |

No tabs, activeTab, scripting, all_urls or clipboard permission is requested. Host patterns cannot restrict ports; code and CSP restrict API requests to 9080. No localhost alias is configured. Toolbar behavior uses setPanelBehavior only, with no popup. Chrome 116 is required for sidePanel.open: https://developer.chrome.com/docs/extensions/reference/api/sidePanel

## Security and session lifetime

Username/password exist only in chrome.storage.session and transient extension memory, never local/sync storage or logs. Access is restricted to trusted extension contexts. Chrome clears session storage on browser restart or extension reload/update/disable; closing only the panel does not clear it. Use Forget account when finished. Session storage is not a secret vault: local process/debugging access can expose credentials. Official behavior: https://developer.chrome.com/docs/extensions/reference/api/storage

The password field is masked and cleared after saving. Basic authentication goes only to the fixed loopback endpoint; redirects are rejected and cookies omitted. Remote deployment requires HTTPS and a reviewed configuration. Backend authentication and CORS are unchanged. User/provider text is rendered with textContent. Webpages never receive credentials; the extension never calls Gemini directly.

Speech uses only voices reporting localService=true with an Arabic language, preferring ar-MA. No remote/cloud speech fallback is used. Install an offline Arabic OS voice if unavailable. Pronunciation may differ from Moroccan Darija. New text/readings and panel closure cancel speech.

## Tests and troubleshooting

From the repository root (Node.js 20+; no npm install):

```powershell
node --test chrome-extension/tests/*.test.js
mvn -B -f backend/pom.xml verify
```

Or run npm test inside chrome-extension. Automated tests cover manifest/assets, UTF-8 credentials, requests/responses, errors/timeouts, Unicode boundaries, session/mailbox state, gesture ordering, cancellation and safe rendering. They do not replace live Chrome acceptance.

- Service unreachable: start Liberty in its configured terminal; verify http://127.0.0.1:9080/api/health, then Check again. Check the extension host permission too.
- 401: correct translator credentials in Settings. 403: configure the translator role; never bypass security.
- 400: check input. 502/503: provider unavailable or rate-limited. 504/client timeout: provider did not finish. Inspect safe backend diagnostics; requests are not automatically retried.
- No selection: use an HTTP/HTTPS page and the explicit menu command, or paste manually.
- Extension errors: reload from chrome://extensions, then re-enter credentials. Inspect console without logging secrets.
- Clipboard denied: select the displayed result and copy manually. Speech unavailable: install an offline Arabic voice.

Previously reported live checks include loading, side-panel opening, manual translation, right-click source transfer, automatic Gemini translation, Copy and Read aloud. These are project-owner observations, separate from automated tests. See the [testing summary](../docs/testing.md) for scope and limitations.
