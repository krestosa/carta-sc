#!/usr/bin/env python3
import os
import re
from pathlib import Path

SITE = Path('.pages-site')
SHA = os.environ.get('GITHUB_SHA', '')

if not re.fullmatch(r'[0-9a-f]{40}', SHA):
    raise SystemExit('GITHUB_SHA is missing or invalid')
if not SITE.is_dir():
    raise SystemExit('.pages-site does not exist')

index_path = SITE / 'index.html'
html = index_path.read_text(encoding='utf-8')

font_css_re = re.compile(
    r'https://fonts\.googleapis\.com/css\?family=Roboto:300,400,700(?:&amp;|&)display=swap|https://fonts\.googleapis\.com/css\?family=Roboto:300,400,700',
    re.IGNORECASE,
)
html, font_css_count = font_css_re.subn(
    'https://fonts.googleapis.com/css?family=Roboto:300,400,700&amp;display=swap',
    html,
    count=1,
)
if font_css_count != 1:
    raise SystemExit(f'Expected one Roboto Google Fonts stylesheet URL, found {font_css_count}')

banner = re.search(
    r'<img\b(?=[^>]*\bclass="[^"]*\bimgBannerShop\b[^"]*")(?=[^>]*\bsrc="([^"]+)")[^>]*>',
    html,
    re.IGNORECASE,
)
if not banner:
    raise SystemExit('Could not locate the catalogue banner image')
banner_src = banner.group(1)

patterns = [
    re.compile(r'<link\s+rel="preconnect"\s+href="https://fonts\.googleapis\.com"\s*>', re.IGNORECASE),
    re.compile(r'<link\s+rel="preconnect"\s+href="https://fonts\.gstatic\.com"\s+crossorigin\s*>', re.IGNORECASE),
    re.compile(r'<link\s+rel="preconnect"\s+href="https://cdn\.jsdelivr\.net"\s+crossorigin\s*>', re.IGNORECASE),
    re.compile(rf'<link\s+rel="preload"\s+as="script"\s+href="_js_dev/main-legacy\.js\?v={re.escape(SHA)}"\s*>', re.IGNORECASE),
    re.compile(rf'<link\s+rel="preload"\s+as="style"\s+href="override/main\.css\?v={re.escape(SHA)}"\s*>', re.IGNORECASE),
    re.compile(rf'<link\s+rel="preload"\s+as="script"\s+href="override/main\.js\?v={re.escape(SHA)}"\s*>', re.IGNORECASE),
    re.compile(r'<link\s+rel="preload"\s+href="fuentes/AcuminPro-Regular\.woff2"\s+as="font"\s+type="font/woff2"\s+crossorigin\s*>', re.IGNORECASE),
    re.compile(r'<link\s+rel="preload"\s+href="fuentes/AcuminPro-Semibold\.woff2"\s+as="font"\s+type="font/woff2"\s+crossorigin\s*>', re.IGNORECASE),
]

for pattern in patterns:
    matches = pattern.findall(html)
    if len(matches) != 1:
        raise SystemExit(f'Expected exactly one critical resource hint for pattern: {pattern.pattern}')
    html = pattern.sub('', html, count=1)

critical_hints = '\n'.join([
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>',
    f'<link rel="preload" as="image" href="{banner_src}" fetchpriority="high">',
    '<link rel="preload" href="fuentes/AcuminPro-Regular.woff2" as="font" type="font/woff2" crossorigin>',
    '<link rel="preload" href="fuentes/AcuminPro-Semibold.woff2" as="font" type="font/woff2" crossorigin>',
    f'<link rel="preload" as="script" href="_js_dev/main-legacy.js?v={SHA}">',
    f'<link rel="preload" as="style" href="override/main.css?v={SHA}">',
    f'<link rel="preload" as="script" href="override/main.js?v={SHA}">',
])

charset = re.compile(r'(?P<tag><meta\s+charset="utf-8"\s*>)', re.IGNORECASE)
html, count = charset.subn(lambda match: match.group('tag') + '\n' + critical_hints, html, count=1)
if count != 1:
    raise SystemExit('Could not place critical hints immediately after meta charset')

if html.count(f'<link rel="preload" as="image" href="{banner_src}" fetchpriority="high">') != 1:
    raise SystemExit('Banner preload must appear exactly once')
if html.count('https://fonts.googleapis.com/css?family=Roboto:300,400,700&amp;display=swap') != 1:
    raise SystemExit('Roboto stylesheet must use display=swap exactly once')
head_start = html.lower().find('<head>')
head_end = html.lower().find('</head>')
charset_pos = html.lower().find('<meta charset="utf-8"', head_start, head_end)
banner_preload_pos = html.find(f'<link rel="preload" as="image" href="{banner_src}"', head_start, head_end)
google_fonts_pos = html.find('https://fonts.googleapis.com/css?', head_start, head_end)
if not (head_start >= 0 and charset_pos > head_start and banner_preload_pos > charset_pos):
    raise SystemExit('Critical hints are not positioned at the start of the document head')
if google_fonts_pos >= 0 and banner_preload_pos > google_fonts_pos:
    raise SystemExit('Critical resource hints must precede the Google Fonts stylesheet')

index_path.write_text(html, encoding='utf-8')
print(f'Moved critical resource hints to head start, enabled Roboto display=swap and preloaded {banner_src}')
