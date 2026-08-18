#!/usr/bin/env python3
import os
import posixpath
import re
import time
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'
DEFERRED = SITE / '_pages/deferred.css'
SHA = os.environ.get('GITHUB_SHA', '')
FIRST_VIEWPORT_COUNT = 4
MAX_FONT_BYTES = 180_000

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
        r'@font-face\s*\{(?P<body>(?=[^{}]*\bfont-family\s*:\s*["\']?Roboto["\']?)[^{}]*)\}',
        re.IGNORECASE,
    )


def download_font(url, index):
    error = None
    for attempt in range(3):
        try:
            request = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urlopen(request, timeout=10) as response:
                data = response.read()
                ctype = (response.headers.get_content_type() or '').lower()
            if not data or len(data) > MAX_FONT_BYTES:
                raise ValueError(f'invalid font byte size: {len(data)}')
            if not (ctype.startswith('font/') or ctype in {'application/font-sfnt', 'application/octet-stream'}):
                raise ValueError(f'unexpected font content type: {ctype}')
            suffix = Path(urlsplit(url).path).suffix.lower()
            if suffix not in {'.woff2', '.woff', '.ttf', '.otf'}:
                suffix = '.woff2'
            out = SITE / '_critical-fonts'
            out.mkdir(parents=True, exist_ok=True)
            target = out / f'roboto-{index}{suffix}'
            target.write_bytes(data)
            mime = {
                '.woff2': 'font/woff2', '.woff': 'font/woff',
                '.ttf': 'font/ttf', '.otf': 'font/otf',
            }[suffix]
            return target, mime
        except Exception as exc:
            error = exc
            if attempt < 2:
                time.sleep(.5 * (attempt + 1))
    raise SystemExit(f'cannot localize Roboto font {url}: {error}')


def localize_roboto(deferred, html):
    matches = list(roboto_face_pattern().finditer(deferred))
    replacements = []
    preloads = []
    for index, match in enumerate(matches, 1):
        block = match.group(0)
        remote = re.search(
            r'url\(\s*["\']?(?P<url>https://fonts\.gstatic\.com/[^)"\']+)["\']?\s*\)',
            block,
            re.IGNORECASE,
        )
        if not remote:
            continue
        target, mime = download_font(remote.group('url'), index)
        href = f'_critical-fonts/{target.name}?v={SHA}'
        css_href = f'../{href}'
        localized = block[:remote.start('url')] + css_href + block[remote.end('url'):]
        replacements.append((match.start(), match.end(), localized))
        preloads.append((href, mime))

    for start, end, replacement in reversed(replacements):
        deferred = deferred[:start] + replacement + deferred[end:]

    # Si una etapa anterior no pudo traer el stylesheet de Google, puede quedar su link de
    # fallback no bloqueante. Pages estático no debe depender de esa cadena externa; los
    # fallbacks normales de font-family siguen disponibles.
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

    if preloads:
        head = re.search(r'<head\b[^>]*>', html, re.IGNORECASE)
        if not head:
            raise SystemExit('head missing while injecting localized Roboto preloads')
        links = ''.join(
            f'\n<link class="sc-roboto-preload" rel="preload" href="{href}" '
            f'as="font" type="{mime}" crossorigin fetchpriority="high">'
            for href, mime in preloads
        )
        html = html[:head.end()] + links + html[head.end():]
    return deferred, html, preloads


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


def verify(html, deferred, promoted, roboto_preloads, fontawesome_href):
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
    for href, _ in roboto_preloads:
        if href not in html:
            raise SystemExit(f'localized Roboto preload missing: {href}')
        local = SITE / href.split('?', 1)[0]
        if not local.is_file() or local.stat().st_size < 1000:
            raise SystemExit(f'localized Roboto font missing or invalid: {local}')
    if fontawesome_href and html.count('id="sc-fontawesome-preload"') != 1:
        raise SystemExit('Font Awesome preload missing or duplicated')


def main():
    html = INDEX.read_text(encoding='utf-8')
    deferred = DEFERRED.read_text(encoding='utf-8')
    html, promoted = promote_first_viewport(html)
    deferred, html, roboto_preloads = localize_roboto(deferred, html)
    html, fontawesome_href = preload_fontawesome(deferred, html)
    verify(html, deferred, promoted, roboto_preloads, fontawesome_href)
    INDEX.write_text(html, encoding='utf-8')
    DEFERRED.write_text(deferred, encoding='utf-8')
    print(
        f'Pages LCP optimized: {len(promoted)} first-viewport products are HTML-discoverable/eager/high; '
        f'product-1 preloaded; localized {len(roboto_preloads)} Roboto face(s); '
        + (f'Font Awesome preloaded from {fontawesome_href}.' if fontawesome_href else 'No Font Awesome preload required.')
    )


if __name__ == '__main__':
    main()
