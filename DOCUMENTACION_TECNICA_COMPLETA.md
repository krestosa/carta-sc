# Documentación técnica — carta-sc

> Fuente de verdad para la arquitectura vigente de la rama `type`. El código y los validadores del SHA actual prevalecen ante cualquier documento histórico.

## 1. Alcance del repositorio

El frontend propio entregable vive en `override/` y su source es TypeScript, CSS y templates HTML.

El runtime JavaScript de `override/` se genera durante el build. No se versiona JavaScript propio como fuente.

Los árboles `js/` y `_js_dev/` son legacy/originales e inmutables. También se conservan como fixture `index.html`, `_css_dev/` y `css/`.

## 2. Estructura vigente

```text
.
├── override/                         # frontend propio: TS/CSS/HTML
├── types/browser.d.ts                # contratos globales del runtime browser
├── scripts/                          # tooling/validadores TypeScript
├── lab/
│   ├── pages/                        # build/validación de Pages en TypeScript
│   └── handoff/                      # build/serve de handoff en TypeScript
├── package.json
├── package-lock.json
├── tsconfig.base.json
├── tsconfig.browser.json
├── tsconfig.tooling.json
├── .github/workflows/
│   ├── handoff.yml
│   └── lab-pages-replica.yml
├── index.html                        # fixture legacy
├── _css_dev/                         # CSS legacy
├── _js_dev/                          # JS legacy
├── css/                              # CSS legacy
└── js/                               # JS legacy
```

No existen como implementación canónica scripts Python, MJS, shell de build ni `requirements.txt`.

## 3. TypeScript browser

`tsconfig.browser.json` incluye:

- `types/browser.d.ts`
- `override/**/*.ts`

Compila a `.generated/browser/` con `noEmitOnError`.

El source se edita siempre en `.ts`; las rutas `.js` que aparecen en manifests/importadores runtime corresponden al JavaScript generado que consume el navegador.

## 4. TypeScript tooling

`tsconfig.tooling.json` incluye:

- `scripts/**/*.ts`
- `lab/pages/**/*.ts`
- `lab/handoff/**/*.ts`

Compila a `.build/tooling/`.

