# GitHub Pages / Lighthouse lab

`lab/pages/` es el harness TypeScript/Node que construye la réplica estática usada por GitHub Pages y Lighthouse. No es código de aplicación de producción y no puede convertirse en dependencia de `override/`.

## Ownership

El frontend propio vive en `override/` y su fuente es TypeScript. Los árboles `js/` y `_js_dev/` permanecen legacy/originales e inmutables.

El lab puede copiar el snapshot a `.pages-site`, reescribir HTML staged, bundlear legacy CSS/JS, generar media optimizada, alterar prioridades de carga e inyectar CSS/lifecycle exclusivos del benchmark. Ninguna de esas transformaciones modifica el source de `override/`.

## Implementación

- `build.ts`: orquestador del build de `.pages-site`.
- `lib/core.ts`: utilidades TypeScript/Node compartidas del pipeline.
- `steps/`: transformaciones TypeScript del pipeline.
- `validators.ts` + `validators/`: validaciones del artifact.
- `assets/prepaint.css` y `assets/performance.css`: CSS exclusivo de staging.
- `.nojekyll`: marker del artifact.

No hay Python, `requirements.txt`, MJS ni scripts shell versionados en la implementación canónica.

## Staging de TypeScript

`npm run build:runtime` compila `override/**/*.ts` a `.generated/browser/`. El build de Pages copia el snapshot excluyendo source `.ts` y superpone el JavaScript generado únicamente dentro de `.pages-site/override/`. Por eso el repositorio conserva fuente TypeScript mientras el artifact navegador usa URLs `.js`.

`apply-lab-overrides.ts` sólo modifica la copia staged de `render-lifecycle.js`; el source `override/core/render-lifecycle.ts` nunca se reescribe.

## Validación

Desde la raíz:

```bash
npm ci
npm run typecheck
npm run validate
GITHUB_SHA=<sha-git-de-40-caracteres> npm run build:pages
```

`npm run validate` comprueba también la frontera de lenguaje: JavaScript versionado sólo puede existir en `js/` y `_js_dev/`.

## CI y deploy

`.github/workflows/lab-pages-replica.yml` se ejecuta sobre `type`, usa Node 22, instala con `npm ci`, ejecuta typecheck/validaciones, construye `.pages-site`, verifica que el run no esté stale y despliega el artifact exacto a GitHub Pages. Después verifica públicamente que el HTML servido contiene el SHA exacto del HEAD desplegado.
