#!/usr/bin/env python3
import re
from pathlib import Path

SITE = Path('.pages-site')
if not SITE.is_dir():
    raise SystemExit('.pages-site does not exist')

index_path = SITE / 'index.html'
html = index_path.read_text(encoding='utf-8')

tag_re = re.compile(
    r'(?P<prefix><div\b(?=[^>]*\bclass="[^"]*\bimgShop\b[^"]*")[^>]*?)\sstyle="(?P<style>[^"]*)"(?P<suffix>[^>]*>)',
    re.IGNORECASE,
)
remove_props = {
    'background-image',
    'background-size',
    'background-position',
    'background-repeat',
}
cleaned = 0


def clean_tag(match):
    global cleaned
    declarations = []
    removed = False
    for raw in match.group('style').split(';'):
        declaration = raw.strip()
        if not declaration:
            continue
        name, sep, value = declaration.partition(':')
        if sep and name.strip().lower() in remove_props:
            removed = True
            continue
        declarations.append(declaration)
    if not removed:
        return match.group(0)
    cleaned += 1
    style = ''
    if declarations:
        style = ' style="' + '; '.join(declarations) + ';"'
    return match.group('prefix') + style + match.group('suffix')


html = tag_re.sub(clean_tag, html)
if cleaned < 1:
    raise SystemExit('No imgShop inline background styles were removed')

remaining = re.compile(
    r'<div\b(?=[^>]*\bclass="[^"]*\bimgShop\b[^"]*")(?=[^>]*\bstyle="[^"]*background-(?:image|size|position|repeat)\s*:)[^>]*>',
    re.IGNORECASE,
)
if remaining.search(html):
    raise SystemExit('An imgShop inline background style remains after cleanup')

index_path.write_text(html, encoding='utf-8')
print(f'Removed eager imgLiquid background styles from {cleaned} product image stages')
