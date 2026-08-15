#!/usr/bin/env python3
import os
import re
from pathlib import Path

SITE = Path('.pages-site')
SHA = os.environ.get('GITHUB_SHA', '')
BUNDLE = SITE / '_pages/shop.js'
LEGACY_JS_BUNDLE = SITE / '_pages/legacy.js'
LEGACY_CSS_BUNDLE = SITE / '_pages/legacy.css'

SHOP_SCRIPTS = [
    'js/funcionesShop__q_f352afe3.js',
    'js/main_shop__q_a48cd660.js',
]

DATE_FLOW_JS = [
    '_js_dev/moment.min.js',
    '_js_dev/daterangepicker.js',
]
DATE_FLOW_CSS = [
    '_css_dev/daterangepicker.css',
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


def source_block_pattern(source):
    return re.compile(
        rf'/\* source: {re.escape(source)} \*/\n.*?(?=\n\n/\* source:|\Z)',
        re.DOTALL,
    )


def prune_source_block(path, source):
    if not path.is_file():
        raise SystemExit(f'Expected bundle before date-flow pruning: {path}')
    text = path.read_text(encoding='utf-8', errors='strict')
    replacement = f'/* source: {source} (pruned: inactive date flow) */'
    text, count = source_block_pattern(source).subn(replacement, text, count=1)
    if count != 1:
        raise SystemExit(f'Expected one bundled source block for {source}, found {count}')
    path.write_text(text, encoding='utf-8')


index_path = SITE / 'index.html'
html = index_path.read_text(encoding='utf-8')
date_flow_present = bool(
    re.search(r'\bid=["\']dateInit["\']', html, re.IGNORECASE)
    or re.search(r'\bshopfunc_(?:start|submit)_init\s*\(', html)
)
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
    if not date_flow_present and src == 'js/main_shop__q_a48cd660.js':
        content, locale_count = re.subn(
            r"(?m)^(?P<indent>\s*)moment\.locale\(\s*['\"]es['\"]\s*\);\s*$",
            r"\g<indent>if (window.moment) moment.locale('es');",
            content,
            count=1,
        )
        if locale_count != 1:
            raise SystemExit(f'Expected one unconditional moment.locale(\'es\') call, found {locale_count}')
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

if not date_flow_present:
    for src in DATE_FLOW_JS:
        prune_source_block(LEGACY_JS_BUNDLE, src)
    for href in DATE_FLOW_CSS:
        prune_source_block(LEGACY_CSS_BUNDLE, href)

if html.count(f'_pages/shop.js?v={SHA}') != 1:
    raise SystemExit('Shop JS bundle tag must appear exactly once')
for src in SHOP_SCRIPTS:
    if script_pattern(src).search(html):
        raise SystemExit(f'Original shop script tag remains after bundling: {src}')
if len(re.findall(r'^/\* source:', BUNDLE.read_text(encoding='utf-8'), re.MULTILINE)) != len(SHOP_SCRIPTS):
    raise SystemExit('Shop JS bundle source count mismatch')

print(f'Bundled {len(SHOP_SCRIPTS)} shop scripts into {BUNDLE}')
if not date_flow_present:
    print(f'Pruned {len(DATE_FLOW_JS)} JS and {len(DATE_FLOW_CSS)} CSS inactive date-flow sources from Pages bundles')
