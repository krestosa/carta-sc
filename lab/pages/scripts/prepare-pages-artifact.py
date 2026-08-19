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


def prune_unused_maps(text):
    map_helpers = {
        (SITE / '_js_dev/mapKrc.js').resolve(),
        (SITE / 'js/main_shop_maps__q_9fc895e1.js').resolve(),
    }
    usage_re = re.compile(
        r'\b(?:shop_init_mapear|shop_krc_geoCode|shop_krc_mapear|krc_geoCode|krc_mapear)\s*\(',
        re.IGNORECASE,
    )
    html_map_re = re.compile(
        r'(?:\bid=["\'][^"\']*map[^"\']*["\']|\bclass=["\'][^"\']*\bmapParent\b[^"\']*["\'])',
        re.IGNORECASE,
    )
    if html_map_re.search(text):
        raise SystemExit('Map markup detected; refusing to remove Google Maps from Pages')

    for js_path in SITE.rglob('*.js'):
        resolved = js_path.resolve()
        if resolved in map_helpers:
            continue
        try:
            source = js_path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            source = js_path.read_text(encoding='utf-8', errors='ignore')
        if usage_re.search(source):
            raise SystemExit(f'Map helper usage detected in {js_path}; refusing to remove Google Maps')

    removals = [
        re.compile(r'<script\b[^>]*\bsrc=["\']https://maps\.googleapis\.com/maps/api/js\?[^"\']*["\'][^>]*></script>', re.IGNORECASE),
        re.compile(r'<script\b[^>]*\bsrc=["\']_js_dev/mapKrc\.js["\'][^>]*></script>', re.IGNORECASE),
        re.compile(r'<script\b[^>]*\bsrc=["\']js/main_shop_maps__q_9fc895e1\.js["\'][^>]*></script>', re.IGNORECASE),
    ]
    for pattern in removals:
        text, count = pattern.subn('', text, count=1)
        if count != 1:
            raise SystemExit(f'Expected exactly one removable map script for pattern: {pattern.pattern}')
    return text


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
        '<link rel="preconnect" href="https://fonts.googleapis.com">',
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
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

    banner_image_re = re.compile(
        r'(?P<prefix><img\b(?=[^>]*\bclass="[^"]*\bimgBannerShop\b[^"]*")(?P<attrs>[^>]*))(?P<close>>)',
        re.IGNORECASE,
    )

    def prioritize_banner_image(match):
        attrs = match.group('attrs')
        attrs = re.sub(r'\s+loading="[^"]*"', '', attrs, flags=re.IGNORECASE)
        attrs = re.sub(r'\s+decoding="[^"]*"', '', attrs, flags=re.IGNORECASE)
        attrs = re.sub(r'\s+fetchpriority="[^"]*"', '', attrs, flags=re.IGNORECASE)
        attrs += ' loading="eager" decoding="async" fetchpriority="high"'
        return '<img' + attrs + match.group('close')

    text, banner_count = banner_image_re.subn(prioritize_banner_image, text, count=1)
    if banner_count != 1:
        raise SystemExit(f'Expected one catalogue banner image, found {banner_count}')

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

    text = prune_unused_maps(text)
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
            f'/* origen: {import_path} */\n'
            f'{rebase_css_urls(path, source, content).rstrip()}'
        )

    path.write_text('\n\n'.join(bundled) + '\n', encoding='utf-8')


def bundle_js():
    path = SITE / 'override/main.js'
    runtime_path = SITE / 'override/runtime-main.js'
    runtime = runtime_path.read_text(encoding='utf-8')
    entry_re = re.compile(r"\[\s*'(?P<path>[^']+\.js)'\s*,\s*'(?P<id>[^']+)'\s*\]")
    entries = [(m.group('path'), m.group('id')) for m in entry_re.finditer(runtime)]
    if not entries:
        raise SystemExit('No override runtime module entries were found to bundle')

    paths = [item[0] for item in entries]
    ids = [item[1] for item in entries]
    if len(paths) != len(set(paths)):
        raise SystemExit('Duplicate JS module paths found while bundling')
    if len(ids) != len(set(ids)):
        raise SystemExit('Duplicate JS module ids found while bundling')

    declared_paths = set(re.findall(r"'([^']+\.js)'", runtime))
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
            f'/* módulo: {module_path} */\n'
            f'{source.read_text(encoding="utf-8").rstrip()}'
        )

    tail = """
var SC=window.SCOverride;
function releaseReveal(){
  var root=document.documentElement;
  if(!root)return;
  root.setAttribute('data-sc-catalog-reveal-ready','true');
  root.classList.remove('sc-catalog-reveal-prepaint');
}
function waitForDomReady(){
  if(document.readyState!=='loading')return Promise.resolve();
  return new Promise(function(resolve){document.addEventListener('DOMContentLoaded',resolve,{once:true});});
}
if(!SC||!SC.renderLifecycle)throw new Error('[SushiClub override] Render lifecycle unavailable');
Promise.resolve()
  .then(function(){
    var templates=SC.templates;
    if(!templates||!templates.ready)throw new Error('Template registry unavailable');
    return templates.ready();
  })
  .then(function(){
    var motion=SC.motion;
    return motion&&motion.prepare?motion.prepare():null;
  })
  .then(waitForDomReady)
  .then(function(){
    var lifecycle=SC.renderLifecycle,motion=SC.motion;
    lifecycle.markInitialViewport();
    if(lifecycle.freezeInitialViewport)lifecycle.freezeInitialViewport();
    if(motion)motion.unlock();
    releaseReveal();
    return lifecycle.waitForStableLayout();
  })
  .then(function(){
    var motion=SC.motion;
    if(motion&&motion.refresh)motion.refresh(0);
  })
  .catch(function(error){
    releaseReveal();
    if(window.console&&console.error)console.error('[SushiClub override] Error iniciando módulos',error);
  });
""".strip()

    output = [
        '(function(){',
        "'use strict';",
        'if(window.__scOverrideEntryBooted||window.__scOverrideMainBooted)return;',
        'window.__scOverrideEntryBooted=true;window.__scOverrideMainBooted=true;',
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
    for origin in ('https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'):
        if f'rel="preconnect" href="{origin}"' not in index:
            raise SystemExit(f'Preconnect hint is missing for {origin}')
    if len(re.findall(r'<link\s+rel="preload"\s+href="fuentes/AcuminPro-(?:Regular|Semibold)\.woff2"\s+as="font"\s+type="font/woff2"\s+crossorigin>', index, re.IGNORECASE)) != 2:
        raise SystemExit('Acumin font preloads must include crossorigin')
    if not re.search(r'<img\b(?=[^>]*\bclass="[^"]*\bimgBannerShop\b[^"]*")(?=[^>]*\bloading="eager")(?=[^>]*\bdecoding="async")(?=[^>]*\bfetchpriority="high")[^>]*>', index, re.IGNORECASE):
        raise SystemExit('Catalogue banner must be eager, async-decoded and high priority')
    if 'loading="lazy"' not in index or 'decoding="async"' not in index:
        raise SystemExit('Native lazy product image attributes are missing')
    if 'maps.googleapis.com/maps/api/js' in index or '_js_dev/mapKrc.js' in index or 'js/main_shop_maps__q_9fc895e1.js' in index:
        raise SystemExit('Unused Google Maps runtime remains in the Pages artifact')
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
