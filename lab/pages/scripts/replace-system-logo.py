#!/usr/bin/env python3
import os
import re
from pathlib import Path

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'
SOURCE = Path('lab/pages/assets/sushiclub-logo.svg')
SHA = os.environ.get('GITHUB_SHA', '')
TARGET = SITE / '_critical-media/sushiclub-logo.svg'
OLD_MOBILE = f'_critical-media/mobile-logo.webp?v={SHA}'
OLD_DESKTOP = f'_chrome-media/desktop-logo.webp?v={SHA}'
NEW_LOGO = f'_critical-media/sushiclub-logo.svg?v={SHA}'
CRITICAL_CSS = """<style id="sc-system-brand-css">
body.sushiShop .sc-system-brand-logo{display:block!important;flex:0 0 auto!important;width:312px!important;max-width:100%!important;height:45px!important;max-height:45px!important;margin:0!important;padding:0!important;opacity:1!important;visibility:visible!important;object-fit:contain!important;object-position:center center!important;filter:invert(1)!important;transform:none!important;transition:filter var(--sc-motion-theme,560ms) cubic-bezier(.45,0,.55,1)!important}
html[data-sc-theme-resolved='dark'] body.sushiShop .sc-system-brand-logo{filter:none!important}
@media(min-width:993px){body.sushiShop .newVer17topBar .brand:has(.sc-system-brand-logo){box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:312px!important;max-width:312px!important;height:55px!important;max-height:55px!important;margin:0 auto!important;padding:0!important;line-height:0!important;vertical-align:top!important}body.sushiShop .newVer17topBar .brand:has(.sc-system-brand-logo)>a{display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;line-height:0!important}}
@media(max-width:992px){body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo){display:flex!important;align-items:center!important;justify-content:center!important}body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo)>a{display:flex!important;align-items:center!important;justify-content:center!important;width:312px!important;max-width:calc(100vw - 120px)!important;height:var(--sc-mobile-header-height,100px)!important;margin:0!important;padding:0!important;line-height:0!important}body.sushiShop .brandOnlyMobile .sc-system-brand-logo{width:312px!important;max-width:100%!important;height:auto!important;max-height:45px!important;aspect-ratio:312/45!important}}
</style>"""

if not re.fullmatch(r'[0-9a-f]{40}', SHA):
    raise SystemExit('invalid system-logo build SHA')
if not INDEX.is_file() or not SOURCE.is_file():
    raise SystemExit('system-logo build inputs are missing')

svg = SOURCE.read_text(encoding='utf-8').strip()
if not re.search(r'<svg\b[^>]*viewBox="0 0 312 45"', svg, re.I):
    raise SystemExit('unexpected SushiClub SVG geometry')
if svg.count('<path ') != 9:
    raise SystemExit('unexpected SushiClub SVG path count')
svg = re.sub(r'>\s+<', '><', svg)
TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_text(svg + '\n', encoding='utf-8')

html = INDEX.read_text(encoding='utf-8')


def clean_style(tag):
    style = re.search(r'\s+style=["\'](?P<value>[^"\']*)["\']', tag, re.I)
    if not style:
        return tag
    blocked = {'margin-left', 'width', 'height', 'max-width', 'max-height', 'transform'}
    kept = []
    for declaration in style.group('value').split(';'):
        declaration = declaration.strip()
        if not declaration or ':' not in declaration:
            continue
        name = declaration.split(':', 1)[0].strip().lower()
        if name not in blocked:
            kept.append(declaration)
    replacement = (' style="' + '; '.join(kept) + '"') if kept else ''
    return tag[:style.start()] + replacement + tag[style.end():]


