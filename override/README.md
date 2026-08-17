# Override frontend architecture

`override/` es la capa frontend entregable. Su responsabilidad es UX: estilos, layout, componentes, interacción, accesibilidad, animación y compatibilidad con el DOM/runtime existente.

No debe depender de GitHub Pages ni de transformaciones ejecutadas por `lab/pages/`. Si el directorio `lab/` desaparece, `override/` debe seguir describiendo por sí solo la implementación frontend que se entrega a Sistemas.

## Límite de responsabilidad

Pertenece a `override/`:

- CSS y layout;
- markup propio de componentes mediante templates;
- JavaScript de comportamiento UI;
- accesibilidad frontend;
- observers/listeners necesarios para la interfaz;
- optimizaciones de reflow/repaint causadas por estos componentes;
- animaciones y su scheduling;
- adaptación compatible con el DOM legacy.

No pertenece a `override/`:

- reescritura del HTML generado por servidor;
- cache/CDN/headers;
- compresión o conversión de assets en CI;
- generación de `srcset` como sustituto de la infraestructura real;
- bundling específico de GitHub Pages;
- hacks para que la réplica estática simule endpoints/backend;
- GTM/reCAPTCHA/server delivery policy.

Esos experimentos viven en `lab/pages/` y, cuando correspondan al sitio real, deben convertirse en requerimientos para Sistemas.

## Source boot flow

1. `_js_dev/main.js` carga la capa frontend de desarrollo.
2. `override/main.css` mantiene un manifest plano de estilos propiedad de componentes/features.
3. `override/main.js` carga módulos JavaScript en orden de dependencia.
4. `templates/registry.js` expone templates HTML propiedad de cada componente.
5. Los módulos esperan sus dependencias antes de montar UI.
6. `core/render-lifecycle.js` coordina estabilidad inicial y desbloqueo de motion.

## Contrato responsive

La arquitectura responsive es **desktop-first por ownership**, no por tamaño visual: desktop define el contrato estructural compartido y tablet/phone heredan ese comportamiento salvo que exista una diferencia real del breakpoint.

Reglas:

- no duplicar una implementación funcional para desktop y otra para mobile;
- los breakpoints inferiores deben sobrescribir preferentemente tokens de ancho, columnas, gaps, tipografía, touch targets o geometría específica;
- un cambio de comportamiento compartido se implementa en la regla base y se hereda;
- sólo se admite una rama estructural cuando el breakpoint usa realmente otra superficie/DOM o necesita una interacción distinta.

El catálogo tiene exactamente dos vistas seleccionables:

- `compact`: grilla de alta densidad;
- `list`: lista.

`normal` queda únicamente como valor legacy de migración y se convierte inmediatamente a `compact`; no es una tercera vista.

Densidad por breakpoint:

- desktop: 4 columnas;
- tablet: 3 columnas;
- phone: 2 columnas.

La lista tiene un único owner estructural: `components/catalog-tools/view-stability.css`. Usa la misma anatomía de dos columnas en todos los breakpoints (`media | contenido`) y sólo varían tokens responsive. El buscador hereda esa misma geometría de lista.

`components/catalog-tools/catalog-tools.css` es dueño del buscador, controles, filtros y grilla de densidad; no puede definir una geometría paralela de lista.

Ejemplos válidos de diferencias específicas por breakpoint:

- `components/mobile-header/`, porque el header mobile es una superficie distinta;
- navegación de categorías cuando desktop/mobile operan sobre DOM legacy diferente;
- dimensiones/padding del modal en pantallas pequeñas;
- columnas, anchos de imagen, gaps, tipografía y touch targets;
- offsets de motion cuando responden al espacio disponible.

No son diferencias válidas por sí solas: pricing, orden de traits, normalización editorial, fitting de imágenes, estructura de cards, estructura de lista o motion base de un componente compartido.

## Responsabilidades por carpeta

- `core/`: configuración, utilities, theme, a11y, performance frontend y lifecycle.
- `templates/`: registry de templates.
- `motion/`: infraestructura de motion y efectos globales.
- `mutations/`: adaptaciones controladas al runtime/DOM legacy.
- `features/catalog/`: layout y comportamiento del catálogo.
- `features/content-normalizer/`: normalización incremental de contenido.
- `features/image-preloader/`: coordinación frontend de estados/prioridades de imágenes.
- `components/category-nav/`: rail, sticky state, indicador, scroll-spy y controles.
- `components/product-card/`: tarjeta, precio, traits, accesibilidad y motion.
- `components/product-modal/`: modal, foco, contenido, controles y motion.
- `components/catalog-tools/`: búsqueda, vistas y theme.
- `components/cart/`: comportamiento visual del carrito.
- `components/mobile-header/`: adaptación del header mobile.
- `components/section-heading/`: títulos y motion.

## Invariantes

- El markup fijo nuevo pertenece a `.html` bajo `override/`, no al snapshot legacy.
- Los lifecycle `init/start/destroy` deben ser idempotentes.
- No duplicar listeners, observers, timers o nodos al reinicializar.
- Browser Back/Forward conserva scroll restoration nativo.
- No usar internals privados de jQuery.
- No introducir una dependencia del host `krestosa.github.io` ni condicionar funcionalidad de producción al benchmark.
- Los hallazgos de Lighthouse sólo modifican `override/` cuando la causa raíz está en esta capa frontend.
- No reintroducir una tercera vista de catálogo.
- No crear implementaciones paralelas de lista por breakpoint.

## Validación

Desde la raíz del repo:

```bash
node scripts/validate-overrides.mjs
node scripts/validate-production-boundary.mjs
node scripts/validate-responsive-contract.mjs
```

`validate-responsive-contract.mjs` bloquea regresiones como una tercera vista, una lista desktop paralela, crop `cover` sólo en ciertos breakpoints o ramas estructurales desktop-only en componentes que deben heredarse.

El laboratorio de GitHub Pages ejecuta estas validaciones antes de construir su réplica, pero sus transforms posteriores no forman parte del contrato de producción.
