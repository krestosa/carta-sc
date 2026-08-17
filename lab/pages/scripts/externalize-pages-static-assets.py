#!/usr/bin/env python3
import os
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen

SITE = Path('.pages-site')
SOURCE = Path('.')
ORIGIN = 'https://www.sushiclub.com.ar/'
ASSET_ROOTS = ('uploads_shop', 'uploads', 'gfx', 'fonts', 'fuentes', 'iconos')
TEXT_SUFFIXES = {'.html', '.css', '.js', '.mjs'}
FORBIDDEN_SUFFIXES = {
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.avif',
    '.eot', '.woff', '.woff2', '.ttf', '.otf',
    '.mp4', '.webm', '.mov', '.m4v', '.avi',
    '.pdf',
}
# EOT and SVG remain only as old-browser fallbacks in legacy CSS. The live
# SushiClub server no longer exposes every historical EOT/SVG file.
MIRROR_FONT_SUFFIXES = {'.woff', '.woff2', '.ttf', '.otf'}
ASSET_SUFFIX_PATTERN = (
    r'png|jpe?g|gif|webp|svg|ico|bmp|avif|'
    r'eot|woff2?|ttf|otf|mp4|webm|mov|m4v|avi|pdf'
)
REMOTE_MODERN_FONT_RE = re.compile(
    r'https://www\.sushiclub\.com\.ar/'
    r'(?P<root>fonts|fuentes)/'
    r'(?P<path>[^"\'\s()<>?#]+?\.(?:woff2?|ttf|otf))'
    r'(?:[?#][^"\'\s()<>]*)?',
    re.IGNORECASE,
)
REMOTE_IMAGE_PROBES = (
    ORIGIN + 'gfx/web-sushiclub2_black_m2.png',
    ORIGIN + 'gfx/web-sushiclub2_black.png',
)
# These cover the typography/icon families that are active in this page. Slick's
# icon font is intentionally not required: the generated catalogue contains no
# Slick slider/arrow markup and the live SushiClub server no longer serves it.
REQUIRED_MIRRORED_FONTS = {
    '_remote-assets/fuentes/AcuminPro-Regular.woff2',
    '_remote-assets/fuentes/AcuminPro-Semibold.woff2',
    '_remote-assets/fonts/fontawesome-webfont.woff2',
    '_remote-assets/fonts/glyphicons-halflings-regular.woff',
    '_remote-assets/fonts/hnl.woff',
    '_remote-assets/fonts/bariol_bold-webfont.woff',
    '_remote-assets/fonts/bariol_light-webfont.woff',
    '_remote-assets/fonts/bariol_regular-webfont.woff',
    '_remote-assets/fonts/websymbolsligaregular.woff',
    '_remote-assets/fonts/PlutoBold.otf',
}
USER_AGENT = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36'
)

if not SITE.is_dir():
    raise SystemExit('.pages-site does not exist')

# Repository policy: source control is code-only. Browser assets must never be
# committed to this branch.
source_assets = []
for path in SOURCE.rglob('*'):
    if not path.is_file():
        continue
    parts = path.parts
    if '.git' in parts or '.pages-site' in parts:
        continue
    if path.suffix.lower() in FORBIDDEN_SUFFIXES:
        source_assets.append(path.as_posix())
if source_assets:
    preview = ', '.join(sorted(source_assets)[:20])
    suffix = '' if len(source_assets) <= 20 else f' (+{len(source_assets) - 20} more)'
    raise SystemExit(f'Static asset files are forbidden in the repository: {preview}{suffix}')

root_group = '|'.join(map(re.escape, ASSET_ROOTS))
asset_dir_re = re.compile(
    rf'(?<![A-Za-z0-9:/])(?:\.\./|\./|/)*(?P<root>{root_group})/',
    re.IGNORECASE,
)
asset_file_re = re.compile(
    r'(?<![A-Za-z0-9:/])(?:\.\./|\./|/)*favicon\.ico\b',
    re.IGNORECASE,
)
# The snapshot downloader encoded query-string variants and duplicate downloads
# into filenames. Those names do not exist on the canonical SushiClub host.
snapshot_suffix_re = re.compile(
    rf'(?:__q_[0-9a-f]{{8}}|__\d+)(?=\.(?:{ASSET_SUFFIX_PATTERN})\b)',
    re.IGNORECASE,
)

