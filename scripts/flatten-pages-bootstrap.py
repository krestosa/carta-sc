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

bootstrap = re.compile(
    rf'<script\b(?=[^>]*\bsrc=["\']_js_dev/main\.js\?v={re.escape(SHA)}["\'])[^>]*>\s*</script>',
    re.IGNORECASE,
)
replacement = '\n'.join([
    f"<script>document.documentElement.classList.add('sc-catalog-prepaint','sc-no-loading-state');window.__scCatalogAssetVersion='{SHA}';</script>",
    f'<script src="_js_dev/main-legacy.js?v={SHA}" type="text/javascript"></script>',
    f'<link rel="stylesheet" href="override/main.css?v={SHA}">',
    f'<script src="override/main.js?v={SHA}" type="text/javascript"></script>',
])
html, count = bootstrap.subn(replacement, html, count=1)
if count != 1:
    raise SystemExit(f'Expected one Pages bootstrap script, found {count}')

if bootstrap.search(html):
    raise SystemExit('Development bootstrap script remains in Pages index')
if len(re.findall(rf'<script\b[^>]*\bsrc=["\']_js_dev/main-legacy\.js\?v={re.escape(SHA)}["\'][^>]*>\s*</script>', html, re.IGNORECASE)) != 1:
    raise SystemExit('Direct main-legacy script must appear exactly once')
if len(re.findall(rf'<link\b[^>]*\bhref=["\']override/main\.css\?v={re.escape(SHA)}["\'][^>]*>', html, re.IGNORECASE)) != 2:
    raise SystemExit('Override CSS must appear once as preload and once as stylesheet')
if len(re.findall(rf'<script\b[^>]*\bsrc=["\']override/main\.js\?v={re.escape(SHA)}["\'][^>]*>\s*</script>', html, re.IGNORECASE)) != 1:
    raise SystemExit('Direct override runtime script must appear exactly once')

index_path.write_text(html, encoding='utf-8')
print('Flattened Pages bootstrap while preserving main-legacy -> CSS -> override order')
