# DarijaTranslate — Python CLI

Python 3.12 tested; Python 3.10+ supported by the source. Uses requests 2.34.2, argparse and getpass. Run from the repository root in PowerShell:

```powershell
python -m venv python-client/.venv
python-client/.venv/Scripts/python.exe -m pip install -r python-client/requirements.txt
python-client/.venv/Scripts/python.exe python-client/main.py --help
python-client/.venv/Scripts/python.exe python-client/main.py --health
python-client/.venv/Scripts/python.exe python-client/main.py
python-client/.venv/Scripts/python.exe python-client/main.py --text "How are you today?"
python-client/.venv/Scripts/python.exe python-client/main.py --text "How are you today?" --json
```

The last two commands each make one real provider request if authentication succeeds. Start your configured Liberty server first. The destination is fixed to http://127.0.0.1:9080; there is no arbitrary URL option. Health is public and does not establish provider readiness.

Credentials come from TRANSLATOR_USERNAME and TRANSLATOR_PASSWORD, or terminal prompts if either is missing. Password entry uses getpass and refuses an echoing fallback. A new terminal works without inherited credentials: enter the local translator account when prompted. Noninteractive use requires environment credentials. Never pass passwords as CLI arguments. See ../docs/client-setup.md for secure PowerShell environment entry. Interactive commands: :account changes credentials in memory; :quit exits; Ctrl+C/EOF exits cleanly.

The CLI preserves input and validates nonblank, valid Unicode and a 5,000-code-point limit. Requests always specify English. The success output comes only from the backend. Windows stdout/stderr use UTF-8; use Windows Terminal with an Arabic-capable font. Bidirectional rendering quality depends on the terminal.

HTTPBasicAuth receives UTF-8 bytes to avoid Requests' Latin-1 string default. Requests Session disables environment proxies and .netrc discovery, rejects redirects, and uses 5-second connection / 55-second read timeouts (health: 3/5 seconds). The read timeout bounds inactivity, not an absolute total transfer deadline. No retries consume extra provider calls. Credentials are held only in memory/environment, not saved to files. Keep HTTP on loopback; remote deployment needs HTTPS and a reviewed configuration. Environment variables can be inspected by sufficiently privileged local processes.

Errors are safe fixed messages: 400 input, 401 credentials, 403 role, 422 rejected content, 429 rate limit, 502/503 provider, 504 timeout, redirects, network problems, malformed JSON and empty/invalid responses. Provider bodies, credentials and stack traces are not printed for normal failures. --json produces one response/error object; errors exit 1, interruption exits 130. Prompts use stderr. --health exits 0 online or 1 offline.

```powershell
python-client/.venv/Scripts/python.exe -m unittest discover -s python-client/tests -v
```

Tests mock HTTP and never call Gemini. Files: main.py (CLI), translator_client.py (HTTP/validation), requirements.txt and tests/. For wire tests and real-backend acceptance see the [client setup guide](../docs/client-setup.md) and [testing summary](../docs/testing.md). Successful authenticated live translation was previously reported by the project owner.
