#!/usr/bin/env bash
set -euo pipefail

# Prepara dependencias y construye la referencia compilada.
python3 -m pip install --disable-pip-version-check --no-input -r lab/pages/requirements.txt
python3 -m compileall -q lab/pages/scripts
bash lab/pages/build.sh

# Arma el paquete fuera del repo para que su copia de source/ no pueda incluirse a sí misma.
TMP_HANDOFF="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/sc-handoff-${GITHUB_SHA:-local}"
rm -rf "$TMP_HANDOFF" handoff
HANDOFF_DIR="$TMP_HANDOFF" bash lab/handoff/build-handoff.sh
mv "$TMP_HANDOFF" handoff
