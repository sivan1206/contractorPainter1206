"""Behavior checks for reference parsing, path confinement and alias preservation."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import sys
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import prepare_public_assets as assets

class PublicAssetTests(unittest.TestCase):
    def test_inline_icon_integration_removes_legacy_links_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);out=root/'reports';out.mkdir();(root/'assets/css').mkdir(parents=True)
            (root/'assets/css/icons.css').write_text('.fas{font-family:"IB Site Icons Free"}',encoding='utf8')
            (out/'media-format-map.json').write_text('{"replacements":[]}',encoding='utf8')
            page=root/'index.html'
            page.write_text('<head><link rel="preload" as="style" href="/fontawesome-free-6.7.2-web/css/all.min.css">'
                            '<link rel="stylesheet" href="../fontawesome-free-6.7.2-web/css/all.min.css?v=old" media="print">'
                            '<noscript><link rel="stylesheet" href="https://istanbulboyacilik.com/fontawesome-free-6.7.2-web/css/all.min.css"></noscript>'
                            '<link rel="stylesheet" href="/styles.pure.css"></head><body><i class="fas fa-phone"></i></body>',encoding='utf8')
            with patch.object(assets,'ROOT',root),patch.object(assets,'OUT',out),patch.object(assets,'sources',return_value=[page]):
                assets.apply_references()
                result=page.read_text(encoding='utf8')
                self.assertNotIn('fontawesome-free-6.7.2-web/css/all.min.css',result)
                self.assertEqual(result.count('data-ib-icons="inline"'),1)
                self.assertIn('href="/styles.pure.css"',result)
                self.assertNotIn('<noscript></noscript>',result)
                assets.apply_references()
                self.assertEqual(page.read_text(encoding='utf8'),result)

    def test_reference_parser_covers_css_srcset_and_schema(self):
        text = '<img srcset="../images/a.WebP 400w, /images/b.webp 800w"><style>p{background:url(/images/c.webp)}</style>{"image":"https://istanbulboyacilik.com/images/d.webp"}'
        self.assertEqual(list(assets.image_references(text)), ['../images/a.WebP','/images/b.webp','/images/c.webp','https://istanbulboyacilik.com/images/d.webp'])

    def test_picture_types_follow_actual_candidate_formats(self):
        mixed='<source srcset="a.webp 400w, b.jpg 800w" type="image/webp">'
        self.assertEqual(assets.correct_image_types(mixed), '<source srcset="a.webp 400w, b.jpg 800w">')
        self.assertIn('type="image/avif"', assets.correct_image_types('<source srcset="a.avif" type="image/webp">'))
        self.assertIn('type="image/jpeg"', assets.correct_image_types('<link rel="preload" href="a.jpg" type="image/webp">'))

    def test_reference_resolution_stays_inside_root_and_rejects_external_hosts(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);image=root/'images/a.webp';image.parent.mkdir();image.write_bytes(b'example');page=root/'district/index.html'
            with patch.object(assets,'ROOT',root):
                for ref in ['../images/a.webp','/images/a.webp','https://istanbulboyacilik.com/images/a.webp']:
                    self.assertEqual(assets.resolve_reference(page,ref),image.resolve())
                self.assertIsNone(assets.resolve_reference(page,'https://other.example/images/a.webp'))
                self.assertIsNone(assets.resolve_reference(page,'../../outside.webp'))

    def test_aliases_are_byte_identical_idempotent_and_collision_safe(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);out=root/'reports';out.mkdir();page=root/'index.html';legacy=root/'photo.webp';alias=root/'photo.jpg'
            Image.new('RGB',(4,3),(10,20,30)).save(legacy,format='JPEG');page.write_text('<img src="photo.webp">',encoding='utf8')
            with patch.object(assets,'ROOT',root),patch.object(assets,'OUT',out),patch.object(assets,'sources',return_value=[page]):
                result=assets.media_inventory();self.assertEqual(result['aliases'],1);self.assertEqual(alias.read_bytes(),legacy.read_bytes())
                self.assertEqual(assets.media_inventory()['replacements'][0]['new'],'photo.jpg')
                alias.write_bytes(b'conflicting original');self.assertRaises(ValueError,assets.media_inventory)
                self.assertEqual(alias.read_bytes(),b'conflicting original');self.assertTrue(legacy.is_file())


    def test_literal_pseudo_glyphs_survive_subsetting_and_family_migration(self):
        import shutil
        from fontTools.ttLib import TTFont
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);out=root/'reports';out.mkdir();(root/'assets/css').mkdir(parents=True)
            vendor=root/'fontawesome-free-6.7.2-web'
            original=assets.ROOT/'fontawesome-free-6.7.2-web'
            for rel in ['css/all.min.css','LICENSE.txt','webfonts/fa-solid-900.woff2','webfonts/fa-brands-400.woff2','webfonts/fa-regular-400.woff2']:
                target=vendor/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(original/rel,target)
            page=root/'index.html'
            page.write_text('<head><style>.close:before{content:"\\f00d";font-family:"Font Awesome 6 Free";font-weight:900}.arrow:after{content:"\\f107";font-family:"Font Awesome 5 Free";font-weight:900}</style></head><body><span class="close fas fa-phone"></span><i class="fab fa-whatsapp"></i><i class="far fa-circle"></i></body>',encoding='utf8')
            with patch.object(assets,'ROOT',root),patch.object(assets,'OUT',out),patch.object(assets,'sources',return_value=[page]):
                assets.icon_assets()
                cmap=TTFont(root/'assets/fonts/fa-site-solid-900.woff2').getBestCmap()
                self.assertTrue({0xf00d,0xf107}.issubset(cmap),'CSS pseudo-element glyphs must be retained')
                (out/'media-format-map.json').write_text('{"replacements":[]}',encoding='utf8')
                assets.apply_references()
                result=page.read_text(encoding='utf8')
                self.assertNotIn('Font Awesome 6 Free',result);self.assertNotIn('Font Awesome 5 Free',result)
                self.assertIn('IB Site Icons Free',result);self.assertIn('data-ib-icons="inline"',result)
                self.assertIn('.sr-only',result)
                self.assertNotIn('<link rel="stylesheet" href="/assets/css/icons.css">',result)
                self.assertEqual((root/'assets/fonts/LICENSE.txt').read_text(encoding='utf8'),(vendor/'LICENSE.txt').read_text(encoding='utf8'))
                generated={p.name:p.read_bytes() for p in (root/'assets/fonts').iterdir()}
                with patch('fontTools.ttLib.tables._h_e_a_d.timestampNow',return_value=4000000000):
                    assets.icon_assets()
                assets.apply_references()
                self.assertEqual(page.read_text(encoding='utf8'),result)
                self.assertEqual({p.name:p.read_bytes() for p in (root/'assets/fonts').iterdir()},generated)

if __name__=='__main__':unittest.main()
