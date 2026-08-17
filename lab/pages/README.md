# GitHub Pages / Lighthouse lab

`lab/pages/` is a benchmark harness for the static GitHub Pages replica. It is not production application code and must not be required by the real SushiClub deployment.

## Ownership boundary

Production-owned frontend lives in `override/`.

This lab may:

- copy the static snapshot into `.pages-site`;
- rewrite the staged HTML;
- bundle legacy CSS/JS for the replica;
- generate responsive WebP assets for PageSpeed experiments;
- alter loading priorities in the staged artifact;
- delay analytics or third-party resources in the replica;
- inject first-paint CSS and lifecycle behavior used only by the static benchmark;
- validate the final Pages artifact.

This lab must not be treated as the implementation contract for the real site. Server rendering, backend behavior, cache headers, CDN configuration, image delivery, compression and production deployment belong to Sistemas.

## Promotion rule

A Lighthouse finding may be promoted from this lab into `override/` only when all of the following are true:

1. the root cause is inside `override/`;
2. the fix is browser/frontend behavior rather than deployment infrastructure;
3. the fix remains valid if every file under `lab/pages/` disappears;
4. it does not require the production server to reproduce a GitHub Pages transformation.

Otherwise the finding stays here or is documented as a recommendation for Sistemas.

## Layout

- `scripts/`: replica builders, integration checks and artifact validators.
- `assets/prepaint.css`: geometry/first-paint rules injected only into `.pages-site`.
- `assets/performance.css`: mobile critical-path rules injected only into `.pages-site`.
- `requirements.txt`: deterministic lab-only Python dependencies.
- `build.sh`: complete `.pages-site` build entrypoint.
- `.nojekyll`: copied into the generated Pages artifact.
- `DOCUMENTACION_TECNICA_LAB_LEGACY.md`: pointer to the historical documentation from before production/lab separation.

The GitHub Actions entrypoint is `.github/workflows/lab-pages-replica.yml` because GitHub requires workflows to live under `.github/workflows/`.

## Staging-only lifecycle injection

The source `override/core/render-lifecycle.js` contains only production-valid frontend coordination. It does not know about `sc-catalog-prepaint` or generated critical media.

During the lab build, `scripts/apply-lab-overrides.py` patches only `.pages-site/override/core/render-lifecycle.js` to add the benchmark-specific critical-media wait and prepaint cleanup. It also copies the two lab CSS files into the staging manifest. The source under `override/` remains unchanged.

## Validation split

From the repository root:

```bash
node scripts/validate-overrides.mjs
node scripts/validate-production-boundary.mjs
node lab/pages/scripts/validate-snapshot-override-integration.mjs
```

The first two validate the frontend deliverable. The third validates only the static snapshot harness used by this lab.

## Run locally

With a 40-character `GITHUB_SHA` exported:

```bash
python3 -m pip install -r lab/pages/requirements.txt
node scripts/validate-overrides.mjs
node scripts/validate-production-boundary.mjs
bash lab/pages/build.sh
```

The output is `.pages-site/`. That directory is disposable laboratory output.
