#!/usr/bin/env python3
import html
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

SITE = Path('.pages-site').resolve()
INDEX = SITE / 'index.html'
ACTIVE_CSS = [SITE / '_pages/legacy.css', SITE / 'override/main.css']

if not SITE.is_dir() or not INDEX.is_file():
    raise SystemExit('Prepared Pages artifact is missing')

RESOURCE_ATTRS = {
    'script': ('src',),
    'img': ('src', 'srcset'),
    'source': ('src', 'srcset'),
    'video': ('src', 'poster'),
    'audio': ('src',),
    'iframe': ('src',),
    'link': ('href',),
}
CHECKED_LINK_RELS = {
    'stylesheet', 'preload', 'prefetch', 'icon', 'shortcut', 'apple-touch-icon',
}

missing = []
checked = set()


def local_path(value):
    value = html.unescape(value or '').strip()
    if not value or value.startswith(('#', 'data:', 'blob:', 'javascript:', 'mailto:', 'tel:')):
        return None
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc or value.startswith('//'):
        return None
    raw = unquote(parsed.path)
    if not raw:
        return None
    if raw.startswith('/'):
        missing.append(f'root-relative resource is invalid for project Pages: {value}')
        return None
    return raw


def check_resource(value, base=SITE):
    path_value = local_path(value)
    if path_value is None:
        return
    target = (base / path_value).resolve()
    try:
        target.relative_to(SITE)
    except ValueError:
        missing.append(f'resource escapes Pages artifact: {value}')
        return
    key = str(target)
    if key in checked:
        return
    checked.add(key)
    if not target.is_file():
        missing.append(f'missing local resource: {value} -> {target.relative_to(SITE)}')


class ResourceParser(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag not in RESOURCE_ATTRS:
            return
        if tag == 'link':
            rel_tokens = set((attrs.get('rel') or '').lower().split())
            if not rel_tokens.intersection(CHECKED_LINK_RELS):
                return
        for attr in RESOURCE_ATTRS[tag]:
            value = attrs.get(attr)
            if not value:
                continue
            if attr == 'srcset':
                for candidate in value.split(','):
                    url = candidate.strip().split()[0] if candidate.strip() else ''
                    check_resource(url)
            else:
                check_resource(value)


parser = ResourceParser(convert_charrefs=True)
parser.feed(INDEX.read_text(encoding='utf-8'))

css_url_re = re.compile(r'url\(\s*(?P<quote>["\']?)(?P<value>.*?)(?P=quote)\s*\)', re.IGNORECASE)
for css_path in ACTIVE_CSS:
    if not css_path.is_file():
        missing.append(f'missing active stylesheet: {css_path.relative_to(SITE)}')
        continue
    content = css_path.read_text(encoding='utf-8', errors='strict')
    for match in css_url_re.finditer(content):
        check_resource(match.group('value'), base=css_path.parent)

if missing:
    print(f'Pages local asset validation failed with {len(missing)} issue(s):')
    for issue in missing:
        print(f'- {issue}')
    raise SystemExit(1)

print(f'Pages local asset validation passed: {len(checked)} unique local resources resolved.')
