#!/usr/bin/env python3
import os
import posixpath
import re
from pathlib import Path

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'
DEFERRED = SITE / '_pages/deferred.css'
SHA = os.environ.get('GITHUB_SHA', '')
FIRST_VIEWPORT_COUNT = 4

if not re.fullmatch(r'[0-9a-f]{40}', SHA):
    raise SystemExit('GITHUB_SHA is missing or invalid')
if not INDEX.is_file() or not DEFERRED.is_file():
    raise SystemExit('Pages LCP optimization context is incomplete')


def promote_first_viewport(html):
    promoted = []
    for index in range(1, FIRST_VIEWPORT_COUNT + 1):
        pattern = re.compile(
            r'<img\b(?=[^>]*\bdata-sc-first-viewport=["\']' + str(index) + r'["\'])[^>]*>',
            re.IGNORECASE,
        )
        matches = list(pattern.finditer(html))
        if len(matches) != 1:
            raise SystemExit(f'first-viewport product {index} count mismatch: {len(matches)}')
        match = matches[0]
        tag = match.group(0)
        source = re.search(r'\bdata-sc-src=["\'](?P<src>[^"\']+)["\']', tag, re.IGNORECASE)
        if not source:
            raise SystemExit(f'first-viewport product {index} has no deferred source')
        src = source.group('src')
        expected = f'_first-viewport/product-{index}.webp?v={SHA}'
        if src != expected:
            raise SystemExit(f'unexpected first-viewport product {index} source: {src}')

        tag = re.sub(r'\s+(?:src|data-sc-src|loading|decoding|fetchpriority)=["\'][^"\']*["\']', '', tag, flags=re.IGNORECASE)
        closing = '/>' if tag.endswith('/>') else '>'
        body = tag[:-len(closing)].rstrip()
        tag = (
            f'{body} src="{src}" loading="eager" decoding="async" '
            f'fetchpriority="high"{closing}'
        )
        html = html[:match.start()] + tag + html[match.end():]
        promoted.append(src)

    preload = (
        f'<link id="sc-product-lcp-preload" rel="preload" as="image" '
        f'href="{promoted[0]}" fetchpriority="high">'
    )
    if 'id="sc-product-lcp-preload"' in html:
        raise SystemExit('product LCP preload already exists')
    head = re.search(r'<head\b[^>]*>', html, re.IGNORECASE)
    if not head:
        raise SystemExit('head missing while injecting product LCP preload')
    html = html[:head.end()] + '\n' + preload + html[head.end():]
    return html, promoted


def roboto_face_pattern():
    return re.compile(
        r'@font-face\s*\{(?=[^{}]*\bfont-family\s*:\s*["\']?Roboto["\']?)[^{}]*\}',
        re.IGNORECASE,
    )


def remove_remote_roboto(deferred, html):
    deferred, removed = roboto_face_pattern().subn('', deferred)
    html = re.sub(
        r'<link\b(?=[^>]*\bhref=["\']https://fonts\.(?:googleapis|gstatic)\.com/[^"\']*["\'])[^>]*>\s*',
        '',
        html,
        flags=re.IGNORECASE,
    )
    html = re.sub(
        r'<style\b[^>]*id=["\']sc-roboto-font-css["\'][^>]*>[\s\S]*?</style>\s*',
        '',
        html,
        flags=re.IGNORECASE,
    )
    if 'fonts.gstatic.com' in deferred or 'fonts.googleapis.com' in deferred:
        raise SystemExit('remote Google font URL remains in deferred CSS')
    if 'fonts.gstatic.com' in html or 'fonts.googleapis.com' in html:
        raise SystemExit('remote Google font URL remains in final HTML')
    return deferred, html, removed


def preload_fontawesome(deferred, html):
    match = re.search(
        r'url\(\s*["\']?(?P<url>[^)"\']*fontawesome-webfont\.woff2(?:\?[^)"\']*)?)["\']?\s*\)',
        deferred,
        re.IGNORECASE,
    )
    if not match:
        return html, None
    css_url = match.group('url').strip()
    if re.match(r'^(?:https?:)?//', css_url, re.IGNORECASE):
        raise SystemExit('Font Awesome must be same-origin in the Pages artifact')
    href = posixpath.normpath(posixpath.join('_pages', css_url))
    preload = (
        f'<link id="sc-fontawesome-preload" rel="preload" href="{href}" '
        'as="font" type="font/woff2" crossorigin fetchpriority="high">'
    )
    if 'id="sc-fontawesome-preload"' not in html:
        head = re.search(r'<head\b[^>]*>', html, re.IGNORECASE)
        if not head:
            raise SystemExit('head missing while injecting Font Awesome preload')
        html = html[:head.end()] + '\n' + preload + html[head.end():]
    return html, href


def verify(html, deferred, promoted, fontawesome_href):
    if len(promoted) != FIRST_VIEWPORT_COUNT:
        raise SystemExit('first-viewport LCP promotion count mismatch')
    for index, src in enumerate(promoted, 1):
        pattern = re.compile(
            r'<img\b(?=[^>]*\bdata-sc-first-viewport=["\']' + str(index) +
            r'["\'])(?=[^>]*\bsrc=["\']' + re.escape(src) +
            r'["\'])(?=[^>]*\bloading=["\']eager["\'])(?=[^>]*\bfetchpriority=["\']high["\'])[^>]*>',
            re.IGNORECASE,
        )
        match = pattern.search(html)
        if not match:
            raise SystemExit(f'first-viewport product {index} is not eager/high-priority in HTML')
        if re.search(r'\bdata-sc-src=', match.group(0), re.IGNORECASE):
            raise SystemExit(f'first-viewport product {index} is still deferred')
    if html.count('id="sc-product-lcp-preload"') != 1:
        raise SystemExit('product LCP preload missing or duplicated')
    preload = re.search(r'<link\b[^>]*id=["\']sc-product-lcp-preload["\'][^>]*>', html, re.IGNORECASE)
    if not preload or promoted[0] not in preload.group(0):
        raise SystemExit('product LCP preload does not target product 1')
    if roboto_face_pattern().search(deferred):
        raise SystemExit('remote Roboto @font-face remains in deferred CSS')
    if fontawesome_href and html.count('id="sc-fontawesome-preload"') != 1:
        raise SystemExit('Font Awesome preload missing or duplicated')


def main():
    html = INDEX.read_text(encoding='utf-8')
    deferred = DEFERRED.read_text(encoding='utf-8')
    html, promoted = promote_first_viewport(html)
    deferred, html, roboto_faces = remove_remote_roboto(deferred, html)
    html, fontawesome_href = preload_fontawesome(deferred, html)
    verify(html, deferred, promoted, fontawesome_href)
    INDEX.write_text(html, encoding='utf-8')
    DEFERRED.write_text(deferred, encoding='utf-8')
    print(
        f'Pages LCP optimized: {len(promoted)} first-viewport products are HTML-discoverable/eager/high; '
        f'product-1 preloaded; removed {roboto_faces} remote Roboto face(s); '
        + (f'Font Awesome preloaded from {fontawesome_href}.' if fontawesome_href else 'No Font Awesome preload required.')
    )


if __name__ == '__main__':
    main()
