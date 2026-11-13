import io
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main
from translator_client import ClientError


class CliTests(unittest.TestCase):
    def test_help(self):
        result = subprocess.run([sys.executable, str(Path(main.__file__)), '--help'], capture_output=True)
        self.assertEqual(result.returncode, 0)
        self.assertIn(b'--health', result.stdout)

    def test_noninteractive_missing_credentials_safe_json(self):
        env = {k: v for k, v in os.environ.items() if k not in ('TRANSLATOR_USERNAME','TRANSLATOR_PASSWORD')}
        result = subprocess.run([sys.executable, str(Path(main.__file__)), '--text', 'Hello', '--json'],
                                input='', env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertIn('credentials', json.loads(result.stdout)['error'])
        self.assertNotIn('Traceback', result.stderr)

    def test_password_echo_fallback_is_refused(self):
        with patch('getpass.getpass', side_effect=main.getpass.GetPassWarning('fixture')):
            with self.assertRaises(ClientError):
                main.read_password()

    def test_credentials_use_environment(self):
        with patch.dict(os.environ, {'TRANSLATOR_USERNAME':'fixture', 'TRANSLATOR_PASSWORD':'fixture-only'}):
            with patch('getpass.getpass') as prompt:
                self.assertEqual(main.credentials(), ('fixture','fixture-only'))
                prompt.assert_not_called()


if __name__ == '__main__':
    unittest.main()
