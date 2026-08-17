#!/usr/bin/env python3
import io
import os
import re
import time
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from PIL import Image

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'
SHA = os.environ.get('GITHUB_SHA', '')
FIRST_VIEWPORT_COUNT = 4
MAX_DIMENSION = 420
WEBP_QUALITY = 72
MAX_BYTES = 36_000
MAX_DOWNLOAD_BYTES = 3_000_000
MAX_CHROME_BYTES = 28_000
MAX_CHROME_TOTAL = 90_000

BANNER_URL = 'https://www.sushiclub.com.ar/uploads_shop/banner_shop/imagenes/aniversario_banner_desktop_(1)1782398717_556.webp'
BANNER_EXPECTED = (1500, 157)

CHROME_MEDIA = (
    ('desktop-logo', 'https://www.sushiclub.com.ar/gfx/web-sushiclub2_black.png'),
    ('flag-arg', 'https://www.sushiclub.com.ar/gfx/band-arg.jpg'),
    ('flag-mex', 'https://www.sushiclub.com.ar/gfx/band-mex.jpg'),
    ('flag-par', 'https://www.sushiclub.com.ar/gfx/band-par.jpg'),
    ('flag-esp', 'https://www.sushiclub.com.ar/gfx/band-esp.jpg'),
    ('flag-uru', 'https://www.sushiclub.com.ar/gfx/band_uru.jpg'),
    ('flag-usa', 'https://www.sushiclub.com.ar/gfx/band-usa.jpg'),
    ('tiktok', 'https://www.sushiclub.com.ar/iconos/icons8-tiktok-32.png'),
)

COUNTRIES = {
    'flag-arg': 'Argentina',
    'flag-mex': 'México',
    'flag-par': 'Paraguay',
    'flag-esp': 'España',
    'flag-uru': 'Uruguay',
    'flag-usa': 'Estados Unidos',
}

DIMENSION_ONLY = (
    'https://www.sushiclub.com.ar/uploads/marcas/6/imagenes/chandon_web_gris_4_1749078095.png',
    'https://www.sushiclub.com.ar/uploads/marcas/8/imagenes/marca_06.jpg',
    'https://www.sushiclub.com.ar/uploads/marcas/4/imagenes/smartwater_gris_web_2_1749078414.png',
    'https://www.sushiclub.com.ar/uploads/marcas/5/imagenes/aquarius_gris_web_1_1749077984.png',
)

if not re.fullmatch(r'[0-9a-f]{40}', SHA) or not INDEX.is_file():
    raise SystemExit('invalid Pages first-viewport media context')


def download_response(url):
    error = None
    for attempt in range(3):
        try:
            req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urlopen(req, timeout=12) as response:
                data = response.read()
                ctype = response.headers.get_content_type()
            if not data or len(data) > MAX_DOWNLOAD_BYTES or not ctype.startswith('image/'):
                raise ValueError(f'invalid source image: type={ctype} bytes={len(data)}')
            return data, ctype
        except Exception as exc:
            error = exc
            if attempt < 2:
                time.sleep(.6 * (attempt + 1))
    raise SystemExit(f'first-viewport image download failed: {url}: {error}')


def download(url):
    return download_response(url)[0]


def decode_image(data, name):
    try:
        with Image.open(io.BytesIO(data)) as source:
            source.load()
            size = source.size
            image = source.convert('RGBA' if 'A' in source.getbands() else 'RGB')
    except Exception as exc:
        raise SystemExit(f'cannot decode Pages image {name}: {exc}')
    if size[0] < 1 or size[1] < 1 or size[0] > 5000 or size[1] > 5000:
        raise SystemExit(f'invalid Pages image dimensions for {name}: {size}')
    return image, size


