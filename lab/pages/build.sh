#!/usr/bin/env bash
set -euo pipefail

LAB="lab/pages"
SCRIPTS="$LAB/scripts"
SITE=".pages-site"

node "$SCRIPTS/validate-snapshot-override-integration.mjs"

rm -rf "$SITE"
mkdir -p "$SITE"
rsync -a \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='.pages-site' \
  --exclude='lab' \
  --exclude='scripts' \
  --exclude='README.md' \
  --exclude='DOCUMENTACION_TECNICA_COMPLETA.md' \
  ./ "$SITE/"
cp "$LAB/.nojekyll" "$SITE/.nojekyll"

python3 "$SCRIPTS/apply-lab-overrides.py"
python3 "$SCRIPTS/compile-pages-templates.py"
python3 "$SCRIPTS/prepare-pages-artifact.py"
python3 "$SCRIPTS/optimize-pages-critical-path.py"
python3 "$SCRIPTS/clean-pages-product-images.py"
python3 "$SCRIPTS/clean-pages-snapshot.py"
python3 "$SCRIPTS/flatten-pages-bootstrap.py"
python3 "$SCRIPTS/bundle-pages-legacy-css.py"
python3 "$SCRIPTS/bundle-pages-legacy-js.py"
python3 "$SCRIPTS/bundle-pages-shop-js.py"

node --check "$SITE/override/main.js"
node --check "$SITE/_pages/legacy.js"
node --check "$SITE/_pages/shop.js"
python3 "$SCRIPTS/validate-pages-local-assets.py"
python3 "$SCRIPTS/validate-pages-html.py"
python3 "$SCRIPTS/validate-pages-performance-budget.py"

python3 "$SCRIPTS/optimize-pages-delivery.py"
python3 "$SCRIPTS/optimize-pages-first-paint.py"
python3 "$SCRIPTS/optimize-pages-first-viewport-media.py"
python3 "$SCRIPTS/optimize-pages-breakpoint-media.py"

node --check "$SITE/override/main.js"
node --check "$SITE/_pages/legacy.js"
node --check "$SITE/_pages/shop.js"
node --check "$SITE/_js_dev/main-legacy.js"
python3 "$SCRIPTS/validate-pages-local-assets.py"
python3 "$SCRIPTS/validate-pages-html.py"

# Lab invariants. These verify the benchmark artifact only; they are not
# production integration requirements.
grep -F 'id="sc-pages-critical-css"' "$SITE/index.html" >/dev/null
grep -F 'id="sc-pages-delivery-loader"' "$SITE/index.html" >/dev/null
test -s "$SITE/_pages/deferred.css"
test -s "$SITE/_critical-media/mobile-logo.webp"
test -s "$SITE/_critical-media/mobile-banner.webp"
test "$(grep -o 'data-sc-first-viewport=' "$SITE/index.html" | wc -l)" -eq 4
for n in 1 2 3 4; do
  test -s "$SITE/_first-viewport/product-${n}.webp"
  test "$(stat -c%s "$SITE/_first-viewport/product-${n}.webp")" -le 36000
done

grep -F "querySelectorAll('img[data-sc-first-viewport]')" "$SITE/index.html" >/dev/null
grep -F "querySelectorAll('img[data-sc-desktop-src]')" "$SITE/index.html" >/dev/null

if grep -F '_critical-media/mobile-logo.png?v=' "$SITE/index.html" >/dev/null; then
  echo 'Legacy mobile LCP PNG remains in lab artifact' >&2
  exit 1
fi
if grep -F '_pages/legacy.css?v=' "$SITE/index.html" | grep -F 'rel="stylesheet"' >/dev/null; then
  echo 'Blocking legacy stylesheet remains in lab artifact' >&2
  exit 1
fi
if grep -F 'override/main.css?v=' "$SITE/index.html" | grep -F 'rel="stylesheet"' >/dev/null; then
  echo 'Blocking override stylesheet remains in lab artifact' >&2
  exit 1
fi

printf 'Pages lab artifact built at %s for %s\n' "$SITE" "${GITHUB_SHA:-unknown}"
