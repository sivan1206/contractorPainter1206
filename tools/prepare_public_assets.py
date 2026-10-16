"""Build local icon subsets and byte-identical format aliases; opt-in reference integration.

Run generation after content edits, then --apply-references once editors have finished.
No original image/font is deleted. Only the repository's public-file policy is scanned.
"""
import argparse, hashlib, json, re, shutil
from pathlib import Path
from urllib.parse import unquote, urlsplit
from PIL import Image
from build_site import public_file

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.docs/12-10-2026'
IMAGE_TOKEN = re.compile(r"[^\s\"'<>;,{}]+")
IMAGE_END = re.compile(r"\.(?:webp|avif|jpe?g|png|gif|svg|ico)(?:\?[^\s]*)?$", re.I)

def image_references(text):
    for match in IMAGE_TOKEN.finditer(text):
        token = re.sub(r'^.*?url\(', '', match[0]).rstrip(')')
        if IMAGE_END.search(token):
            yield token

FA_FACE = re.compile(r'@font-face\s*\{[^{}]*font-family\s*:\s*[\"\']?(?:Font Awesome[^;\"\']*|FontAwesome)[\"\']?\s*;[^{}]*\}',re.I)

def pseudo_codepoints(text):
    """Retain literal icon content even when no fa-* class uses the glyph."""
    codes = set()
    for match in re.finditer(r'\bcontent\s*:\s*([\"\'])(.*?)\1', text, re.S):
        value = match[2]
        codes.update(int(code, 16) for code in re.findall(r'\\([0-9a-fA-F]{1,6})(?:\s)?', value))
        codes.update(ord(char) for char in value if 0xe000 <= ord(char) <= 0xf8ff)
    return {code for code in codes if 0xe000 <= code <= 0xf8ff}

def migrate_icon_families(text):
    text = re.sub(r'Font Awesome [56] Free|FontAwesome', 'IB Site Icons Free', text)
    return re.sub(r'Font Awesome [56] Brands', 'IB Site Icons Brands', text)

def sources():
    return sorted(p for p in ROOT.rglob('*') if 'fontawesome-free-6.7.2-web' not in p.parts and p.is_file() and public_file(p.relative_to(ROOT).as_posix()) and p.suffix.lower() in {'.html','.css','.js','.json','.xml'})

def resolve_reference(source, ref):
    parsed = urlsplit(ref)
    if parsed.netloc and parsed.netloc.lower() not in {'istanbulboyacilik.com','www.istanbulboyacilik.com'}:
        return None
    path = unquote(parsed.path)
    resolved = (ROOT / path.lstrip('/') if parsed.netloc or path.startswith('/') else source.parent / path).resolve()
    return resolved if resolved.is_relative_to(ROOT.resolve()) and resolved.is_file() else None

