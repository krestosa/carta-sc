#!/usr/bin/env python3
import re
from pathlib import Path

SITE = Path('.pages-site')
if not SITE.is_dir():
    raise SystemExit('.pages-site does not exist')

index_path = SITE / 'index.html'
html = index_path.read_text(encoding='utf-8')

# The captured imgLiquid styles contain HTML entities such as &quot;. Splitting on
# every semicolon corrupts those entities (the old implementation turned the URL
# into a stray "uploads_shop/...&quot; );" declaration). This tokenizer only treats
# semicolons as declaration boundaries when they are outside entities, strings,
# and parentheses.
def split_declarations(style):
    chunks = []
    start = 0
    quote = None
    escaped = False
    paren_depth = 0
    in_entity = False

    for index, char in enumerate(style):
        if in_entity:
            if char == ';':
                in_entity = False
            continue

        if quote:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == quote:
                quote = None
            continue

        if char == '&':
            in_entity = True
        elif char in ('"', "'"):
            quote = char
        elif char == '(':
            paren_depth += 1
        elif char == ')' and paren_depth:
            paren_depth -= 1
        elif char == ';' and paren_depth == 0:
            chunks.append(style[start:index])
            start = index + 1

    chunks.append(style[start:])
    return chunks


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

    for raw in split_declarations(match.group('style')):
        declaration = raw.strip()
        if not declaration:
            continue
        name, sep, _value = declaration.partition(':')
        if not sep:
            raise SystemExit(f'Malformed imgShop inline declaration before cleanup: {declaration!r}')
        if name.strip().lower() in remove_props:
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

# Regression guard for the exact corruption this script used to create.
malformed_imgshop = re.compile(
    r'<div\b(?=[^>]*\bclass="[^"]*\bimgShop\b[^"]*")[^>]*\bstyle="\s*uploads_shop/',
    re.IGNORECASE,
)
if malformed_imgshop.search(html):
    raise SystemExit('Malformed imgShop URL-only style remains after cleanup')

index_path.write_text(html, encoding='utf-8')
print(f'Removed eager imgLiquid background styles from {cleaned} product image stages')
