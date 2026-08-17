#!/usr/bin/env python3
import io
import os
import re
from pathlib import Path

from PIL import Image

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'
SHA = os.environ.get('GITHUB_SHA', '')
MOBILE_BANNER_WIDTH = 764
MAX_MOBILE_BANNER = 14_000
MAX_MOBILE_LOGO = 6_000
PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
DESKTOP_ONLY = ('desktop-logo', 'flag-arg', 'flag-mex', 'flag-par', 'flag-esp', 'flag-uru', 'flag-usa')

if not re.fullmatch(r'[0-9a-f]{40}', SHA) or not INDEX.is_file():
    raise SystemExit('invalid breakpoint-media optimization context')

html = INDEX.read_text(encoding='utf-8')

# The mobile logo is the LCP candidate. Keep pixels identical while cutting the
# transfer from ~11 KiB PNG to ~3.5 KiB lossless WebP.
logo_png = SITE / '_critical-media/mobile-logo.png'
if not logo_png.is_file():
    raise SystemExit('mobile LCP PNG missing')
with Image.open(logo_png) as source:
    source.load()
    logo_size = source.size
    logo = source.convert('RGBA')
buf = io.BytesIO()
logo.save(buf, format='WEBP', lossless=True, method=6)
logo_bytes = buf.getvalue()
if not logo_bytes or len(logo_bytes) > MAX_MOBILE_LOGO:
    raise SystemExit(f'mobile LCP WebP budget exceeded: {len(logo_bytes)}')
logo_webp = SITE / '_critical-media/mobile-logo.webp'
logo_webp.write_bytes(logo_bytes)
old_logo = f'_critical-media/mobile-logo.png?v={SHA}'
new_logo = f'_critical-media/mobile-logo.webp?v={SHA}'
if html.count(old_logo) < 2:
    raise SystemExit('mobile LCP image/preload references missing')
html = html.replace(old_logo, new_logo)
logo_png.unlink()

# The full 1500px desktop banner was being selected on the emulated phone.
# Add a right-sized candidate; keep the desktop source/preload untouched.
desktop_banner = SITE / '_critical-media/desktop-banner.webp'
if not desktop_banner.is_file():
    raise SystemExit('desktop banner missing')
with Image.open(desktop_banner) as source:
    source.load()
    banner = source.convert('RGB')
mobile_h = max(1, int(banner.height * MOBILE_BANNER_WIDTH / banner.width + .5))
mobile_banner = banner.resize((MOBILE_BANNER_WIDTH, mobile_h), Image.Resampling.LANCZOS)
buf = io.BytesIO()
mobile_banner.save(buf, format='WEBP', quality=78, method=6)
mobile_banner_bytes = buf.getvalue()
if not mobile_banner_bytes or len(mobile_banner_bytes) > MAX_MOBILE_BANNER:
    raise SystemExit(f'mobile banner budget exceeded: {len(mobile_banner_bytes)}')
mobile_banner_path = SITE / '_critical-media/mobile-banner.webp'
mobile_banner_path.write_bytes(mobile_banner_bytes)
desktop_url = f'_critical-media/desktop-banner.webp?v={SHA}'
mobile_url = f'_critical-media/mobile-banner.webp?v={SHA}'

banner_re = re.compile(r'<img\b(?=[^>]*\bclass=["\'][^"\']*\bimgBannerShop\b[^"\']*["\'])[^>]*>', re.I)
match = banner_re.search(html)
if not match or desktop_url not in match.group(0):
    raise SystemExit('localized banner tag missing')
tag = re.sub(r'\s+(?:srcset|sizes)=["\'][^"\']*["\']', '', match.group(0), flags=re.I)
close = '/>' if tag.endswith('/>') else '>'
body = tag[:-len(close)].rstrip()
tag = (f'{body} srcset="{mobile_url} {MOBILE_BANNER_WIDTH}w, {desktop_url} {banner.width}w" '
       f'sizes="(max-width: 992px) 100vw, 1140px"{close}')
html = html[:match.start()] + tag + html[match.end():]

