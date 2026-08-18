#!/usr/bin/env bash
set -euo pipefail

# Prepara dependencias, construye la referencia y arma el handoff.
python3 -m pip install --disable-pip-version-check --no-input -r lab/pages/requirements.txt
python3 -m compileall -q lab/pages/scripts
bash lab/pages/build.sh
bash lab/handoff/build-handoff.sh
