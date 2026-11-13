<?php
// Explicit opt-in diagnostic. Credentials are read only from the server environment.
declare(strict_types=1);
require_once __DIR__ . '/../src/TranslatorClient.php';
$client = new TranslatorClient();
echo 'Backend: ' . ($client->health() ? 'Online' : 'Offline') . PHP_EOL;
if (($argv[1] ?? '') !== '--translate') { exit(0); }
try {
    $result = $client->translate('How are you today?');
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . PHP_EOL;
} catch (ClientError $e) {
    fwrite(STDERR, $e->getMessage() . PHP_EOL); exit(1);
}