changed_files = 0
replacements = 0
canonicalized_variants = 0


def rewrite_to_origin(text):
    global replacements, canonicalized_variants

    def repl_dir(match):
        global replacements
        replacements += 1
        return ORIGIN + match.group('root') + '/'

    def repl_file(_match):
        global replacements
        replacements += 1
        return ORIGIN + 'favicon.ico'

    text = asset_dir_re.sub(repl_dir, text)
    text = asset_file_re.sub(repl_file, text)
    text, count = snapshot_suffix_re.subn('', text)
    canonicalized_variants += count
    return text


for path in SITE.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
        continue
    source = path.read_text(encoding='utf-8', errors='strict')
    rewritten = rewrite_to_origin(source)
    if rewritten != source:
        path.write_text(rewritten, encoding='utf-8')
        changed_files += 1

if replacements < 1:
    raise SystemExit('No static asset references were externalized')
if canonicalized_variants < 1:
    raise SystemExit('Expected captured snapshot asset variants to be canonicalized')

# Images can be consumed cross-origin directly. Validate the two logo paths that
# were previously broken by snapshot-only filename suffixes.
for url in REMOTE_IMAGE_PROBES:
    request = Request(
        url,
        headers={'User-Agent': USER_AGENT, 'Referer': ORIGIN + 'carta_delivery.php'},
        method='GET',
    )
    try:
        with urlopen(request, timeout=15) as response:
            status = getattr(response, 'status', response.getcode())
            content_type = (response.headers.get('Content-Type') or '').lower()
            if status != 200 or not content_type.startswith('image/'):
                raise SystemExit(
                    f'Critical SushiClub image is not usable: status={status}, '
                    f'type={content_type or "(missing)"}, url={url}'
                )
    except (HTTPError, URLError, TimeoutError) as exc:
        raise SystemExit(f'Critical SushiClub image probe failed: {url}: {exc}') from exc

# SushiClub font responses do not include Access-Control-Allow-Origin, so fonts
# cannot be consumed directly from GitHub Pages. Mirror modern formats into the
# generated artifact at build time. Nothing is committed to Git; every deploy
# refreshes the bytes from the original SushiClub host.
text_files = [
    path
    for path in SITE.rglob('*')
    if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES
]
font_urls = set()
for path in text_files:
    text = path.read_text(encoding='utf-8', errors='strict')
    font_urls.update(match.group(0) for match in REMOTE_MODERN_FONT_RE.finditer(text))
if not font_urls:
    raise SystemExit('No modern SushiClub font URLs were found to mirror')

mirror_root = SITE / '_remote-assets'
downloaded_fonts = {}
downloaded_targets = set()
failed_fonts = []
downloaded_bytes = 0


def fetch_font(url):
    request = Request(
        url,
        headers={'User-Agent': USER_AGENT, 'Referer': ORIGIN + 'carta_delivery.php'},
        method='GET',
    )
    with urlopen(request, timeout=12) as response:
        status = getattr(response, 'status', response.getcode())
        payload = response.read()
        content_type = (response.headers.get('Content-Type') or '').lower()
    if status != 200:
        raise HTTPError(url, status, f'HTTP {status}', {}, None)
    if not payload:
        raise ValueError('empty response')
    if len(payload) > 8 * 1024 * 1024:
        raise ValueError('response is unexpectedly large')
    if b'<html' in payload[:512].lower() or content_type.startswith('text/html'):
        raise ValueError('response is HTML, not a font')
    return payload


for source_url in sorted(font_urls):
    parsed = urlsplit(source_url)
    relative_source_path = parsed.path.lstrip('/')
    target = mirror_root / relative_source_path

    if not relative_source_path.startswith(('fonts/', 'fuentes/')):
        raise SystemExit(f'Refusing unexpected mirrored font path: {relative_source_path}')
    if target.suffix.lower() not in MIRROR_FONT_SUFFIXES:
        raise SystemExit(f'Refusing unexpected mirrored font extension: {target}')

    if target in downloaded_targets:
        downloaded_fonts[source_url] = target
        continue

    candidates = [source_url]
    canonical_url = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, '', ''))
    if canonical_url != source_url:
        candidates.append(canonical_url)

    payload = None
    last_error = None
    for candidate in candidates:
        try:
            payload = fetch_font(candidate)
            break
        except (HTTPError, URLError, TimeoutError, ValueError) as exc:
            last_error = exc

    if payload is None:
        failed_fonts.append((source_url, target, last_error))
        continue

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(payload)
    downloaded_targets.add(target)
    downloaded_fonts[source_url] = target
    downloaded_bytes += len(payload)