El `tsconfig.base.json` activa `strict`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch` y `skipLibCheck: false`.

## 5. `override/`

Responsabilidades:

- interacción y UX;
- layout/responsive;
- accesibilidad;
- templates propios;
- búsqueda, filtros, vista y tema;
- modal, carrito, navegación y header mobile;
- normalización de contenido;
- carga/prioridad visual de imágenes;
- motion y lifecycle frontend;
- compatibilidad controlada con el DOM legacy.

No pertenece a `override/`:

- reescritura del HTML del backend;
- cache/CDN/headers;
- optimización de assets de infraestructura;
- bundling específico de Pages;
- simulación de endpoints;
- transforms del benchmark.

El detalle de ownership vive en `override/README.md`.

## 6. Runtime y build

Comandos canónicos:

```bash
npm ci
npm run typecheck
npm run validate
npm run build:pages
npm run build:handoff
npm run validate:handoff
npm run ci
```

`npm run build:runtime`:

1. compila tooling TypeScript;
2. compila browser TypeScript;
3. ejecuta `scripts/sync-runtime.ts` compilado;
4. deja el JavaScript generado preparado para validación/build.

`npm run validate` ejecuta:

- source boundary;
- validación de override;
- production boundary;
- responsive contract.

## 7. Frontera de lenguaje

`scripts/validate-source-boundary.ts` impide source propio:

- `.js`
- `.mjs`
- `.py`
- `.sh`
- `requirements.txt`

fuera de los directorios legacy `js/` y `_js_dev/`.

Esto permite que el navegador siga recibiendo JavaScript generado sin volver a introducir JavaScript fuente propio.

## 8. Laboratorio de Pages

`lab/pages/` es TypeScript/Node.

```text
lab/pages/
├── build.ts
├── lib/
│   └── core.ts
├── steps/
│   ├── apply-lab-overrides.ts
│   ├── bundle-legacy.ts
│   ├── first-paint.ts
│   ├── first-paint/
│   ├── first-viewport-media.ts
│   ├── replace-system-logo.ts
│   ├── system-logo-source.ts
│   └── ...
├── validators.ts
├── validators/
├── assets/
│   ├── prepaint.css
│   └── performance.css
├── .nojekyll
└── README.md
```

Flujo general:

1. valida integración snapshot/override;
2. crea `.pages-site` desde la fixture;
3. superpone runtime browser generado;
4. aplica transforms exclusivos del lab;
5. bundlea legacy sin modificar `js/`/`_js_dev/`;
6. externaliza/mirrors recursos necesarios en el artifact;
7. optimiza first paint, first viewport, breakpoint media y logo;
8. desactiva PHP runtime para réplica estática;
9. ejecuta validadores finales.

`.pages-site/` es output desechable, nunca source.

## 9. Logo del sistema

El SVG del logo no se versiona como asset estático. Su geometría vive como texto fuente TypeScript en `lab/pages/steps/system-logo-source.ts`.

`replace-system-logo.ts` valida ese source y genera el SVG final dentro del artifact de Pages. Así se conserva la regla que prohíbe assets estáticos versionados en el laboratorio.

## 10. Handoff

`lab/handoff/` contiene sólo tooling TypeScript:

- `build-handoff.ts`
- `rebuild-handoff.ts`
- `serve.ts`
- `shared.ts`

`npm run build:handoff` genera un paquete reproducible con:

- `compiled/`;
- `source/`;
- `README.md`;
- `BUILD_SHA`;
- launchers generados dentro del artifact cuando corresponda.

Los launchers generados pueden ser shell/PowerShell porque son output del handoff; no son source versionado del repositorio.

`npm run validate:handoff` verifica estructura, SHA y frontera de source.

## 11. CI

### TypeScript CI and Handoff

`.github/workflows/handoff.yml` corre sobre `push` a `type`, PR `type -> main` y dispatch manual.

Usa Node 22, `npm ci` y `npm run ci`. Verifica el contrato del handoff y publica el artifact.

### Pages lab

`.github/workflows/lab-pages-replica.yml` corre sobre `type`.

Usa Node 22, valida SHA contra la branch actual, ejecuta typecheck/validaciones, construye `.pages-site` y publica el resultado como artifact normal de Actions llamado `pages-lab-<sha>`.

La rama `type` no declara el environment `github-pages` ni intenta un deploy público. Las reglas de protección actuales del environment rechazan deployments desde `type` antes de iniciar el job. Un deploy público sólo debe ejecutarse desde una rama permitida por esas reglas o después de cambiar explícitamente la configuración de protección del environment.

## 12. Legacy e integración

Las siguientes superficies permanecen deliberadamente fuera de la migración:

- `js/`
- `_js_dev/`

Se usan como runtime/fixture de compatibilidad y no deben editarse durante la migración TypeScript.

`index.html`, `_css_dev/` y `css/` también permanecen como fixture legacy salvo una necesidad explícita separada de este refactor.

## 13. Responsive y estado

El catálogo mantiene sólo dos vistas:

- `compact`
- `list`

`normal` es un valor legacy que se migra a `compact`.

Densidad:

- desktop: 4 columnas;
- tablet: 3 columnas;
- phone: 2 columnas.

`data-sc-catalog-view` es la única fuente de verdad de geometría de vista. La búsqueda no cambia ni persiste una vista alternativa.

## 14. Motion

Motion es progressive enhancement y se implementa con un motor TypeScript local basado en `requestAnimationFrame`, Web Animations API donde ya era la ruta primaria y primitivas propias de interpolación. No carga runtimes de animación externos.

El motor conserva las curvas matemáticas, duraciones, delays, stagger, interrupción y cleanup de los efectos existentes. Los paths SVG usan sampling/alineación de puntos; las geometrías rectangulares interpolan atributos SVG nativos. Cada componente es owner de sus `MotionHandle` y `prefers-reduced-motion` se centraliza mediante `SC.motion.reduced()`.

## 15. Reglas para cambios futuros

- agregar comportamiento propio sólo en TypeScript;
- no reintroducir `.js/.mjs/.py/.sh` propios;
- no usar `@ts-ignore`, `@ts-nocheck` ni `any` como escape de tipos;
- mantener `js/` y `_js_dev/` inmutables;
- no reintroducir runtimes o plugins externos de animación;
- mantener el lab separado del contrato de producción;
- ejecutar `npm run ci` antes de considerar un cambio entregable.

## 16. Documentación histórica

`lab/pages/DOCUMENTACION_TECNICA_LAB_LEGACY.md` es únicamente un puntero histórico y no es fuente de verdad para el estado actual.

Fuentes vigentes:

- arquitectura global: este documento;
- frontend: `override/README.md`;
- Pages: `lab/pages/README.md`;
- comportamiento efectivo: source + validadores del SHA actual.
