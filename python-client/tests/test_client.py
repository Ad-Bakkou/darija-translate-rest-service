import base64
import unittest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from unittest.mock import Mock
import requests
from translator_client import TranslatorClient, ClientError, validate_text, BASE_URL


class ClientTests(unittest.TestCase):
    def setUp(self):
        self.session = Mock()
        self.client = TranslatorClient(self.session)
        self.response = self.session.post.return_value
        self.response.status_code = 200
        self.data = {'originalText': ' Hello ', 'translatedText': 'مرحبا', 'sourceLanguage': 'English', 'targetLanguage': 'Moroccan Darija'}
        self.response.json.return_value = self.data

    def call(self):
        return self.client.translate(' Hello ', 'مستخدم', 'سري')

    def test_unicode_success_and_contract(self):
        self.assertEqual(self.call(), self.data)
        args, kwargs = self.session.post.call_args
        self.assertEqual(args, (BASE_URL + '/api/translate',))
        self.assertEqual(kwargs['json'], {'text': ' Hello ', 'sourceLanguage': 'English'})
        self.assertFalse(kwargs['allow_redirects'])
        self.assertFalse(self.session.trust_env)
        self.assertEqual(kwargs['timeout'], (5, 55))
        prepared = requests.Request('POST', args[0], auth=kwargs['auth']).prepare()
        self.assertEqual(base64.b64decode(prepared.headers['Authorization'][6:]).decode(), 'مستخدم:سري')

    def test_http_errors_and_redirects_never_expose_body(self):
        for status in (400, 401, 403, 422, 429, 502, 503, 504, 500, 302, 307):
            with self.subTest(status=status):
                self.response.status_code = status
                self.response.text = 'SECRET provider body'
                with self.assertRaises(ClientError) as error:
                    self.call()
                self.assertNotIn('SECRET', str(error.exception))
                self.assertNotIn('سري', str(error.exception))
        self.response.json.assert_not_called()

    def test_network_and_timeout_safe(self):
        for exception in (requests.ConnectionError('SECRET'), requests.Timeout('SECRET')):
            self.session.post.side_effect = exception
            with self.assertRaises(ClientError) as error:
                self.call()
            self.assertNotIn('SECRET', str(error.exception))

    def test_invalid_responses(self):
        for data in (None, [], {}, dict(self.data, translatedText=''), dict(self.data, translatedText='  '),
                     dict(self.data, translatedText=9), dict(self.data, originalText='wrong'),
                     dict(self.data, sourceLanguage='French'), dict(self.data, translatedText='\ud800')):
            with self.subTest(data=data):
                self.response.json.return_value = data
                with self.assertRaises(ClientError):
                    self.call()

    def test_malformed_json(self):
        self.response.json.side_effect = ValueError('SECRET')
        with self.assertRaisesRegex(ClientError, 'invalid JSON'):
            self.call()

    def test_validation(self):
        for text in ('', ' \n\u2003', 'x' * 5001, '\ud800', None):
            with self.subTest(text=repr(text)[:40]), self.assertRaises(ClientError):
                self.client.translate(text, 'u', 'p')
        self.session.post.assert_not_called()
        validate_text('😀' * 5000)
        with self.assertRaises(ClientError):
            validate_text('😀' * 5001)

    def test_credentials(self):
        for username, password in (('', 'p'), ('u', ''), ('u:x', 'p'), (None, 'p'), ('u', '\ud800')):
            with self.subTest(username=username), self.assertRaises(ClientError):
                self.client.translate('Hello', username, password)
        self.session.post.assert_not_called()

    def test_health_is_public(self):
        self.session.get.return_value.status_code = 200
        self.session.get.return_value.json.return_value = {'status': 'UP'}
        self.assertTrue(self.client.health())
        self.assertNotIn('auth', self.session.get.call_args.kwargs)
        self.session.get.return_value.status_code = 302
        self.assertFalse(self.client.health())
        self.session.get.side_effect = requests.ConnectionError()
        self.assertFalse(self.client.health())

    def test_close(self):
        self.client.close()
        self.session.close.assert_called_once()


if __name__ == '__main__':
    unittest.main()
