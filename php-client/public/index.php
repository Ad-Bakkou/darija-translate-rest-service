<?php
declare(strict_types=1);
ini_set('display_errors', '0');
require_once __DIR__ . '/../src/TranslatorClient.php';
require_once __DIR__ . '/../src/Web.php';
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
if (!preg_match('/^(127\.0\.0\.1|localhost)(:\d+)?$/D', $_SERVER['HTTP_HOST'] ?? '')) {
    http_response_code(400); exit('Use the local PHP server address.');
}
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if (!in_array($method, ['GET', 'POST'], true)) {
    header('Allow: GET, POST'); http_response_code(405); exit('Method not allowed.');
}
session_start(['use_strict_mode' => 1, 'use_only_cookies' => 1,
    'cookie_httponly' => true, 'cookie_samesite' => 'Strict', 'cookie_secure' => false]);
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));
$csrf = $_SESSION['csrf'];
session_write_close();
$text = $method === 'POST' && is_string($_POST['text'] ?? null) ? $_POST['text'] : '';
$translation = null; $error = ''; $client = new TranslatorClient();
try {
    Configuration::credentials();
    if ($method === 'POST') {
        if (!validCsrf($_POST['csrf'] ?? null, $csrf)) {
            http_response_code(403); throw new ClientError('This form expired or is invalid. Reload the page and try again.');
        }
        $text = is_string($_POST['text'] ?? null) ? $_POST['text'] : '';
        $translation = $client->translate($text);
    }
} catch (ClientError $e) {
    $error = $e->getMessage();
} catch (Throwable) {
    $error = 'The PHP application could not complete this request. Check its local configuration.';
}
$online = $client->health();
?>
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DarijaTranslate</title><link rel="stylesheet" href="assets/style.css"><script src="assets/app.js" defer></script></head>
<body><main><header><span class="eyebrow">YOUR WORDS, IN DARIJA</span><h1>DarijaTranslate<span>↗</span></h1>
<p>English to Moroccan Darija · PHP client</p><p class="status"><?= $online ? '● Local backend online' : '○ Local backend unreachable' ?></p></header>
<section><form method="post" id="translate-form"><input type="hidden" name="csrf" value="<?= escape($csrf) ?>">
<label for="text">English text</label><textarea id="text" name="text" rows="7" required placeholder="Write or paste something in English…" aria-describedby="count"><?= escape($text) ?></textarea>
<div class="row"><small id="count">Up to 5,000 Unicode code points</small><button type="submit" id="translate">Translate to Darija ↗</button></div></form></section>
<p id="feedback" role="status" aria-live="polite" class="<?= $error !== '' ? 'error' : '' ?>"><?= escape($error) ?></p>
<section aria-labelledby="result-title"><div class="row"><h2 id="result-title">Moroccan Darija</h2><button id="copy" type="button" <?= $translation === null ? 'disabled' : '' ?>>Copy translation</button></div>
<?php if ($translation !== null): ?>
<p id="result" dir="rtl" lang="ar-MA"><?= escape($translation['translatedText']) ?></p>
<details><summary>Original English text</summary><p class="original"><?= escape($text) ?></p></details>
<?php else: ?><p class="empty">Your translation will appear here.</p><?php endif; ?></section>
<footer>Credentials stay on the PHP server. Translation is provided by your local Java service.</footer></main></body></html>
