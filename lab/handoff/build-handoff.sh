#!/usr/bin/env bash
set -euo pipefail

OUT="${HANDOFF_DIR:-.handoff}"
INPUT="${HANDOFF_INPUT_DIR:-.pages-site}"
SHA="${GITHUB_SHA:-local}"

# Arma el handoff con fuente, tooling y referencia compilada.
test -d "$INPUT"
rm -rf "$OUT"
mkdir -p "$OUT/source" "$OUT/compiled"

# Copia la implementación editable sin metadata del repositorio ni tooling de CI.
rsync -a \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='.pages-site' \
  --exclude='.systems-handoff' \
  --exclude='.handoff' \
  --exclude='lab' \
  --exclude='scripts' \
  --exclude='README.md' \
  --exclude='DOCUMENTACION_TECNICA_COMPLETA.md' \
  ./ "$OUT/source/"

# Copia el pipeline con nombres neutrales para uso local.
mkdir -p "$OUT/source/tooling/scripts" "$OUT/source/tooling/validators" "$OUT/source/tooling/assets"
rsync -a lab/pages/assets/ "$OUT/source/tooling/assets/"
cp lab/pages/.nojekyll "$OUT/source/tooling/.nojekyll"
cp lab/pages/requirements.txt "$OUT/source/tooling/requirements.txt"
rsync -a scripts/ "$OUT/source/tooling/validators/"

