"""Give local CSS/JS references a content version in the public export."""
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode, unquote
import hashlib
import re

REFERENCE = re.compile(r'(\b(?:src|href)\s*=\s*)(["\'])(.*?)\2')
SITE_HOSTS = {'istanbulboyacilik.com', 'www.istanbulboyacilik.com'}


def version_html_assets(root):
    root = root.resolve()
    versions = {}
    changed = 0
    for page in root.rglob('*.html'):
        document = page.read_text(encoding='utf-8')

        def replace(match):
            part = urlsplit(match[3])
            if part.netloc and part.hostname not in SITE_HOSTS:
                return match[0]
            if not part.path.lower().endswith(('.css', '.js')):
                return match[0]
            path = unquote(part.path)
            asset = (root / path.lstrip('/') if part.netloc or path.startswith('/') else page.parent / path).resolve()
            if not asset.is_relative_to(root) or not asset.is_file():
                return match[0]
            if asset not in versions:
                # Match Git's LF text representation on Windows and CI runners.
                versions[asset] = hashlib.sha256(asset.read_text(encoding='utf-8').encode('utf-8')).hexdigest()[:12]
            query = [(k, v) for k, v in parse_qsl(part.query, keep_blank_values=True) if k != 'v']
            query.append(('v', versions[asset]))
            url = urlunsplit((part.scheme, part.netloc, part.path, urlencode(query), part.fragment))
            return match[1] + match[2] + url + match[2]

        versioned = REFERENCE.sub(replace, document)
        if versioned != document:
            page.write_text(versioned, encoding='utf-8')
            changed += 1
    return changed
