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
- inject first-paint guards used only by the static benchmark;
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

- `scripts/`: replica builders and validators.
- `assets/`: static first-paint helpers used only by the lab artifact.
- `requirements.txt`: deterministic lab-only Python dependencies.
- `build.sh`: complete `.pages-site` build entrypoint.
- `.nojekyll`: copied into the generated Pages artifact.

The GitHub Actions entrypoint is `.github/workflows/lab-pages-replica.yml` because GitHub requires workflows to live under `.github/workflows/`.

## Run locally

From the repository root, with a 40-character `GITHUB_SHA` exported:

```bash
python3 -m pip install -r lab/pages/requirements.txt
node scripts/validate-overrides.mjs
bash lab/pages/build.sh
```

The output is `.pages-site/`. That directory is disposable laboratory output.
