"""Authenticated loopback-only REST client. Never includes provider bodies in errors."""
import requests
from requests.auth import HTTPBasicAuth

BASE_URL = 'http://127.0.0.1:9080'
MESSAGES = {400: 'The backend rejected the input.', 401: 'Incorrect or missing translator credentials.',
            403: 'This account does not have the translator role.', 422: 'The provider could not translate this text.',
            429: 'Rate limit reached. Try again later.', 502: 'Translation provider failed.',
            503: 'Translation provider is unavailable or rate-limited.', 504: 'Translation provider timed out.'}


class ClientError(Exception):
    pass


def validate_text(text):
    if not isinstance(text, str) or not text.strip():
        raise ClientError('Enter nonblank English text.')
    if len(text) > 5000:
        raise ClientError('Text must contain at most 5,000 Unicode code points.')
    try:
        text.encode('utf-8')
    except UnicodeError:
        raise ClientError('Text must be valid Unicode.') from None


class TranslatorClient:
    def __init__(self, session=None):
        self.session = session if session is not None else requests.Session()
        # Do not route credentials through environment proxies or read .netrc accounts.
        self.session.trust_env = False

    def close(self):
        self.session.close()

    def health(self):
        try:
            response = self.session.get(BASE_URL + '/api/health', timeout=(3, 5), allow_redirects=False)
            return response.status_code == 200 and response.json() == {'status': 'UP'}
        except (requests.RequestException, ValueError):
            return False

    def translate(self, text, username, password):
        validate_text(text)
        if not isinstance(username, str) or not username.strip() or not isinstance(password, str) or not password.strip():
            raise ClientError('Configure translator credentials or enter them interactively.')
        if ':' in username:
            raise ClientError('The translator username cannot contain a colon.')
        try:
            # HTTPBasicAuth accepts bytes: explicit UTF-8 avoids its string Latin-1 default.
            auth = HTTPBasicAuth(username.encode('utf-8'), password.encode('utf-8'))
        except UnicodeError:
            raise ClientError('Credentials must be valid Unicode.') from None
        try:
            response = self.session.post(BASE_URL + '/api/translate',
                json={'text': text, 'sourceLanguage': 'English'}, auth=auth,
                timeout=(5, 55), allow_redirects=False)
        except requests.Timeout:
            raise ClientError('The request timed out. Check the backend and try again.') from None
        except requests.RequestException:
            raise ClientError('Cannot connect to the local backend. Start Open Liberty and try again.') from None
        if 300 <= response.status_code < 400:
            raise ClientError('Backend redirect rejected. Check the local server configuration.')
        if response.status_code != 200:
            raise ClientError(MESSAGES.get(response.status_code, 'Unexpected backend HTTP error.'))
        try:
            data = response.json()
        except ValueError:
            raise ClientError('The backend returned invalid JSON.') from None
        if (not isinstance(data, dict) or data.get('originalText') != text
                or data.get('sourceLanguage') != 'English' or data.get('targetLanguage') != 'Moroccan Darija'
                or not isinstance(data.get('translatedText'), str) or not data['translatedText'].strip()):
            raise ClientError('The backend returned an invalid or empty translation.')
        try:
            data['translatedText'].encode('utf-8')
        except UnicodeError:
            raise ClientError('The backend returned invalid Unicode.') from None
        return {key: data[key] for key in ('originalText', 'translatedText', 'sourceLanguage', 'targetLanguage')}
