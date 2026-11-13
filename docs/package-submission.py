"""Package audited committed source only. Python stdlib + Git; no local tools needed.

Run from any directory: python docs/package-submission.py
Use --audit-index before committing. Findings contain paths/categories, never values.
This is a pattern/path guard, not a replacement for manual credential review.
"""
from pathlib import Path, PurePosixPath
import argparse
import hashlib
import json
import re
import struct
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TOP = {'backend', 'chrome-extension', 'python-client', 'php-client', 'mobile-client', 'docs'}
ROOT_FILES = {'.env.example', '.gitignore', 'README.md'}
DENIED = {'.git', '.tools', '.browser-testing', 'node_modules', '.venv', '__pycache__',
          'target', '.expo', '.test-build', '.idea', '.vscode', 'dist', 'submission-output'}
EXTENSIONS = {'.java', '.xml', '.json', '.js', '.cjs', '.ts', '.tsx', '.css', '.html',
              '.py', '.php', '.txt', '.md', '.puml', '.svg', '.png', '.ps1'}
REQUIRED = {'README.md', '.env.example', 'backend/pom.xml',
            'backend/src/main/liberty/config/server.xml',
            'backend/src/main/webapp/WEB-INF/web.xml',
            'chrome-extension/manifest.json', 'chrome-extension/sidepanel.html',
            'python-client/main.py', 'python-client/requirements.txt',
            'php-client/public/index.php', 'mobile-client/App.tsx',
            'mobile-client/package.json', 'mobile-client/package-lock.json',
            'docs/api-reference.md', 'docs/verification.md', 'docs/submission-checklist.md',
            'docs/demo-script.md'} | {f'docs/uml/{name}.{ext}' for name in
                ('class-diagram', 'deployment-diagram') for ext in ('puml', 'svg', 'png')}
PATTERNS = {
    'Google API key': rb'AIza[0-9A-Za-z_-]{30,}',
    'GitHub token': rb'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})',
    'private key': rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    'literal Authorization token': rb'(?i)Authorization[\"\x27]?\s*[:=]\s*[\"\x27]Basic\s+[A-Za-z0-9+/]{12,}',
    'embedded URL credentials': rb'https?://[^\s/:]+:[^\s/@]+@',
}

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def snapshot(index=False):
    result = {}
    if index:
        for row in git('ls-files', '--stage', '-z').split(b'\0'):
            if not row:
                continue
            meta, path = row.split(b'\t', 1)
            mode, oid, stage = meta.decode().split()
            if stage != '0' or mode not in ('100644', '100755'):
                raise SystemExit('Unsupported index entry: ' + path.decode())
            result[path.decode()] = git('cat-file', 'blob', oid)
    else:
        for row in git('ls-tree', '-r', '-z', 'HEAD').split(b'\0'):
            if not row:
                continue
            meta, path = row.split(b'\t', 1)
            mode, kind, oid = meta.decode().split()
            if mode not in ('100644', '100755') or kind != 'blob':
                raise SystemExit('Unsupported commit entry: ' + path.decode())
            result[path.decode()] = git('cat-file', 'blob', oid)
    return result