unresolved_failed = []
for source_url, target, error in failed_fonts:
    if target in downloaded_targets:
        downloaded_fonts[source_url] = target
    else:
        unresolved_failed.append((source_url, error))

for path in text_files:
    text = path.read_text(encoding='utf-8', errors='strict')
    rewritten = text
    for source_url, target in sorted(
        downloaded_fonts.items(), key=lambda item: len(item[0]), reverse=True
    ):
        relative = os.path.relpath(target, start=path.parent).replace(os.sep, '/')
        rewritten = rewritten.replace(source_url, relative)
    if rewritten != text:
        path.write_text(rewritten, encoding='utf-8')

unexpected_artifact_assets = []
mirrored_font_assets = []
for path in SITE.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in FORBIDDEN_SUFFIXES:
        continue
    rel = path.relative_to(SITE)
    is_mirrored_font = (
        len(rel.parts) >= 3
        and rel.parts[0] == '_remote-assets'
        and rel.parts[1] in {'fonts', 'fuentes'}
        and path.suffix.lower() in MIRROR_FONT_SUFFIXES
    )
    if is_mirrored_font:
        mirrored_font_assets.append(rel.as_posix())
    else:
        unexpected_artifact_assets.append(rel.as_posix())

if unexpected_artifact_assets:
    preview = ', '.join(sorted(unexpected_artifact_assets)[:20])
    suffix = '' if len(unexpected_artifact_assets) <= 20 else f' (+{len(unexpected_artifact_assets) - 20} more)'
    raise SystemExit(f'Unexpected static asset files remain in Pages artifact: {preview}{suffix}')

mirrored_set = set(mirrored_font_assets)
missing_critical = sorted(REQUIRED_MIRRORED_FONTS - mirrored_set)
if missing_critical:
    details = '; '.join(f'{url}: {error}' for url, error in unresolved_failed[:10])
    raise SystemExit(
        f'Critical mirrored font(s) missing: {missing_critical}'
        + (f'. Unresolved upstream font URLs: {details}' if details else '')
    )
if len(mirrored_font_assets) != len(downloaded_targets):
    raise SystemExit('Mirrored SushiClub font count does not match downloaded font set')

critical_remote_refs = []
critical_names = {Path(path).name.lower() for path in REQUIRED_MIRRORED_FONTS}
for path in text_files:
    text = path.read_text(encoding='utf-8', errors='strict')
    for match in REMOTE_MODERN_FONT_RE.finditer(text):
        if Path(urlsplit(match.group(0)).path).name.lower() in critical_names:
            critical_remote_refs.append((path.relative_to(SITE).as_posix(), match.group(0)))
if critical_remote_refs:
    raise SystemExit(f'Critical cross-origin font reference(s) remain: {critical_remote_refs[:10]}')

local_refs = []
snapshot_refs = []
for path in text_files:
    text = path.read_text(encoding='utf-8', errors='strict')
    rel = path.relative_to(SITE).as_posix()
    if asset_dir_re.search(text) or asset_file_re.search(text):
        local_refs.append(rel)
    if snapshot_suffix_re.search(text):
        snapshot_refs.append(rel)
if local_refs:
    raise SystemExit('Local static asset reference(s) remain: ' + ', '.join(sorted(local_refs)))
if snapshot_refs:
    raise SystemExit('Snapshot-only static asset filename(s) remain: ' + ', '.join(sorted(snapshot_refs)))

if unresolved_failed:
    print(f'Skipped {len(unresolved_failed)} unavailable optional modern font fallback URL(s).')
    for url, error in unresolved_failed[:10]:
        print(f'- optional font fallback unavailable: {url} ({error})')

print(
    f'Externalized {replacements} static asset reference(s) across {changed_files} file(s) '
    f'to {ORIGIN}; canonicalized {canonicalized_variants} snapshot-only asset path(s).'
)
print(
    f'Mirrored {len(mirrored_font_assets)} modern font file(s), {downloaded_bytes} bytes, '
    'from SushiClub into the generated Pages artifact only; repository contains 0 static asset files.'
)
