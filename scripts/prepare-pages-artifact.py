#!/usr/bin/env python3
import os
import re
from pathlib import Path

SITE = Path('.pages-site')
SHA = os.environ.get('GITHUB_SHA', '')

if not re.fullmatch(r'[0-9a-f]{40}', SHA):
    raise SystemExit('GITHUB_SHA is missing or invalid')
if not SITE.is_dir():
    raise SystemExit('.pages-site does not exist')


def stamp_entrypoint():
    path = SITE / 'index.html'
    text = path.read_text(encoding='utf-8')
    text, count = re.subn(
        r"_js_dev/main\.js\?v=[^\"']+",
        f'_js_dev/main.js?v={SHA}',
        text,
        count=1,
    )
    if count != 1:
        raise SystemExit('Could not rewrite the main.js entrypoint exactly once')

    entry_re = re.compile(
        rf'(?P<tag><script\s+src=["\']_js_dev/main\.js\?v={re.escape(SHA)}["\'][^>]*></script>)',
        re.IGNORECASE,
    )
    hints = '\n'.join([
        '<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>',
        f'<link rel="preload" as="script" href="_js_dev/main-legacy.js?v={SHA}">',
        f'<link rel="preload" as="style" href="override/main.css?v={SHA}">',
        f'<link rel="preload" as="script" href="override/main.js?v={SHA}">',
    ])
    text, count = entry_re.subn(lambda match: hints + '\n' + match.group('tag'), text, count=1)
    if count != 1:
        raise SystemExit('Could not inject override preload hints exactly once')

    font_preload_re = re.compile(
        r'(?P<tag><link\s+rel="preload"\s+href="fuentes/AcuminPro-(?:Regular|Semibold)\.woff2"\s+as="font"\s+type="font/woff2")(?P<end>>)',
        re.IGNORECASE,
    )
    text, font_count = font_preload_re.subn(lambda match: match.group('tag') + ' crossorigin' + match.group('end'), text)
    if font_count != 2:
        raise SystemExit(f'Expected two Acumin font preloads, found {font_count}')

    product_image_re = re.compile(
        r'(?P<prefix><div\b[^>]*class="[^"]*\bimgShop\b[^"]*"[^>]*>\s*<img\b)(?P<attrs>[^>]*)(?P<close>>)',
        re.IGNORECASE,
    )

    def lazy_product_image(match):
        attrs = match.group('attrs')
        if not re.search(r'\bloading\s*=', attrs, re.IGNORECASE):
            attrs += ' loading="lazy"'
        if not re.search(r'\bdecoding\s*=', attrs, re.IGNORECASE):
            attrs += ' decoding="async"'
        return match.group('prefix') + attrs + match.group('close')

    text, image_count = product_image_re.subn(lazy_product_image, text)
    if image_count < 1:
        raise SystemExit('No product images were found for native lazy loading')
    path.write_text(text, encoding='utf-8')


def stamp_bootstrap():
    path = SITE / '_js_dev/main.js'
    text = path.read_text(encoding='utf-8')
    text, count = re.subn(
        r"var version='[^']+';",
        f"var version='{SHA}';",
        text,
        count=1,
    )
    if count != 1:
        raise SystemExit('Could not stamp the bootstrap version exactly once')
    path.write_text(text, encoding='utf-8')


def rebase_css_urls(bundle_path, source_path, content):
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
        relative = parts.group('path')
        suffix = parts.group('suffix') or ''
        resolved = os.path.normpath(os.path.join(str(source_path.parent), relative))
        rebased = os.path.relpath(resolved, start=str(bundle_path.parent)).replace(os.sep, '/')
        quote = match.group('quote')
        return f'url({quote}{rebased}{suffix}{quote})'

    return url_re.sub(replace, content)


def bundle_css():
    path = SITE / 'override/main.css'
    manifest = path.read_text(encoding='utf-8')
    import_re = re.compile(
        r'^\s*@import\s+["\'](?P<path>\./[^"\']+)\?v=unversioned["\'];\s*$',
        re.MULTILINE,
    )
    imports = [match.group('path') for match in import_re.finditer(manifest)]
    if not imports:
        raise SystemExit('No CSS imports were found to bundle')
    if len(imports) != len(set(imports)):
        raise SystemExit('Duplicate CSS imports found while bundling')
    if import_re.sub('', manifest).strip():
        raise SystemExit('override/main.css contains non-import content; refusing unsafe bundle')

    bundled = []
    for import_path in imports:
        source = path.parent / import_path.removeprefix('./')
        if not source.is_file():
            raise SystemExit(f'Missing CSS source while bundling: {source}')
        content = source.read_text(encoding='utf-8')
        if '@import' in content:
            raise SystemExit(f'Nested CSS import found while bundling: {source}')
        bundled.append(
            f'/* source: {import_path} */\n'
            f'{rebase_css_urls(path, source, content).rstrip()}'
        )

    path.write_text('\n\n'.join(bundled) + '\n', encoding='utf-8')


