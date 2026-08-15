#!/usr/bin/env python3
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SITE = Path('.pages-site')
SOURCE = Path('.')
ORIGIN = 'https://www.sushiclub.com.ar/'
PAGES_ORIGIN = 'https://krestosa.github.io'
ASSET_ROOTS = ('uploads_shop', 'uploads', 'gfx', 'fonts', 'fuentes', 'iconos')
ASSET_FILES = ('favicon.ico',)
TEXT_SUFFIXES = {'.html', '.css', '.js', '.mjs'}
FORBIDDEN_SUFFIXES = {
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.avif',
    '.eot', '.woff', '.woff2', '.ttf', '.otf',
    '.mp4', '.webm', '.mov', '.m4v', '.avi',
    '.pdf',
}
ASSET_SUFFIX_PATTERN = (
    r'png|jpe?g|gif|webp|svg|ico|bmp|avif|'
    r'eot|woff2?|ttf|otf|mp4|webm|mov|m4v|avi|pdf'
)
CRITICAL_REMOTE_ASSETS = (
    ('mobile-logo', ORIGIN + 'gfx/web-sushiclub2_black_m2.png', False),
    ('desktop-logo', ORIGIN + 'gfx/web-sushiclub2_black.png', False),
    ('acumin-regular', ORIGIN + 'fuentes/AcuminPro-Regular.woff2', True),
    ('acumin-semibold', ORIGIN + 'fuentes/AcuminPro-Semibold.woff2', True),
    ('fontawesome', ORIGIN + 'fonts/fontawesome-webfont.woff2', True),
)

if not SITE.is_dir():
    raise SystemExit('.pages-site does not exist')

# Repository policy: code only. Static media/font binaries must stay on the
# canonical SushiClub host and must never be committed to this branch again.
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
# Match only local/root-relative asset references. The negative lookbehind keeps
# already-absolute https://www.sushiclub.com.ar/... URLs untouched.
asset_dir_re = re.compile(
    rf'(?<![A-Za-z0-9:/])(?:\.\./|\./|/)*(?P<root>{root_group})/',
    re.IGNORECASE,
)
asset_file_re = re.compile(
    r'(?<![A-Za-z0-9:/])(?:\.\./|\./|/)*favicon\.ico\b',
    re.IGNORECASE,
)
# The static snapshot downloader encoded query-string variants and duplicate
# downloads into local filenames. Those suffixes are not part of SushiClub's
# canonical asset paths and must be removed before pointing at the live origin.
snapshot_suffix_re = re.compile(
    rf'(?:__q_[0-9a-f]{{8}}|__\d+)(?=\.(?:{ASSET_SUFFIX_PATTERN})\b)',
    re.IGNORECASE,
)

changed_files = 0
replacements = 0
canonicalized_variants = 0


def rewrite(text):
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
    rewritten = rewrite(source)
    if rewritten != source:
        path.write_text(rewritten, encoding='utf-8')
        changed_files += 1

if replacements < 1:
    raise SystemExit('No static asset references were externalized')
if canonicalized_variants < 1:
    raise SystemExit('Expected captured snapshot asset variants to be canonicalized')

# The deploy artifact must also remain code-only.
artifact_assets = []
for path in SITE.rglob('*'):
    if path.is_file() and path.suffix.lower() in FORBIDDEN_SUFFIXES:
        artifact_assets.append(path.relative_to(SITE).as_posix())
if artifact_assets:
    preview = ', '.join(sorted(artifact_assets)[:20])
    suffix = '' if len(artifact_assets) <= 20 else f' (+{len(artifact_assets) - 20} more)'
    raise SystemExit(f'Static asset files remain in Pages artifact: {preview}{suffix}')

# No deployed HTML/CSS/JS may keep references to the old mirrored asset roots
# or snapshot-only filename suffixes.
local_refs = []
snapshot_refs = []
for path in SITE.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
        continue
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

# Probe only a few critical routing families. This is diagnostic rather than a
# deployment dependency because the production host can rate-limit CI clients.
for label, url, needs_cors in CRITICAL_REMOTE_ASSETS:
    headers = {
        'User-Agent': (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36'
        ),
        'Referer': PAGES_ORIGIN + '/carta-sc/',
    }
    if needs_cors:
        headers['Origin'] = PAGES_ORIGIN
    request = Request(url, headers=headers, method='GET')
    try:
        with urlopen(request, timeout=12) as response:
            status = getattr(response, 'status', response.getcode())
            content_type = response.headers.get('Content-Type', '')
            allow_origin = response.headers.get('Access-Control-Allow-Origin', '')
            print(
                f'Remote asset probe {label}: status={status}, '
                f'type={content_type or "(missing)"}, '
                f'acao={allow_origin or "(missing)"}, url={url}'
            )
    except (HTTPError, URLError, TimeoutError) as exc:
        print(f'Remote asset probe {label}: unavailable to CI probe ({exc}); url={url}')

print(
    f'Externalized {replacements} static asset reference(s) across {changed_files} file(s) '
    f'to {ORIGIN}; canonicalized {canonicalized_variants} snapshot-only asset path(s); '
    'repository and artifact contain 0 static asset files.'
)