def normalize_logo_tag(tag, source_attr='src'):
    tag = clean_style(tag)
    tag = re.sub(r'\s+(?:width|height)=["\'][^"\']*["\']', '', tag, flags=re.I)
    tag = re.sub(
        r'\s+class=["\'](?P<classes>[^"\']*)["\']',
        lambda m: ' class="' + ' '.join(dict.fromkeys((m.group('classes') + ' sc-system-brand-logo').split())) + '"',
        tag,
        count=1,
        flags=re.I,
    )
    if 'sc-system-brand-logo' not in tag:
        tag = tag[:-1].rstrip() + ' class="sc-system-brand-logo">'
    if source_attr == 'data-sc-desktop-src':
        tag = re.sub(r'\s+data-sc-desktop-src=["\'][^"\']*["\']', '', tag, count=1, flags=re.I)
    tag = re.sub(r'\bsrc=["\'][^"\']*["\']', f'src="{NEW_LOGO}"', tag, count=1, flags=re.I)
    close = '/>' if tag.endswith('/>') else '>'
    body = tag[:-len(close)].rstrip()
    return f'{body} width="312" height="45"{close}'


mobile_re = re.compile(
    r'<img\b(?=[^>]*\bdata-sc-lcp-logo=["\']1["\'])(?=[^>]*\bsrc=["\']'
    + re.escape(OLD_MOBILE) + r'["\'])[^>]*>', re.I)
mobile = list(mobile_re.finditer(html))
if len(mobile) != 1:
    raise SystemExit(f'expected one generated mobile logo, found {len(mobile)}')
match = mobile[0]
html = html[:match.start()] + normalize_logo_tag(match.group(0)) + html[match.end():]

preload_re = re.compile(
    r'<link\b(?=[^>]*\brel=["\']preload["\'])(?=[^>]*\bas=["\']image["\'])(?=[^>]*\bhref=["\']'
    + re.escape(OLD_MOBILE) + r'["\'])[^>]*>', re.I)
preloads = list(preload_re.finditer(html))
if len(preloads) != 1:
    raise SystemExit(f'expected one generated mobile logo preload, found {len(preloads)}')
match = preloads[0]
preload = match.group(0).replace(OLD_MOBILE, NEW_LOGO)
preload = re.sub(r'\s+media=["\'][^"\']*["\']', '', preload, flags=re.I)
if not re.search(r'\stype=["\']image/svg\+xml["\']', preload, re.I):
    preload = preload[:-1].rstrip() + ' type="image/svg+xml">'
html = html[:match.start()] + preload + html[match.end():]

desktop_re = re.compile(
    r'<img\b(?=[^>]*\bdata-sc-desktop-src=["\']' + re.escape(OLD_DESKTOP) + r'["\'])[^>]*>', re.I)
desktop = list(desktop_re.finditer(html))
if len(desktop) != 1:
    raise SystemExit(f'expected one generated desktop logo, found {len(desktop)}')
match = desktop[0]
html = html[:match.start()] + normalize_logo_tag(match.group(0), 'data-sc-desktop-src') + html[match.end():]

if 'id="sc-system-brand-css"' in html:
    raise SystemExit('system logo critical CSS already exists')
head_close = re.search(r'</head\s*>', html, re.I)
if not head_close:
    raise SystemExit('document head closing tag missing')
html = html[:head_close.start()] + CRITICAL_CSS + '\n' + html[head_close.start():]

for obsolete in (SITE / '_critical-media/mobile-logo.webp', SITE / '_chrome-media/desktop-logo.webp'):
    if obsolete.exists():
        obsolete.unlink()

if OLD_MOBILE in html or OLD_DESKTOP in html:
    raise SystemExit('obsolete generated logo reference remains')
logo_tags = re.findall(r'<img\b(?=[^>]*\bclass=["\'][^"\']*\bsc-system-brand-logo\b[^"\']*["\'])[^>]*>', html, re.I)
if len(logo_tags) != 2:
    raise SystemExit(f'system logo must appear exactly twice, found {len(logo_tags)}')
if html.count(NEW_LOGO) != 3:
    raise SystemExit('system logo URL must serve two images plus one preload')
if html.count('id="sc-system-brand-css"') != 1:
    raise SystemExit('system logo critical CSS must appear exactly once')
if not TARGET.is_file() or TARGET.stat().st_size > 7_000:
    raise SystemExit('optimized system SVG is missing or over budget')

INDEX.write_text(html, encoding='utf-8')
print(f'System logo optimized: one {TARGET.stat().st_size}B SVG shared by mobile and desktop; critical centering injected.')
