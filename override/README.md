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
- `components/catalog-tools/`: búsqueda, vista y theme.
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

## Validación

Desde la raíz del repo:

```bash
node scripts/validate-overrides.mjs
```

El laboratorio de GitHub Pages ejecuta esta misma validación antes de construir su réplica, pero sus transforms posteriores no forman parte del contrato de producción.
