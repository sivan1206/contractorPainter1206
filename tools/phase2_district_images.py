"""Surgical district image/hours update; originals and testimonial markup retained."""
from pathlib import Path
import io, json, re
from PIL import Image, ImageOps
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / '.docs/reports/seo/2026-10-05'
PAGES = sorted(p for p in ROOT.glob('*/index.html') if p.parent.name not in {'bloglar', 'boyaci', 'dist'})
manifest_path = REPORT / 'phase2-district-images.json'
previous = json.loads(manifest_path.read_text('utf-8')) if manifest_path.is_file() else {}
assets = [row for row in previous.get('generated_assets', []) if (ROOT / row['file']).is_file()]
changes, inspected = [], []

def variant(path, width, portrait=False):
    out = path.with_name(path.stem + (f'-mobile-{width}' if portrait else f'-{width}') + '.webp')
    im = Image.open(path)
    if out.exists():
        existing = Image.open(out)
        if existing.width == width and (not portrait or existing.height == width * 2) and out.stat().st_size < path.stat().st_size:
            return out
    if portrait:
        if im.height < width * 2 or im.width < width:
            return None
        im = ImageOps.fit(im, (width, width * 2), Image.Resampling.LANCZOS, centering=(.5,.5))
    else:
        if im.width <= width:
            return None
        im = im.resize((width, round(im.height * width / im.width)), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    im.save(buffer, format='WEBP', quality=82, method=6)
    if len(buffer.getvalue()) >= path.stat().st_size:
        return None
    # Never overwrite existing derivative files owned by earlier work.
    if out.exists():
        out = path.with_name(path.stem + f'-phase2-{width}' + '.webp')
    out.write_bytes(buffer.getvalue())
    row = {'file':out.relative_to(ROOT).as_posix(),'bytes':out.stat().st_size,'dimensions':list(im.size),'original':path.relative_to(ROOT).as_posix(),'original_bytes':path.stat().st_size}
    assets[:] = [item for item in assets if item['file'] != row['file']]
    assets.append(row)
    return out

def attribute(tag, name, value):
    if re.search(r'\b' + name + r'\s*=\s*["\']', tag):
        return re.sub(r'(\b' + name + r'\s*=\s*)(["\']).*?\2',lambda m:m[1]+'"'+value+'"',tag,flags=re.S)
    return re.sub(r'\s*/?>$',lambda m:' '+name+'="'+value+'"'+m[0],tag)

def update_business(raw):
    decoder=json.JSONDecoder()
    for match in re.finditer(r'\{\s*"@type"\s*:\s*(?:\[\s*)?"(?:LocalBusiness|HousePainter)"',raw):
        obj,end=decoder.raw_decode(raw[match.start():])
        types=obj.get('@type',[])
        if isinstance(types,str):types=[types]
        if 'LocalBusiness' not in types and 'HousePainter' not in types:continue
        old=raw[match.start():match.start()+end]
        spec={'@type':'OpeningHoursSpecification','dayOfWeek':['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],'opens':'00:00','closes':'23:59'}
        if 'openingHours' in obj or 'openingHoursSpecification' in obj:
            obj['openingHours']='Mo-Su 00:00-23:59';obj['openingHoursSpecification']=spec
            new=json.dumps(obj,ensure_ascii=True,separators=(',',':'))
        else:
            new=old[:-1]+',"openingHours":"Mo-Su 00:00-23:59","openingHoursSpecification":'+json.dumps(spec,separators=(',',':'))+'}'
        return raw[:match.start()]+new+raw[match.start()+end:]
    raise AssertionError('Missing business object')

def run():
    for page in PAGES:
        raw=page.read_bytes().decode('utf-8'); before=raw
        # Replace the generated block rather than appending one on every run.
        raw=re.sub(r'<style\s+data-phase2="responsive-hero">.*?</style>\r?\n?', '', raw, flags=re.S)
        css=(page.parent/'styles.pure.css').read_text('utf-8')
        modern='min(100%,350px)' in css
        # These match measured service grid widths: 90% container / 30px gap,
        # or 48px section inset / 32px gap with a 1200px grid cap.
        sizes='(max-width: 811px) 90vw, (max-width: 1233px) calc(45vw - 15px), (max-width: 1333px) calc(30vw - 20px), 380px' if modern else '(max-width: 679px) calc(100vw - 48px), (max-width: 1011px) calc(50vw - 40px), (max-width: 1247px) calc(33.333vw - 37.333px), 379px'
        raw=update_business(raw)
        raw=re.sub(r'Çalışma Saatleri:\s*[^<\r\n]+','Çalışma Saatleri: 7/24 (Pzt-Paz 00:00-23:59)',raw)
        if 'Çalışma Saatleri:' not in raw:
            # Add factual hours to the existing contact information container.
            soup=BeautifulSoup(raw,'html.parser');box=soup.select_one('.contact-info')
            assert box is not None, page
            heading=box.find(['h2','h3'])
            assert heading is not None,page
            # Locate exact existing heading markup; no serialization of the page.
            matches=list(re.finditer(r'<h[23]\b[^>]*>.*?</h[23]>',raw,re.S))
            match=next(m for m in matches if BeautifulSoup(m[0],'html.parser').get_text()==heading.get_text())
            raw=raw[:match.end()]+'\r\n        <p><i class="fas fa-clock"></i> Çalışma Saatleri: 7/24 (Pzt-Paz 00:00-23:59)</p>'+raw[match.end():]
        def image(match):
            tag=match[0];node=BeautifulSoup(tag,'html.parser').img
            src=node.get('src','');path=page.parent/src
            if not path.is_file() or path.stat().st_size<=100000:return tag
            if 'kadikoy-boyaci' in src:return tag
            im=Image.open(path)
            inspected.append({'page':page.parent.name,'src':src,'bytes':path.stat().st_size,'dimensions':list(im.size)})
            candidates=[]
            for width in [400,800]:
                out=variant(path,width)
                if out:candidates.append((out.relative_to(page.parent).as_posix(),Image.open(out).width))
            if not candidates:return tag
            if all(w!=im.width for _,w in candidates):candidates.append((src,im.width))
            tag=attribute(tag,'srcset',', '.join(f'{s} {w}w' for s,w in candidates))
            return attribute(tag,'sizes',sizes)
        raw=re.sub(r'<img\b[^>]*>',image,raw,flags=re.S|re.I)
        # A single-source picture source would otherwise bypass its img srcset.
        def picture(match):
            block=match[0];img=BeautifulSoup(block,'html.parser').img
            if img and img.get('srcset') and 'kadikoy-boyaci' not in img.get('src',''):
                block=re.sub(r'<source\b[^>]*>',lambda m:attribute(attribute(m[0],'srcset',img['srcset']),'sizes',img['sizes']),block,flags=re.S)
            return block
        raw=re.sub(r'<picture\b[^>]*>.*?</picture>',picture,raw,flags=re.S)
        hero_rules=list(re.finditer(r'(\.hero(?:::before)?\s*)\{([^}]*url\([^}]+)\}',raw,re.S))
        if page.parent.name!='kadikoy':
            assert hero_rules,page
            rule=hero_rules[0];url=re.search(r'url\((["\']?)(.*?)\1\)',rule[2]);src=url[2]
            path=page.parent/src;assert path.is_file(),path
            image_value=re.search(r'background\s*:\s*(.*?);',rule[2],re.S)
            if image_value is None: image_value=re.search(r'background\s*:\s*(.*)',rule[2],re.S)
            assert image_value,page
            value=image_value[1].strip()
            mobile=variant(path,400,portrait=True);tablet=variant(path,800)
            rules=[]
            for bp,out in [(768,tablet),(480,mobile)]:
                if out:
                    replacement=out.relative_to(page.parent).as_posix()
                    val=re.sub(r'url\((["\']?)(.*?)\1\)',f'url("{replacement}")',value)
                    rules.append(f'@media(max-width:{bp}px){{{rule[1].strip()}{{background:{val}!important}}}}')
            if rules:raw=raw.replace('</head>','<style data-phase2="responsive-hero">'+''.join(rules)+'</style>\r\n</head>',1)
        if raw!=before:
            page.write_bytes(raw.encode('utf-8'));changes.append(page.relative_to(ROOT).as_posix())
    REPORT.mkdir(parents=True,exist_ok=True)
    applied = sorted(set(previous.get('changed_html', [])) | set(changes))
    report = {**previous, 'changed_html':applied, 'generated_assets':assets, 'large_img_uses_inspected':inspected}
    manifest_path.write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
    print(json.dumps({'changed_this_run':len(changes),'applied_html':len(applied),'generated_assets':len(assets),'large_img_uses_inspected':len(inspected)}))

if __name__=='__main__':run()
