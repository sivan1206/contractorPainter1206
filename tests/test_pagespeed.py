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
    def test_calculator_validates_bounds_on_click_and_enter(self):
        page=self.page()
        valid={'10':'1.000–2.000 TL','100':'10.000–20.000 TL','1000':'100.000–200.000 TL'}
        invalid=['','-5','0','1','1001','2000','10.5']
        for val,expected in valid.items():
            page.locator('#area').fill(val);page.locator('#calculate-btn').click()
            self.assertEqual(page.locator('#estimated-cost').text_content(),expected)
            page.locator('#estimated-cost').evaluate("e=>e.textContent='RESET'")
            page.locator('#area').fill(val);page.locator('#area').press('Enter')
            self.assertEqual(page.locator('#estimated-cost').text_content(),expected)
        for val in invalid:
            page.locator('#area').fill('100');page.locator('#calculate-btn').click()
            page.locator('#area').fill(val);page.locator('#calculate-btn').click()
            click_msg=page.locator('#estimated-cost').text_content()
            self.assertIn('10 ile 1000',click_msg)
            page.locator('#area').fill('100');page.locator('#calculate-btn').click()
            page.locator('#area').fill(val);page.locator('#area').press('Enter')
            enter_msg=page.locator('#estimated-cost').text_content()
            self.assertEqual(click_msg,enter_msg)
    def test_hero_h1_geometry_matches_before_and_after_external_css(self):
        base=f'http://127.0.0.1:{self.server.server_port}'
        probe="""e=>{const cs=getComputedStyle(e),r=e.getBoundingClientRect();return {fontFamily:cs.fontFamily,fontSize:cs.fontSize,lineHeight:cs.lineHeight,maxWidth:cs.maxWidth,letterSpacing:cs.letterSpacing,width:Math.round(r.width*100)/100,height:Math.round(r.height*100)/100}}"""
        for w,h in [(390,844),(600,900),(1365,900)]:
            with self.subTest(viewport=f'{w}x{h}'):
                p1=self.browser.new_page(viewport={'width':w,'height':h})
                p1.route('**/*',lambda r:r.abort() if 'styles.pure.css' in r.request.url or not r.request.url.startswith(base) else r.continue_())
                p1.goto(f'{base}/',wait_until='load');before=p1.locator('.hero-content h1').evaluate(probe);p1.close()
                p2=self.browser.new_page(viewport={'width':w,'height':h})
                p2.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) else r.abort())
                p2.goto(f'{base}/',wait_until='load');after=p2.locator('.hero-content h1').evaluate(probe);p2.close()
                self.assertEqual(before,after)
    def test_district_faq_search_shows_accessible_empty_state(self):
        page=self.page()
        page.goto(f'http://127.0.0.1:{self.server.server_port}/kadikoy/',wait_until='load')
        page.locator('#faq-search').fill('zzzzz_olmayan_kelime')
        empty=page.locator('#faq-empty-state')
        self.assertEqual(empty.count(),1);self.assertTrue(empty.is_visible())
        self.assertEqual(empty.get_attribute('role'),'status')
        self.assertEqual(empty.get_attribute('aria-live'),'polite')

if __name__=='__main__':unittest.main()