def validate(files):
    problems = []
    for name, data in files.items():
        p = PurePosixPath(name)
        if (p.is_absolute() or '..' in p.parts or any(x in DENIED for x in p.parts)
                or (p.parts[0] not in TOP and name not in ROOT_FILES)
                or (p.suffix not in EXTENSIONS and p.name not in ROOT_FILES)
                or (p.name.startswith('.env') and name != '.env.example')
                or p.name in ('server.env', 'local.properties')
                or name.startswith(('mobile-client/android/', 'mobile-client/ios/'))):
            problems.append((name, 'excluded path/type'))
        if len(data) > 1_000_000:
            problems.append((name, 'over 1 MB: explicit review required'))
        for label, pattern in PATTERNS.items():
            if re.search(pattern, data):
                problems.append((name, label))
        if p.suffix == '.png':
            if not data.startswith(b'\x89PNG\r\n\x1a\n'):
                problems.append((name, 'invalid PNG'))
            pos = 8
            while pos + 12 <= len(data):
                length = struct.unpack('>I', data[pos:pos+4])[0]
                chunk = data[pos+4:pos+8]
                if chunk in (b'eXIf', b'tEXt', b'zTXt', b'iTXt'):
                    # PlantUML embeds its public source in zTXt; scan decoded content too.
                    if chunk == b'zTXt':
                        import zlib
                        payload = data[pos+8:pos+8+length]
                        try:
                            text = zlib.decompress(payload.split(b'\0', 1)[1][1:])
                            for label, pattern in PATTERNS.items():
                                if re.search(pattern, text):
                                    problems.append((name, 'PNG metadata: ' + label))
                        except (ValueError, zlib.error):
                            problems.append((name, 'unreadable PNG metadata'))
                    elif chunk == b'tEXt' and data[pos+8:pos+8+length] == b'copyleft\0Generated by https://plantuml.com':
                        pass  # Reviewed renderer attribution, not personal metadata.
                    elif chunk == b'iTXt':
                        import zlib
                        payload = data[pos+8:pos+8+length]
                        keyword, rest = payload.split(b'\0', 1)
                        flag, method = rest[:2]
                        language, translated, text = rest[2:].split(b'\0', 2)
                        if flag:
                            text = zlib.decompress(text)
                        if keyword != b'plantuml' or method != 0:
                            problems.append((name, 'unreviewed image metadata'))
                        for label, pattern in PATTERNS.items():
                            if re.search(pattern, text):
                                problems.append((name, 'PNG metadata: ' + label))
                        if re.search(rb'(?i)[A-Z]:[\\/]Users[\\/]', text):
                            problems.append((name, 'private path in PNG metadata'))
                    else:
                        problems.append((name, 'image metadata requires review'))
                pos += length + 12
        elif p.suffix == '.svg':
            if not ET.fromstring(data).tag.endswith('svg'):
                problems.append((name, 'invalid SVG'))
    for name in sorted(REQUIRED - files.keys()):
        problems.append((name, 'mandatory file missing'))
    for directory in TOP:
        if not any(p.startswith(directory + '/') for p in files):
            problems.append((directory, 'empty mandatory directory'))
    for line in files.get('.env.example', b'').decode().splitlines():
        if '=' in line and not line.startswith('#'):
            key, value = line.split('=', 1)
            if key in ('GEMINI_API_KEY', 'TRANSLATOR_USERNAME', 'TRANSLATOR_PASSWORD') and value.strip():
                problems.append(('.env.example', 'nonempty secret/account example'))
    if problems:
        raise SystemExit(json.dumps({'reviewRequired': problems}, indent=2))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--audit-index', action='store_true')
    args = parser.parse_args()
    files = snapshot(args.audit_index)
    validate(files)
    entries = [{'path': p, 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}
               for p, b in sorted(files.items())]
    out = ROOT / 'dist'
    out.mkdir(exist_ok=True)
    if args.audit_index:
        (out / 'staged-inventory.json').write_text(json.dumps(entries, indent=2), encoding='utf-8')
        print(f'Index audit passed: {len(entries)} files; {sum(x["bytes"] for x in entries)} bytes')
        return
    if git('status', '--porcelain').strip():
        raise SystemExit('Commit reviewed changes before packaging; working tree is not clean.')
    path = out / 'DarijaTranslate-MiniProject2-Submission.zip'
    prefix = 'DarijaTranslate-MiniProject2/'
    with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(prefix + name, date_time=(2026, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None
        assert set(archive.namelist()) == {prefix + p for p in files}
        with tempfile.TemporaryDirectory(prefix='darija-verify-', dir=out) as directory:
            archive.extractall(directory)  # All member paths were validated above.
            for name, data in files.items():
                assert (Path(directory) / prefix / name).read_bytes() == data
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    (out / (path.name + '.sha256')).write_text(digest + '  ' + path.name + '\n', encoding='ascii')
    report = {'commit': git('rev-parse', 'HEAD').decode().strip(), 'zip': path.name,
              'bytes': path.stat().st_size, 'sha256': digest, 'files': entries,
              'zipIntegrity': 'passed', 'extractionByteComparison': 'passed',
              'videoIncluded': False, 'publishedGitHubUrlIncluded': False}
    (out / 'submission-manifest.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'files'}, indent=2))
    print(f'Packaged and extracted {len(entries)} audited committed files.')

if __name__ == '__main__':
    main()
