#!/usr/bin/env python3
import os
import posixpath
import re
from pathlib import Path
from urllib.request import Request, urlopen

SITE = Path('.pages-site')
SHA = os.environ.get('GITHUB_SHA', '')
INDEX = SITE / 'index.html'

if not re.fullmatch(r'[0-9a-f]{40}', SHA):
    raise SystemExit('GITHUB_SHA is missing or invalid')
if not INDEX.is_file():
    raise SystemExit('Prepared Pages index is missing')


def replace_once(pattern, replacement, text, label, flags=0):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return updated


def rebase_css_urls(content, source_rel):
    base = posixpath.dirname(source_rel)
    url_re = re.compile(
        r'url\(\s*(?P<quote>["\']?)(?P<value>.*?)(?P=quote)\s*\)',
        re.IGNORECASE,
    )

    def replace(match):
        value = match.group('value').strip()
        if not value or re.match(r'^(?:data:|[a-z][a-z0-9+.-]*:|//|/|#)', value, re.IGNORECASE):
            return match.group(0)
        parts = re.match(r'^(?P<path>[^?#]+)(?P<suffix>[?#].*)?$', value)
        if not parts:
            return match.group(0)
        rebased = posixpath.normpath(posixpath.join(base, parts.group('path')))
        rebased += parts.group('suffix') or ''
        quote = match.group('quote')
        return f'url({quote}{rebased}{quote})'

    return url_re.sub(replace, content)


def ensure_font_display(content):
    face_re = re.compile(r'@font-face\s*\{(?P<body>.*?)\}', re.IGNORECASE | re.DOTALL)

    def replace(match):
        body = match.group('body')
        if re.search(r'\bfont-display\s*:', body, re.IGNORECASE):
            return match.group(0)
        return '@font-face {' + body.rstrip() + '\n  font-display: swap;\n}'

    return face_re.sub(replace, content)


def inline_local_styles(html):
    legacy_path = SITE / '_pages/legacy.css'
    override_path = SITE / 'override/main.css'
    if not legacy_path.is_file() or not override_path.is_file():
        raise SystemExit('Bundled local stylesheets are missing')

    legacy = ensure_font_display(
        rebase_css_urls(legacy_path.read_text(encoding='utf-8'), '_pages/legacy.css')
    )
    override = ensure_font_display(
        rebase_css_urls(override_path.read_text(encoding='utf-8'), 'override/main.css')
    )
    critical = (
        '<style id="sc-pages-critical-css">\n'
        + legacy.rstrip()
        + '\n'
        + override.rstrip()
        + '\n</style>'
    )

    html = replace_once(
        rf'<link\b(?=[^>]*\brel=["\']stylesheet["\'])(?=[^>]*\bhref=["\']_pages/legacy\.css\?v={re.escape(SHA)}["\'])[^>]*>',
        lambda _: critical,
        html,
        'legacy stylesheet',
        re.IGNORECASE,
    )
    html = replace_once(
        rf'<link\b(?=[^>]*\brel=["\']stylesheet["\'])(?=[^>]*\bhref=["\']override/main\.css\?v={re.escape(SHA)}["\'])[^>]*>\s*',
        '',
        html,
        'override stylesheet',
        re.IGNORECASE,
    )

    for asset in ('_js_dev/main-legacy.js', 'override/main.js', 'override/main.css'):
        html = re.sub(
            rf'<link\b(?=[^>]*\brel=["\']preload["\'])(?=[^>]*\bhref=["\']{re.escape(asset)}\?v={re.escape(SHA)}["\'])[^>]*>\s*',
            '',
            html,
            count=1,
            flags=re.IGNORECASE,
        )

    html = re.sub(
        r'<link\b(?=[^>]*\brel=["\']preconnect["\'])(?=[^>]*\bhref=["\']https://cdn\.jsdelivr\.net/?["\'])[^>]*>\s*',
        '',
        html,
        count=1,
        flags=re.IGNORECASE,
    )
    return html


