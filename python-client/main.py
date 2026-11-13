"""Interactive or one-shot DarijaTranslate client."""
import argparse
import getpass
import json
import os
import sys
import warnings
from translator_client import ClientError, TranslatorClient


def read_username():
    print('Translator username: ', end='', file=sys.stderr, flush=True)
    return input()


def read_password():
    # Refuse getpass's echoing fallback if a secure terminal is unavailable.
    with warnings.catch_warnings():
        warnings.simplefilter('error', getpass.GetPassWarning)
        try:
            return getpass.getpass('Translator password: ')
        except getpass.GetPassWarning:
            raise ClientError('Secure password entry is unavailable. Use a terminal or environment configuration.') from None


def credentials():
    username = os.environ.get('TRANSLATOR_USERNAME', '')
    password = os.environ.get('TRANSLATOR_PASSWORD', '')
    if sys.stdin.isatty():
        if not username.strip():
            username = read_username()
        if not password.strip():
            password = read_password()
    return username, password


def main():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='replace')
    parser = argparse.ArgumentParser(description='Translate English to Moroccan Darija using the local authenticated backend.')
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--text', help='English text to translate once (not for passwords)')
    modes.add_argument('--health', action='store_true', help='Check public backend health without credentials')
    parser.add_argument('--json', action='store_true', help='Output JSON in one-shot/health mode')
    args = parser.parse_args()
    if args.json and args.text is None and not args.health:
        parser.error('--json requires --text or --health')
    client = TranslatorClient()
    try:
        if args.health:
            online = client.health()
            print(json.dumps({'online': online}) if args.json else 'Backend: ' + ('Online' if online else 'Offline'))
            return 0 if online else 1
        if args.text is not None:
            result = client.translate(args.text, *credentials())
            print(json.dumps(result, ensure_ascii=False) if args.json else 'Moroccan Darija:\n' + result['translatedText'])
            return 0
        if not sys.stdin.isatty():
            raise ClientError('Use --text or --health when running without an interactive terminal.')
        print('DarijaTranslate — Python Client\nBackend: ' + ('Online' if client.health() else 'Offline'))
        account = credentials()
        while True:
            text = input('\nEnglish text (:quit to exit, :account to change credentials):\n')
            if text == ':quit':
                return 0
            if text == ':account':
                account = (read_username(), read_password())
                continue
            try:
                print('Translating...')
                print('Moroccan Darija:\n' + client.translate(text, *account)['translatedText'])
            except ClientError as error:
                print('Error: ' + str(error), file=sys.stderr)
    except ClientError as error:
        if args.json:
            print(json.dumps({'error': str(error)}))
        else:
            print('Error: ' + str(error), file=sys.stderr)
        return 1
    except (KeyboardInterrupt, EOFError):
        print('\nGoodbye.', file=sys.stderr)
        return 130
    finally:
        client.close()


if __name__ == '__main__':
    sys.exit(main())