# Header chrome fixed for desktop must not consume mobile bandwidth. Preserve
# intrinsic dimensions and DOM shape; release the real source only at >=993px.
for name in DESKTOP_ONLY:
    url = f'_chrome-media/{name}.webp?v={SHA}'
    img_re = re.compile(r'<img\b(?=[^>]*\bsrc=["\']' + re.escape(url) + r'["\'])[^>]*>', re.I)
    matches = list(img_re.finditer(html))
    if not matches:
        raise SystemExit(f'desktop-only media missing: {name}')
    for m in reversed(matches):
        t = m.group(0)
        t = re.sub(r'\bsrc=["\'][^"\']+["\']', f'src="{PIXEL}"', t, count=1, flags=re.I)
        t = re.sub(r'\s+data-sc-desktop-src=["\'][^"\']*["\']', '', t, flags=re.I)
        close = '/>' if t.endswith('/>') else '>'
        body = t[:-len(close)].rstrip()
        t = f'{body} data-sc-desktop-src="{url}"{close}'
        html = html[:m.start()] + t + html[m.end():]

# Sponsor marks are below the first viewport and were still competing on Slow 4G.
sponsor_re = re.compile(r'<img\b(?=[^>]*\bsrc=["\']https://www\.sushiclub\.com\.ar/uploads/marcas/[^"\']+["\'])[^>]*>', re.I)
def lazy_sponsor(m):
    t = re.sub(r'\s+(?:loading|decoding|fetchpriority)=["\'][^"\']*["\']', '', m.group(0), flags=re.I)
    close = '/>' if t.endswith('/>') else '>'
    return t[:-len(close)].rstrip() + f' loading="lazy" decoding="async" fetchpriority="low"{close}'
html = sponsor_re.sub(lazy_sponsor, html)

marker = "function ready(){if(done)return;done=1;[].forEach.call(d.querySelectorAll('img[data-sc-first-viewport]'),li);images();scheduleRuntime()}"
replacement = (
    "function dc(){[].forEach.call(d.querySelectorAll('img[data-sc-desktop-src]'),function(i){"
    "var s=i.getAttribute('data-sc-desktop-src');if(!s)return;i.removeAttribute('data-sc-desktop-src');i.src=s})}"
    "function ready(){if(done)return;done=1;var m=w.matchMedia&&w.matchMedia('(min-width:993px)');"
    "if(!m||m.matches)dc();else{var on=function(e){if(!e.matches)return;dc();"
    "if(m.removeEventListener)m.removeEventListener('change',on);else if(m.removeListener)m.removeListener(on)};"
    "if(m.addEventListener)m.addEventListener('change',on);else if(m.addListener)m.addListener(on)};"
    "[].forEach.call(d.querySelectorAll('img[data-sc-first-viewport]'),li);images();scheduleRuntime()}"
)
if html.count(marker) != 1:
    raise SystemExit('delivery-loader ready marker missing or duplicated')
html = html.replace(marker, replacement, 1)

if old_logo in html or not logo_webp.is_file() or logo_webp.stat().st_size > MAX_MOBILE_LOGO:
    raise SystemExit('mobile LCP conversion verification failed')
if not mobile_banner_path.is_file() or mobile_banner_path.stat().st_size > MAX_MOBILE_BANNER:
    raise SystemExit('mobile banner verification failed')
for name in DESKTOP_ONLY:
    url = f'_chrome-media/{name}.webp?v={SHA}'
    if re.search(r'\bsrc=["\']' + re.escape(url) + r'["\']', html, re.I):
        raise SystemExit(f'desktop-only media remains eager on mobile: {name}')
if "querySelectorAll('img[data-sc-desktop-src]')" not in html:
    raise SystemExit('desktop breakpoint media activator missing')

INDEX.write_text(html, encoding='utf-8')
print(
    f'Breakpoint media optimized: mobile LCP {logo_size[0]}x{logo_size[1]}/{len(logo_bytes)}B lossless WebP; '
    f'mobile banner {MOBILE_BANNER_WIDTH}x{mobile_h}/{len(mobile_banner_bytes)}B; '
    f'{len(DESKTOP_ONLY)} desktop-only images gated; sponsor marks lazy.'
)
