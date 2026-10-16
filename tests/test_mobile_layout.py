"""Short mobile screens must keep navigation, hero content and actions apart."""
from pathlib import Path
import functools
import http.server
import threading
import unittest

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
REGIONS = ('kucukcekmece', 'sariyer', 'kagithane', 'acarkent', 'fatih', 'kadikoy')
BLOGS = (
    'boya-maliyetini-dusurmenin-7-yolu',
    'boyaci-ile-sozlesme-yaparken-dikkat-edilecekler',
    'hazir-renk-mi-renk-makinesi-mi',
    'kendin-boyasan-mi-usta-tutsan-mi-maliyet-karsilastirmasi',
    'marshall-mi-dyo-mu',
)
GEOMETRY = """() => {
    const box = e => {
        const r = e.getBoundingClientRect();
        return {top:r.top, bottom:r.bottom, left:r.left, right:r.right};
    };
    const shown = e => {
        const s = getComputedStyle(e);
        return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
    };
    const content = document.querySelector('.hero-content');
    return {
        header:box(document.querySelector('header')),
        hero:box(document.querySelector('.hero')),
        content:box(content),
        heading:box(content.querySelector('h1')),
        banner:content.querySelector('.hero-usp-banner') ? box(content.querySelector('.hero-usp-banner')) : null,
        actions:[...content.querySelectorAll('.hero-buttons a')].map(box),
        floats:[...document.querySelectorAll('.call-us-button,.whatsapp-button,.phone-button')].filter(shown).map(box),
        width:innerWidth, scrollWidth:document.documentElement.scrollWidth
    };
}"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class MobileLayoutRegressions(unittest.TestCase):
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

    def page(self, path, size=(390, 664), consent='denied', javascript=True):
        page = self.browser.new_page(
            viewport={'width':size[0], 'height':size[1]},
            is_mobile=size[0] <= 768, has_touch=size[0] <= 768,
            java_script_enabled=javascript)
        page.route('**/*', lambda r: r.continue_() if r.request.url.startswith(self.base) else r.abort())
        if consent == 'denied':
            page.add_init_script("localStorage.setItem('ib-analytics-consent',JSON.stringify({choice:'denied',ts:Date.now()}))")
        page.goto(self.base + path, wait_until='load')
        if javascript:
            page.evaluate('document.fonts.ready')
        return page

    def assert_clear_hero(self, page):
        g = page.evaluate(GEOMETRY)
        first = g['banner'] or g['heading']
        self.assertGreaterEqual(first['top'], g['header']['bottom'] + 8, g)
        self.assertGreaterEqual(g['content']['top'], g['hero']['top'], g)
        self.assertLessEqual(g['content']['bottom'], g['hero']['bottom'] + 1, g)
        self.assertLessEqual(g['scrollWidth'], g['width'] + 1, g)
        for action in g['actions']:
            self.assertLessEqual(action['bottom'], g['hero']['bottom'] + 1, g)
            self.assertGreaterEqual(action['left'], 0, g)
            self.assertLessEqual(action['right'], g['width'], g)
            for floating in g['floats']:
                w = min(action['right'], floating['right']) - max(action['left'], floating['left'])
                h = min(action['bottom'], floating['bottom']) - max(action['top'], floating['top'])
                self.assertFalse(w > 4 and h > 4, g)

    def test_short_mobile_heroes_keep_content_clear_of_navigation_and_controls(self):
        for region in REGIONS:
            for size in ((320,568), (360,640), (390,664), (390,844)):
                with self.subTest(region=region, size=size):
                    page = self.page(f'/{region}/', size)
                    try:
                        self.assert_clear_hero(page)
                    finally:
                        page.close()

    def test_blog_headings_start_below_navigation_on_mobile_and_desktop(self):
        for slug in BLOGS:
            for size in ((320,568), (390,664), (1440,900)):
                with self.subTest(blog=slug, size=size):
                    page = self.page(f'/bloglar/{slug}.html', size)
                    try:
                        gap = page.locator('h1').evaluate("e=>e.getBoundingClientRect().top-document.querySelector('header').getBoundingClientRect().bottom")
                        self.assertGreaterEqual(gap, 16)
                    finally:
                        page.close()

    def test_mobile_contact_controls_appear_after_hero_and_hide_on_return(self):
        page = self.page('/sariyer/')
        try:
            controls = page.locator('.call-us-button,.whatsapp-button')
            self.assertEqual(controls.count(), 2)
            for control in controls.all():
                expect(control).to_be_hidden()
            page.evaluate("window.scrollTo(0,document.querySelector('.hero').offsetHeight+120)")
            for control in controls.all():
                expect(control).to_be_visible()
            self.assertTrue(page.locator('a.call-us-button').get_attribute('href').startswith('tel:'))
            self.assertTrue(page.locator('a.whatsapp-button').get_attribute('href').startswith('https://wa.me/'))
            page.evaluate('window.scrollTo(0,0)')
            for control in controls.all():
                expect(control).to_be_hidden()
        finally:
            page.close()

    def test_open_consent_panel_does_not_make_mobile_controls_cover_hero(self):
        for region in REGIONS[:3]:
            with self.subTest(region=region):
                page = self.page(f'/{region}/', consent='fresh')
                try:
                    expect(page.locator('.ib-consent')).to_be_visible()
                    self.assert_clear_hero(page)
                    for control in page.locator('.call-us-button,.whatsapp-button').all():
                        expect(control).to_be_hidden()
                finally:
                    page.close()

    def test_district_phone_control_variant_is_hidden_while_hero_is_visible(self):
        page = self.page('/kadikoy/', size=(360,640))
        try:
            variant = page.locator('a.phone-button')
            expect(variant).to_be_hidden()
            page.evaluate("window.scrollTo(0,document.querySelector('.hero').offsetHeight+120)")
            expect(variant).to_be_visible()
            self.assertTrue(variant.get_attribute('href').startswith('tel:'))
        finally:
            page.close()

    def test_expanded_menu_stays_inside_short_screen_and_last_link_is_reachable(self):
        page = self.page('/kadikoy/', size=(320,568))
        try:
            page.locator('.mobile-menu-button').click()
            menu = page.locator('header .main-nav')
            expect(menu).to_be_visible()
            # Wait for the existing menu opening transition before measuring.
            page.wait_for_timeout(450)
            self.assertLessEqual(menu.bounding_box()['y'] + menu.bounding_box()['height'], 568)
            last = menu.locator('a').last
            last.focus()
            expect(last).to_be_in_viewport()
        finally:
            page.close()

    def test_without_javascript_mobile_hero_and_contact_links_remain_usable(self):
        page = self.page('/kagithane/', size=(320,568), javascript=False)
        try:
            self.assert_clear_hero(page)
            actions = page.locator('.hero-buttons a')
            self.assertEqual(actions.count(), 2)
            for action in actions.all():
                expect(action).to_be_visible()
                action.scroll_into_view_if_needed()
                expect(action).to_be_in_viewport()
        finally:
            page.close()


if __name__ == '__main__':
    unittest.main()