def encode_webp(data, name):
    image, _ = decode_image(data, name)
    image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)
    out_dir = SITE / '_first-viewport'
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / f'{name}.webp'

    attempts = ((MAX_DIMENSION, WEBP_QUALITY), (384, 70), (352, 68))
    encoded = b''
    final_size = image.size
    for dimension, quality in attempts:
        candidate = image.copy()
        candidate.thumbnail((dimension, dimension), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        candidate.save(buf, format='WEBP', quality=quality, method=6)
        encoded = buf.getvalue()
        final_size = candidate.size
        if len(encoded) <= MAX_BYTES:
            break
    if not encoded or len(encoded) > MAX_BYTES:
        raise SystemExit(f'first-viewport WebP budget exceeded for {name}: {len(encoded)} bytes')
    target.write_bytes(encoded)
    return f'_first-viewport/{target.name}?v={SHA}', len(encoded), final_size


def encode_chrome_webp(data, name):
    image, size = decode_image(data, name)
    encoded = b''
    for quality in (88, 82, 76):
        buf = io.BytesIO()
        image.save(buf, format='WEBP', quality=quality, method=6)
        encoded = buf.getvalue()
        if len(encoded) <= MAX_CHROME_BYTES:
            break
    if not encoded or len(encoded) > MAX_CHROME_BYTES:
        raise SystemExit(f'desktop chrome WebP budget exceeded for {name}: {len(encoded)} bytes')
    out_dir = SITE / '_chrome-media'
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / f'{name}.webp'
    target.write_bytes(encoded)
    return f'_chrome-media/{target.name}?v={SHA}', size, len(encoded)


def optimize_first_viewport(html):
    product = re.compile(
        r'<img\b(?=[^>]*\bdata-sc-src=["\'](?P<src>https://www\.sushiclub\.com\.ar/uploads_shop/productos/[^"\']+)["\'])[^>]*>',
        re.IGNORECASE,
    )
    matches = list(product.finditer(html))
    if len(matches) < FIRST_VIEWPORT_COUNT:
        raise SystemExit(f'expected at least {FIRST_VIEWPORT_COUNT} hard-lazy products, found {len(matches)}')

    replacements = []
    stats = []
    for index, match in enumerate(matches[:FIRST_VIEWPORT_COUNT], 1):
        tag = match.group(0)
        url = match.group('src')
        asset, size, dimensions = encode_webp(download(url), f'product-{index}')
        tag = re.sub(
            r'\bdata-sc-src=["\'][^"\']+["\']',
            f'data-sc-src="{asset}"',
            tag,
            count=1,
            flags=re.IGNORECASE,
        )
        tag = re.sub(r'\s+data-sc-first-viewport=["\'][^"\']*["\']', '', tag, flags=re.IGNORECASE)
        tag = tag[:-1].rstrip() + f' data-sc-first-viewport="{index}">'
        replacements.append((match.start(), match.end(), tag))
        stats.append((index, size, dimensions))

    for start, end, replacement in reversed(replacements):
        html = html[:start] + replacement + html[end:]

    marker = 'function ready(){if(done)return;done=1;images();scheduleRuntime()}'
    replacement = "function ready(){if(done)return;done=1;[].forEach.call(d.querySelectorAll('img[data-sc-first-viewport]'),li);images();scheduleRuntime()}"
    if marker not in html:
        raise SystemExit('delivery-loader ready() marker missing')
    html = html.replace(marker, replacement, 1)
    return html, stats


def replace_img_source(html, old_url, new_url, size):
    pattern = re.compile(
        r'<img\b(?=[^>]*\bsrc=["\']' + re.escape(old_url) + r'["\'])[^>]*>',
        re.IGNORECASE,
    )
    count = 0

    def repl(match):
        nonlocal count
        count += 1
        tag = match.group(0)
        tag = re.sub(r'\bsrc=["\'][^"\']+["\']', f'src="{new_url}"', tag, count=1, flags=re.IGNORECASE)
        tag = re.sub(r'\s+(?:width|height)\s*=\s*["\'][^"\']*["\']', '', tag, flags=re.IGNORECASE)
        closing = '/>' if tag.endswith('/>') else '>'
        body = tag[:-len(closing)].rstrip()
        return f'{body} width="{size[0]}" height="{size[1]}"{closing}'

    return pattern.sub(repl, html), count


def ensure_remote_dimensions(html, url, size):
    pattern = re.compile(
        r'<img\b(?=[^>]*\bsrc=["\']' + re.escape(url) + r'["\'])[^>]*>',
        re.IGNORECASE,
    )
    count = 0

    def repl(match):
        nonlocal count
        count += 1
        tag = match.group(0)
        tag = re.sub(r'\s+(?:width|height)\s*=\s*["\'][^"\']*["\']', '', tag, flags=re.IGNORECASE)
        closing = '/>' if tag.endswith('/>') else '>'
        body = tag[:-len(closing)].rstrip()
        return f'{body} width="{size[0]}" height="{size[1]}"{closing}'

    return pattern.sub(repl, html), count


def normalize_country_links(html, local_url, label):
    img_src = re.escape(local_url)
    anchor = re.compile(
        r'<a\b(?P<attrs>[^>]*)>(?P<body>(?:(?!<a\b|</a>).)*?<img\b(?=[^>]*\bsrc=["\']'
        + img_src
        + r'["\'])[^>]*>(?:(?!<a\b|</a>).)*?)</a>',
        re.IGNORECASE | re.DOTALL,
    )
    count = 0

    def repl(match):
        nonlocal count
        count += 1
        attrs = match.group('attrs')
        body = match.group('body')
        if re.search(r'\saria-label=["\'][^"\']*["\']', attrs, re.IGNORECASE):
            attrs = re.sub(
                r'\saria-label=["\'][^"\']*["\']',
                f' aria-label="{label}"',
                attrs,
                count=1,
                flags=re.IGNORECASE,
            )
        else:
            attrs = attrs.rstrip() + f' aria-label="{label}"'
        body = re.sub(
            r'(<img\b(?=[^>]*\bsrc=["\']' + img_src + r'["\'])[^>]*?)\s+alt=["\'][^"\']*["\']',
            r'\1 alt=""',
            body,
            count=1,
            flags=re.IGNORECASE,
        )
        return '<a' + attrs + '>' + body + '</a>'

    return anchor.sub(repl, html), count


def optimize_banner(html):
    data, ctype = download_response(BANNER_URL)
    image, size = decode_image(data, 'desktop-banner')
    if size != BANNER_EXPECTED:
        raise SystemExit(f'desktop banner geometry changed upstream: expected {BANNER_EXPECTED}, got {size}')

    out_dir = SITE / '_critical-media'
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / 'desktop-banner.webp'
    if ctype == 'image/webp':
        encoded = data
    else:
        buf = io.BytesIO()
        image.save(buf, format='WEBP', quality=90, method=6)
        encoded = buf.getvalue()
    if not encoded or len(encoded) > 120_000:
        raise SystemExit(f'desktop banner budget exceeded: {len(encoded)} bytes')
    target.write_bytes(encoded)
    local = f'_critical-media/desktop-banner.webp?v={SHA}'

    banner = re.compile(
        r'<img\b(?=[^>]*\bclass=["\'][^"\']*\bimgBannerShop\b[^"\']*["\'])[^>]*>',
        re.IGNORECASE,
    )
    match = banner.search(html)
    if not match:
        raise SystemExit('desktop banner image missing')
    tag = match.group(0)
    if BANNER_URL not in tag:
        raise SystemExit('unexpected desktop banner source before localization')
    tag = re.sub(r'\bsrc=["\'][^"\']+["\']', f'src="{local}"', tag, count=1, flags=re.IGNORECASE)
    tag = re.sub(r'\s+(?:width|height|loading|decoding|fetchpriority)=["\'][^"\']*["\']', '', tag, flags=re.IGNORECASE)
    closing = '/>' if tag.endswith('/>') else '>'
    body = tag[:-len(closing)].rstrip()
    tag = f'{body} width="{size[0]}" height="{size[1]}" loading="eager" decoding="async" fetchpriority="auto"{closing}'
    html = html[:match.start()] + tag + html[match.end():]

    preload = re.compile(
        r'<link\b(?=[^>]*\brel=["\']preload["\'])(?=[^>]*\bas=["\']image["\'])[^>]*>',
        re.IGNORECASE,
    )
    candidates = [m for m in preload.finditer(html) if BANNER_URL in m.group(0)]
    if len(candidates) != 1:
        raise SystemExit(f'expected one desktop banner preload, found {len(candidates)}')
    match = candidates[0]
    new = match.group(0).replace(BANNER_URL, local)
    if not re.search(r'\bmedia=["\']\(min-width:\s*993px\)["\']', new, re.IGNORECASE):
        raise SystemExit('desktop banner preload lost desktop media gate')
    html = html[:match.start()] + new + html[match.end():]
    return html, len(encoded), size


def optimize_desktop_stability(html):
    html, banner_bytes, banner_size = optimize_banner(html)

    media_stats = []
    local_by_name = {}
    total = 0
    for name, url in CHROME_MEDIA:
        local, size, encoded_bytes = encode_chrome_webp(download(url), name)
        total += encoded_bytes
        if total > MAX_CHROME_TOTAL:
            raise SystemExit(f'desktop chrome total WebP budget exceeded: {total} bytes')
        html, count = replace_img_source(html, url, local, size)
        if count < 1:
            raise SystemExit(f'expected desktop chrome image not found: {url}')
        local_by_name[name] = local
        media_stats.append((name, count, size, encoded_bytes))

    country_links = 0
    for name, label in COUNTRIES.items():
        html, count = normalize_country_links(html, local_by_name[name], label)
        if count < 1:
            raise SystemExit(f'country link not found for {label}')
        country_links += count

    dimension_stats = []
    for url in DIMENSION_ONLY:
        _, size = decode_image(download(url), Path(urlparse(url).path).name)
        html, count = ensure_remote_dimensions(html, url, size)
        if count < 1:
            raise SystemExit(f'dimension-only image not found: {url}')
        dimension_stats.append((Path(urlparse(url).path).name, count, size))

    desktop = {
        'banner_bytes': banner_bytes,
        'banner_size': banner_size,
        'media': media_stats,
        'country_links': country_links,
        'dimensions': dimension_stats,
    }
    return html, desktop


def verify(html, first_stats, desktop):
    if html.count('data-sc-first-viewport=') != FIRST_VIEWPORT_COUNT:
        raise SystemExit('first-viewport product marker count mismatch')
    for index in range(1, FIRST_VIEWPORT_COUNT + 1):
        asset = SITE / f'_first-viewport/product-{index}.webp'
        if not asset.is_file() or asset.stat().st_size > MAX_BYTES:
            raise SystemExit(f'invalid first-viewport product asset: {asset}')
    if "querySelectorAll('img[data-sc-first-viewport]')" not in html:
        raise SystemExit('delivery loader does not release first-viewport products after LCP media')

    if BANNER_URL in html:
        raise SystemExit('remote desktop banner remains after localization')
    if 'web-sushiclub2_black.png' in html:
        raise SystemExit('remote desktop logo remains after localization')
    if html.count('_chrome-media/flag-') < len(COUNTRIES):
        raise SystemExit('country chrome-media localization incomplete')
    if not (SITE / '_critical-media/desktop-banner.webp').is_file():
        raise SystemExit('localized desktop banner missing')
    if not re.search(
        r'<img\b(?=[^>]*\bclass=["\'][^"\']*\bimgBannerShop\b)(?=[^>]*\bsrc=["\']_critical-media/desktop-banner\.webp\?v=' + re.escape(SHA) + r'["\'])(?=[^>]*\bwidth=["\']1500["\'])(?=[^>]*\bheight=["\']157["\'])[^>]*>',
        html,
        re.IGNORECASE,
    ):
        raise SystemExit('desktop banner lost localized intrinsic geometry')
    if not re.search(
        r'<img\b(?=[^>]*\bsrc=["\']_chrome-media/desktop-logo\.webp\?v=' + re.escape(SHA) + r'["\'])(?=[^>]*\bwidth=["\'][1-9][0-9]*["\'])(?=[^>]*\bheight=["\'][1-9][0-9]*["\'])[^>]*>',
        html,
        re.IGNORECASE,
    ):
        raise SystemExit('desktop logo intrinsic dimensions missing')
    for name, label in COUNTRIES.items():
        local = f'_chrome-media/{name}.webp?v={SHA}'
        if not re.search(
            r'<a\b(?=[^>]*\baria-label=["\']' + re.escape(label) + r'["\'])[^>]*>(?:(?!</a>).)*?<img\b(?=[^>]*\bsrc=["\']' + re.escape(local) + r'["\'])(?=[^>]*\balt=["\']["\'])[^>]*>(?:(?!</a>).)*?</a>',
            html,
            re.IGNORECASE | re.DOTALL,
        ):
            raise SystemExit(f'accessibility normalization missing for country {label}')


html = INDEX.read_text(encoding='utf-8')
html, first_stats = optimize_first_viewport(html)
html, desktop = optimize_desktop_stability(html)
INDEX.write_text(html, encoding='utf-8')
verify(html, first_stats, desktop)

first_summary = ', '.join(f'{index}:{size}B/{dims[0]}x{dims[1]}' for index, size, dims in first_stats)
chrome_summary = ', '.join(
    f'{name}:{count}x/{size[0]}x{size[1]}/{encoded_bytes}B'
    for name, count, size, encoded_bytes in desktop['media']
)
dimensions_summary = ', '.join(
    f'{name}:{count}x/{size[0]}x{size[1]}' for name, count, size in desktop['dimensions']
)
print(
    f'Optimized {FIRST_VIEWPORT_COUNT} first-viewport products after logo readiness: {first_summary}. '
    f'Desktop stability: banner {desktop["banner_size"][0]}x{desktop["banner_size"][1]}/{desktop["banner_bytes"]}B same-origin; '
    f'{chrome_summary}; {desktop["country_links"]} country links labelled; dimension-only {dimensions_summary}.'
)
