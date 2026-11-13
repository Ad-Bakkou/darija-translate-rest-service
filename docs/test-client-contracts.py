"""Offline wire tests, NOT Gemini: uses temporary client copies and ephemeral ports.
Run with the client's virtualenv Python; pass --php path/to/php.exe.
"""
import argparse
import base64
import html
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import subprocess
import sys
import threading
import time
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'python-client'))
import translator_client
from translator_client import TranslatorClient, ClientError

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--php', required=True)
args = parser.parse_args()
username, password = 'fixture-user', secrets.token_urlsafe(24)
expected_auth = 'Basic ' + base64.b64encode(f'{username}:{password}'.encode()).decode()
state = {'status': 200, 'calls': 0}
fixture = 'مرحبا <script>alert(1)</script>'


class Stub(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        assert self.path == '/api/health'
        assert self.headers.get('Authorization') is None
        self.reply(200, {'status': 'UP'})

    def reply(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_POST(self):
        assert self.path == '/api/translate'
        state['calls'] += 1
        if self.headers.get('Authorization') != expected_auth:
            self.reply(401, {'error': 'fixture'}); return
        payload = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        assert payload['sourceLanguage'] == 'English'
        assert set(payload) == {'text', 'sourceLanguage'}
        self.reply(state['status'], {'originalText': payload['text'], 'translatedText': fixture,
            'sourceLanguage': 'English', 'targetLanguage': 'Moroccan Darija'})


# Leave the production files and running Liberty untouched.
with socket.socket() as probe:
    probe.bind(('127.0.0.1', 0))
    web_port = probe.getsockname()[1]
stub = ThreadingHTTPServer(('127.0.0.1', 0), Stub)
fixture_url = f'http://127.0.0.1:{stub.server_port}'
web_url = f'http://127.0.0.1:{web_port}'
temporary = tempfile.TemporaryDirectory(prefix='darija-contract-')
copy_root = Path(temporary.name)
for folder in ('python-client', 'php-client'):
    shutil.copytree(ROOT/folder, copy_root/folder, ignore=shutil.ignore_patterns('.venv', '__pycache__'))
for relative in ('python-client/translator_client.py', 'php-client/src/Configuration.php'):
    path = copy_root/relative
    path.write_text(path.read_text(encoding='utf-8').replace('http://127.0.0.1:9080', fixture_url), encoding='utf-8')
translator_client.BASE_URL = fixture_url
thread = threading.Thread(target=stub.serve_forever, daemon=True)
thread.start()
env = os.environ.copy()
env.update(TRANSLATOR_USERNAME=username, TRANSLATOR_PASSWORD=password)
process = None
session = requests.Session(); session.trust_env = False
try:
    client = TranslatorClient()
    assert client.health()
    assert client.translate('Hello', username, password)['translatedText'] == fixture
    try:
        client.translate('Hello', username, 'incorrect')
        raise AssertionError('Expected authentication rejection')
    except ClientError:
        pass
    cli = subprocess.run([sys.executable, str(copy_root/'python-client/main.py'), '--text', 'Hello', '--json'],
        env=env, capture_output=True, encoding='utf-8', check=True)
    assert json.loads(cli.stdout)['translatedText'] == fixture
    php = subprocess.run([args.php, str(copy_root/'php-client/tests/live.php'), '--translate'],
        env=env, capture_output=True, encoding='utf-8', check=True)
    assert fixture in php.stdout.replace('\\/', '/')
    process = subprocess.Popen([args.php, '-S', f'127.0.0.1:{web_port}', '-t', str(copy_root/'php-client/public')],
        env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(40):
        if process.poll() is not None:
            raise RuntimeError('PHP server exited')
        try:
            page = session.get(web_url, timeout=2)
            break
        except requests.ConnectionError:
            time.sleep(.1)
    else:
        raise RuntimeError('PHP did not start')
    assert page.status_code == 200
    token = re.search(r'name="csrf" value="([a-f0-9]{64})"', page.text).group(1)
    before = state['calls']
    rejected = session.post(web_url, data={'csrf': 'wrong', 'text': 'Hello'}, timeout=5)
    assert rejected.status_code == 403 and state['calls'] == before
    assert session.put(web_url, timeout=5).status_code == 405
    assert session.get(web_url, headers={'Host':'evil.example'}, timeout=5).status_code == 400
    malicious = '<img src=x onerror=alert(1)> & English'
    result = session.post(web_url, data={'csrf':token, 'text':malicious}, timeout=5)
    assert result.status_code == 200 and html.escape(malicious, quote=True) in result.text
    assert html.escape(fixture, quote=True) in result.text and '<script>alert' not in result.text
    assert password not in result.text and username not in result.text
    assert 'dir="rtl"' in result.text and 'HttpOnly' in page.headers['Set-Cookie']
    assert "frame-ancestors 'none'" in page.headers['Content-Security-Policy']
    for status in (400,401,403,502,503,504,302):
        state['status'] = status
        result = session.post(web_url, data={'csrf':token,'text':'Hello'}, timeout=5)
        assert 'class="error"' in result.text and 'id="result"' not in result.text
        assert password not in result.text
    print('PASS: Python HTTP/CLI, PHP cURL/CLI and PHP web form contract checks against LOCAL STUB (not Gemini).')
finally:
    if process is not None:
        process.terminate(); process.wait(timeout=10)
    session.close()
    stub.shutdown(); stub.server_close()
    temporary.cleanup()