for src in lab/pages/scripts/*; do
  [ -f "$src" ] || continue
  name="$(basename "$src")"
  name="${name//pages/build}"
  cp "$src" "$OUT/source/tooling/scripts/$name"
done

# Neutraliza nombres heredados dentro de las copias del tooling.
python3 - "$OUT/source/tooling" <<'PY'
from pathlib import Path
import sys
root = Path(sys.argv[1])
for path in root.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in {'.py', '.mjs', '.js', '.sh', '.css', '.html', '.md', '.txt'}:
        continue
    text = path.read_text(encoding='utf-8', errors='ignore')
    text = text.replace('lab/pages', 'tooling')
    text = text.replace('.pages-site', '.build-site')
    text = text.replace('GITHUB_PAGES', 'HANDOFF_BUILD')
    text = text.replace('_pages', '_build')
    text = text.replace('sc-pages-', 'sc-build-')
    text = text.replace('Pages', 'Build')
    text = text.replace('pages-', 'build-')
    text = text.replace('-pages', '-build')
    path.write_text(text, encoding='utf-8')
PY

# Copia la referencia compilada y neutraliza nombres internos del paquete.
rsync -a "$INPUT/" "$OUT/compiled/"
python3 - "$OUT/compiled" <<'PY'
from pathlib import Path
import shutil
import sys
root = Path(sys.argv[1])
legacy = root / '_pages'
neutral = root / '_build'
if legacy.exists():
    if neutral.exists():
        shutil.rmtree(neutral)
    legacy.rename(neutral)
for path in root.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in {'.html', '.css', '.js', '.json', '.txt', '.svg', '.xml'}:
        continue
    text = path.read_text(encoding='utf-8', errors='ignore')
    text = text.replace('_pages/', '_build/')
    text = text.replace('sc-pages-', 'sc-build-')
    text = text.replace('Pages', 'Build')
    path.write_text(text, encoding='utf-8')
PY
printf '%s\n' "$SHA" > "$OUT/BUILD_SHA"

cat > "$OUT/source/tooling/build.py" <<'PY'
#!/usr/bin/env python3
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLING = ROOT / 'tooling'
SCRIPTS = TOOLING / 'scripts'
VALIDATORS = TOOLING / 'validators'
SITE = ROOT / '.build-site'
PACKAGE = ROOT.parent
COMPILED = PACKAGE / 'compiled'


def run(*args: str) -> None:
    print('+', ' '.join(map(str, args)), flush=True)
    subprocess.run([str(a) for a in args], cwd=ROOT, check=True)


def copy_tree() -> None:
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir(parents=True)
    excluded = {
        '.git', '.github', '.build-site', '.handoff', 'tooling',
        'README.md', 'DOCUMENTACION_TECNICA_COMPLETA.md'
    }
    for item in ROOT.iterdir():
        if item.name in excluded:
            continue
        target = SITE / item.name
        if item.is_dir():
            shutil.copytree(item, target)
        else:
            shutil.copy2(item, target)
    shutil.copy2(TOOLING / '.nojekyll', SITE / '.nojekyll')


def py(name: str, *args: str) -> None:
    run(sys.executable, str(SCRIPTS / name), *args)


def node_check(relative: str) -> None:
    run('node', '--check', str(SITE / relative))


def require_file(relative: str) -> None:
    path = SITE / relative
    if not path.is_file() or path.stat().st_size == 0:
        raise SystemExit(f'missing build output: {relative}')


def verify_final() -> None:
    html = (SITE / 'index.html').read_text(encoding='utf-8', errors='ignore')
    for marker in ('id="sc-build-critical-css"', 'id="sc-build-delivery-loader"', 'id="sc-theme-prepaint"'):
        if marker not in html:
            raise SystemExit(f'missing build marker: {marker}')
    if 'keepSessionAlive' in html:
        raise SystemExit('legacy session keepalive remains')
    require_file('index.html')
    require_file('_build/deferred.css')
    require_file('_build/php-guard.js')
    require_file('_critical-media/sushiclub-logo.svg')
    for n in range(1, 5):
        require_file(f'_first-viewport/product-{n}.webp')


def publish_compiled() -> None:
    if COMPILED.exists():
        shutil.rmtree(COMPILED)
    shutil.copytree(SITE, COMPILED)
    sha = os.environ.get('GITHUB_SHA') or (PACKAGE / 'BUILD_SHA').read_text(encoding='utf-8').strip()
    (PACKAGE / 'BUILD_SHA').write_text(sha + '\n', encoding='utf-8')


def main() -> None:
    os.environ.setdefault('HANDOFF_BUILD', 'true')
    run('node', str(VALIDATORS / 'validate-overrides.mjs'))
    run('node', str(VALIDATORS / 'validate-production-boundary.mjs'))
    run('node', str(VALIDATORS / 'validate-responsive-contract.mjs'))
    run(sys.executable, '-m', 'compileall', '-q', str(SCRIPTS))

    copy_tree()

    run('node', str(SCRIPTS / 'validate-snapshot-override-integration.mjs'))
    for name in (
        'apply-lab-overrides.py',
        'compile-build-templates.py',
        'prepare-build-artifact.py',
        'optimize-build-critical-path.py',
        'clean-build-product-images.py',
        'clean-build-snapshot.py',
        'flatten-build-bootstrap.py',
        'bundle-build-legacy-css.py',
        'bundle-build-legacy-js.py',
        'bundle-build-shop-js.py',
    ):
        py(name)

    node_check('override/main.js')
    node_check('_build/legacy.js')
    node_check('_build/shop.js')
    py('validate-build-local-assets.py')
    py('validate-build-html.py')
    py('validate-build-performance-budget.py')

    for name in (
        'optimize-build-delivery.py',
        'optimize-build-first-paint.py',
        'seed-build-theme.py',
        'optimize-build-first-viewport-media.py',
        'optimize-build-breakpoint-media.py',
    ):
        py(name)
    py('calibrate-system-logo.py', 'measure')
    py('replace-system-logo.py')
    py('calibrate-system-logo.py', 'apply')
    py('prune-build-superseded-media.py')
    py('disable-build-php-runtime.py')
    if (SCRIPTS / 'optimize-build-lcp.py').is_file():
        py('optimize-build-lcp.py')

    node_check('override/main.js')
    node_check('_build/legacy.js')
    node_check('_build/shop.js')
    node_check('_build/php-guard.js')
    node_check('_js_dev/main-legacy.js')
    py('validate-build-local-assets.py')
    py('validate-build-html.py')
    py('validate-system-load.py')

    verify_final()
    publish_compiled()
    print(f'Build listo en {COMPILED}')


if __name__ == '__main__':
    main()
PY

cat > "$OUT/build-local.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
ROOT="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
VENV="\$ROOT/.venv"
PYTHON="\${PYTHON:-python3}"

# Prepara el entorno local.
if [ ! -x "\$VENV/bin/python" ]; then "\$PYTHON" -m venv "\$VENV"; fi
"\$VENV/bin/python" -m pip install --disable-pip-version-check --no-input -r "\$ROOT/source/tooling/requirements.txt"

# Reconstruye compiled/.
export GITHUB_SHA="\${GITHUB_SHA:-$SHA}"
"\$VENV/bin/python" "\$ROOT/source/tooling/build.py"
EOF

cat > "$OUT/serve-local.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Levanta compiled/ en localhost:8080.
python3 -m http.server 8080 --directory "$ROOT/compiled"
EOF

cat > "$OUT/build-local.ps1" <<EOF
\$ErrorActionPreference = 'Stop'
\$Root = Split-Path -Parent \$MyInvocation.MyCommand.Path
\$Venv = Join-Path \$Root '.venv'

# Prepara el entorno local.
if (Get-Command py -ErrorAction SilentlyContinue) {
  \$PythonBase = @('py', '-3')
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  \$PythonBase = @('python')
} else {
  throw 'Python 3 no esta instalado o no esta en PATH.'
}

if (-not (Test-Path (Join-Path \$Venv 'Scripts\\python.exe'))) {
  if (\$PythonBase.Count -eq 2) { & \$PythonBase[0] \$PythonBase[1] -m venv \$Venv }
  else { & \$PythonBase[0] -m venv \$Venv }
}

\$Python = Join-Path \$Venv 'Scripts\\python.exe'
& \$Python -m pip install --disable-pip-version-check --no-input -r (Join-Path \$Root 'source\\tooling\\requirements.txt')

# Reconstruye compiled/.
if (-not \$env:GITHUB_SHA) { \$env:GITHUB_SHA = '$SHA' }
& \$Python (Join-Path \$Root 'source\\tooling\\build.py')
if (\$LASTEXITCODE -ne 0) { exit \$LASTEXITCODE }
EOF

cat > "$OUT/serve-local.ps1" <<'EOF'
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Compiled = Join-Path $Root 'compiled'

# Levanta compiled/ en localhost:8080.
if (Get-Command py -ErrorAction SilentlyContinue) {
  & py -3 -m http.server 8080 --directory $Compiled
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  & python -m http.server 8080 --directory $Compiled
} else {
  throw 'Python 3 no esta instalado o no esta en PATH.'
}
EOF

cat > "$OUT/README.md" <<'EOF'
# Handoff

Paquete autocontenido con implementación editable, tooling de build y referencia compilada.

- `source/override/`: diseño, UI, UX, motion, accesibilidad y optimizaciones propias.
- `source/tooling/`: scripts y validaciones necesarios para reconstruir la salida.
- `source/`: snapshot y assets necesarios para reproducir la integración.
- `compiled/`: referencia final ya construida. No editar a mano.
- `BUILD_SHA`: versión exacta del handoff.

## Requisitos

Python 3, Node.js e Internet durante el rebuild.

## Linux / macOS

```bash
bash serve-local.sh
# Levanta compiled/ en localhost:8080.

bash build-local.sh
# Prepara dependencias y reconstruye compiled/.
```

## Windows PowerShell

```powershell
powershell -ExecutionPolicy Bypass -File .\serve-local.ps1
# Levanta compiled/ en localhost:8080.

powershell -ExecutionPolicy Bypass -File .\build-local.ps1
# Prepara dependencias y reconstruye compiled/.
```

## Flujo

1. Editar principalmente `source/override/`.
2. Si cambia el pipeline, editar `source/tooling/`.
3. Ejecutar el build local del sistema operativo.
4. Revisar `compiled/`.

No requiere CI para reconstruir la salida.
EOF

chmod +x "$OUT/build-local.sh" "$OUT/serve-local.sh"

test -s "$OUT/README.md"
test -s "$OUT/BUILD_SHA"
test -d "$OUT/source/override"
test -d "$OUT/source/tooling/scripts"
test -s "$OUT/source/tooling/build.py"
test -x "$OUT/build-local.sh"
test -x "$OUT/serve-local.sh"
test -s "$OUT/build-local.ps1"
test -s "$OUT/serve-local.ps1"
test -s "$OUT/compiled/index.html"
test ! -e "$OUT/compiled/_pages"
test -d "$OUT/compiled/_build"

printf 'Handoff ready at %s for %s\n' "$OUT" "$SHA"
