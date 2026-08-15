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


def normalize_legacy_fonts(href, content):
    if href == '_css_dev/font-awesome.min.css':
        pattern = re.compile(
            r"@font-face\s*\{\s*font-family\s*:\s*['\"]FontAwesome['\"].*?\}",
            re.IGNORECASE | re.DOTALL,
        )
        replacement = (
            "@font-face{font-family:'FontAwesome';"
            "src:url('../fonts/fontawesome-webfont__q_fb3a7b16.woff2') format('woff2');"
            "font-weight:normal;font-style:normal}"
        )
        content, count = pattern.subn(replacement, content, count=1)
        if count != 1:
            raise SystemExit('Could not normalize the Font Awesome @font-face block exactly once')

    elif href == '_css_dev/slick-theme.css':
        font_face = re.compile(
            r"@font-face\s*\{\s*font-family\s*:\s*['\"]slick['\"].*?\}",
            re.IGNORECASE | re.DOTALL,
        )
        content, count = font_face.subn('', content, count=1)
        if count != 1:
            raise SystemExit('Could not remove the missing Slick @font-face block exactly once')

        content, family_count = re.subn(
            r"font-family\s*:\s*['\"]slick['\"]\s*;",
            'font-family: Arial, sans-serif;',
            content,
            flags=re.IGNORECASE,
        )
        if family_count < 1:
            raise SystemExit('No Slick pseudo-element font-family declarations were normalized')

    return content


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


def remove_commented_link(html, href):
    pattern = re.compile(
        rf'<!--\s*<link\b(?=[^>]*\bhref=["\']{re.escape(href)}["\'])[^>]*>\s*-->',
        re.IGNORECASE,
    )
    return pattern.sub('', html)


index_path = SITE / 'index.html'
html = index_path.read_text(encoding='utf-8')
bundled = []

for href in LEGACY_STYLES:
    html = remove_commented_link(html, href)

for position, href in enumerate(LEGACY_STYLES):
    pattern = link_pattern(href)
    matches = list(pattern.finditer(html))
    if len(matches) != 1:
        raise SystemExit(f'Expected exactly one active stylesheet tag for {href}, found {len(matches)}')

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
    content = normalize_legacy_fonts(href, content)
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
        raise SystemExit(f'Active legacy stylesheet tag remains after bundling: {href}')
if len(re.findall(r'^/\* source:', BUNDLE.read_text(encoding='utf-8'), re.MULTILINE)) != len(LEGACY_STYLES):
    raise SystemExit('Legacy CSS bundle source count mismatch')

bundle_text = BUNDLE.read_text(encoding='utf-8')
if 'fontawesome-webfont.eot' in bundle_text or 'fontawesome-webfont.woff?' in bundle_text or 'fontawesome-webfont.ttf' in bundle_text or 'fontawesome-webfont.svg' in bundle_text:
    raise SystemExit('Obsolete missing Font Awesome fallbacks remain in the Pages CSS bundle')
if re.search(r"url\([^)]*fonts/slick\.(?:eot|woff|ttf|svg)", bundle_text, re.IGNORECASE):
    raise SystemExit('Missing Slick font URLs remain in the Pages CSS bundle')

print(f'Bundled {len(LEGACY_STYLES)} legacy stylesheets into {BUNDLE}')
