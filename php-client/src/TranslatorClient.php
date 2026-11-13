<?php
declare(strict_types=1);
require_once __DIR__ . '/Configuration.php';

final class TranslatorClient
{
    public static function validateText(mixed $text): string
    {
        if (!is_string($text) || preg_match('//u', $text) !== 1) {
            throw new ClientError('Enter valid Unicode English text.');
        }
        if (preg_match('/\S/u', $text) !== 1) {
            throw new ClientError('Enter nonblank English text.');
        }
        if (preg_match_all('/./us', $text) > 5000) {
            throw new ClientError('Text must contain at most 5,000 Unicode code points.');
        }
        return $text;
    }

    public static function decode(int $status, string $body, string $original): array
    {
        if ($status >= 300 && $status < 400) {
            throw new ClientError('Backend redirect rejected. Check the local server configuration.');
        }
        if ($status !== 200) {
            throw new ClientError(match ($status) {
                400 => 'The backend rejected the input.',
                401 => 'The server translator credentials are incorrect or missing.',
                403 => 'The server account does not have the translator role.',
                422 => 'The provider could not translate this text.',
                429 => 'Rate limit reached. Try again later.',
                502 => 'Translation provider failed.',
                503 => 'Translation provider is unavailable or rate-limited.',
                504 => 'Translation provider timed out.',
                default => 'Unexpected backend HTTP error.'
            });
        }
        try {
            $data = json_decode($body, true, 32, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new ClientError('The backend returned invalid JSON.');
        }
        if (!is_array($data) || ($data['originalText'] ?? null) !== $original
            || ($data['sourceLanguage'] ?? null) !== 'English'
            || ($data['targetLanguage'] ?? null) !== 'Moroccan Darija'
            || !is_string($data['translatedText'] ?? null)
            || preg_match('/\S/u', $data['translatedText']) !== 1) {
            throw new ClientError('The backend returned an invalid or empty translation.');
        }
        return array_intersect_key($data, array_flip(['originalText', 'translatedText', 'sourceLanguage', 'targetLanguage']));
    }

    private function request(string $path, ?array $payload = null): array
    {
        if (!extension_loaded('curl')) {
            throw new ClientError('Enable the PHP cURL extension and restart the PHP server.');
        }
        $options = [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => $payload === null ? 5 : 55,
            CURLOPT_PROXY => '', CURLOPT_PROTOCOLS => CURLPROTO_HTTP,
            CURLOPT_HTTPHEADER => ['Accept: application/json']];
        if ($payload !== null) {
            [$username, $password] = Configuration::credentials();
            $options += [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($payload, JSON_THROW_ON_ERROR),
                CURLOPT_HTTPAUTH => CURLAUTH_BASIC, CURLOPT_USERPWD => $username . ':' . $password];
            $options[CURLOPT_HTTPHEADER][] = 'Content-Type: application/json';
        }
        $handle = curl_init(Configuration::BASE_URL . $path);
        try {
            curl_setopt_array($handle, $options);
            $body = curl_exec($handle);
            if ($body === false) {
                throw new ClientError(curl_errno($handle) === CURLE_OPERATION_TIMEDOUT
                    ? 'The request timed out. Check the backend and try again.'
                    : 'Cannot connect to the local backend. Start Open Liberty and try again.');
            }
            return [(int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE), $body];
        } finally {
            curl_close($handle);
        }
    }

    public function health(): bool
    {
        try {
            [$status, $body] = $this->request('/api/health');
            return $status === 200 && json_decode($body, true) === ['status' => 'UP'];
        } catch (ClientError) {
            return false;
        }
    }

    public function translate(mixed $text): array
    {
        $text = self::validateText($text);
        [$status, $body] = $this->request('/api/translate', ['text' => $text, 'sourceLanguage' => 'English']);
        return self::decode($status, $body, $text);
    }
}
