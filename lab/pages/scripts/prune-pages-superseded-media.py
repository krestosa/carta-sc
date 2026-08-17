#!/usr/bin/env python3
import re
from pathlib import Path

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'

if not INDEX.is_file():
    raise SystemExit('Pages index missing for superseded-media pruning')

html = INDEX.read_text(encoding='utf-8')

TRAIT_URL_RE = re.compile(
    r'https://www\.sushiclub\.com\.ar/gfx/sabor_(?:pic_[0-3]|vegano)\.png',
    re.I,
)
IMG_RE = re.compile(r'<img\b[^>]*>', re.I)

trait_count = 0
trait_urls = set()

def prune_trait_img(match):
    global trait_count
    tag = match.group(0)
    src = re.search(r'\s+src=(["\'])(?P<url>https://www\.sushiclub\.com\.ar/gfx/sabor_(?:pic_[0-3]|vegano)\.png)\1', tag, re.I)
    if not src:
        return tag
    if not re.search(r'\bdata-original-title=(["\'])[^"\']+\1', tag, re.I):
        raise SystemExit(f'legacy trait image lacks metadata: {src.group("url")}')
    trait_count += 1
    trait_urls.add(src.group('url'))
    tag = tag[:src.start()] + tag[src.end():]
    tag = re.sub(r'\s+data-toggle=(["\'])tooltip\1', '', tag, flags=re.I)
    if not re.search(r'\baria-hidden=', tag, re.I):
        tag = tag[:-1].rstrip() + ' aria-hidden="true">'
    return tag

html = IMG_RE.sub(prune_trait_img, html)
if trait_count == 0:
    raise SystemExit('no legacy trait image sources found to prune')
if len(trait_urls) != 5:
    raise SystemExit(f'expected 5 unique legacy trait assets, found {len(trait_urls)}')

# Theme surfaces and the custom category rail supersede these legacy raster
# backgrounds. Remove the declarations from the final CSS so they cannot enter
# the browser resource graph even on wide desktop or legacy mobile markup.
css_replacements = {
    'https://www.sushiclub.com.ar/gfx/back_body_01.png': 1,
    'https://www.sushiclub.com.ar/gfx/back_body_01_white.png': 1,
    'https://www.sushiclub.com.ar/gfx/scrollTab2.png': 2,
}
for url, expected in css_replacements.items():
    pattern = re.compile(
        r'background-image\s*:\s*url\(\s*(["\']?)' + re.escape(url) + r'\1\s*\)',
        re.I,
    )
    html, count = pattern.subn('background-image:none', html)
    if count != expected:
        raise SystemExit(f'superseded CSS asset contract mismatch for {url}: {count} != {expected}')

for url in list(trait_urls) + list(css_replacements):
    if url in html:
        raise SystemExit(f'superseded media URL remains in final HTML/CSS: {url}')

INDEX.write_text(html, encoding='utf-8')
print(
    f'Pruned superseded media: {trait_count} legacy trait <img src> references '
    f'({len(trait_urls)} unique files), 2 legacy body backgrounds and 2 legacy category-arrow backgrounds.'
)
