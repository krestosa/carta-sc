#!/usr/bin/env python3
import os
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'
SHA = os.environ.get('GITHUB_SHA', '')

if not INDEX.is_file() or not re.fullmatch(r'[0-9a-f]{40}', SHA):
    raise SystemExit('invalid system-load validation context')


class LoadGraph(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.scripts = []
        self.styles = []
        self.images = []
        self.preloads = []

    def handle_starttag(self, tag, attrs_list):
        attrs = dict(attrs_list)
        if tag == 'script' and attrs.get('src'):
            self.scripts.append(attrs['src'])
        elif tag == 'link':
            rel = set((attrs.get('rel') or '').lower().split())
            href = attrs.get('href') or ''
            if 'stylesheet' in rel and href:
                self.styles.append(href)
            if 'preload' in rel and href:
                self.preloads.append(href)
        elif tag == 'img' and attrs.get('src'):
            self.images.append(attrs['src'])


def path_only(value):
    return urlsplit(value).path.lstrip('/')


html = INDEX.read_text(encoding='utf-8')
graph = LoadGraph()
graph.feed(html)
issues = []

logo = f'_critical-media/sushiclub-logo.svg?v={SHA}'
logo_paths = [v for v in graph.images if v == logo]
logo_preloads = [v for v in graph.preloads if v == logo]
if len(logo_paths) != 2 or len(logo_preloads) != 1:
    issues.append(f'system logo load contract mismatch: images={len(logo_paths)} preloads={len(logo_preloads)}')

for stale in (
    'web-sushiclub2_black_m2',
    'web-sushiclub2_black.png',
    '_critical-media/mobile-logo.png',
    '_critical-media/mobile-logo.webp',
    '_chrome-media/desktop-logo.webp',
):
    if stale in html:
        issues.append(f'superseded logo reference remains active/generated: {stale}')

for stale_file in (
    SITE / '_critical-media/mobile-logo.png',
    SITE / '_critical-media/mobile-logo.webp',
    SITE / '_chrome-media/desktop-logo.webp',
):
    if stale_file.exists():
        issues.append(f'superseded logo file remains in artifact: {stale_file.relative_to(SITE)}')

# Shop source scripts are replaced by one bundle. They may remain as repository
# source files, but must never be requested by the built page.
shop_sources = {'js/funcionesShop__q_f352afe3.js', 'js/main_shop__q_a48cd660.js'}
active_script_paths = [path_only(v) for v in graph.scripts]
for source in sorted(shop_sources & set(active_script_paths)):
    issues.append(f'superseded shop script is still loaded: {source}')
if active_script_paths.count('_pages/shop.js') != 1:
    issues.append(f'optimized shop bundle load count must be 1, found {active_script_paths.count("_pages/shop.js")}')
for script in sorted(set(active_script_paths)):
    if active_script_paths.count(script) > 1:
        issues.append(f'duplicate active script load ({active_script_paths.count(script)}x): {script}')

# Local legacy/override CSS is split into critical inline CSS + one deferred sheet.
active_style_paths = [path_only(v) for v in graph.styles]
for p in active_style_paths:
    if p.startswith('_css_dev/') or p in {
        '_pages/legacy.css', 'override/main.css',
        'css/styles_shop__q_a48cd660.css', 'css/_aux__q_a48cd660.css',
    }:
        issues.append(f'superseded stylesheet is still loaded: {p}')
if active_style_paths.count('_pages/deferred.css') != 1:
    issues.append(f'optimized deferred stylesheet load count must be 1, found {active_style_paths.count("_pages/deferred.css")}')
for style in sorted(set(active_style_paths)):
    if active_style_paths.count(style) > 1:
        issues.append(f'duplicate active stylesheet load ({active_style_paths.count(style)}x): {style}')
if html.count('id="sc-pages-critical-css"') != 1:
    issues.append('critical inline CSS block missing or duplicated')

# The localized responsive banner replaces the upstream desktop banner URL.
if 'aniversario_banner_desktop_(1)1782398717_556.webp' in html:
    issues.append('upstream banner remains referenced after responsive localization')
if f'_critical-media/desktop-banner.webp?v={SHA}' not in html:
    issues.append('optimized desktop banner reference missing')
if f'_critical-media/mobile-banner.webp?v={SHA}' not in html:
    issues.append('optimized mobile banner reference missing')

# A preload plus the eventual element use is intentional: the browser coalesces
# them into one transfer. Replacement correctness is checked by explicit old/new
# pairs above, not by counting textual references across different resource roles.

if issues:
    print(f'System load validation failed with {len(issues)} issue(s):')
    for issue in issues:
        print(f'- {issue}')
    raise SystemExit(1)

print(
    'System load validation passed: optimized resources replace originals in the browser load graph; '
    f'{len(graph.scripts)} scripts, {len(graph.styles)} stylesheets, '
    f'{len(graph.images)} eager image srcs and {len(graph.preloads)} preloads audited.'
)
