"""Every public template must render icons without the full vendor bundle."""
from pathlib import Path
import functools
import http.server
import re
import sys
import threading
import unittest

from bs4 import BeautifulSoup
from fontTools.ttLib import TTFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from tools.build_site import public_file

ICON_SELECTOR = '.fas,.fab,.far,.fa-solid,.fa-brands,.fa-regular'


def public_pages():
    return sorted(p for p in ROOT.rglob('*.html')
                  if public_file(p.relative_to(ROOT).as_posix())
                  and not p.name.startswith(('google', 'yandex'))
                  and 'fontawesome-free-6.7.2-web' not in p.parts)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class IconDeliveryRegressions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(
            ('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def test_public_pages_do_not_load_legacy_icon_stylesheets(self):
        pages = public_pages()
        self.assertTrue(pages)
        for page in pages:
            with self.subTest(page=page.relative_to(ROOT).as_posix()):
                soup = BeautifulSoup(page.read_text(encoding='utf-8'), 'html.parser')
                self.assertEqual(len(soup.select('style[data-ib-icons]')), 1)
                legacy = [x.get('href') for x in soup.select('link[href]')
                          if 'fontawesome-free-6.7.2-web/css/' in x['href']
                          or '/assets/css/icons.css' in x['href']]
                self.assertEqual(legacy, [])

    def test_inline_rules_and_subset_fonts_cover_every_used_icon(self):
        cmaps = {style:set(TTFont(ROOT / f'assets/fonts/fa-site-{style}-{weight}.woff2').getBestCmap())
                 for style,weight in [('solid',900), ('brands',400), ('regular',400)]}
        for page in public_pages():
            with self.subTest(page=page.relative_to(ROOT).as_posix()):
                soup = BeautifulSoup(page.read_text(encoding='utf-8'), 'html.parser')
                rules = soup.select_one('style[data-ib-icons]').get_text()
                mapping = {name:int(code,16) for name,code in
                           re.findall(r'\.([\w-]+)\{--fa:"\\([0-9a-f]+)"\}', rules)}
                for icon in soup.select(ICON_SELECTOR):
                    classes = set(icon.get('class', []))
                    names = classes.intersection(mapping)
                    self.assertTrue(names, f'No inline glyph for {classes}')
                    style = ('brands' if classes.intersection({'fab','fa-brands'}) else
                             'regular' if classes.intersection({'far','fa-regular'}) else 'solid')
                    for name in names:
                        self.assertIn(mapping[name], cmaps[style], f'{style} font lacks {name}')

    def test_blog_legal_and_error_icons_render_without_vendor_requests(self):
        paths = [p for p in public_pages() if p.parent.name == 'bloglar'
                 or p.name in {'404.html','gizlilik-politikasi.html','kullanim-kosullari.html'}]
        page = self.browser.new_page(viewport={'width':390, 'height':664})
        page.route('**/*', lambda r:r.continue_() if r.request.url.startswith(self.base) else r.abort())
        page.add_init_script("localStorage.setItem('ib-analytics-consent',JSON.stringify({choice:'denied',ts:Date.now()}))")
        requests = []
        page.on('request', lambda r:requests.append(r.url))
        try:
            for path in paths:
                with self.subTest(page=path.relative_to(ROOT).as_posix()):
                    requests.clear()
                    page.goto(self.base + '/' + path.relative_to(ROOT).as_posix(), wait_until='load')
                    page.evaluate('document.fonts.ready')
                    self.assertEqual([u for u in requests if 'fontawesome-free-6.7.2-web/' in u], [])
                    icons = page.locator(ICON_SELECTOR).evaluate_all("""es=>es.map(e=>({
                        family:getComputedStyle(e).fontFamily,
                        glyph:getComputedStyle(e,'::before').content
                    }))""")
                    self.assertTrue(icons)
                    for icon in icons:
                        self.assertIn('IB Site Icons', icon['family'])
                        self.assertNotIn(icon['glyph'], ('none', 'normal', '""', "''"))
        finally:
            page.close()

    def test_screen_reader_labels_keep_text_without_spilling_into_the_layout(self):
        paths = [p for p in public_pages()
                 if BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser').select_one('.sr-only')]
        self.assertTrue(paths)
        page = self.browser.new_page(viewport={'width':390, 'height':664})
        page.route('**/*', lambda r:r.continue_() if r.request.url.startswith(self.base) else r.abort())
        page.add_init_script("localStorage.setItem('ib-analytics-consent',JSON.stringify({choice:'denied',ts:Date.now()}))")
        try:
            for path in paths:
                with self.subTest(page=path.relative_to(ROOT).as_posix()):
                    page.goto(self.base + '/' + path.relative_to(ROOT).as_posix(), wait_until='load')
                    labels = page.locator('.sr-only').evaluate_all("""es=>es.map(e=>{
                        const r=e.getBoundingClientRect(),s=getComputedStyle(e);
                        return {text:e.textContent.trim(),width:r.width,height:r.height,
                            display:s.display,visibility:s.visibility,overflow:s.overflow};
                    })""")
                    self.assertTrue(labels)
                    for label in labels:
                        self.assertTrue(label['text'])
                        self.assertNotEqual(label['display'], 'none')
                        self.assertNotEqual(label['visibility'], 'hidden')
                        self.assertLessEqual(label['width'], 1)
                        self.assertLessEqual(label['height'], 1)
                        self.assertEqual(label['overflow'], 'hidden')
        finally:
            page.close()


if __name__ == '__main__':
    unittest.main()
