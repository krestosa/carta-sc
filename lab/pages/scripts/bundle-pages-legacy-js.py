#!/usr/bin/env python3
import os
import re
from pathlib import Path

SITE = Path('.pages-site')
SHA = os.environ.get('GITHUB_SHA', '')
BUNDLE = SITE / '_pages/legacy.js'

LEGACY_SCRIPTS = [
    '_js_dev/modernizr-2.6.1-respond-1.1.0.min.js',
    '_js_dev/jquery.easing.1.3.min.js',
    'js/bootstrap.min.js',
    '_js_dev/jquery.cycle2.min.js',
    '_js_dev/jquery.slicknav.js',
    '_js_dev/jquery.nyroModal.custom.js',
    '_js_dev/jquery.livequery.min.js',
    '_js_dev/jquery.fancybox.js',
    '_js_dev/jquery.fancybox-buttons.js',
    '_js_dev/jquery.fancybox-media.js',
    '_js_dev/moment.min.js',
    '_js_dev/daterangepicker.js',
    '_js_dev/imgLiquid.js',
    '_js_dev/slick.min.js',
    '_js_dev/sweetalert2.min.js',
    '_js_dev/plugins.js',
]

if not re.fullmatch(r'[0-9a-f]{40}', SHA):
    raise SystemExit('GITHUB_SHA is missing or invalid')
if not SITE.is_dir():
    raise SystemExit('.pages-site does not exist')


def script_pattern(src):
    return re.compile(
        rf'<script\b(?=[^>]*\bsrc=["\']{re.escape(src)}["\'])[^>]*>\s*</script>',
        re.IGNORECASE,
    )


def remove_commented_script(html, src):
    pattern = re.compile(
        rf'<!--\s*<script\b(?=[^>]*\bsrc=["\']{re.escape(src)}["\'])[^>]*>\s*</script>\s*-->',
        re.IGNORECASE,
    )
    return pattern.sub('', html)


index_path = SITE / 'index.html'
html = index_path.read_text(encoding='utf-8')
bundled = []

for src in LEGACY_SCRIPTS:
    html = remove_commented_script(html, src)

for position, src in enumerate(LEGACY_SCRIPTS):
    pattern = script_pattern(src)
    matches = list(pattern.finditer(html))
    if len(matches) != 1:
        raise SystemExit(f'Expected exactly one active script tag for {src}, found {len(matches)}')

    tag = matches[0].group(0)
    if re.search(r'\b(?:async|defer)\b', tag, re.IGNORECASE):
        raise SystemExit(f'Cannot safely bundle async/defer script: {src}')
    script_type = re.search(r'\btype=["\']([^"\']+)["\']', tag, re.IGNORECASE)
    if script_type and script_type.group(1).strip().lower() not in ('text/javascript', 'application/javascript'):
        raise SystemExit(f'Cannot safely bundle script type {script_type.group(1)!r}: {src}')

    source = SITE / src
    if not source.is_file():
        raise SystemExit(f'Missing legacy script: {src}')
    content = source.read_text(encoding='utf-8', errors='strict')
    if re.search(r'\bdocument\.currentScript\b|\bimport\.meta\b', content):
        raise SystemExit(f'Script depends on per-file execution semantics and cannot be bundled: {src}')
    bundled.append(f'/* origen: {src} */\n{content.rstrip()}\n;')

    replacement = ''
    if position == 0:
        replacement = f'<script src="_pages/legacy.js?v={SHA}" type="text/javascript"></script>'
    html, count = pattern.subn(replacement, html, count=1)
    if count != 1:
        raise SystemExit(f'Could not replace legacy script tag: {src}')

BUNDLE.parent.mkdir(parents=True, exist_ok=True)
BUNDLE.write_text('\n\n'.join(bundled) + '\n', encoding='utf-8')
index_path.write_text(html, encoding='utf-8')

if html.count(f'_pages/legacy.js?v={SHA}') != 1:
    raise SystemExit('Legacy JS bundle tag must appear exactly once')
for src in LEGACY_SCRIPTS:
    if script_pattern(src).search(html):
        raise SystemExit(f'Active legacy script tag remains after bundling: {src}')
if len(re.findall(r'^/\* origen:', BUNDLE.read_text(encoding='utf-8'), re.MULTILINE)) != len(LEGACY_SCRIPTS):
    raise SystemExit('Legacy JS bundle source count mismatch')

print(f'Bundled {len(LEGACY_SCRIPTS)} legacy scripts into {BUNDLE}')
