#!/usr/bin/env python3
import os
import re
from pathlib import Path

SITE = Path('.pages-site')
SHA = os.environ.get('GITHUB_SHA', '')
BUNDLE = SITE / '_pages/legacy.css'

LEGACY_STYLES = [
    '_css_dev/font-awesome.min.css',
    '_css_dev/bootstrap.min.css',
    '_css_dev/fnt-helvlig.css',
    '_css_dev/fontBar.css',
    '_css_dev/jquery.fancybox.css',
    '_css_dev/jquery.fancybox-buttons.css',
    '_css_dev/slick.css',
    '_css_dev/slick-theme.css',
    '_css_dev/sweetalert2.min.css',
    '_css_dev/slicknav__q_dd9216b6.css',
    '_css_dev/nyroModal_wkTheme.css',
    '_css_dev/daterangepicker.css',
    '_css_dev/styles.css',
    '_css_dev/styles_newver17.css',
    'css/styles_shop__q_a48cd660.css',
    'css/_aux__q_a48cd660.css',
]

if not re.fullmatch(r'[0-9a-f]{40}', SHA):
    raise SystemExit('GITHUB_SHA is missing or invalid')
if not SITE.is_dir():
    raise SystemExit('.pages-site does not exist')


def rebase_urls(source, content):
    url_re = re.compile(
        r'url\(\s*(?P<quote>["\']?)(?P<value>.*?)(?P=quote)\s*\)',
        re.IGNORECASE,
    )

    def replace(match):
        value = match.group('value').strip()
        if not value or re.match(r'^(?:[a-z][a-z0-9+.-]*:|//|/|#)', value, re.IGNORECASE):
            return match.group(0)
        parts = re.match(r'^(?P<path>[^?#]+)(?P<suffix>[?#].*)?$', value)
        if not parts:
            return match.group(0)
        resolved = os.path.normpath(os.path.join(str(source.parent), parts.group('path')))
        rebased = os.path.relpath(resolved, start=str(BUNDLE.parent)).replace(os.sep, '/')
        quote = match.group('quote')
        suffix = parts.group('suffix') or ''
        return f'url({quote}{rebased}{suffix}{quote})'

    return url_re.sub(replace, content)


def link_pattern(href):
    return re.compile(
        rf'<link\b(?=[^>]*\bhref=["\']{re.escape(href)}["\'])[^>]*>',
        re.IGNORECASE,
    )


index_path = SITE / 'index.html'
html = index_path.read_text(encoding='utf-8')
bundled = []

for position, href in enumerate(LEGACY_STYLES):
    pattern = link_pattern(href)
    matches = list(pattern.finditer(html))
    if len(matches) != 1:
        raise SystemExit(f'Expected exactly one stylesheet tag for {href}, found {len(matches)}')

    tag = matches[0].group(0)
    if not re.search(r'\brel=["\']stylesheet["\']', tag, re.IGNORECASE):
        raise SystemExit(f'Non-stylesheet link matched for {href}: {tag}')
    media = re.search(r'\bmedia=["\']([^"\']+)["\']', tag, re.IGNORECASE)
    if media and media.group(1).strip().lower() != 'all':
        raise SystemExit(f'Cannot safely bundle {href} with media={media.group(1)!r}')

    source = SITE / href
    if not source.is_file():
        raise SystemExit(f'Missing legacy stylesheet: {href}')
    content = source.read_text(encoding='utf-8', errors='strict')
    content = re.sub(r'^\s*@charset\s+["\'][^"\']+["\'];\s*', '', content, count=1, flags=re.IGNORECASE)
    if re.search(r'@import\b', content, re.IGNORECASE):
        raise SystemExit(f'Nested @import found in legacy stylesheet: {href}')
    bundled.append(f'/* source: {href} */\n{rebase_urls(source, content).rstrip()}')

    replacement = ''
    if position == 0:
        replacement = f'<link href="_pages/legacy.css?v={SHA}" rel="stylesheet" media="all" type="text/css">'
    html, count = pattern.subn(replacement, html, count=1)
    if count != 1:
        raise SystemExit(f'Could not replace legacy stylesheet tag: {href}')

BUNDLE.parent.mkdir(parents=True, exist_ok=True)
BUNDLE.write_text('\n\n'.join(bundled) + '\n', encoding='utf-8')
index_path.write_text(html, encoding='utf-8')

if html.count(f'_pages/legacy.css?v={SHA}') != 1:
    raise SystemExit('Legacy CSS bundle link must appear exactly once')
for href in LEGACY_STYLES:
    if link_pattern(href).search(html):
        raise SystemExit(f'Legacy stylesheet tag remains after bundling: {href}')
if len(re.findall(r'^/\* source:', BUNDLE.read_text(encoding='utf-8'), re.MULTILINE)) != len(LEGACY_STYLES):
    raise SystemExit('Legacy CSS bundle source count mismatch')

print(f'Bundled {len(LEGACY_STYLES)} legacy stylesheets into {BUNDLE}')
