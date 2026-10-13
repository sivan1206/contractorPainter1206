"""Export explicitly allowed public files; never upload the repository itself."""
import argparse
import os
import re
import shutil
import stat
import subprocess
from pathlib import Path, PurePosixPath
try:
    from .version_assets import version_html_assets
except ImportError:
    from version_assets import version_html_assets

AREAS = set('acarkent acibadem arnavutkoy atasehir avcilar bagcilar bahcelievler bakirkoy basaksehir bayrampasa bebek besiktas beykoz beylikduzu beyoglu buyukcekmece camlica catalca cekmekoy esenler esenyurt etiler fatih gaziosmanpasa gungoren kadikoy kagithane kandilli kartal kemerburgaz kucukcekmece levent maltepe nisantasi pendik sancaktepe sariyer sile silivri sisli sultanbeyli tarabya tuzla ulus umraniye uskudar zekeriyakoy zeytinburnu'.split())
PUBLIC_ROOT_FILES = set('index.html 404.html gizlilik-politikasi.html kullanim-kosullari.html CNAME .htaccess _headers favicon.ico robots.txt sitemap.xml llms.txt BingSiteAuth.xml styles.pure.css b1bad19eb2af4ef9956dff5e8a807b13.txt'.split())
ASSET_DIRS = {'assets', 'images', 'fonts', 'css', 'js', 'fontawesome-free-6.7.2-web'}
ASSET_EXTENSIONS = {'.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico', '.avif', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp4', '.webm'}

def public_file(name):
    path = PurePosixPath(name)
    if any(part.startswith('.') or part in {'tests', 'tools', 'dist', '__pycache__'} for part in path.parts):
        return name == '.htaccess'
    if name == 'assets/fonts/LICENSE.txt':
        return True
    if len(path.parts) == 1:
        return name in PUBLIC_ROOT_FILES or bool(re.fullmatch(r'(google[0-9a-f]+|yandex_[0-9a-f]+)\.html', name))
    if path.parts[0] in {'bloglar', 'boyaci'} and len(path.parts) == 2 and path.suffix == '.html':
        return True
    asset_parts = path.parts
    if path.parts[0] in AREAS | {'bloglar', 'boyaci'}:
        if len(path.parts) == 2 and re.fullmatch(r'(google[0-9a-f]+|yandex_[0-9a-f]+)\.html', path.name):
            return True
        if len(path.parts) == 2 and path.name in {'index.html', 'main.js', 'style.css', 'styles.pure.css'}:
            return True
        asset_parts = path.parts[1:]
    return bool(asset_parts and asset_parts[0] in ASSET_DIRS and path.suffix.lower() in ASSET_EXTENSIONS)

def build(root):
    # Tracked source plus allowed new assets: generated variants and shared JS work
    # in a local preview even before committing. Path policy applies to both.
    result = subprocess.run(['git', '-C', str(root), 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], check=True, stdout=subprocess.PIPE)
    names = sorted({name for name in result.stdout.decode('utf-8').split('\0') if name and public_file(name)})
    output = root / 'dist'
    if output.is_symlink():
        raise ValueError('dist must not be a symlink')
    if output.resolve().parent != root.resolve():
        raise ValueError('dist must resolve directly inside the repository')
    output.mkdir(exist_ok=True)
    # Keep sync-managed directories in place. Validate the existing tree first,
    # then remove only stale files from this fixed generated export directory.
    existing = []
    for directory, directories, files in os.walk(output, followlinks=False):
        for name in directories + files:
            child = Path(directory) / name
            if child.is_symlink() or not child.resolve().is_relative_to(output.resolve()):
                raise ValueError('Export child resolves outside dist or is a symlink')
        existing.extend(Path(directory) / name for name in files)
    allowed = set(names)
    for child in existing:
        if child.relative_to(output).as_posix() not in allowed:
            child.chmod(child.stat().st_mode | stat.S_IWRITE)
            child.unlink()
    for name in names:
        source = root / name
        if source.is_symlink() or not source.resolve().is_relative_to(root.resolve()):
            raise ValueError(f'External source is forbidden: {name}')
        destination = output / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            if source.read_bytes() == destination.read_bytes():
                continue
            destination.chmod(destination.stat().st_mode | stat.S_IWRITE)
        shutil.copyfile(source, destination)
    version_html_assets(output)
    print(f'Exported {len(names)} public files to dist')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    build(parser.parse_args().root.resolve())
