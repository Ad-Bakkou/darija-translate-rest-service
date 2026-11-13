<?php
declare(strict_types=1);
function escape(string $text): string
{
    return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
function validCsrf(mixed $actual, mixed $expected): bool
{
    return is_string($actual) && is_string($expected) && strlen($expected) === 64 && hash_equals($expected, $actual);
}
