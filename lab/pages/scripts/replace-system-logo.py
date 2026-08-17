#!/usr/bin/env python3
import os
import re
from pathlib import Path

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'
SOURCE = Path('lab/pages/assets/sushiclub-logo.svg')
SHA = os.environ.get('GITHUB_SHA', '')
TARGET = SITE / '_critical-media/sushiclub-logo.svg'
OLD_MOBILE = f'_critical-media/mobile-logo.webp?v={SHA}'
OLD_DESKTOP = f'_chrome-media/desktop-logo.webp?v={SHA}'
NEW_LOGO = f'_critical-media/sushiclub-logo.svg?v={SHA}'

if not re.fullmatch(r'[0-9a-f]{40}', SHA):
    raise SystemExit('invalid system-logo build SHA')
if not INDEX.is_file() or not SOURCE.is_file():
    raise SystemExit('system-logo build inputs are missing')

svg = SOURCE.read_text(encoding='utf-8').strip()
if not re.search(r'<svg\b[^>]*viewBox="0 0 312 45"', svg, re.I):
    raise SystemExit('unexpected SushiClub SVG geometry')
if svg.count('<path ') != 9:
    raise SystemExit('unexpected SushiClub SVG path count')
svg = re.sub(r'>\s+<', '><', svg)
TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_text(svg + '\n', encoding='utf-8')

html = INDEX.read_text(encoding='utf-8')


def clean_style(tag):
    style = re.search(r'\s+style=["\'](?P<value>[^"\']*)["\']', tag, re.I)
    if not style:
        return tag
    blocked = {'margin-left', 'width', 'height', 'max-width', 'max-height', 'transform'}
    kept = []
    for declaration in style.group('value').split(';'):
        declaration = declaration.strip()
        if not declaration or ':' not in declaration:
            continue
        name = declaration.split(':', 1)[0].strip().lower()
        if name not in blocked:
            kept.append(declaration)
    replacement = (' style="' + '; '.join(kept) + '"') if kept else ''
    return tag[:style.start()] + replacement + tag[style.end():]


def normalize_logo_tag(tag, source_attr='src'):
    tag = clean_style(tag)
    tag = re.sub(r'\s+(?:width|height)=["\'][^"\']*["\']', '', tag, flags=re.I)
    tag = re.sub(r'\s+class=["\'](?P<classes>[^"\']*)["\']',
                 lambda m: ' class="' + ' '.join(dict.fromkeys((m.group('classes') + ' sc-system-brand-logo').split())) + '"',
                 tag, count=1, flags=re.I)
    if 'sc-system-brand-logo' not in tag:
        tag = tag[:-1].rstrip() + ' class="sc-system-brand-logo">'
    if source_attr == 'data-sc-desktop-src':
        tag = re.sub(r'\s+data-sc-desktop-src=["\'][^"\']*["\']', '', tag, count=1, flags=re.I)
        tag = re.sub(r'\bsrc=["\'][^"\']*["\']', f'src="{NEW_LOGO}"', tag, count=1, flags=re.I)
    else:
        tag = re.sub(r'\bsrc=["\'][^"\']*["\']', f'src="{NEW_LOGO}"', tag, count=1, flags=re.I)
    close = '/>' if tag.endswith('/>') else '>'
    body = tag[:-len(close)].rstrip()
    return f'{body} width="312" height="45"{close}'


mobile_re = re.compile(
    r'<img\b(?=[^>]*\bdata-sc-lcp-logo=["\']1["\'])(?=[^>]*\bsrc=["\']'
    + re.escape(OLD_MOBILE) + r'["\'])[^>]*>', re.I)
mobile = list(mobile_re.finditer(html))
if len(mobile) != 1:
    raise SystemExit(f'expected one generated mobile logo, found {len(mobile)}')
match = mobile[0]
html = html[:match.start()] + normalize_logo_tag(match.group(0)) + html[match.end():]

preload_re = re.compile(
    r'<link\b(?=[^>]*\brel=["\']preload["\'])(?=[^>]*\bas=["\']image["\'])(?=[^>]*\bhref=["\']'
    + re.escape(OLD_MOBILE) + r'["\'])[^>]*>', re.I)
preloads = list(preload_re.finditer(html))
if len(preloads) != 1:
    raise SystemExit(f'expected one generated mobile logo preload, found {len(preloads)}')
match = preloads[0]
preload = match.group(0).replace(OLD_MOBILE, NEW_LOGO)
preload = re.sub(r'\s+media=["\'][^"\']*["\']', '', preload, flags=re.I)
if not re.search(r'\stype=["\']image/svg\+xml["\']', preload, re.I):
    preload = preload[:-1].rstrip() + ' type="image/svg+xml">'
html = html[:match.start()] + preload + html[match.end():]

desktop_re = re.compile(
    r'<img\b(?=[^>]*\bdata-sc-desktop-src=["\']' + re.escape(OLD_DESKTOP) + r'["\'])[^>]*>', re.I)
desktop = list(desktop_re.finditer(html))
if len(desktop) != 1:
    raise SystemExit(f'expected one generated desktop logo, found {len(desktop)}')
match = desktop[0]
html = html[:match.start()] + normalize_logo_tag(match.group(0), 'data-sc-desktop-src') + html[match.end():]

for obsolete in (SITE / '_critical-media/mobile-logo.webp', SITE / '_chrome-media/desktop-logo.webp'):
    if obsolete.exists():
        obsolete.unlink()

if OLD_MOBILE in html or OLD_DESKTOP in html:
    raise SystemExit('obsolete generated logo reference remains')
if html.count('sc-system-brand-logo') != 2:
    raise SystemExit('system logo must appear exactly twice')
if html.count(NEW_LOGO) != 3:
    raise SystemExit('system logo URL must serve two images plus one preload')
if not TARGET.is_file() or TARGET.stat().st_size > 7_000:
    raise SystemExit('optimized system SVG is missing or over budget')

INDEX.write_text(html, encoding='utf-8')
print(f'System logo optimized: one {TARGET.stat().st_size}B SVG shared by mobile and desktop; centered by override CSS.')
