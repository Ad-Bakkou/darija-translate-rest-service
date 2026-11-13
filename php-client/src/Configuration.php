<?php
declare(strict_types=1);

final class ClientError extends RuntimeException {}

final class Configuration
{
    public const BASE_URL = 'http://127.0.0.1:9080';

    public static function credentials(): array
    {
        $username = getenv('TRANSLATOR_USERNAME');
        $password = getenv('TRANSLATOR_PASSWORD');
        if (!is_string($username) || trim($username) === '' || !is_string($password) || trim($password) === '') {
            throw new ClientError('Configure TRANSLATOR_USERNAME and TRANSLATOR_PASSWORD in the PHP server terminal, then restart PHP.');
        }
        if (str_contains($username, ':') || str_contains($username . $password, "\0") || preg_match('//u', $username . $password) !== 1) {
            throw new ClientError('The server translator credentials have an invalid format.');
        }
        return [$username, $password];
    }
}
