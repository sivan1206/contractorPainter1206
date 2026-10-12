from pathlib import Path
import threading, http.server, unittest, urllib.parse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
class Forms(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),lambda *a,**kw:Quiet(*a,directory=str(ROOT),**kw)); threading.Thread(target=cls.server.serve_forever,daemon=True).start()
  cls.pw=sync_playwright().start(); cls.browser=cls.pw.chromium.launch()
 @classmethod
 def tearDownClass(cls): cls.browser.close(); cls.pw.stop(); cls.server.shutdown()
 def page(self,home=False,consent='granted',popup=True,captcha=None, district='acibadem'):
  p=self.browser.new_page(viewport={'width':360,'height':800})
  p.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
  p.add_init_script("localStorage.setItem('ib-analytics-consent',JSON.stringify({choice:'%s',ts:Date.now()}));window.opened=[];window.open=(url)=>{return %s};window.alert=()=>{};window.quoteEvents=[];document.addEventListener('ib:quote-started',e=>quoteEvents.push(e.detail));"%(consent,'{opener:null,set location(url){opened.push(url)}}' if popup else 'null'))
  if captcha is not None:p.add_init_script('window.grecaptcha={getResponse:()=>'+repr(captcha)+'}')
  p.goto('http://127.0.0.1:%s/%s'%(self.server.server_port,'' if home else district+'/'))
  if p.locator('script[src*="/assets/js/quote-form.js"]').count()==0 and (ROOT/'assets/js/quote-form.js').exists():p.add_script_tag(url='/assets/js/quote-form.js')
  p.locator('#name, [name=name]').fill('Ayşe & #+ Test');
  if p.locator('#phone, [name=phone]').count():p.locator('#phone, [name=phone]').fill('05078322912')
  if p.locator('#email, [name=email]').count():p.locator('#email, [name=email]').fill('test@example.com')
  p.locator('#service, [name=service]').select_option(index=1);p.locator('#message, [name=message]').fill('Duvar & #+\nİstanbul')
  if home:p.locator('#district').select_option(index=1)
  elif p.locator('[name=district]').count():p.locator('[name=district]').fill('Moda')
  self.addCleanup(p.close);return p
 def submit(self,p):p.locator('#quote-form').evaluate('(f)=>f.requestSubmit()')
 def events(self,p):return p.evaluate("dataLayer.filter(a=>a[0]==='event').map(a=>[a[1],a[2]])")
 def test_blocked_retains_and_fallback_once(self):
  p=self.page(popup=False);self.submit(p)
  self.assertEqual(p.locator('#name, [name=name]').input_value(),'Ayşe & #+ Test');self.assertEqual(self.events(p),[])
  a=p.locator('[data-quote-fallback]');self.assertEqual(a.count(),1);self.assertIn('Duvar & #+\nİstanbul',urllib.parse.parse_qs(urllib.parse.urlparse(a.get_attribute('href')).query)['text'][0])
  a.evaluate('(a)=>{a.addEventListener("click",e=>e.preventDefault());a.click();a.click()}')
  self.assertEqual([x[0] for x in self.events(p)],['quote_request_started']);self.assertNotIn('test@example.com',str(self.events(p)))
 def test_success_encoding_and_duplicate_binding(self):
  p=self.page();q=ROOT/'assets/js/quote-form.js'
  if q.exists():p.add_script_tag(path=str(q))
  self.submit(p);self.assertEqual(len(p.evaluate('opened')),1)
  msg=urllib.parse.parse_qs(urllib.parse.urlparse(p.evaluate('opened[0]')).query)['text'][0]
  self.assertIn('Ayşe & #+ Test',msg);self.assertIn('Duvar & #+\nİstanbul',msg)
  self.assertEqual([x[0] for x in self.events(p)],['quote_request_started']);self.assertEqual(len(p.evaluate('quoteEvents')),1)
 def test_invalid_email(self):
  p=self.page();p.locator('#email, [name=email]').fill('bad');self.submit(p);self.assertEqual(p.evaluate('opened'),[]);self.assertEqual(self.events(p),[])
 def test_home_captcha_missing_and_empty(self):
  for cap in [None,'']:
   p=self.page(home=True,captcha=cap);self.submit(p);self.assertEqual(p.evaluate('opened'),[]);self.assertEqual(self.events(p),[]);self.assertTrue(p.locator('[data-quote-status]').is_visible())
 def test_home_captcha_valid(self):
  p=self.page(home=True,captcha='token');self.submit(p);self.assertEqual(len(p.evaluate('opened')),1);self.assertEqual([x[0] for x in self.events(p)],['quote_request_started'])
 def test_denied_no_replay(self):
  p=self.page(consent='denied');self.submit(p);self.assertEqual(self.events(p),[])
  p.locator('.ib-consent-link').click();p.locator('.ib-consent .ib-accept').click();self.assertEqual(self.events(p),[])
  self.submit(p);self.assertEqual([x[0] for x in self.events(p)],['quote_request_started'])
 def test_mobile_panel_and_preferences(self):
  p=self.page(consent='denied');p.locator('.ib-consent-link').click()
  p.wait_for_function("Array.from(document.querySelectorAll('.call-us-button,.whatsapp-button,.call-fixed')).every(e=>getComputedStyle(e).display==='none'||e.getBoundingClientRect().bottom<=document.querySelector('.ib-consent').getBoundingClientRect().top)");b=p.locator('.ib-consent').bounding_box();self.assertLess(b['height'],260)
  for selector in ['.call-us-button','.whatsapp-button','.call-fixed']:
   for c in p.locator(selector).all():
    if c.is_visible():
     box=c.bounding_box();self.assertGreaterEqual(box['y'],0);self.assertLessEqual(box['y']+box['height'],b['y'])
  p.locator('.ib-prefs').click();self.assertTrue(p.locator('.ib-consent-dialog').is_visible())
  p.keyboard.press('Escape');self.assertFalse(p.locator('.ib-consent-dialog').is_visible());self.assertTrue(p.locator('.ib-prefs').evaluate('(e)=>e===document.activeElement'))
 def test_kadikoy_optional_service_and_context(self):
  p=self.page(district='kadikoy');p.locator('[name=service]').select_option(index=0);p.locator('[name=timing]').select_option(index=1);self.submit(p)
  self.assertEqual(len(p.evaluate('opened')),1)
  msg=urllib.parse.parse_qs(urllib.parse.urlparse(p.evaluate('opened[0]')).query)['text'][0]
  self.assertIn('Moda',msg);self.assertIn('Kadıköy',msg);self.assertIn('Başlama Zamanı:',msg)
 def test_all_district_templates(self):
  districts=[p.parent.name for p in ROOT.glob('*/index.html') if (p.parent/'main.js').exists() and 'id="quote-form"' in p.read_text(encoding='utf-8')]
  self.assertEqual(len(districts),48)
  for district in districts:
   with self.subTest(district=district):
    p=self.page(district=district)
    for field in p.locator('#quote-form [required]').all():
     if not field.input_value():
      if field.evaluate('(e)=>e.tagName')=='SELECT':field.select_option(index=1)
      else:field.fill('Test')
    self.submit(p);self.assertEqual(len(p.evaluate('opened')),1);self.assertEqual([x[0] for x in self.events(p)],['quote_request_started'])
    p.close()
 def test_whitespace_required_and_changed_fallback(self):
  p=self.page(popup=False);p.locator('#name').fill('   ');self.submit(p);self.assertEqual(p.locator('[data-quote-fallback]:visible').count(),0);self.assertEqual(self.events(p),[])
  p.locator('#name').fill('Test Name');self.submit(p);self.assertTrue(p.locator('[data-quote-fallback]').is_visible());p.locator('#message').fill('Changed');self.assertFalse(p.locator('[data-quote-fallback]').is_visible());self.assertEqual(self.events(p),[])
 def test_regrant_updates_google_consent_without_replay(self):
  p=self.page();self.submit(p)
  self.assertEqual(len(self.events(p)),1)
  p.locator('.ib-consent-link').click();p.locator('.ib-consent .ib-reject').click()
  self.submit(p);self.assertEqual(len(self.events(p)),1)
  self.assertEqual(p.evaluate("dataLayer.filter(a=>a[0]==='consent'&&a[1]==='update').at(-1)[2].analytics_storage"),'denied')
  p.locator('.ib-consent-link').click();p.locator('.ib-consent .ib-accept').click()
  self.assertEqual(p.evaluate("dataLayer.filter(a=>a[0]==='consent'&&a[1]==='update').at(-1)[2].analytics_storage"),'granted')
  self.assertEqual(len(self.events(p)),1)
  self.submit(p);self.assertEqual(len(self.events(p)),2)
  self.assertEqual(p.locator('script[src^="https://www.googletagmanager.com/gtag/js"]').count(),1)
 def test_mobile_floating_contacts_do_not_cover_hero(self):
  for home in [True,False]:
   for width in [360,390]:
    p=self.page(home=home,district='kadikoy',consent='denied');p.set_viewport_size({'width':width,'height':800});p.locator('.ib-consent-link').click();p.evaluate('scrollTo(0,0)')
    p.wait_for_function("document.documentElement.classList.contains('ib-consent-open')")
    result=p.evaluate("""()=>{
      const cs=Array.from(document.querySelectorAll('.call-us-button,.call-button,.call-fixed,.whatsapp-button'));
      const floats=cs.filter(e=>getComputedStyle(e).position==='fixed');
      const ordinary=Array.from(document.querySelectorAll('.hero a[href],.hero-content a[href],.slide.active a[href]')).filter(e=>getComputedStyle(e).position!=='fixed');
      const targets=Array.from(document.querySelectorAll('.hero h1,.hero h2,.hero a[href],.hero-content h1,.hero-content h2,.hero-content a[href],.slide.active h1,.slide.active h2,.slide.active a[href]'));
      const visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0;
      const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
      return {count:floats.length, overlaps:floats.filter(visible).some(f=>targets.filter(visible).some(t=>intersects(f.getBoundingClientRect(),t.getBoundingClientRect()))), ordinary:ordinary.filter(visible).length};
    }""")
    self.assertGreater(result['count'],0);self.assertFalse(result['overlaps']);self.assertGreater(result['ordinary'],0)
    p.locator('.ib-consent .ib-reject').click()
    self.assertGreater(p.locator('.call-us-button:visible,.call-fixed:visible,.whatsapp-button:visible').count(),0)
 def test_preferences_choice_keeps_current_scroll_position(self):
  for choice in ['ib-reject','ib-accept']:
   p=self.page(home=True,consent='unset')
   p.evaluate('()=>{document.activeElement.blur();scrollTo(0,0)}')
   p.wait_for_function('scrollY < 1')
   p.locator('.ib-consent .ib-prefs').click()
   p.locator('.ib-consent-dialog .'+choice).click()
   p.wait_for_function("document.querySelector('.ib-consent').hidden")
   p.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
   self.assertLess(p.evaluate('scrollY'),5,'Choosing consent must not jump to the footer')
   self.assertGreater(p.locator('.btn-whatsapp-hero').count(),0)
   p.close()
 def test_mobile_menu_close_icon_and_escape(self):
  for home,district in [(True,'acibadem'),(False,'kadikoy'),(False,'acarkent'),(False,'acibadem')]:
   with self.subTest(home=home,district=district):
    p=self.page(home=home,district=district);p.evaluate('scrollTo(0,0)')
    menu=p.locator('.mobile-menu-button');menu.click()
    self.assertEqual(menu.get_attribute('aria-expanded'),'true')
    content=menu.locator('i').evaluate("e=>getComputedStyle(e,'::before').content")
    self.assertIn('\uf00d',content,'Open menus must show the close icon')
    self.assertIn('IB Site Icons Free',menu.locator('i').evaluate("e=>getComputedStyle(e,'::before').fontFamily"))
    p.keyboard.press('Escape');self.assertEqual(menu.get_attribute('aria-expanded'),'false');p.close()
if __name__=='__main__':unittest.main(verbosity=2)
