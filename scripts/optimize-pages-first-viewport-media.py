#!/usr/bin/env python3
import io
import os
import re
import time
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'
SHA = os.environ.get('GITHUB_SHA', '')
FIRST_VIEWPORT_COUNT = 4
MAX_DIMENSION = 420
WEBP_QUALITY = 72
MAX_BYTES = 36_000

if not re.fullmatch(r'[0-9a-f]{40}', SHA) or not INDEX.is_file():
    raise SystemExit('invalid Pages first-viewport media context')


def download(url):
    error = None
    for attempt in range(3):
        try:
            req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urlopen(req, timeout=12) as response:
                data = response.read()
                ctype = response.headers.get_content_type()
            if not data or len(data) > 3_000_000 or not ctype.startswith('image/'):
                raise ValueError(f'invalid source image: type={ctype} bytes={len(data)}')
            return data
        except Exception as exc:
            error = exc
            if attempt < 2:
                time.sleep(.6 * (attempt + 1))
    raise SystemExit(f'first-viewport image download failed: {url}: {error}')


def encode_webp(data, name):
    try:
        with Image.open(io.BytesIO(data)) as source:
            source.load()
            image = source.convert('RGBA' if 'A' in source.getbands() else 'RGB')
    except Exception as exc:
        raise SystemExit(f'cannot decode first-viewport image {name}: {exc}')

    image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)
    out_dir = SITE / '_first-viewport'
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / f'{name}.webp'

    attempts = ((MAX_DIMENSION, WEBP_QUALITY), (384, 70), (352, 68))
    encoded = b''
    for dimension, quality in attempts:
        candidate = image.copy()
        candidate.thumbnail((dimension, dimension), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        candidate.save(buf, format='WEBP', quality=quality, method=6)
        encoded = buf.getvalue()
        if len(encoded) <= MAX_BYTES:
            break
    if not encoded or len(encoded) > MAX_BYTES:
        raise SystemExit(f'first-viewport WebP budget exceeded for {name}: {len(encoded)} bytes')
    target.write_bytes(encoded)
    return f'_first-viewport/{target.name}?v={SHA}', len(encoded), image.size


def optimize(html):
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


html = INDEX.read_text(encoding='utf-8')
html, stats = optimize(html)
INDEX.write_text(html, encoding='utf-8')

if html.count('data-sc-first-viewport=') != FIRST_VIEWPORT_COUNT:
    raise SystemExit('first-viewport product marker count mismatch')
for index in range(1, FIRST_VIEWPORT_COUNT + 1):
    asset = SITE / f'_first-viewport/product-{index}.webp'
    if not asset.is_file() or asset.stat().st_size > MAX_BYTES:
        raise SystemExit(f'invalid first-viewport product asset: {asset}')
if "querySelectorAll('img[data-sc-first-viewport]')" not in html:
    raise SystemExit('delivery loader does not release first-viewport products after LCP media')

summary = ', '.join(f'{index}:{size}B/{dims[0]}x{dims[1]}' for index, size, dims in stats)
print(f'Optimized {FIRST_VIEWPORT_COUNT} first-viewport products to local WebP after logo readiness: {summary}')
