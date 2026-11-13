# DarijaTranslate — PHP web client

Native PHP 8.x with cURL; tested with official Windows x64 NTS PHP 8.4.27 (distribution 8.4.27-1). JSON, PCRE and sessions are included in this runtime. No Composer/framework dependency. Only public/ is served; src/ and tests/ are outside the document root.

Install PHP with cURL enabled and place `php` on PATH. See the [client setup guide](../docs/client-setup.md) for a standalone Windows installation.

In a separate PowerShell terminal, from the repository root, set TRANSLATOR_USERNAME and TRANSLATOR_PASSWORD to the existing backend account using the secure prompts documented in the setup guide. Leave Liberty running in its own configured terminal. Confirm port 8081 is free, then:

```powershell
php -v
php -m
php -S 127.0.0.1:8081 -t php-client/public
```

Open http://127.0.0.1:8081, enter English text and Translate. Results display RTL, with an escaped original-text disclosure and Copy button. The counter uses Unicode code points, matching server validation. JavaScript only improves the form's counter/loading/copy behavior; REST requests use server-side PHP cURL. The form also works with JavaScript disabled. Stop PHP with Ctrl+C; restart it after changing its environment. No .env file is automatically loaded.

Credentials never enter HTML, JavaScript, cookies or browser storage. Missing server credentials produce a configuration message. Basic authentication uses CURLAUTH_BASIC/CURLOPT_USERPWD; redirects and environment proxies are disabled. Destination is fixed to 127.0.0.1:9080. Connection timeout: 5 seconds; total translation timeout: 55 seconds. No retries. No CORS changes or Gemini keys in this client.

Security: HTML is escaped with htmlspecialchars; CSRF state uses an unpredictable server-session token and timing-safe comparison; session cookies are HttpOnly/SameSite Strict with strict session IDs. Cookie Secure is false only for this loopback HTTP development server. Responses are no-store and use a restrictive CSP. Only GET/POST and loopback Host names are accepted. User/provider text cannot execute HTML/JS. Passwords remain in the PHP environment, which is accessible to privileged local processes. PHP session storage contains only CSRF state, not credentials or translations.

This is a local single-user development application: anyone with access to its local browser/session can use the server account. Do not publish the PHP built-in server. Network deployment requires HTTPS, Secure cookies, independent user access control and reviewed configuration.

Errors explain offline/network, 400 input, 401 credentials, 403 role, 422 content, 429 rate limit, 502/503 provider, 504 timeout, redirect rejection and malformed/empty responses. Internal exception text/provider bodies are not rendered. Backend online indicates process health only. Use the existing Java diagnostic logs for upstream failures.

```powershell
Get-ChildItem php-client -Recurse -Filter *.php | ForEach-Object { & php -l $_.FullName }
php php-client/tests/run.php
php php-client/tests/live.php
# Explicitly performs one real translation, using server environment credentials:
php php-client/tests/live.php --translate
```

run.php is deterministic and never calls Gemini. live.php without --translate checks only health. See the [client setup guide](../docs/client-setup.md) for offline wire tests and the browser acceptance checklist. Files: public/index.php, public/assets/style.css and app.js; src/Configuration.php, TranslatorClient.php and Web.php; tests/run.php and live.php. No browser visual/copy check or successful live Gemini translation is claimed by these tests.

A real authenticated translation through the PHP application was previously reported by the project owner. The [testing summary](../docs/testing.md) distinguishes automated HTTP checks from live observations; exhaustive visual/accessibility and browser Copy checks are not claimed.
