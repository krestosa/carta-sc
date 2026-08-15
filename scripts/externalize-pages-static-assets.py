#!/usr/bin/env python3
import os
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
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
FONT_SUFFIXES = {'.eot', '.woff', '.woff2', '.ttf', '.otf', '.svg'}
ASSET_SUFFIX_PATTERN = (
    r'png|jpe?g|gif|webp|svg|ico|bmp|avif|'
    r'eot|woff2?|ttf|otf|mp4|webm|mov|m4v|avi|pdf'
)
REMOTE_FONT_RE = re.compile(
    r'https://www\.sushiclub\.com\.ar/'
    r'(?P<root>fonts|fuentes)/'
    r'(?P<path>[^"\'\s()<>?#]+?\.(?:eot|woff2?|ttf|otf|svg))'
    r'(?:[?#][^"\'\s()<>]*)?',
    re.IGNORECASE,
)
REMOTE_IMAGE_PROBES = (
    ORIGIN + 'gfx/web-sushiclub2_black_m2.png',
    ORIGIN + 'gfx/web-sushiclub2_black.png',
)
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
        headers={
            'User-Agent': USER_AGENT,
            'Referer': ORIGIN + 'carta_delivery.php',
        },
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

# Fonts are different: SushiClub currently serves them without an
# Access-Control-Allow-Origin header. A GitHub Pages document therefore cannot
# consume them directly. Download the exact files from SushiClub at build time
# into the generated Pages artifact. They remain absent from Git history and are
# refreshed from the canonical source on every deployment.
text_files = [
    path
    for path in SITE.rglob('*')
    if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES
]
font_urls = set()
for path in text_files:
    text = path.read_text(encoding='utf-8', errors='strict')
    font_urls.update(match.group(0) for match in REMOTE_FONT_RE.finditer(text))

if not font_urls:
    raise SystemExit('No SushiClub font URLs were found to mirror into the Pages artifact')

mirror_root = SITE / '_remote-assets'
downloaded_fonts = {}
downloaded_bytes = 0

for source_url in sorted(font_urls):
    parsed = urlsplit(source_url)
    canonical_url = f'{parsed.scheme}://{parsed.netloc}{parsed.path}'
    relative_source_path = parsed.path.lstrip('/')
    target = mirror_root / relative_source_path

    if not relative_source_path.startswith(('fonts/', 'fuentes/')):
        raise SystemExit(f'Refusing unexpected mirrored font path: {relative_source_path}')
    if target.suffix.lower() not in FONT_SUFFIXES:
        raise SystemExit(f'Refusing unexpected mirrored font extension: {target}')

    request = Request(
        canonical_url,
        headers={
            'User-Agent': USER_AGENT,
            'Referer': ORIGIN + 'carta_delivery.php',
        },
        method='GET',
    )
    try:
        with urlopen(request, timeout=20) as response:
            status = getattr(response, 'status', response.getcode())
            payload = response.read()
            content_type = (response.headers.get('Content-Type') or '').lower()
    except (HTTPError, URLError, TimeoutError) as exc:
        raise SystemExit(f'Could not fetch SushiClub font {canonical_url}: {exc}') from exc

    if status != 200:
        raise SystemExit(f'Could not fetch SushiClub font {canonical_url}: HTTP {status}')
    if not payload:
        raise SystemExit(f'SushiClub font response was empty: {canonical_url}')
    if len(payload) > 8 * 1024 * 1024:
        raise SystemExit(f'SushiClub font response is unexpectedly large: {canonical_url}')
    if b'<html' in payload[:512].lower() or content_type.startswith('text/html'):
        raise SystemExit(f'SushiClub font URL returned HTML instead of a font: {canonical_url}')

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(payload)
    downloaded_fonts[source_url] = target
    downloaded_bytes += len(payload)

for path in text_files:
    text = path.read_text(encoding='utf-8', errors='strict')
    rewritten = text
    for source_url, target in downloaded_fonts.items():
        relative = os.path.relpath(target, start=path.parent).replace(os.sep, '/')
        rewritten = rewritten.replace(source_url, relative)
    if rewritten != text:
        path.write_text(rewritten, encoding='utf-8')

# No browser-facing direct SushiClub font URL may remain: that would regress to
# the CORS failure that triggered this fix.
remote_font_refs = []
for path in text_files:
    text = path.read_text(encoding='utf-8', errors='strict')
    if REMOTE_FONT_RE.search(text):
        remote_font_refs.append(path.relative_to(SITE).as_posix())
if remote_font_refs:
    raise SystemExit(
        'Direct cross-origin SushiClub font URL(s) remain: '
        + ', '.join(sorted(remote_font_refs))
    )

# The generated artifact may contain only the build-time font mirror. Every
# other browser asset must remain on SushiClub and every source asset must remain
# out of Git.
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
        and path.suffix.lower() in FONT_SUFFIXES
    )
    if is_mirrored_font:
        mirrored_font_assets.append(rel.as_posix())
    else:
        unexpected_artifact_assets.append(rel.as_posix())

if unexpected_artifact_assets:
    preview = ', '.join(sorted(unexpected_artifact_assets)[:20])
    suffix = (
        ''
        if len(unexpected_artifact_assets) <= 20
        else f' (+{len(unexpected_artifact_assets) - 20} more)'
    )
    raise SystemExit(f'Unexpected static asset files remain in Pages artifact: {preview}{suffix}')
if len(mirrored_font_assets) != len({target for target in downloaded_fonts.values()}):
    raise SystemExit('Mirrored SushiClub font count does not match downloaded font set')

# No deployed HTML/CSS/JS may keep references to old mirrored asset roots or
# snapshot-only local filenames.
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

print(
    f'Externalized {replacements} static asset reference(s) across {changed_files} file(s) '
    f'to {ORIGIN}; canonicalized {canonicalized_variants} snapshot-only asset path(s).'
)
print(
    f'Mirrored {len(mirrored_font_assets)} font file(s), {downloaded_bytes} bytes, '
    'from SushiClub into the generated Pages artifact only; repository contains 0 static asset files.'
)