def bundle_js():
    path = SITE / 'override/main.js'
    loader = path.read_text(encoding='utf-8')
    entry_re = re.compile(r"\['(?P<path>[^']+\.js)','(?P<id>[^']+)'\]")
    entries = [(m.group('path'), m.group('id')) for m in entry_re.finditer(loader)]
    if not entries:
        raise SystemExit('No override JS module entries were found to bundle')

    section_match = re.search(
        r"loadScript\('(?P<path>components/section-heading/section-heading\.js)','(?P<id>[^']+)'\)",
        loader,
    )
    if not section_match:
        raise SystemExit('Could not locate the delayed section-heading module')
    entries.append((section_match.group('path'), section_match.group('id')))

    paths = [item[0] for item in entries]
    ids = [item[1] for item in entries]
    if len(paths) != len(set(paths)):
        raise SystemExit('Duplicate JS module paths found while bundling')
    if len(ids) != len(set(ids)):
        raise SystemExit('Duplicate JS module ids found while bundling')

    declared_paths = set(re.findall(r"'([^']+\.js)'", loader))
    captured_paths = set(paths)
    if declared_paths != captured_paths:
        missing = sorted(declared_paths - captured_paths)
        extra = sorted(captured_paths - declared_paths)
        raise SystemExit(
            f'JS bundle manifest mismatch; uncaptured={missing}, unexpected={extra}'
        )

    modules = []
    for module_path, _ in entries:
        source = path.parent / module_path
        if not source.is_file():
            raise SystemExit(f'Missing JS source while bundling: {source}')
        modules.append(
            f'/* module: {module_path} */\n'
            f'{source.read_text(encoding="utf-8").rstrip()}'
        )

    tail = """
var SC=window.SCOverride;
if(!SC||!SC.renderLifecycle)throw new Error('[SushiClub override] Render lifecycle unavailable');
SC.renderLifecycle.waitForStableLayout().then(function(){
  SC.renderLifecycle.markInitialViewport();
  if(SC.motion)SC.motion.unlock();
}).catch(function(error){
  if(window.console&&console.error)console.error('[SushiClub override] Error iniciando módulos',error);
});
""".strip()

    output = [
        '(function(){',
        "'use strict';",
        'if(window.__scOverrideMainBooted)return;window.__scOverrideMainBooted=true;',
        '',
        '\n\n'.join(modules),
        '',
        tail,
        '})();',
        '',
    ]
    path.write_text('\n'.join(output), encoding='utf-8')


def verify():
    index = (SITE / 'index.html').read_text(encoding='utf-8')
    bootstrap = (SITE / '_js_dev/main.js').read_text(encoding='utf-8')
    css = (SITE / 'override/main.css').read_text(encoding='utf-8')
    js = (SITE / 'override/main.js').read_text(encoding='utf-8')

    if f'_js_dev/main.js?v={SHA}' not in index:
        raise SystemExit('Stamped main.js entrypoint is missing')
    for asset in (
        f'_js_dev/main-legacy.js?v={SHA}',
        f'override/main.css?v={SHA}',
        f'override/main.js?v={SHA}',
    ):
        if f'rel="preload"' not in index or asset not in index:
            raise SystemExit(f'Preload hint is missing for {asset}')
    if 'rel="preconnect" href="https://cdn.jsdelivr.net"' not in index:
        raise SystemExit('jsDelivr preconnect hint is missing')
    if len(re.findall(r'<link\s+rel="preload"\s+href="fuentes/AcuminPro-(?:Regular|Semibold)\.woff2"\s+as="font"\s+type="font/woff2"\s+crossorigin>', index, re.IGNORECASE)) != 2:
        raise SystemExit('Acumin font preloads must include crossorigin')
    if 'loading="lazy"' not in index or 'decoding="async"' not in index:
        raise SystemExit('Native lazy product image attributes are missing')
    if f"var version='{SHA}';" not in bootstrap:
        raise SystemExit('Stamped bootstrap version is missing')
    if '@import' in css:
        raise SystemExit('CSS imports remain in bundled Pages artifact')
    if 'loadStages([' in js:
        raise SystemExit('Development JS loader remains in bundled Pages artifact')
    if 'components/section-heading/section-heading.js' not in js:
        raise SystemExit('Section-heading module is missing from JS bundle')


stamp_entrypoint()
stamp_bootstrap()
bundle_css()
bundle_js()
verify()
