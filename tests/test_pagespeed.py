"""Regressions reported by the real PageSpeed run, tested in a browser."""
from pathlib import Path
import functools,http.server,re,threading,unittest,hashlib
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
def contrast(foreground,background):
    def luminance(color):
        rgb=[int(x)/255 for x in re.findall(r'\d+',color)[:3]]
        linear=[x/12.92 if x<=0.04045 else ((x+0.055)/1.055)**2.4 for x in rgb]
        return sum(x*w for x,w in zip(linear,[0.2126,0.7152,0.0722]))
    a,b=sorted([luminance(foreground),luminance(background)])
    return (b+0.05)/(a+0.05)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
class PageSpeedRegressions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever,daemon=True).start()
        cls.pw=sync_playwright().start();cls.browser=cls.pw.chromium.launch()
    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.pw.stop();cls.server.shutdown()
    def page(self):
        page=self.browser.new_page(viewport={'width':390,'height':844})
        page.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
        page.add_init_script("localStorage.setItem('ib-analytics-consent',JSON.stringify({choice:'denied',ts:Date.now()}))")
        page.goto(f'http://127.0.0.1:{self.server.server_port}/',wait_until='load')
        self.addCleanup(page.close);return page
    def test_whatsapp_fallback_has_crawlable_url_before_and_after_input(self):
        page=self.page();fallback=page.locator('[data-quote-fallback]')
        self.assertEqual(fallback.count(),1)
        self.assertEqual(fallback.get_attribute('href'),'https://wa.me/905078322912')
        page.locator('#name').fill('Test kullanıcı')
        self.assertEqual(fallback.get_attribute('href'),'https://wa.me/905078322912')
        self.assertFalse(fallback.is_visible())
        self.assertEqual(page.locator('a:not([href])').count(),0)
    def test_whatsapp_keeps_white_and_passes_contrast_in_all_states(self):
        page=self.page();cta=page.locator('.btn-whatsapp-hero')
        for state in ['normal','hover','focus']:
            with self.subTest(state=state):
                if state=='hover':cta.hover()
                if state=='focus':page.mouse.move(0,0);cta.focus()
                page.wait_for_timeout(350)
                colors=cta.evaluate("e=>({fg:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor,icon:getComputedStyle(e.querySelector('i')).color})")
                self.assertEqual(colors['fg'],'rgb(255, 255, 255)');self.assertEqual(colors['icon'],'rgb(255, 255, 255)')
                self.assertGreaterEqual(contrast(colors['fg'],colors['bg']),4.5)
    def test_icon_css_is_inline_and_does_not_block_on_external_stylesheet(self):
        page=self.page()
        self.assertEqual(page.locator('link[rel=stylesheet][href*="assets/css/icons.css"]').count(),0)
        self.assertEqual(page.locator('style[data-ib-icons]').count(),1)
        page.evaluate('document.fonts.ready')
        self.assertIn('IB Site Icons',page.locator('.mobile-menu-button i').evaluate("e=>getComputedStyle(e).fontFamily"))
        self.assertNotEqual(page.locator('.mobile-menu-button i').evaluate("e=>getComputedStyle(e,'::before').content"),'none')
        self.assertEqual(page.locator('link[rel=preconnect],link[rel=dns-prefetch]').count(),0)
    def test_generated_analytics_is_current_and_loaded(self):
        source=(ROOT/'assets/js/analytics.js').read_text(encoding='utf8')
        compiled=(ROOT/'assets/js/analytics.min.js').read_text(encoding='utf8')
        digest=hashlib.sha256(source.encode('utf8')).hexdigest()
        self.assertIn('source-sha256: '+digest,compiled)
        page=self.page()
        self.assertEqual(page.locator('script[src*="assets/js/analytics.min.js"]').count(),1)
        self.assertEqual(page.locator('script[src*="assets/js/analytics.js"]').count(),0)

if __name__=='__main__':unittest.main()
