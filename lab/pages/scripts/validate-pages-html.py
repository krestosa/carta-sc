#!/usr/bin/env python3
import html
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'

if not SITE.is_dir() or not INDEX.is_file():
    raise SystemExit('Prepared Pages artifact is missing')

VOID_TAGS = {
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
    'meta', 'param', 'source', 'track', 'wbr',
}
SOCIAL_HOSTS = {
    'facebook.com', 'www.facebook.com',
    'instagram.com', 'www.instagram.com',
    'tiktok.com', 'www.tiktok.com',
    'pinterest.com', 'www.pinterest.com',
}


def class_tokens(attrs):
    return set((attrs.get('class') or '').split())


class AuditParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.fragments = []
        self.labels_for = set()
        self.controls = []
        self.imgshop_styles = []
        self.social_links = []
        self.stack = []

    def handle_starttag(self, tag, attrs_list):
        attrs = dict(attrs_list)
        element_id = attrs.get('id')
        if element_id:
            self.ids.append(element_id)
        if tag == 'label' and attrs.get('for'):
            self.labels_for.add(attrs['for'])

        if tag == 'a':
            href = (attrs.get('href') or '').strip()
            if href.startswith('#') and len(href) > 1:
                self.fragments.append(unquote(html.unescape(href[1:])))
            parsed = urlsplit(href)
            is_social = bool(parsed.hostname and parsed.hostname.lower() in SOCIAL_HOSTS)
            self.stack.append({
                'tag': tag,
                'attrs': attrs,
                'text': '',
                'img_alt': '',
                'social': is_social,
            })
        elif tag not in VOID_TAGS:
            self.stack.append({
                'tag': tag,
                'attrs': attrs,
                'text': '',
                'img_alt': '',
                'social': False,
            })

        if tag == 'img' and self.stack:
            alt = (attrs.get('alt') or '').strip()
            if alt:
                for item in self.stack:
                    item['img_alt'] = alt

        if tag == 'div' and 'imgShop' in class_tokens(attrs) and attrs.get('style') is not None:
            self.imgshop_styles.append(attrs.get('style') or '')

        if tag in {'input', 'select', 'textarea'}:
            input_type = (attrs.get('type') or '').lower()
            if tag == 'input' and input_type in {'hidden', 'submit', 'button', 'image', 'reset'}:
                return
            self.controls.append({
                'tag': tag,
                'id': attrs.get('id') or '',
                'name': attrs.get('name') or '',
                'aria-label': (attrs.get('aria-label') or '').strip(),
                'aria-labelledby': (attrs.get('aria-labelledby') or '').strip(),
                'title': (attrs.get('title') or '').strip(),
            })

    def handle_startendtag(self, tag, attrs_list):
        self.handle_starttag(tag, attrs_list)
        if tag not in VOID_TAGS:
            self.handle_endtag(tag)

    def handle_data(self, data):
        for item in self.stack:
            item['text'] += data

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            item = self.stack[index]
            if item['tag'] != tag:
                continue
            del self.stack[index:]
            if tag == 'a' and item['social']:
                attrs = item['attrs']
                accessible_name = (
                    item['text'].strip()
                    or (attrs.get('aria-label') or '').strip()
                    or (attrs.get('title') or '').strip()
                    or item['img_alt']
                )
                self.social_links.append(((attrs.get('href') or '').strip(), bool(accessible_name)))
            return


text = INDEX.read_text(encoding='utf-8', errors='strict')
issues = []

if '\ufffd' in text:
    issues.append('index.html contains Unicode replacement character U+FFFD')

parser = AuditParser()
parser.feed(text)
parser.close()

counts = Counter(parser.ids)
for element_id, count in sorted(counts.items()):
    if count > 1:
        issues.append(f'duplicate id {element_id!r} appears {count} times')

id_set = set(parser.ids)
for fragment in sorted(set(parser.fragments)):
    if fragment not in id_set:
        issues.append(f'fragment target does not exist: #{fragment}')

for style in parser.imgshop_styles:
    normalized = html.unescape(style).strip()
    if normalized.startswith('uploads_shop/') or normalized.startswith('url('):
        issues.append(f'malformed imgShop inline style: {style[:120]!r}')
    if re.search(r'(^|;)\s*background-(?:image|size|position|repeat)\s*:', normalized, re.IGNORECASE):
        issues.append('imgShop retains eager imgLiquid background styles after cleanup')

for control in parser.controls:
    has_name = bool(
        control['aria-label']
        or control['aria-labelledby']
        or control['title']
        or (control['id'] and control['id'] in parser.labels_for)
    )
    if not has_name:
        ident = control['name'] or control['id'] or '<unnamed>'
        issues.append(f'form control lacks an accessible name: {control["tag"]}[{ident}]')

for href, has_name in parser.social_links:
    if not has_name:
        issues.append(f'social link lacks an accessible name: {href}')

unpinned_gsap = []
for path in (SITE / 'override').rglob('*.js'):
    source = path.read_text(encoding='utf-8', errors='strict')
    if 'cdn.jsdelivr.net/npm/gsap@3/dist/' in source:
        unpinned_gsap.append(path.relative_to(SITE).as_posix())
if unpinned_gsap:
    issues.append('unpinned GSAP CDN reference(s): ' + ', '.join(sorted(unpinned_gsap)))

if issues:
    unique = list(dict.fromkeys(issues))
    print(f'Pages HTML validation failed with {len(unique)} issue(s):')
    for issue in unique:
        print(f'- {issue}')
    raise SystemExit(1)

print(
    'Pages HTML validation passed: '
    f'{len(parser.ids)} ids, {len(parser.fragments)} fragment links, '
    f'{len(parser.controls)} form controls, {len(parser.social_links)} social links checked.'
)
