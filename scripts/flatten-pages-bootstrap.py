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
view_prepaint = (
    "(function(){var r=document.documentElement,w=window.innerWidth||r.clientWidth||0,"
    "c=w<=640?'phone':w<=992?'tablet':'desktop',v='',l='';"
    "function m(x){if(x==='list')return'list';if(c==='phone')return x==='two'?'compact':x==='one'?'normal':'';"
    "if(c==='tablet')return x==='three'||x==='four'?'compact':x==='two'?'normal':'';return x==='four'?'compact':x==='three'?'normal':''}"
    "try{v=localStorage.getItem('scCatalogView:v3')||'';if(['normal','compact','list'].indexOf(v)<0){"
    "l=localStorage.getItem('scCatalogView:v2:'+c)||localStorage.getItem(c==='desktop'?'scCatalogView:desktop':'scCatalogView:mobile')||'';"
    "v=m(l);if(v){try{localStorage.setItem('scCatalogView:v3',v)}catch(e2){}}}}catch(e){v=''}"
    "if(['normal','compact','list'].indexOf(v)<0)v='normal';r.setAttribute('data-sc-catalog-view',v);"
    "r.classList.add('sc-catalog-prepaint','sc-no-loading-state')})();"
)
replacement = '\n'.join([
    f"<script>{view_prepaint}window.__scCatalogAssetVersion='{SHA}';</script>",
    f'<script src="_js_dev/main-legacy.js?v={SHA}" type="text/javascript"></script>',
    f'<link rel="stylesheet" href="override/main.css?v={SHA}">',
    f'<script src="override/main.js?v={SHA}" type="text/javascript"></script>',
])
html, count = bootstrap.subn(replacement, html, count=1)
if count != 1:
    raise SystemExit(f'Expected one Pages bootstrap script, found {count}')

if bootstrap.search(html):
    raise SystemExit('Development bootstrap script remains in Pages index')
if 'data-sc-catalog-view' not in html or 'scCatalogView:v3' not in html:
    raise SystemExit('Remembered unified catalogue view prepaint bootstrap is missing')
if len(re.findall(rf'<script\b[^>]*\bsrc=["\']_js_dev/main-legacy\.js\?v={re.escape(SHA)}["\'][^>]*>\s*</script>', html, re.IGNORECASE)) != 1:
    raise SystemExit('Direct main-legacy script must appear exactly once')
if len(re.findall(rf'<link\b[^>]*\bhref=["\']override/main\.css\?v={re.escape(SHA)}["\'][^>]*>', html, re.IGNORECASE)) != 2:
    raise SystemExit('Override CSS must appear once as preload and once as stylesheet')
if len(re.findall(rf'<script\b[^>]*\bsrc=["\']override/main\.js\?v={re.escape(SHA)}["\'][^>]*>\s*</script>', html, re.IGNORECASE)) != 1:
    raise SystemExit('Direct override runtime script must appear exactly once')

index_path.write_text(html, encoding='utf-8')
print('Flattened Pages bootstrap with remembered view prepaint and main-legacy -> CSS -> override order')