def make_roboto_nonblocking(html):
    link_re = re.compile(
        r'<link\b(?=[^>]*\bhref=["\'](?P<url>https://fonts\.googleapis\.com/css\?family=Roboto:[^"\']+)["\'])(?=[^>]*\brel=["\']stylesheet["\'])[^>]*>',
        re.IGNORECASE,
    )
    match = link_re.search(html)
    if not match:
        raise SystemExit('Roboto stylesheet was not found')

    escaped_url = match.group('url')
    request_url = escaped_url.replace('&amp;', '&')
    try:
        request = Request(request_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urlopen(request, timeout=6) as response:
            css = response.read().decode('utf-8')
        replacement = '<style id="sc-roboto-font-css">' + ensure_font_display(css) + '</style>'
    except Exception:
        replacement = (
            f'<link rel="stylesheet" href="{escaped_url}" media="print" '
            'onload="this.media=\'all\'">'
        )

    return html[:match.start()] + replacement + html[match.end():]


def defer_local_scripts(html):
    paths = (
        'js/jquery-2.1.0.min.js',
        '_pages/legacy.js',
        '_js_dev/main-legacy.js',
        'override/main.js',
        '_pages/shop.js',
    )

    for path in paths:
        suffix = '' if path.startswith('js/jquery') else rf'\?v={re.escape(SHA)}'
        script_re = re.compile(
            rf'<script\b(?=[^>]*\bsrc=["\']{re.escape(path)}{suffix}["\'])(?P<attrs>[^>]*)></script>',
            re.IGNORECASE,
        )

        def replace(match):
            attrs = match.group('attrs')
            if re.search(r'\bdefer\b', attrs, re.IGNORECASE):
                return match.group(0)
            return '<script defer fetchpriority="low"' + attrs + '></script>'

        html, count = script_re.subn(replace, html, count=1)
        if count != 1:
            raise SystemExit(f'Expected one local runtime script for {path}, found {count}')
    return html


def wrap_jquery_inline_handlers(html):
    script_re = re.compile(r'<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>', re.IGNORECASE | re.DOTALL)
    for marker in (
        'function isValidEmailAddress(emailAddress)',
        'var keepSessionAlive = function()',
    ):
        match = next((item for item in script_re.finditer(html) if marker in item.group('body')), None)
        if not match:
            raise SystemExit(f'Inline runtime marker was not found: {marker}')
        body = match.group('body')
        replacement = (
            "<script>document.addEventListener('DOMContentLoaded',function(){\n"
            + body
            + "\n},{once:true});</script>"
        )
        html = html[:match.start()] + replacement + html[match.end():]
    return html


def delay_third_parties(html):
    html = replace_once(
        r'<script\b(?=[^>]*\bsrc=["\']https://www\.google\.com/recaptcha/api\.js["\'])[^>]*>\s*</script>\s*',
        '',
        html,
        'reCAPTCHA bootstrap',
        re.IGNORECASE,
    )
    html = replace_once(
        r'<script>\s*\(function\(w,d,s,l,i\).*?GTM-WQPLGX9.*?</script>\s*',
        '',
        html,
        'GTM bootstrap',
        re.IGNORECASE | re.DOTALL,
    )
    return html


def hard_lazy_product_images(html):
    image_re = re.compile(
        r'(<div\b[^>]*class=["\'][^"\']*\b(?:imgShop|imgLiquidNoFillShop)\b[^"\']*["\'][^>]*>\s*<img\b)(?P<attrs>[^>]*)(>)',
        re.IGNORECASE,
    )
    seen = 0

    def replace(match):
        nonlocal seen
        seen += 1
        attrs = match.group('attrs')
        if seen <= 4:
            return match.group(0)
        source = re.search(r'\s+src=["\'](?P<src>[^"\']+)["\']', attrs, re.IGNORECASE)
        if not source:
            return match.group(0)
        src = source.group('src')
        attrs = re.sub(r'\s+src=["\'][^"\']+["\']', '', attrs, count=1, flags=re.IGNORECASE)
        attrs = re.sub(r'\s+fetchpriority=["\'][^"\']+["\']', '', attrs, flags=re.IGNORECASE)
        attrs += f' data-sc-src="{src}" fetchpriority="low"'
        return match.group(1) + attrs + match.group(3)

    html = image_re.sub(replace, html)
    if seen < 100:
        raise SystemExit(f'Expected the catalogue product images, found only {seen}')
    return html, seen


def strip_stale_source_maps():
    for relative in (
        '_pages/legacy.js',
        '_pages/shop.js',
        '_js_dev/main-legacy.js',
        'override/main.js',
    ):
        path = SITE / relative
        source = path.read_text(encoding='utf-8', errors='ignore')
        source = re.sub(r'(?m)^\s*//[@#]\s*sourceMappingURL=.*$', '', source)
        source = re.sub(r'/\*# sourceMappingURL=.*?\*/', '', source, flags=re.DOTALL)
        path.write_text(source, encoding='utf-8')


def add_small_image_dimensions(html):
    icon_re = re.compile(
        r'(<img\b(?=[^>]*\bsrc=["\']https://www\.sushiclub\.com\.ar/iconos/icons8-tiktok-32\.png["\'])(?P<attrs>[^>]*))>',
        re.IGNORECASE,
    )
    match = icon_re.search(html)
    if not match:
        return html
    attrs = match.group('attrs')
    if not re.search(r'\bwidth=', attrs, re.IGNORECASE):
        attrs += ' width="22"'
    if not re.search(r'\bheight=', attrs, re.IGNORECASE):
        attrs += ' height="22"'
    return html[:match.start()] + '<img' + attrs + '>' + html[match.end():]


def inject_delivery_loader(html):
    loader = """<script id=\"sc-pages-delivery-loader\">(function(){'use strict';var d=document,w=window;w.dataLayer=w.dataLayer||[];function li(i){var s=i&&i.getAttribute('data-sc-src');if(!s)return;i.removeAttribute('data-sc-src');i.src=s}var a=[].slice.call(d.querySelectorAll('img[data-sc-src]'));if('IntersectionObserver'in w){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){io.unobserve(e.target);li(e.target)}})},{rootMargin:'120px 0px'});a.forEach(function(i){io.observe(i)})}else a.forEach(li);var g=0;function gtm(){if(g)return;g=1;w.dataLayer=w.dataLayer||[];w.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});var s=d.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtm.js?id=GTM-WQPLGX9';d.head.appendChild(s)}['pointerdown','keydown','touchstart','wheel'].forEach(function(t){w.addEventListener(t,gtm,{once:true,passive:true})});w.addEventListener('load',function(){setTimeout(gtm,30000)},{once:true});var r=0;function rc(){if(r)return;r=1;var s=d.createElement('script');s.async=true;s.defer=true;s.src='https://www.google.com/recaptcha/api.js';d.head.appendChild(s)}w.__scLoadRecaptcha=rc;var f=d.getElementById('newsletterForm');if(f){f.addEventListener('focusin',rc,{once:true});f.addEventListener('pointerdown',rc,{once:true,passive:true});if('IntersectionObserver'in w){var ro=new IntersectionObserver(function(es){if(es.some(function(e){return e.isIntersecting})){ro.disconnect();rc()}},{rootMargin:'600px 0px'});ro.observe(f)}}})();</script>"""
    if 'id="sc-pages-delivery-loader"' in html:
        raise SystemExit('Pages delivery loader is already present')
    return replace_once(r'</body>', loader + '\n</body>', html, 'body close', re.IGNORECASE)


def verify(html, product_count):
    if 'id="sc-pages-critical-css"' not in html:
        raise SystemExit('Critical local CSS was not inlined')
    if re.search(rf'<link\b[^>]*\bhref=["\'](?:_pages/legacy|override/main)\.css\?v={re.escape(SHA)}["\'][^>]*>', html, re.IGNORECASE):
        raise SystemExit('Blocking local stylesheet link remains')
    for path in (
        'js/jquery-2.1.0.min.js',
        '_pages/legacy.js',
        '_js_dev/main-legacy.js',
        'override/main.js',
        '_pages/shop.js',
    ):
        suffix = '' if path.startswith('js/jquery') else rf'\?v={re.escape(SHA)}'
        if not re.search(rf'<script\b(?=[^>]*\bdefer\b)(?=[^>]*\bfetchpriority=["\']?low["\']?)(?=[^>]*\bsrc=["\']{re.escape(path)}{suffix}["\'])[^>]*></script>', html, re.IGNORECASE):
            raise SystemExit(f'Local script is not deferred/low-priority: {path}')
    if 'https://www.google.com/recaptcha/api.js" async defer' in html:
        raise SystemExit('Eager reCAPTCHA loader remains')
    if "googletagmanager.com/gtm.js?id='+i" in html:
        raise SystemExit('Eager GTM loader remains')
    if product_count < 100 or html.count('data-sc-src=') < product_count - 6:
        raise SystemExit('Explicit product-image lazy loading was not applied')
    if 'sourceMappingURL=' in (SITE / '_pages/legacy.js').read_text(encoding='utf-8', errors='ignore'):
        raise SystemExit('Stale legacy source-map directive remains')
    override_source = (SITE / 'override/main.js').read_text(encoding='utf-8', errors='ignore')
    if 'cetAttribute' in override_source:
        raise SystemExit('Broken catalog filter attribute call remains in override bundle')
    if "banner.setAttribute('height','157')" in override_source or "banner.setAttribute('width','1500')" in override_source:
        raise SystemExit('Fixed banner dimensions remain in override runtime')
    if 'w.dataLayer=w.dataLayer||[]' not in html:
        raise SystemExit('Deferred analytics queue bootstrap is missing')


def main():
    html = INDEX.read_text(encoding='utf-8')
    html = inline_local_styles(html)
    html = make_roboto_nonblocking(html)
    html = defer_local_scripts(html)
    html = wrap_jquery_inline_handlers(html)
    html = delay_third_parties(html)
    html, product_count = hard_lazy_product_images(html)
    html = add_small_image_dimensions(html)
    html = inject_delivery_loader(html)
    strip_stale_source_maps()
    verify(html, product_count)
    INDEX.write_text(html, encoding='utf-8')
    print(
        'Optimized Pages delivery: '
        f'{product_count} product images, local CSS inline, local scripts deferred, '
        'third-party bootstraps delayed, stale source maps removed.'
    )


if __name__ == '__main__':
    main()
