#!/usr/bin/env python3
import re
from pathlib import Path

SITE = Path('.pages-site')
SOURCE = Path('.')
ORIGIN = 'https://www.sushiclub.com.ar/'
ASSET_ROOTS = ('uploads_shop', 'uploads', 'gfx', 'fonts', 'fuentes', 'iconos')
ASSET_FILES = ('favicon.ico',)
TEXT_SUFFIXES = {'.html', '.css', '.js', '.mjs'}
FORBIDDEN_SUFFIXES = {
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.avif',
    '.eot', '.woff', '.woff2', '.ttf', '.otf',
    '.mp4', '.webm', '.mov', '.m4v', '.avi',
    '.pdf',
}

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

changed_files = 0
replacements = 0


def rewrite(text):
    global replacements

    def repl_dir(match):
        global replacements
        replacements += 1
        return ORIGIN + match.group('root') + '/'

    def repl_file(_match):
        global replacements
        replacements += 1
        return ORIGIN + 'favicon.ico'

    text = asset_dir_re.sub(repl_dir, text)
    return asset_file_re.sub(repl_file, text)


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

# The deploy artifact must also remain code-only.
artifact_assets = []
for path in SITE.rglob('*'):
    if path.is_file() and path.suffix.lower() in FORBIDDEN_SUFFIXES:
        artifact_assets.append(path.relative_to(SITE).as_posix())
if artifact_assets:
    preview = ', '.join(sorted(artifact_assets)[:20])
    suffix = '' if len(artifact_assets) <= 20 else f' (+{len(artifact_assets) - 20} more)'
    raise SystemExit(f'Static asset files remain in Pages artifact: {preview}{suffix}')

# No deployed HTML/CSS/JS may keep references to the old mirrored asset roots.
local_refs = []
for path in SITE.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
        continue
    text = path.read_text(encoding='utf-8', errors='strict')
    if asset_dir_re.search(text) or asset_file_re.search(text):
        local_refs.append(path.relative_to(SITE).as_posix())
if local_refs:
    raise SystemExit('Local static asset reference(s) remain: ' + ', '.join(sorted(local_refs)))

print(
    f'Externalized {replacements} static asset reference(s) across {changed_files} file(s) '
    f'to {ORIGIN}; repository and artifact contain 0 static asset files.'
)