def media_inventory():
    files, replacements = {}, []
    for source in sources():
        for ref in image_references(source.read_text(encoding='utf8')):
            path = resolve_reference(source,ref)
            if not path: continue
            key = path.relative_to(ROOT).as_posix()
            if key not in files:
                try:
                    with Image.open(path) as im: fmt, dims = im.format, [im.width,im.height]
                except (OSError,ValueError): continue
                files[key] = {'file':key,'format':fmt,'dimensions':dims,'bytes':path.stat().st_size,'references':[]}
            row=files[key]; row['references'].append({'source':source.relative_to(ROOT).as_posix(),'reference':ref})
            if path.suffix.lower()=='.webp' and row['format'] in {'JPEG','AVIF'}:
                ext = '.jpg' if row['format']=='JPEG' else '.avif'
                alias = path.with_suffix(ext)
                if alias.exists() and alias.read_bytes()!=path.read_bytes(): raise ValueError(f'Conflicting alias: {alias}')
                if not alias.exists(): shutil.copyfile(path,alias)
                row['alias']=alias.relative_to(ROOT).as_posix(); row['sha256']=hashlib.sha256(path.read_bytes()).hexdigest()
                replacements.append({'source':source.relative_to(ROOT).as_posix(),'old':ref,'new':re.sub(r'\.webp(?=\?|$)',ext,ref,flags=re.I)})
    result={'unique_referenced_images':len(files),'reference_occurrences':sum(len(v['references']) for v in files.values()),'aliases':sum('alias' in v for v in files.values()),'images':list(files.values()),'replacements':replacements}
    (OUT/'media-format-map.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    return result

def icon_assets():
    from fontTools import subset
    from fontTools.ttLib import TTFont
    vendor=ROOT/'fontawesome-free-6.7.2-web'; css=(vendor/'css/all.min.css').read_text(encoding='utf8')
    classes=set(); literal_codes=set()
    for p in sources():
        raw=p.read_text(encoding='utf8')
        # Generated CSS includes --fa-* variables and font filenames, neither
        # of which is a markup class. Exclude it from the next source scan.
        if p.suffix=='.html':
            raw=re.sub(r'<style\b[^>]*\bdata-ib-icons\b[^>]*>.*?</style\s*>','',raw,flags=re.S)
        if p.suffix in {'.html','.js'}:
            classes.update(re.findall(r'\bfa-[a-z0-9-]+',raw))
        if p.suffix in {'.html','.css'}:
            literal_codes.update(pseudo_codepoints(raw))
    mappings={}
    for selectors,code in re.findall(r'([^{}]+)\{--fa:"\\([0-9a-f]+)"\}',css):
        for cls in re.findall(r'\.([\w-]+)',selectors):mappings[cls]=int(code,16)
    used={c:mappings[c] for c in sorted(classes) if c in mappings}
    unknown=classes-set(mappings)
    # Screen-reader utilities occur after the glyph mappings in vendor CSS.
    # They must survive the subset too: their labels stay in the accessibility
    # tree while being clipped out of the visual layout.
    screen_reader_rules=''.join(selectors+'{'+body+'}' for selectors,body in re.findall(r'([^{}]+)\{([^{}]*)\}',css)
                                if re.search(r'\.(?:fa-)?sr-only(?:-focusable)?(?=[:,\s]|$)',selectors))
    utilities=set(re.findall(r'\.([\w-]+)',css.split('.fa-0{')[0]+screen_reader_rules))
    if unknown-utilities: raise ValueError(f'Unresolved icon classes: {unknown-utilities}')
    codes=set(used.values()) | literal_codes
    fonts=ROOT/'assets/fonts';fonts.mkdir(exist_ok=True)
    reports=[]; rules=[]
    for style,weight in [('solid',900),('brands',400),('regular',400)]:
        src=vendor/f'webfonts/fa-{style}-{weight}.woff2';font=TTFont(src,recalcTimestamp=False)
        available=set(font.getBestCmap());selected=codes & available
        options=subset.Options();options.flavor='woff2';options.recalc_timestamp=False;options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*']
        sub=subset.Subsetter(options=options);sub.populate(unicodes=selected);sub.subset(font)
        # Subsetting is a Modified Version under OFL: avoid the reserved font name.
        renamed = f'IB Site Icons {style.title()}'
        for record in font['name'].names:
            if record.nameID in {1,3,4,6,16,18}:
                value = renamed.replace(' ','') if record.nameID==6 else renamed
                record.string = value.encode(record.getEncoding())
        target=fonts/f'fa-site-{style}-{weight}.woff2';font.save(target)
        actual=set(TTFont(target).getBestCmap() or {})
        if not selected.issubset(actual):raise ValueError(f'Missing glyphs in {target}')
        reports.append({'style':style,'original_bytes':src.stat().st_size,'subset_bytes':target.stat().st_size,'codepoints':[hex(c) for c in sorted(actual)]})
        family='Brands' if style=='brands' else 'Free'
        rules.append(f'@font-face{{font-family:"IB Site Icons {family}";font-style:normal;font-weight:{weight};font-display:swap;src:url("/assets/fonts/{target.name}") format("woff2")}}')
    # Base, sizing and animation rules come directly from the licensed vendor CSS.
    base=css[:css.index('.fa-0{')].replace('Font Awesome 6 Free','IB Site Icons Free').replace('Font Awesome 6 Brands','IB Site Icons Brands')
    glyphs=''.join(f'.{name}{{--fa:"\\{code:x}"}}' for name,code in used.items())
    cssout=base+screen_reader_rules+glyphs+''.join(rules)+'.fa-solid,.fas{font-weight:900}.fa-brands,.fab,.fa-regular,.far{font-weight:400}'
    (ROOT/'assets/css/icons.css').write_text(cssout,encoding='utf8')
    # Keep the full OFL/MIT/CC-BY license beside the subsets. The build policy
    # permits this exact path, without exposing arbitrary internal text files.
    license=(vendor/'LICENSE.txt').read_text(encoding='utf8')
    (fonts/'LICENSE.txt').write_text(license,encoding='utf8')
    with (ROOT/'assets/css/icons.css').open('a',encoding='utf8') as f:
        f.write('\n/*! Font Awesome subset: full license /assets/fonts/LICENSE.txt */\n')
    solid=set(int(c,16) for f in reports if f['style']=='solid' for c in f['codepoints']);brands=set(int(c,16) for f in reports if f['style']=='brands' for c in f['codepoints'])
    if not codes.issubset(solid|brands):raise ValueError('Icon glyph not in solid/brands subsets')
    if not literal_codes.issubset(solid):raise ValueError('CSS pseudo-element glyph missing from solid subset')
    result={'used_icon_classes':used,'literal_pseudo_codepoints':[hex(c) for c in sorted(literal_codes)],'utility_classes':sorted(unknown),'fonts':reports,'solid_brands_before_bytes':sum(f['original_bytes'] for f in reports if f['style']!='regular'),'solid_brands_after_bytes':sum(f['subset_bytes'] for f in reports if f['style']!='regular')}
    (OUT/'icon-subset-coverage.json').write_text(json.dumps(result,indent=2),encoding='utf8');return result

def correct_image_types(text):
    """A picture source can mix candidates: omit a single-format type in that case."""
    def fix(match):
        tag=match[0]
        if 'type="image/webp"' not in tag: return tag
        references=list(image_references(tag))
        formats={Path(urlsplit(ref).path).suffix.lower() for ref in references}
        if not formats or formats=={'.webp'}: return tag
        mime={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.avif':'image/avif','.png':'image/png'}
        if len(formats)==1 and next(iter(formats)) in mime:
            return tag.replace('type="image/webp"',f'type="{mime[next(iter(formats))]}"')
        return tag.replace(' type="image/webp"','')
    return re.sub(r'<(?:source|link)\b[^>]*>',fix,text,flags=re.S)

def apply_references():
    data=json.loads((OUT/'media-format-map.json').read_text(encoding='utf8'));byfile={}
    for r in data['replacements']:byfile.setdefault(r['source'],{})[r['old']]=r['new']
    changes=[]
    icons=(ROOT/'assets/css/icons.css').read_text(encoding='utf8')
    inline_icons='<style data-ib-icons="inline">'+icons.replace('</style','<\\/style')+'</style>'
    for source in sources():
        old=source.read_text(encoding='utf8');new=old
        for ref,replacement in sorted(byfile.get(source.relative_to(ROOT).as_posix(),{}).items(),key=lambda p:-len(p[0])):new=new.replace(ref,replacement)
        if source.suffix=='.html':new=correct_image_types(new)
        if source.suffix in {'.html','.css'}:
            new=FA_FACE.sub('',new)
            new=migrate_icon_families(new)
            if source.suffix=='.html':
                new=re.sub(r'<style\b[^>]*\bdata-ib-icons\b[^>]*>.*?</style\s*>',lambda _:inline_icons,new,flags=re.S)
                def inline_link(match):
                    tag=match[0]
                    if re.search(r'\bhref=["\']/assets/css/icons\.css(?:\?[^"\']*)?["\']',tag):
                        return inline_icons
                    return tag
                new=re.sub(r'<link\b[^>]*>',inline_link,new)
                if re.search(r'\b(?:fas|fab|far|fa-solid|fa-brands|fa-regular)\b|IB Site Icons',new) and 'data-ib-icons=' not in new:
                    new=new.replace('</head>',inline_icons+'\n</head>',1)
                if re.search(r'<style\b[^>]*\bdata-ib-icons\b',new):
                    def remove_legacy_icons(match):
                        href=re.search(r'\bhref\s*=\s*(["\'])(.*?)\1',match[0],re.I)
                        if not href: return match[0]
                        url=urlsplit(href[2])
                        if (not url.netloc or url.hostname in {'istanbulboyacilik.com','www.istanbulboyacilik.com'}) and url.path.endswith('fontawesome-free-6.7.2-web/css/all.min.css'):
                            return ''
                        return match[0]
                    new=re.sub(r'(?:^[ \t]*)?<link\b[^>]*>',remove_legacy_icons,new,flags=re.I|re.M)
                    new=re.sub(r'(?:^[ \t]*)?<noscript\b[^>]*>\s*</noscript\s*>','',new,flags=re.I|re.M)
        if new!=old:source.write_text(new,encoding='utf8');changes.append(source.relative_to(ROOT).as_posix())
    (OUT/'asset-reference-integration.json').write_text(json.dumps({'changed_files':changes},indent=2),encoding='utf8');print('Integrated',len(changes),'public sources')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--apply-references',action='store_true');args=parser.parse_args();OUT.mkdir(parents=True,exist_ok=True)
    if args.apply_references:apply_references()
    else:
        media=media_inventory();icons=icon_assets();print(json.dumps({'unique_images':media['unique_referenced_images'],'aliases':media['aliases'],'icon_classes':len(icons['used_icon_classes']),'solid_brands_before':icons['solid_brands_before_bytes'],'solid_brands_after':icons['solid_brands_after_bytes']}))
