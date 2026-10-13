import importlib.util
import subprocess
import tempfile
import unittest
import stat
import hashlib
from pathlib import Path

BUILDER = Path(__file__).resolve().parents[1] / 'tools/build_site.py'

class SiteExportTests(unittest.TestCase):
    def test_export_refreshes_asset_versions_without_changing_external_urls(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'assets').mkdir()
            sheet = root / 'assets/app.css'
            sheet.write_text('body{color:red}', encoding='utf-8')
            (root / 'index.html').write_text('<link href="/assets/app.css?v=old"><script src="https://external.example/app.js?v=external"></script>', encoding='utf-8')
            subprocess.run(['git', 'init', '-q', str(root)], check=True)
            subprocess.run(['git', '-C', str(root), 'add', '.'], check=True)
            subprocess.run(['python', str(BUILDER), '--root', str(root)], check=True)
            first = (root / 'dist/index.html').read_text(encoding='utf-8')
            self.assertIn(hashlib.sha256(sheet.read_bytes()).hexdigest()[:12], first)
            self.assertIn('https://external.example/app.js?v=external', first)
            sheet.write_text('body{color:blue}', encoding='utf-8')
            subprocess.run(['python', str(BUILDER), '--root', str(root)], check=True)
            second = (root / 'dist/index.html').read_text(encoding='utf-8')
            self.assertNotEqual(first, second)
            self.assertIn(hashlib.sha256(sheet.read_bytes()).hexdigest()[:12], second)

    def test_only_public_site_files_exported(self):
        self.assertTrue(BUILDER.exists(), 'Safe site exporter must exist')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            files = ['index.html', 'assets/js/app.js', 'images/photo.webp', 'bloglar/images/hero.webp',
                     'google123.html', 'sultanbeyli/google123.html', '.htaccess', 'CNAME', 'robots.txt', '_headers',
                     '.docs/private.html', 'tests/example.html', 'tools/demo.html',
                     'README.md', 'desktop.ini', '.seo-cache/page.html',
                     'assets/fonts/LICENSE.txt', 'assets/fonts/private.txt',
                     'assets/private.md', 'random-secret.html']
            for name in files:
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text('<script src="/assets/js/app.js"></script>' if name == 'index.html' else 'fixture')
            subprocess.run(['git', 'init', '-q', str(root)], check=True)
            subprocess.run(['git', '-C', str(root), 'add', '.'], check=True)
            subprocess.run(['python', str(BUILDER), '--root', str(root)], check=True)
            exported = {p.relative_to(root / 'dist').as_posix() for p in (root / 'dist').rglob('*') if p.is_file()}
            self.assertEqual(exported, {'index.html', 'assets/js/app.js', 'images/photo.webp', 'bloglar/images/hero.webp', 'google123.html', 'sultanbeyli/google123.html', '.htaccess', 'CNAME', 'robots.txt', '_headers', 'assets/fonts/LICENSE.txt'})
            self.assertTrue((root / 'dist/assets/js/app.js').is_file())

    def test_rebuild_updates_readonly_files_without_removing_directories(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'index.html').write_text('new content')
            subprocess.run(['git', 'init', '-q', str(root)], check=True)
            subprocess.run(['git', '-C', str(root), 'add', '.'], check=True)
            export = root / 'dist'
            empty = export / 'assets/kept-directory'
            empty.mkdir(parents=True)
            current = export / 'index.html'
            current.write_text('old content')
            current.chmod(stat.S_IREAD)
            stale = export / 'private-old-report.html'
            stale.write_text('must not be published')
            stale.chmod(stat.S_IREAD)
            try:
                subprocess.run(['python', str(BUILDER), '--root', str(root)], check=True)
                self.assertEqual(current.read_text(), 'new content')
                self.assertFalse(stale.exists())
                self.assertTrue(empty.is_dir(), 'Sync-managed directories must not be recursively removed')
            finally:
                for path in export.rglob('*'):
                    if path.is_file(): path.chmod(stat.S_IREAD | stat.S_IWRITE)

if __name__ == '__main__':
    unittest.main()
