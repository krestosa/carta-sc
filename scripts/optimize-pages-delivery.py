#!/usr/bin/env python3
import os
import posixpath
import re
from pathlib import Path
from urllib.request import Request, urlopen

SITE = Path('.pages-site')
SHA = os.environ.get('GITHUB_SHA', '')
INDEX = SITE / 'index.html'

if not re.fullmatch(r'[0-9a-f]{40}', SHA) or not INDEX.is_file():
    raise SystemExit('Invalid Pages build context')


def minify_css(content):
    content = re.sub(r'/\*(?!\!)[\s\S]*?\*/', '', content)
    content = re.sub(r'[\t\r\n]+', ' ', content)
    content = re.sub(r' {2,}', ' ', content)
    return content.strip()


def rebase_css_urls(content, base):
    url_re = re.compile(r'url\(\s*(?P<quote>["\']?)(?P<value>.*?)(?P=quote)\s*\)', re.IGNORECASE)

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
        body = body.rstrip()
        if body and not body.endswith(';'):
            body += ';'
        return '@font-face {' + body + '\n  font-display: swap;\n}'

    return face_re.sub(replace, content)


def inline_local_styles(html):
    legacy_path = SITE / '_pages/legacy.css'
    override_path = SITE / 'override/main.css'
    if not legacy_path.is_file() or not override_path.is_file():
        raise SystemExit('Bundled local stylesheets are missing')

    legacy = ensure_font_display(
        rebase_css_urls(legacy_path.read_text(encoding='utf-8'), '_pages')
    )
    override = ensure_font_display(
        rebase_css_urls(override_path.read_text(encoding='utf-8'), 'override')
    )
    css = minify_css(legacy + '\n' + override)
    style = '<style id="sc-pages-critical-css">' + css + '</style>'

    links = (
        rf'<link\b(?=[^>]*\bhref=["\']_pages/legacy\.css\?v={re.escape(SHA)}["\'])[^>]*>',
        rf'<link\b(?=[^>]*\bhref=["\']override/main\.css\?v={re.escape(SHA)}["\'])[^>]*>',
    )
    insert_at = None
    for pattern in links:
        regex = re.compile(pattern, re.IGNORECASE)
        match = regex.search(html)
        if not match:
            raise SystemExit('Expected local stylesheet tag missing before inlining')
        if insert_at is None:
            insert_at = match.start()
        html = regex.sub('', html, count=1)

    preload_re = re.compile(
        rf'<link\b(?=[^>]*\brel=["\']preload["\'])(?=[^>]*\bhref=["\']override/main\.css\?v={re.escape(SHA)}["\'])[^>]*>',
        re.IGNORECASE,
    )
    html = preload_re.sub('', html, count=1)

    if insert_at is None:
        raise SystemExit('No insertion point for local CSS')
    html = html[:insert_at] + style + '\n' + html[insert_at:]
    return html


def strip_unused_preloads(html):
    preload_patterns = (
        rf'<link\b(?=[^>]*\brel=["\']preload["\'])(?=[^>]*\bhref=["\']_js_dev/main-legacy\.js\?v={re.escape(SHA)}["\'])[^>]*>\s*',
        rf'<link\b(?=[^>]*\brel=["\']preload["\'])(?=[^>]*\bhref=["\']override/main\.js\?v={re.escape(SHA)}["\'])[^>]*>\s*',
    )
    for pattern in preload_patterns:
        html = re.sub(pattern, '', html, count=1, flags=re.IGNORECASE)

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
        match = script_re.search(html)
        if not match:
            raise SystemExit(f'Expected script missing before defer: {path}')
        tag = match.group(0)
        if not re.search(r'\bdefer\b', tag, re.IGNORECASE):
            tag = tag[:-9].rstrip() + ' defer></script>'
        html = html[:match.start()] + tag + html[match.end():]

    return html


