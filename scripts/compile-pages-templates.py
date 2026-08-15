#!/usr/bin/env python3
import json
import re
from pathlib import Path

SITE = Path('.pages-site')
REGISTRY = SITE / 'override/templates/registry.js'
TEMPLATE_FILES = (
    'components/product-modal/product-modal.html',
    'components/category-nav/category-nav.html',
    'components/product-card/product-card.html',
)
REQUIRED_TEMPLATES = {
    'product-modal',
    'category-toolbar',
    'category-arrow-left',
    'category-arrow-right',
    'category-indicator',
    'product-card-a11y-meta',
    'product-trait-group',
}
MARKER = 'var COMPILED_TEMPLATES=null;/*__SC_TEMPLATE_PAYLOAD__*/'
TEMPLATE_RE = re.compile(
    r'<template\b[^>]*\bdata-sc-template=["\'](?P<name>[^"\']+)["\'][^>]*>(?P<body>.*?)</template>',
    re.IGNORECASE | re.DOTALL,
)

if not SITE.is_dir():
    raise SystemExit('.pages-site does not exist')
if not REGISTRY.is_file():
    raise SystemExit('Template registry is missing from Pages staging')

payload = {}
for relative_path in TEMPLATE_FILES:
    source_path = SITE / 'override' / relative_path
    if not source_path.is_file():
        raise SystemExit(f'Missing override template source: {relative_path}')
    source = source_path.read_text(encoding='utf-8')
    matches = list(TEMPLATE_RE.finditer(source))
    if not matches:
        raise SystemExit(f'No data-sc-template blocks found in {relative_path}')
    remainder = TEMPLATE_RE.sub('', source)
    if re.sub(r'<!--.*?-->', '', remainder, flags=re.DOTALL).strip():
        raise SystemExit(f'Unexpected non-template markup in {relative_path}')
    for match in matches:
        name = match.group('name').strip()
        if not name:
            raise SystemExit(f'Empty template name in {relative_path}')
        if name in payload:
            raise SystemExit(f'Duplicate override template name: {name}')
        body = match.group('body').strip()
        if not body:
            raise SystemExit(f'Empty override template: {name}')
        payload[name] = body

names = set(payload)
if names != REQUIRED_TEMPLATES:
    missing = sorted(REQUIRED_TEMPLATES - names)
    extra = sorted(names - REQUIRED_TEMPLATES)
    raise SystemExit(f'Override template manifest mismatch; missing={missing}, extra={extra}')

registry = REGISTRY.read_text(encoding='utf-8')
if registry.count(MARKER) != 1:
    raise SystemExit('Template registry compile marker must exist exactly once')
serialized = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
serialized = serialized.replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
registry = registry.replace(
    MARKER,
    f'var COMPILED_TEMPLATES={serialized};/*__SC_TEMPLATE_PAYLOAD__*/',
    1,
)
REGISTRY.write_text(registry, encoding='utf-8')

if 'var COMPILED_TEMPLATES=null;' in registry:
    raise SystemExit('Template payload was not compiled into the staging registry')
print(f'Compiled {len(payload)} override templates from {len(TEMPLATE_FILES)} HTML sources.')
