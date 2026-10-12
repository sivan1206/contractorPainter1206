"""Check the deployable HTML, sitemap, schema and local asset references."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
from collections import Counter
import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET

from bs4 import BeautifulSoup
from PIL import Image
try:
    from .build_site import public_file
except ImportError:
    from build_site import public_file

BASE = 'https://istanbulboyacilik.com/'


def objects(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from objects(child)
    elif isinstance(value, list):
        for child in value:
            yield from objects(child)


def text(value):
    return re.sub(r'\s+', ' ', BeautifulSoup(str(value), 'html.parser').get_text(' ', strip=True)).strip()


def comparable_text(value):
    # Case, curly quotes and en-dashes do not change the FAQ's meaning.
    return re.sub(r'[^\w]+', ' ', text(value).lower()).strip()


def local_path(root, page, url):
    url = url.strip()
    part = urlsplit(url)
    if part.scheme and (part.scheme not in ('http', 'https') or part.hostname != 'istanbulboyacilik.com'):
        return None
    if not part.path:
        return None
    path = root / unquote(part.path.lstrip('/')) if part.scheme or part.path.startswith('/') else page.parent / unquote(part.path)
    if path.is_dir():
        path /= 'index.html'
    return path


def verify(root):
    errors, pages, urls, seen, image_cache = [], [], set(), Counter(), {}
    html = sorted(p for p in root.rglob('*.html')
                  if public_file(p.relative_to(root).as_posix())
                  and not p.name.startswith(('google', 'yandex'))
                  and 'fontawesome-free-6.7.2-web' not in p.parts)
    for page in html:
        rel = page.relative_to(root).as_posix()
        soup = BeautifulSoup(page.read_text(encoding='utf-8'), 'html.parser')
        expected = BASE + ('' if rel == 'index.html' else rel[:-10] if rel.endswith('index.html') else rel)
        canonical = soup.select('link[rel="canonical"]')
        if len(canonical) != 1 or canonical[0].get('href') != expected:
            errors.append(f'{rel}: canonical mismatch')
        if not soup.title or not soup.title.get_text(strip=True):
            errors.append(f'{rel}: missing title')
        if len(soup.find_all('h1')) != 1:
            errors.append(f'{rel}: expected one h1')
        if not soup.find('meta', attrs={'name': 'description', 'content': True}):
            errors.append(f'{rel}: missing description')
        robot = soup.find('meta', attrs={'name': 'robots'})
        if not robot or 'noindex' not in robot.get('content', '').lower():
            urls.add(expected)
        body_text = comparable_text(str(soup.body or soup))
        for script in soup.select('script[type="application/ld+json"]'):
            try:
                graph = json.loads(script.string or script.get_text())
            except (ValueError, TypeError) as exc:
                errors.append(f'{rel}: invalid JSON-LD: {exc}')
                continue
            for node in objects(graph):
                types = node.get('@type', [])
                types = [types] if isinstance(types, str) else types
                seen.update(types)
                if 'BlogPosting' in types:
                    entity = node.get('mainEntityOfPage')
                    entity_url = entity.get('@id') if isinstance(entity, dict) else entity
                    if node.get('url') != expected or entity_url != expected:
                        errors.append(f'{rel}: article identity differs from canonical')
                    author = node.get('author', {})
                    if author.get('@type') != 'Person' or author.get('name') != 'Enes Usta':
                        errors.append(f'{rel}: missing approved person author')
                if 'FAQPage' in types:
                    for question in node.get('mainEntity', []):
                        for value in [question.get('name'), question.get('acceptedAnswer', {}).get('text')]:
                            if not value or comparable_text(value) not in body_text:
                                errors.append(f'{rel}: FAQ schema text absent from visible body')
        for tag in soup.find_all(['img', 'script', 'link', 'a']):
            attr = 'src' if tag.name in ('img', 'script') else 'href'
            value = tag.get(attr)
            if not value or (tag.name == 'link' and not set(tag.get('rel', [])) & {'stylesheet', 'preload', 'icon'}):
                continue
            target = local_path(root, page, value)
            if target is not None and not target.is_file():
                errors.append(f'{rel}: missing local {value}')
        for tag in soup.find_all(['img', 'source', 'link']):
            attribute = 'imagesrcset' if tag.name == 'link' else 'srcset'
            for candidate in tag.get(attribute, '').split(','):
                parts = candidate.strip().split()
                if not parts:
                    continue
                target = local_path(root, page, parts[0])
                if target is None:
                    continue
                if not target.is_file():
                    errors.append(f'{rel}: missing responsive image {parts[0]}')
                    continue
                if len(parts) > 1 and re.fullmatch(r'\d+w', parts[1]):
                    try:
                        if target not in image_cache:
                            with Image.open(target) as image:
                                image_cache[target] = image.width
                        if image_cache[target] != int(parts[1][:-1]):
                            errors.append(f'{rel}: image width differs from {parts[1]}')
                    except Exception as exc:
                        errors.append(f'{rel}: invalid image {parts[0]}: {exc}')
        pages.append(rel)
    sitemap = ET.parse(root / 'sitemap.xml')
    mapped = [entry.text.strip() for entry in sitemap.iter() if entry.tag.endswith('loc') and entry.text]
    if len(set(mapped)) != len(mapped):
        errors.append('sitemap: duplicate URLs')
    if set(mapped) != urls:
        errors.append('sitemap: does not match indexable canonical URLs')
    return {'pages': len(pages), 'indexable': len(urls), 'sitemap_urls': len(mapped),
            'schema_types': dict(seen), 'errors': list(dict.fromkeys(errors))}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--output', type=Path)
    arguments = parser.parse_args()
    result = verify(arguments.root.resolve())
    if arguments.output:
        arguments.output.parent.mkdir(parents=True, exist_ok=True)
        arguments.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(bool(result['errors']))
