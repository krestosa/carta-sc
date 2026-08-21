# Override frontend architecture

`override/` es la capa frontend entregable. Su source propio es TypeScript + CSS + templates HTML. El JavaScript de `override/` existe únicamente como output generado durante el build; no se versiona como fuente.

`override/` no depende de GitHub Pages ni de transformaciones de `lab/pages/`. Si `lab/` desaparece, esta carpeta sigue describiendo por sí sola la implementación frontend entregable.

## Frontera

Pertenece a `override/`:

- TypeScript de comportamiento UI;
- CSS, layout y design tokens;
- templates HTML propios;
- accesibilidad;
- observers/listeners;
- animaciones;
- normalización de contenido;
- compatibilidad controlada con DOM/runtime legacy.

No pertenece a `override/`:

- reescritura del HTML del servidor;
- cache/CDN/headers;
- conversión de assets de CI;
- bundling específico de Pages;
- simulación de endpoints/backend;
- políticas de infraestructura o terceros.

## Source y runtime generado

El source canónico usa `.ts`. Ejemplos:

- `main.ts`
- `runtime-main.ts`
- `core/variables.ts`
- `core/render-lifecycle.ts`
- `motion/main.ts`
- `templates/registry.ts`
- módulos bajo `components/`, `features/` y `mutations/`.

`npm run build:runtime` compila esos archivos a `.generated/browser/override/**/*.js` y `scripts/sync-runtime.ts` sincroniza el runtime generado necesario para validación/build. Los `.js` generados no son source versionado.

La única excepción de JavaScript versionado son las fronteras legacy `js/` y `_js_dev/`, fuera de `override/`.

## Boot flow

1. `_js_dev/main.js` es bootstrap legacy y permanece inmutable.
2. `override/main.css` mantiene el manifest de estilos.
3. `override/main.ts` define el bootstrap propio y el manifest de módulos.
4. `override/runtime-main.ts` posee el orden de carga: foundation → features → templates → integrations.
5. `override/motion/main.ts` inicializa sincrónicamente el motor local de RAF, easings e interpolación.
6. `override/templates/registry.ts` resuelve templates antes de montar consumidores.
7. `override/core/render-lifecycle.ts` coordina viewport inicial, desbloqueo de motion y estabilidad de layout.

En runtime, esas rutas se sirven como `.js` compilado. Cuando la documentación habla de ownership o edición, siempre se refiere al `.ts` fuente.

## Ownership

| Área | Source owner |
| --- | --- |
| Bootstrap | `main.ts`, `runtime-main.ts` |
| Configuración | `core/variables.ts` |
| Persistencia | `core/storage-policy.ts` |
| Lifecycle | `core/render-lifecycle.ts` |
| Templates | `templates/registry.ts` |
| Motion base | `motion/main.ts` |
| Categorías | `components/category-nav/` |
| Herramientas de catálogo | `components/catalog-tools/` |
| Tarjetas | `components/product-card/` |
| Modal | `components/product-modal/` |
| Carrito | `components/cart/` |
| Header mobile | `components/mobile-header/` |
| Títulos | `components/section-heading/` |
| Normalización | `features/content-normalizer/` |
| Imágenes | `features/image-preloader/` |
| Compatibilidad legacy | `mutations/` |

## Estado y lifecycle

`window.SCOverride` es el namespace compartido. Los guards `__sc*Booted` son de vida de página.

Persistencia permitida:

- `scTheme:v1`: `system | light | dark`;
- `scCatalogView:v3`: `compact | list`.

`normal` es sólo un valor legacy que se normaliza a `compact`.

Todo listener, observer, timer, RAF, tween o nodo generado debe tener owner, guard contra duplicación y cleanup/reparación cuando corresponda.

## Motion

Motion es progressive enhancement y se ejecuta exclusivamente con el motor local del proyecto, sin dependencias de animación externas.

- `whenLoaded`: el motor local está disponible.
- `whenReady`: el motor local está disponible y el gate de layout inicial fue liberado.
- `SC.motion.reduced()`: fuente compartida para reduced motion.
- `MotionHandle` define cancelación/finalización uniforme para RAFs, delays y propiedades interpoladas.
- SVG paths se interpolan con sampling y alineación de puntos implementados en el repo; los iconos basados en rectángulos interpolan sus atributos nativos.
- Cada componente cancela sus handles antes de retargetear o desmontar.

## Responsive

La arquitectura es desktop-first por ownership: comportamiento compartido en base; breakpoints sólo divergen cuando existe una superficie o interacción realmente distinta.

Vistas de catálogo válidas:

- `compact`
- `list`

Densidad:

- desktop: 4 columnas;
- tablet: 3 columnas;
- phone: 2 columnas.

La búsqueda es layout-neutral y `data-sc-catalog-view` es la única fuente de verdad de la vista.

## Compatibilidad legacy

`_js_dev/main.js`, `js/`, `_js_dev/`, el DOM heredado, jQuery/SlickNav y selectores existentes son una frontera de compatibilidad. No se migran ni se editan dentro de este refactor.

`mutations/` aísla adaptaciones necesarias sin modificar esa frontera.

## Cómo extender

1. Agregar comportamiento en TypeScript, nunca como nuevo source `.js`.
2. Registrar el módulo en `runtime-main.ts` y, cuando corresponda al contrato estático, en `main.ts`.
3. Agregar CSS desde `main.css` respetando ownership/cascade.
4. Registrar templates en `templates/registry.ts`.
5. Mantener idempotencia y cleanup de mecanismos activos.
6. Ejecutar `npm run typecheck` y `npm run validate` antes de publicar.

## Debugging

- Bootstrap: `main.ts` / `runtime-main.ts`.
- Categorías: `components/category-nav/category-nav.ts` y auxiliares `.ts`.
- Búsqueda/filtros: `components/catalog-tools/search.ts`.
- Modal: `view.ts`, `a11y.ts`, `motion.ts`.
- Lifecycle: `core/render-lifecycle.ts`.

Para inspeccionar el navegador se verá el `.js` generado correspondiente, pero cualquier corrección debe hacerse sobre el `.ts` fuente.

## Invariantes

- No versionar source `.js` bajo `override/`.
- No usar `@ts-ignore`, `@ts-nocheck` ni `any` como escape de migración.
- No duplicar listeners/observers/timers/nodos al reinicializar.
- No introducir dependencias del host de GitHub Pages en producción.
- No reintroducir una tercera vista de catálogo.
- No introducir dependencias externas de animación; el runtime de motion debe seguir siendo propiedad del repositorio.

## Validación

Desde la raíz:

```bash
npm ci
npm run typecheck
npm run validate
```

`npm run validate` compila browser/tooling y ejecuta `validate-source-boundary`, `validate-overrides`, `validate-production-boundary` y `validate-responsive-contract`. La frontera de source rechaza `.js`, `.mjs`, `.py`, `.sh` y `requirements.txt` propios fuera de `js/` y `_js_dev/`, y bloquea la reintroducción del stack de animación externo retirado.
