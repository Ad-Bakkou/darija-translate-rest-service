<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/TranslatorClient.php';
require_once __DIR__ . '/../src/Web.php';
$passed = 0;
function check(bool $condition): void {
    global $passed;
    if (!$condition) { throw new RuntimeException('Assertion failed'); }
    $passed++;
}
function fails(callable $fn): void {
    try { $fn(); } catch (ClientError $e) { check(!str_contains($e->getMessage(), 'SECRET')); return; }
    throw new RuntimeException('Expected safe client error');
}
foreach (['', " \n\u{2003}", str_repeat('😀', 5001), "\xFF", [], null] as $text) {
    fails(fn() => TranslatorClient::validateText($text));
}
check(TranslatorClient::validateText(str_repeat('😀', 5000)) === str_repeat('😀', 5000));
check(TranslatorClient::validateText(' Hello ') === ' Hello ');
$response = ['originalText' => 'Hello', 'translatedText' => 'مرحبا', 'sourceLanguage' => 'English', 'targetLanguage' => 'Moroccan Darija'];
check(TranslatorClient::decode(200, json_encode($response), 'Hello') === $response);
foreach ([400,401,403,422,429,502,503,504,500,302,307] as $status) {
    fails(fn() => TranslatorClient::decode($status, 'SECRET', 'Hello'));
}
foreach (['SECRET', 'null', '[]', '{}'] as $body) { fails(fn() => TranslatorClient::decode(200, $body, 'Hello')); }
foreach (['', ' ', 7, null] as $value) {
    fails(fn() => TranslatorClient::decode(200, json_encode(array_replace($response, ['translatedText' => $value])), 'Hello'));
}
fails(fn() => TranslatorClient::decode(200, json_encode($response), 'Different'));
check(escape('<script>"&\'') === '&lt;script&gt;&quot;&amp;&#039;');
check(escape('مرحبا') === 'مرحبا');
check(validCsrf(str_repeat('a',64), str_repeat('a',64)));
check(!validCsrf(str_repeat('b',64), str_repeat('a',64)));
check(!validCsrf(null, str_repeat('a',64)));
check(!validCsrf([], str_repeat('a',64)));
check(!validCsrf('', ''));
$savedUser = getenv('TRANSLATOR_USERNAME'); $savedPass = getenv('TRANSLATOR_PASSWORD');
try {
    putenv('TRANSLATOR_USERNAME'); putenv('TRANSLATOR_PASSWORD'); fails(fn() => Configuration::credentials());
    putenv('TRANSLATOR_USERNAME=test'); fails(fn() => Configuration::credentials());
    putenv('TRANSLATOR_PASSWORD=fixture-only'); check(Configuration::credentials() === ['test','fixture-only']);
    putenv('TRANSLATOR_USERNAME=bad:name'); fails(fn() => Configuration::credentials());
} finally {
    putenv($savedUser === false ? 'TRANSLATOR_USERNAME' : 'TRANSLATOR_USERNAME=' . $savedUser);
    putenv($savedPass === false ? 'TRANSLATOR_PASSWORD' : 'TRANSLATOR_PASSWORD=' . $savedPass);
}
echo "$passed assertions passed\n";
