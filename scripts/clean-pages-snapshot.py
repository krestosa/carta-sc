#!/usr/bin/env python3
import os
import re
from pathlib import Path

SITE = Path('.pages-site')
SHA = os.environ.get('GITHUB_SHA', '')

if not re.fullmatch(r'[0-9a-f]{40}', SHA):
    raise SystemExit('GITHUB_SHA is missing or invalid')
if not SITE.is_dir():
    raise SystemExit('.pages-site does not exist')

index_path = SITE / 'index.html'
html = index_path.read_text(encoding='utf-8')

jquery_fallback = re.compile(
    r'<script>\s*window\.jQuery\s*\|\|\s*document\.write\(.*?jquery-2\.1\.0\.min\.js.*?\)\s*</script>',
    re.IGNORECASE | re.DOTALL,
)
html, jquery_fallback_count = jquery_fallback.subn('', html, count=1)
if jquery_fallback_count != 1:
    raise SystemExit(f'Expected one redundant jQuery document.write fallback, found {jquery_fallback_count}')

captured_gtm = re.compile(
    r'<script\b[^>]*\bsrc=["\']https://www\.googletagmanager\.com/gtm\.js\?id=GTM-WQPLGX9["\'][^>]*>\s*</script>',
    re.IGNORECASE,
)
html, captured_gtm_count = captured_gtm.subn('', html, count=1)
if captured_gtm_count != 1:
    raise SystemExit(f'Expected one captured GTM runtime tag, found {captured_gtm_count}')

jquery_tag = re.compile(
    r'<script\b[^>]*\bsrc=["\']js/jquery-2\.1\.0\.min\.js["\'][^>]*>\s*</script>',
    re.IGNORECASE,
)
if len(jquery_tag.findall(html)) != 1:
    raise SystemExit('Pages artifact must retain exactly one explicit jQuery 2.1.0 script tag')
if captured_gtm.search(html):
    raise SystemExit('Captured GTM runtime tag remains after cleanup')
if 'GTM-WQPLGX9' not in html or 'googletagmanager.com/gtm.js?id=' not in html:
    raise SystemExit('Canonical GTM bootstrap snippet is missing after cleanup')

index_path.write_text(html, encoding='utf-8')
print('Removed duplicate snapshot jQuery and GTM runtime loads')