def delay_third_parties(html):
    recaptcha_re = re.compile(
        r'<script\b(?=[^>]*\bsrc=["\']https://www\.google\.com/recaptcha/api\.js["\'])[^>]*>\s*</script>',
        re.IGNORECASE,
    )
    html, recaptcha_count = recaptcha_re.subn('', html, count=1)
    if recaptcha_count != 1:
        raise SystemExit('Expected one eager reCAPTCHA script')

    gtm_re = re.compile(
        r'<script>\s*\(function\(w,d,s,l,i\).*?googletagmanager\.com/gtm\.js\?id=.*?</script>',
        re.IGNORECASE | re.DOTALL,
    )
    html, gtm_count = gtm_re.subn('', html, count=1)
    if gtm_count != 1:
        raise SystemExit('Expected one eager GTM bootstrap')

    loader = f'''<script id="sc-pages-delivery-loader">(function(){{'use strict';var d=document,w=window;w.dataLayer=w.dataLayer||[];function load(src,attrs){{var s=d.createElement('script');s.src=src;Object.keys(attrs||{{}}).forEach(function(k){{s[k]=attrs[k]}});d.head.appendChild(s)}}var g=0;function gtm(){{if(g)return;g=1;w.dataLayer.push({{'gtm.start':Date.now(),event:'gtm.js'}});load('https://www.googletagmanager.com/gtm.js?id=GTM-WQPLGX9',{{async:true}})}}['pointerdown','keydown','touchstart','wheel'].forEach(function(t){{w.addEventListener(t,gtm,{{once:true,passive:true}})}});w.addEventListener('load',function(){{setTimeout(gtm,30000)}},{{once:true}});var r=0;function rc(){{if(r)return;r=1;load('https://www.google.com/recaptcha/api.js',{{async:true,defer:true}})}}w.__scLoadRecaptcha=rc;var f=d.getElementById('newsletterForm');if(f){{f.addEventListener('focusin',rc,{{once:true}});f.addEventListener('pointerdown',rc,{{once:true,passive:true}});if('IntersectionObserver'in w){{var o=new IntersectionObserver(function(es){{if(es.some(function(e){{return e.isIntersecting}})){{o.disconnect();rc()}}}},{{rootMargin:'600px 0px'}});o.observe(f)}}}}}})();</script>'''

    body_end = html.lower().rfind('</body>')
    if body_end < 0:
        raise SystemExit('Missing body end for delivery loader')
    return html[:body_end] + loader + '\n' + html[body_end:]


def strip_stale_source_maps():
    for path in (SITE / '_pages/legacy.js', SITE / '_pages/shop.js'):
        text = path.read_text(encoding='utf-8', errors='ignore')
        text = re.sub(r'(?m)^\s*//[@#]\s*sourceMappingURL=.*$', '', text)
        text = re.sub(r'/\*# sourceMappingURL=.*?\*/', '', text, flags=re.DOTALL)
        path.write_text(text, encoding='utf-8')


def optimize_product_images(html):
    img_re = re.compile(
        r'<img\b(?=[^>]*\bclass=["\'][^"\']*\b(?:imgShop|imgBannerShop)\b[^"\']*["\'])[^>]*>',
        re.IGNORECASE,
    )
    product_re = re.compile(r'<img\b(?=[^>]*\bclass=["\'][^"\']*\bimgShop\b[^"\']*["\'])[^>]*>', re.IGNORECASE)
    count = 0

    def replace(match):
        nonlocal count
        tag = match.group(0)
        is_product = bool(product_re.search(tag))
        if is_product:
            count += 1
        tag = re.sub(r'\s+loading=["\'][^"\']*["\']', '', tag, flags=re.IGNORECASE)
        tag = re.sub(r'\s+decoding=["\'][^"\']*["\']', '', tag, flags=re.IGNORECASE)
        tag = re.sub(r'\s+fetchpriority=["\'][^"\']*["\']', '', tag, flags=re.IGNORECASE)
        if is_product:
            priority = 'eager' if count <= 2 else 'lazy'
            fetch = 'high' if count == 1 else ('auto' if count == 2 else 'low')
            tag = tag[:-1].rstrip() + f' loading="{priority}" decoding="async" fetchpriority="{fetch}">'
        else:
            tag = tag[:-1].rstrip() + ' loading="eager" decoding="async" fetchpriority="auto">'
        return tag

    return img_re.sub(replace, html), count


html = INDEX.read_text(encoding='utf-8')
html = inline_local_styles(html)
html = strip_unused_preloads(html)
html = make_roboto_nonblocking(html)
html = defer_local_scripts(html)
html = delay_third_parties(html)
html, product_count = optimize_product_images(html)
strip_stale_source_maps()

if product_count < 100:
    raise SystemExit('Expected product images were not optimized')
if '<style id="sc-pages-critical-css">' not in html:
    raise SystemExit('Critical CSS inline block missing')
if re.search(r'<link\b(?=[^>]*\bhref=["\'](?:_pages/legacy\.css|override/main\.css)', html, re.IGNORECASE):
    raise SystemExit('Blocking local stylesheet remains')
if re.search(r'<script\b(?=[^>]*\bsrc=["\']https://www\.google\.com/recaptcha/api\.js["\'])', html, re.IGNORECASE):
    raise SystemExit('Eager reCAPTCHA script remains')
if 'googletagmanager.com/gtm.js?id='+"'+i" in html:
    raise SystemExit('Eager GTM bootstrap remains')

INDEX.write_text(html, encoding='utf-8')
print(f'Optimized Pages delivery: {product_count} product images, local CSS inline, local scripts deferred, third-party bootstraps delayed, stale source maps removed.')
