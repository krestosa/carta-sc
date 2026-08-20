# GitHub Pages / Lighthouse lab

`lab/pages/` es el harness de benchmark para la réplica estática de GitHub Pages. No es código de aplicación de producción y no puede convertirse en dependencia de `override/`.

## Ownership

El frontend propio vive en `override/` y su fuente JavaScript fue reemplazada por TypeScript. Los árboles `js/` y `_js_dev/` permanecen legacy/originales y el laboratorio los trata como dependencias inmutables.

Este lab puede copiar el snapshot a `.pages-site`, reescribir HTML staged, bundlear legacy CSS/JS, generar media WebP, alterar prioridades de carga e inyectar CSS/lifecycle exclusivos del benchmark.

## Implementación

- `build.ts`: orquestador único del build de `.pages-site`.
- `lib/`: utilidades Node para filesystem, red e imágenes.
- `steps/`: transformaciones TypeScript del pipeline.
- `validators.ts`: validaciones del artifact.
- `assets/prepaint.css` y `assets/performance.css`: CSS inyectado sólo en staging.
- `.nojekyll`: marker del artifact.

No hay Python, `requirements.txt`, MJS ni shell de build en la implementación canónica.

## Staging de TypeScript

El build compila `override/**/*.ts` a `.generated/browser/`. Luego copia el snapshot excluyendo los `.ts` y superpone el JavaScript compilado únicamente dentro de `.pages-site/override/`. Por eso el source permanece TypeScript-only mientras las URLs runtime legacy continúan terminando en `.js` dentro del artifact generado.

`apply-lab-overrides.ts` modifica sólo la copia staged de `render-lifecycle.js` y agrega los assets de first paint del lab. El source TypeScript de `override/` no se reescribe.

## Validación

Desde la raíz:

```bash
npm ci
npm run typecheck
npm run validate
GITHUB_SHA=<sha-git-de-40-caracteres> npm run build:pages
```

`npm run validate` verifica también el límite de lenguaje: JavaScript versionado sólo puede existir en `js/` y `_js_dev/`.

## CI

`.github/workflows/lab-pages-replica.yml` ejecuta Node 22, `npm ci`, typecheck, validaciones y el build. La branch `type` construye y valida el artifact sin desplegarlo. Sólo `ux` puede desplegar GitHub Pages, conservando los guards de SHA y los reintentos del deploy.
