"""Read-only production health plus deliberately incorrect authentication; no Gemini call.
Pass --php path/to/php.exe. No real credentials are read or printed.
"""
import argparse
import os
from pathlib import Path
import secrets
import subprocess
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'python-client'))
from translator_client import TranslatorClient, ClientError
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--php', required=True)
args = parser.parse_args()
client = TranslatorClient()
try:
    assert client.health(), 'Java health is not UP'
    try:
        client.translate('How are you today?', 'invalid-' + secrets.token_hex(16), secrets.token_urlsafe(32))
        raise AssertionError('Invalid credentials unexpectedly accepted')
    except ClientError as error:
        assert str(error) == 'Incorrect or missing translator credentials.'
    env = os.environ.copy()
    env.update(TRANSLATOR_USERNAME='invalid-' + secrets.token_hex(16), TRANSLATOR_PASSWORD=secrets.token_urlsafe(32))
    result = subprocess.run([args.php, str(ROOT/'php-client/tests/live.php'), '--translate'],
        env=env, capture_output=True, text=True)
    assert result.returncode == 1 and 'Backend: Online' in result.stdout
    assert 'credentials are incorrect or missing' in result.stderr
    print('PASS: Both clients reached production Java health and handled HTTP 401 with invalid test credentials. No live translation attempted.')
finally:
    client.close()
