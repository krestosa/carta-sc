#!/usr/bin/env python3
import os
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'
SHA = os.environ.get('GITHUB_SHA', '')

if not INDEX.is_file() or not re.fullmatch(r'[0-9a-f]{40}', SHA):
    raise SystemExit('invalid system-load validation context')


class LoadGraph(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.scripts = []
        self.styles = []
        self.images = []
        self.preloads = []

    def handle_starttag(self, tag, attrs_list):
        attrs = dict(attrs_list)
        if tag == 'script' and attrs.get('src'):
            self.scripts.append(attrs['src'])
        elif tag == 'link':
            rel = set((attrs.get('rel') or '').lower().split())
            href = attrs.get('href') or ''
            if 'stylesheet' in rel and href:
                self.styles.append(href)
            if 'preload' in rel and href:
                self.preloads.append(href)
        elif tag == 'img' and attrs.get('src'):
            self.images.append(attrs['src'])


def path_only(value):
    return urlsplit(value).path.lstrip('/')


html = INDEX.read_text(encoding='utf-8')
graph = LoadGraph()
graph.feed(html)
issues = []

logo = f'_critical-media/sushiclub-logo.svg?v={SHA}'
logo_paths = [v for v in graph.images if v == logo]
logo_preloads = [v for v in graph.preloads if v == logo]
if len(logo_paths) != 2 or len(logo_preloads) != 1:
    issues.append(f'system logo load contract mismatch: images={len(logo_paths)} preloads={len(logo_preloads)}')

for stale in (
    'web-sushiclub2_black_m2',
    'web-sushiclub2_black.png',
    '_critical-media/mobile-logo.png',
    '_critical-media/mobile-logo.webp',
    '_chrome-media/desktop-logo.webp',
):
    if stale in html:
        issues.append(f'superseded logo reference remains active/generated: {stale}')

for stale_file in (
    SITE / '_critical-media/mobile-logo.png',
    SITE / '_critical-media/mobile-logo.webp',
    SITE / '_chrome-media/desktop-logo.webp',
):
    if stale_file.exists():
        issues.append(f'superseded logo file remains in artifact: {stale_file.relative_to(SITE)}')

# Los PNG de rasgos quedan sólo como fuente de metadata. Los rasgos visibles de producto y
# referencias se generan como SVG inline, así que conservar un <img src> haría trabajo de
# red redundante incluso con el nodo legacy en display:none.
trait_tags = re.findall(r'<img\b(?=[^>]*\bdata-original-title=)[^>]*>', html, re.I)
if not trait_tags:
    issues.append('legacy trait metadata nodes are missing')
for tag in trait_tags:
    if re.search(r'\bsrc\s*=', tag, re.I):
        issues.append('legacy trait metadata still has an active img src')
        break

# Estos fondos raster están totalmente reemplazados por tokens de superficie del tema y
# por el riel SVG de categorías; incluso una referencia CSS url() sería una regresión.
for stale in (
    'https://www.sushiclub.com.ar/gfx/back_body_01.png',
    'https://www.sushiclub.com.ar/gfx/back_body_01_white.png',
    'https://www.sushiclub.com.ar/gfx/scrollTab2.png',
):
    if stale in html:
        issues.append(f'superseded CSS raster remains in final browser graph: {stale}')

# La entrega final de Pages no tiene tags de runtime local eager. Su loader inline es dueño
# del manifiesto optimizado exacto y crea los tags recién después del primer paint/idle.
# También se audita esa ruta real de carga del navegador.
runtime_manifest = (
    "A=['js/jquery-2.1.0.min.js','_pages/php-guard.js?v='+S,'_pages/legacy.js?v='+S,"
    "'_js_dev/main-legacy.js?v='+S,'override/main.js?v='+S,'_pages/shop.js?v='+S]"
)
if html.count(runtime_manifest) != 1:
    issues.append(f'optimized deferred runtime manifest count must be 1, found {html.count(runtime_manifest)}')
if not (SITE / '_pages/php-guard.js').is_file():
    issues.append('static Pages PHP transport guard is missing')
if 'keepSessionAlive' in html or 'keepalive: 1' in html:
    issues.append('captured PHP session keepalive remains in final Pages HTML')
if html.count("'_pages/php-guard.js?v='+S") != 1:
    issues.append('PHP transport guard runtime reference is missing or duplicated')
if html.count("c.href='_pages/deferred.css?v='+S") != 1:
    issues.append('optimized deferred stylesheet loader is missing or duplicated')

# Estos dos scripts fuente quedan reemplazados por _pages/shop.js. Los archivos fuente pueden
# existir en el artefacto por procedencia, pero no debe sobrevivir ninguna referencia de carga
# estática o dinámica en el HTML construido.
for source in ('js/funcionesShop__q_f352afe3.js', 'js/main_shop__q_a48cd660.js'):
    if source in html:
        issues.append(f'superseded shop script is still referenced by browser load graph: {source}')

# Los links a stylesheets fuente quedan reemplazados por CSS crítico inline y un único bundle
# diferido. Los nombres de origen dentro de comentarios CSS no afectan; se inspeccionan sólo links.
active_style_paths = [path_only(v) for v in graph.styles]
for p in active_style_paths:
    if p.startswith('_css_dev/') or p in {
        '_pages/legacy.css', 'override/main.css',
        'css/styles_shop__q_a48cd660.css', 'css/_aux__q_a48cd660.css',
    }:
        issues.append(f'superseded stylesheet is still loaded directly: {p}')
for style in sorted(set(active_style_paths)):
    if active_style_paths.count(style) > 1:
        issues.append(f'duplicate eager stylesheet load ({active_style_paths.count(style)}x): {style}')
if html.count('id="sc-pages-critical-css"') != 1:
    issues.append('critical inline CSS block missing or duplicated')

# Cualquier tag de script local eager que quede también debe ser único. El runtime optimizado
# se espera ausente acá porque se crea dinámicamente.
active_script_paths = [path_only(v) for v in graph.scripts]
for script in sorted(set(active_script_paths)):
    if active_script_paths.count(script) > 1:
        issues.append(f'duplicate eager script load ({active_script_paths.count(script)}x): {script}')

# Las variantes locales responsive del banner reemplazan la petición upstream. Un preload más
# su uso posterior en <img> es intencional y el navegador los coalesce.
if 'aniversario_banner_desktop_(1)1782398717_556.webp' in html:
    issues.append('upstream banner remains referenced after responsive localization')
if f'_critical-media/desktop-banner.webp?v={SHA}' not in html:
    issues.append('optimized desktop banner reference missing')
if f'_critical-media/mobile-banner.webp?v={SHA}' not in html:
    issues.append('optimized mobile banner reference missing')

if issues:
    print(f'System load validation failed with {len(issues)} issue(s):')
    for issue in issues:
        print(f'- {issue}')
    raise SystemExit(1)

print(
    'System load validation passed: optimized resources replace originals in the actual browser load graph; '
    f'{len(graph.scripts)} eager scripts, {len(graph.styles)} eager stylesheets, '
    f'{len(graph.images)} src-bearing images and {len(graph.preloads)} preloads audited; '
    f'{len(trait_tags)} legacy trait nodes retained as metadata only; deferred runtime manifest audited separately.'
)
