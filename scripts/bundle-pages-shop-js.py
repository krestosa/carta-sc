#!/usr/bin/env python3
import os
import re
from pathlib import Path

SITE = Path('.pages-site')
SHA = os.environ.get('GITHUB_SHA', '')
BUNDLE = SITE / '_pages/shop.js'

SHOP_SCRIPTS = [
    'js/funcionesShop__q_f352afe3.js',
    'js/main_shop__q_a48cd660.js',
]

if not re.fullmatch(r'[0-9a-f]{40}', SHA):
    raise SystemExit('GITHUB_SHA is missing or invalid')
if not SITE.is_dir():
    raise SystemExit('.pages-site does not exist')


def script_pattern(src):
    return re.compile(
        rf'<script\b(?=[^>]*\bsrc=["\']{re.escape(src)}["\'])[^>]*>\s*</script>',
        re.IGNORECASE,
    )


index_path = SITE / 'index.html'
html = index_path.read_text(encoding='utf-8')
bundled = []
positions = []

for src in SHOP_SCRIPTS:
    pattern = script_pattern(src)
    matches = list(pattern.finditer(html))
    if len(matches) != 1:
        raise SystemExit(f'Expected exactly one shop script tag for {src}, found {len(matches)}')
    match = matches[0]
    positions.append((match.start(), match.end()))
    tag = match.group(0)
    if re.search(r'\b(?:async|defer)\b', tag, re.IGNORECASE):
        raise SystemExit(f'Cannot safely bundle async/defer shop script: {src}')

    source = SITE / src
    if not source.is_file():
        raise SystemExit(f'Missing shop script: {src}')
    content = source.read_text(encoding='utf-8', errors='strict')
    if re.search(r'\bdocument\.currentScript\b|\bimport\.meta\b', content):
        raise SystemExit(f'Shop script depends on per-file execution semantics: {src}')
    bundled.append(f'/* source: {src} */\n{content.rstrip()}\n;')

between = html[positions[0][1]:positions[1][0]]
if re.sub(r'\s+', '', between):
    raise SystemExit('Unexpected markup exists between the two shop scripts; refusing to change execution layout')

for position, src in enumerate(SHOP_SCRIPTS):
    replacement = ''
    if position == 0:
        replacement = f'<script src="_pages/shop.js?v={SHA}" type="text/javascript"></script>'
    html, count = script_pattern(src).subn(replacement, html, count=1)
    if count != 1:
        raise SystemExit(f'Could not replace shop script tag: {src}')

BUNDLE.parent.mkdir(parents=True, exist_ok=True)
BUNDLE.write_text('\n\n'.join(bundled) + '\n', encoding='utf-8')
index_path.write_text(html, encoding='utf-8')

if html.count(f'_pages/shop.js?v={SHA}') != 1:
    raise SystemExit('Shop JS bundle tag must appear exactly once')
for src in SHOP_SCRIPTS:
    if script_pattern(src).search(html):
        raise SystemExit(f'Original shop script tag remains after bundling: {src}')
if len(re.findall(r'^/\* source:', BUNDLE.read_text(encoding='utf-8'), re.MULTILINE)) != len(SHOP_SCRIPTS):
    raise SystemExit('Shop JS bundle source count mismatch')

print(f'Bundled {len(SHOP_SCRIPTS)} shop scripts into {BUNDLE}')
