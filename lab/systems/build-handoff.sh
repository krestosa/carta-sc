#!/usr/bin/env bash
set -euo pipefail

OUT="${SYSTEMS_HANDOFF_DIR:-.systems-handoff}"
SITE="${PAGES_SITE_DIR:-.pages-site}"
SHA="${GITHUB_SHA:-local}"

# Arma el paquete para Sistemas.
test -d "$SITE"
rm -rf "$OUT"
mkdir -p "$OUT/source" "$OUT/compiled"

# Copia las fuentes necesarias para reconstruir la web.
rsync -a \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='.pages-site' \
  --exclude='.systems-handoff' \
  --exclude='DOCUMENTACION_TECNICA_COMPLETA.md' \
  ./ "$OUT/source/"

# Copia la salida ya compilada como referencia.
rsync -a "$SITE/" "$OUT/compiled/"
printf '%s\n' "$SHA" > "$OUT/BUILD_SHA"

cat > "$OUT/build-local.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
ROOT="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
VENV="\$ROOT/.venv"
cd "\$ROOT/source"
export GITHUB_SHA="\${GITHUB_SHA:-$SHA}"
export GITHUB_PAGES="true"

# Prepara el entorno Python local.
if [ ! -x "\$VENV/bin/python" ]; then python3 -m venv "\$VENV"; fi
"\$VENV/bin/python" -m pip install --disable-pip-version-check --no-input -r lab/pages/requirements.txt
export PATH="\$VENV/bin:\$PATH"

# Reconstruye la versión optimizada.
bash lab/pages/build.sh

# Actualiza la carpeta compilada.
rm -rf "\$ROOT/compiled"
mkdir -p "\$ROOT/compiled"
rsync -a .pages-site/ "\$ROOT/compiled/"
printf '%s\n' "\$GITHUB_SHA" > "\$ROOT/BUILD_SHA"
echo "Build listo en compiled/"
EOF

cat > "$OUT/serve-local.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Sirve la salida local en http://localhost:8080.
python3 -m http.server 8080 --directory "$ROOT/compiled"
EOF

cat > "$OUT/README.md" <<'EOF'
# Handoff para Sistemas

Este paquete separa la implementación editable de la salida final.

- `source/override/`: diseño, UX, motion y optimizaciones propias.
- `source/lab/pages/`: pipeline y scripts de optimización/build.
- `source/scripts/`: validadores usados por el build.
- `source/`: snapshot y assets legacy necesarios para reproducir la integración.
- `compiled/`: salida exacta ya construida. Usarla como referencia; no editarla a mano.
- `BUILD_SHA`: versión exacta del paquete.

## Requisitos

Bash, Python 3 con `venv`, Node.js, `rsync` e Internet durante el rebuild. En Windows usar WSL.

## Comandos

```bash
bash serve-local.sh
# Levanta compiled/ en localhost:8080.

bash build-local.sh
# Prepara dependencias y reconstruye compiled/ desde source/.
```

## Implementación

1. Trabajar principalmente en `source/override/`.
2. Para optimizaciones de build, usar `source/lab/pages/scripts/`.
3. Ejecutar `bash build-local.sh`.
4. Revisar el resultado en `compiled/`.

No requiere GitHub Actions para reproducir el build.
EOF

chmod +x "$OUT/build-local.sh" "$OUT/serve-local.sh"

test -s "$OUT/README.md"
test -s "$OUT/BUILD_SHA"
test -d "$OUT/source/override"
test -d "$OUT/source/lab/pages/scripts"
test -x "$OUT/build-local.sh"
test -x "$OUT/serve-local.sh"
test -s "$OUT/compiled/index.html"

printf 'Systems handoff ready at %s for %s\n' "$OUT" "$SHA"
