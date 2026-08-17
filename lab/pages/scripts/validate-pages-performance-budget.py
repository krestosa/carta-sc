#!/usr/bin/env python3
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'

if not INDEX.is_file():
    raise SystemExit('Prepared Pages index is missing')

EXPECTED_LOCAL_SCRIPTS = {
    'js/jquery-2.1.0.min.js',
    '_pages/legacy.js',
    '_js_dev/main-legacy.js',
    'override/main.js',
    '_pages/shop.js',
}
EXPECTED_LOCAL_STYLES = {
    '_pages/legacy.css',
    'override/main.css',
}


def normalized_url(value):
    parsed = urlsplit(value or '')
    return parsed.path.lstrip('./')


def is_remote(value):
    parsed = urlsplit(value or '')
    return bool(parsed.scheme or parsed.netloc or (value or '').startswith('//'))


class BudgetParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.local_scripts = []
        self.remote_blocking_scripts = []
        self.local_styles = []
        self.preloads = []
        self.product_images = []
        self.banner_images = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        parent_classes = {klass for _, classes in self.stack for klass in classes}

        if tag == 'script' and attrs.get('src'):
            src = attrs['src']
            if is_remote(src):
                if 'async' not in attrs and 'defer' not in attrs:
                    self.remote_blocking_scripts.append(src)
            else:
                self.local_scripts.append(normalized_url(src))

        elif tag == 'link':
            rel = set((attrs.get('rel') or '').lower().split())
            href = attrs.get('href')
            if href and 'stylesheet' in rel and not is_remote(href):
                self.local_styles.append(normalized_url(href))
            if href and 'preload' in rel:
                self.preloads.append((attrs.get('as', '').lower(), normalized_url(href), attrs))

        elif tag == 'img':
            classes = set((attrs.get('class') or '').split())
            if 'imgShop' in parent_classes:
                self.product_images.append(attrs)
            if 'imgBannerShop' in classes:
                self.banner_images.append(attrs)

        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:
            self.stack.append((tag, set((attrs.get('class') or '').split())))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                return


parser = BudgetParser()
parser.feed(INDEX.read_text(encoding='utf-8'))
errors = []

local_scripts = set(parser.local_scripts)
if local_scripts != EXPECTED_LOCAL_SCRIPTS:
    errors.append(
        'local script topology changed: '
        f'expected={sorted(EXPECTED_LOCAL_SCRIPTS)}, actual={sorted(local_scripts)}'
    )
if len(parser.local_scripts) != len(local_scripts):
    errors.append(f'duplicate local script request(s): {parser.local_scripts}')

local_styles = set(parser.local_styles)
if local_styles != EXPECTED_LOCAL_STYLES:
    errors.append(
        'local stylesheet topology changed: '
        f'expected={sorted(EXPECTED_LOCAL_STYLES)}, actual={sorted(local_styles)}'
    )
if len(parser.local_styles) != len(local_styles):
    errors.append(f'duplicate local stylesheet request(s): {parser.local_styles}')

if parser.remote_blocking_scripts:
    errors.append(f'blocking remote scripts detected: {parser.remote_blocking_scripts}')

if not parser.product_images:
    errors.append('no product images detected')
else:
    bad_products = []
    for index, attrs in enumerate(parser.product_images, start=1):
        if attrs.get('loading') != 'lazy' or attrs.get('decoding') != 'async':
            bad_products.append(index)
        if attrs.get('fetchpriority', '').lower() == 'high':
            bad_products.append(index)
    if bad_products:
        errors.append(f'product images outside lazy/async budget: {sorted(set(bad_products))[:20]}')

if len(parser.banner_images) != 1:
    errors.append(f'expected exactly one catalogue banner, found {len(parser.banner_images)}')
else:
    banner = parser.banner_images[0]
    if banner.get('loading') != 'eager' or banner.get('decoding') != 'async' or banner.get('fetchpriority') != 'high':
        errors.append('catalogue banner lost eager/async/high-priority attributes')
    banner_src = normalized_url(banner.get('src', ''))
    image_preloads = [href for kind, href, attrs in parser.preloads if kind == 'image']
    if image_preloads.count(banner_src) != 1:
        errors.append(f'catalogue banner preload mismatch: banner={banner_src}, image_preloads={image_preloads}')

required_preloads = {
    ('script', '_js_dev/main-legacy.js'),
    ('style', 'override/main.css'),
    ('script', 'override/main.js'),
    ('font', '_remote-assets/fuentes/AcuminPro-Regular.woff2'),
    ('font', '_remote-assets/fuentes/AcuminPro-Semibold.woff2'),
}
actual_preloads = {(kind, href) for kind, href, attrs in parser.preloads}
missing_preloads = sorted(required_preloads - actual_preloads)
if missing_preloads:
    errors.append(f'missing critical preload(s): {missing_preloads}')

if errors:
    print(f'Pages performance budget failed with {len(errors)} issue(s):')
    for error in errors:
        print(f'- {error}')
    raise SystemExit(1)

print(
    'Pages performance budget passed: '
    f'{len(parser.local_scripts)} local scripts, '
    f'{len(parser.local_styles)} local stylesheets, '
    f'{len(parser.product_images)} lazy product images, '
    f'{len(parser.preloads)} preload hints, '
    '0 blocking remote scripts.'
)
