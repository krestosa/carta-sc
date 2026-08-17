#!/usr/bin/env python3
import base64
import os
import re
import zlib
from pathlib import Path

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'
SHA = os.environ.get('GITHUB_SHA', '')
TARGET = SITE / '_critical-media/sushiclub-logo.svg'
OLD_MOBILE = f'_critical-media/mobile-logo.webp?v={SHA}'
OLD_DESKTOP = f'_chrome-media/desktop-logo.webp?v={SHA}'
NEW_LOGO = f'_critical-media/sushiclub-logo.svg?v={SHA}'
SVG_ZLIB_B64 = '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'
CRITICAL_CSS = """<style id="sc-system-brand-css">
body.sushiShop .sc-system-brand-logo{display:block!important;flex:0 0 auto!important;width:312px!important;max-width:100%!important;height:45px!important;max-height:45px!important;margin:0!important;padding:0!important;opacity:1!important;visibility:visible!important;object-fit:contain!important;object-position:center center!important;filter:invert(1)!important;transform:none!important;transition:filter var(--sc-motion-theme,560ms) cubic-bezier(.45,0,.55,1)!important}
html[data-sc-theme-resolved='dark'] body.sushiShop .sc-system-brand-logo{filter:none!important}
@media(min-width:993px){body.sushiShop .newVer17topBar .brand:has(.sc-system-brand-logo){box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:312px!important;max-width:312px!important;height:55px!important;max-height:55px!important;margin:0 auto!important;padding:0!important;line-height:0!important;vertical-align:top!important}body.sushiShop .newVer17topBar .brand:has(.sc-system-brand-logo)>a{display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;line-height:0!important}}
@media(max-width:992px){body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo){display:flex!important;align-items:center!important;justify-content:center!important}body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo)>a{display:flex!important;align-items:center!important;justify-content:center!important;width:312px!important;max-width:calc(100vw - 120px)!important;height:var(--sc-mobile-header-height,100px)!important;margin:0!important;padding:0!important;line-height:0!important}body.sushiShop .brandOnlyMobile .sc-system-brand-logo{width:312px!important;max-width:100%!important;height:auto!important;max-height:45px!important;aspect-ratio:312/45!important}}
</style>"""

if not re.fullmatch(r'[0-9a-f]{40}', SHA):
    raise SystemExit('invalid system-logo build SHA')
if not INDEX.is_file():
    raise SystemExit('system-logo build input is missing')

try:
    svg = zlib.decompress(base64.b64decode(SVG_ZLIB_B64)).decode('utf-8').strip()
except Exception as exc:
    raise SystemExit(f'embedded SushiClub SVG decode failed: {exc}') from exc
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
