# Python and PHP setup

Run commands from your repository root. Keep the existing Java server bound to 127.0.0.1:9080. Do not restart it merely to start a client. The verified runtime model is gemini-3.5-flash-lite, supplied to Liberty through GEMINI_MODEL; the backend source fallback remains unchanged. Clients neither select a model nor receive the Gemini key.

## Credentials in PowerShell

Environment values are process-specific. A new terminal needs the same existing translator account entered again. This does not create/change the Java account. Enter passwords securely, never as literal command arguments:

```powershell
$env:TRANSLATOR_USERNAME = Read-Host 'Existing translator username'
$clientSecret = Read-Host 'Existing translator password' -AsSecureString
$env:TRANSLATOR_PASSWORD = [Net.NetworkCredential]::new('', $clientSecret).Password
Remove-Variable clientSecret
```

Do not echo these variables or include secrets in logs. Python can prompt directly instead. PHP must inherit them when its server starts. Neither client loads .env automatically. Use a separate terminal for PHP and Liberty. Remove client variables when finished:

```powershell
Remove-Item Env:TRANSLATOR_USERNAME, Env:TRANSLATOR_PASSWORD -ErrorAction SilentlyContinue
```

## Python

```powershell
python -m venv python-client/.venv
python-client/.venv/Scripts/python.exe -m pip install -r python-client/requirements.txt
python-client/.venv/Scripts/python.exe -m unittest discover -s python-client/tests -v
python-client/.venv/Scripts/python.exe python-client/main.py --health
python-client/.venv/Scripts/python.exe python-client/main.py
# One explicit live translation:
python-client/.venv/Scripts/python.exe python-client/main.py --text "How are you today?" --json
```

Tested Python 3.12.8 and requests 2.34.2, installed in the isolated virtual environment. Runtime dependency versions are resolved by pip; only Requests is a direct dependency. Reference: [Requests documentation](https://requests.readthedocs.io/en/latest/user/advanced/).

## Standalone PHP on Windows

Use PHP 8.x with cURL, JSON and sessions enabled. The tested Windows runtime is PHP 8.4.27, NTS Visual C++ 2022 x64 (distribution 8.4.27-1). The following optional recipe installs it locally without requiring pre-existing tool binaries.

Download the official x64 NTS ZIP from [PHP Windows downloads](https://www.php.net/downloads.php?os=windows&version=8.4). The verified distribution used here:

```powershell
New-Item -ItemType Directory -Force .tools/php | Out-Null
Invoke-WebRequest 'https://downloads.php.net/~windows/releases/archives/php-8.4.27-1-nts-Win32-vs17-x64.zip' -OutFile .tools/php.zip
if ((Get-FileHash .tools/php.zip -Algorithm SHA256).Hash -ne 'dbae154a0a89791f36c3d48e68bae797878333e7d6cb5721e74617de59b63ab7') { throw 'PHP checksum mismatch' }
Expand-Archive .tools/php.zip -DestinationPath .tools/php -Force
$phpExtensionPath = (Resolve-Path .tools/php/ext).Path
('extension_dir="' + $phpExtensionPath + '"' + "`nextension=curl`ndisplay_errors=Off`nlog_errors=On") | Set-Content .tools/php/php.ini
.tools/php/php.exe -v
.tools/php/php.exe -m
```

The Visual C++ 2015–2022 x64 redistributable is required by this official build; if Windows reports a missing runtime DLL, install the prerequisite linked from PHP's download page. `.tools/` is ignored; rebuild php.ini after moving the project because its extension_dir is absolute.

```powershell
Get-ChildItem php-client -Recurse -Filter *.php | ForEach-Object { & .tools/php/php.exe -l $_.FullName }
.tools/php/php.exe php-client/tests/run.php
.tools/php/php.exe php-client/tests/live.php
# One explicit live translation through PHP cURL:
.tools/php/php.exe php-client/tests/live.php --translate
# Check availability first; if occupied, stop your old PHP server or choose another loopback port.
Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
.tools/php/php.exe -S 127.0.0.1:8081 -t php-client/public
```

Visit http://127.0.0.1:8081. Keep this terminal open; Ctrl+C stops PHP. Never bind 0.0.0.0 for this local demonstration. A successful `--translate` verifies the PHP HTTP client, while a successful form submission also verifies the browser-to-PHP path.

## Repeatable integration checks without Gemini credits

```powershell
python-client/.venv/Scripts/python.exe docs/test-client-contracts.py --php .tools/php/php.exe
python-client/.venv/Scripts/python.exe docs/check-client-auth.py --php .tools/php/php.exe
node --test chrome-extension/tests/*.test.js
mvn -B -f backend/pom.xml verify
```

The contract script starts a loopback HTTP stub and PHP server on ephemeral ports. It copies the clients into a temporary directory and substitutes only the fixed endpoint in those copies; production code/configuration stays unchanged. It checks real Python Requests and PHP cURL traffic, CLI JSON, PHP form success, escaping, CSRF, methods, Host restriction and HTTP errors. Generated fixture credentials and translations are test-only; this is not Gemini verification. Child server and temporary copies are cleaned up.

The authentication check uses the actual Java endpoint: public health and random invalid credentials must produce 401 in both clients. It does not exercise successful authentication or call Gemini. Existing Maven tests cover successful authentication using their test-only translation service. These local-server tests require permission to bind and connect to loopback ports.

## Manual acceptance and repeatable regression checks

- Run one Python --text translation with the real local account; confirm Arabic and unchanged original text in --json.
- In interactive Python, translate twice, try blank/overlength input, change credentials with :account, and exit with :quit/Ctrl+C.
- Run PHP live.php --translate with the real local account, then submit the PHP web form. Confirm RTL output, preserved English and Copy.
- Resize the PHP page and use keyboard-only navigation. Verify visible focus and no horizontal overflow.
- In a separate client terminal use deliberately wrong account values and verify 401 feedback. Do not change the running Liberty environment.
- When convenient, stop your own Liberty process and verify both clients' offline feedback, then restart from its original configured terminal. This check temporarily interrupts service.

Real authenticated translations through both clients were previously reported by the project owner. The checklist describes reproducible checks, not a claim that every manual edge case has passed. See [testing](testing.md) for the verified scope.
