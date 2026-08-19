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

1. `_js_dev/main.js` carga la capa frontend de desarrollo y fija tema/vista antes del primer paint cuando es posible.
2. `override/main.css` mantiene el manifest plano de estilos propiedad de componentes/features.
3. `override/main.js` confirma el tema y carga exclusivamente `runtime-main.js`. Su manifest de rutas es un contrato de validación estática; no define el orden de ejecución.
4. `runtime-main.js` es el owner del orden de carga. Cada grupo se resuelve en paralelo y los grupos avanzan en secuencia: foundation → features → templates → integrations.
5. `motion/main.js` inicia la descarga de GSAP/MorphSVG/ScrollTrigger/SplitText sin bloquear la carga de módulos funcionales locales.
6. `templates/registry.js` resuelve los templates HTML propiedad de cada componente antes de montar coordinadores que los consumen.
7. `SC.motion.prepare()` espera dependencias de motion; después `core/render-lifecycle.js` captura el viewport inicial, se desbloquea motion, se libera el prepaint y se espera layout estable.
8. El refresh final de motion ocurre después de esa estabilización.

No cambiar el orden entre etapas sin demostrar qué dependencia deja de existir o qué invariant requiere el cambio.

## Ownership runtime

| Área | Owner principal | Responsabilidad |
| --- | --- | --- |
| Bootstrap | `main.js`, `runtime-main.js` | Tema/vista tempranos, carga por etapas y desbloqueo final. |
| Configuración | `core/variables.js` | Selectores, media queries, URLs y tokens JS compartidos. |
| Persistencia | `core/storage-policy.js` | Permite sólo estado de tema/vista y purga claves legacy del catálogo. |
| Estabilidad inicial | `core/render-lifecycle.js` | Viewport inicial y espera de layout estable. |
| Templates | `templates/registry.js` | Carga/clonado de markup propio de componentes. |
| Motion base | `motion/main.js` | Dependencias GSAP, gates `whenLoaded`/`whenReady`, refresh y microinteracciones. |
| Categorías | `components/category-nav/` | Relocalización del rail legacy, sticky, scroll-spy, indicador y navegación programática. |
| Herramientas de catálogo | `components/catalog-tools/` | Búsqueda, filtros, vista y tema; `catalog-tools.js` coordina montaje/reparación. |
| Tarjetas | `components/product-card/` | Datos derivados, contenido, a11y, medición y motion de cards. |
| Modal de producto | `components/product-modal/` | Construcción, foco, aislamiento del fondo y transiciones interrumpibles. |
| Carrito | `components/cart/` | Motion de filas, scroll y badge. |
| Header mobile | `components/mobile-header/` | Compatibilidad con SlickNav, ARIA y reparación del menú legacy. |
| Títulos de sección | `components/section-heading/` | SplitText y reveal forward-only de headings. |
| Normalización editorial | `features/content-normalizer/` | Texto/markup editorial incremental y observación de mutaciones. |
| Imágenes | `features/image-preloader/` | Prioridades, estados visuales, lotes y observación de imágenes. |
| Compatibilidad legacy | `mutations/` | Adaptaciones puntuales al DOM, history y handlers heredados. |

Los archivos auxiliares dentro de un componente no son servicios globales: su API existe para el coordinador de ese dominio. Evitar moverlos a `core/` sólo para reutilizar una función pequeña.

## Estado y persistencia

`window.SCOverride` es el namespace compartido de la capa. Cada dominio publica ahí únicamente la API que necesitan módulos cargados después. Los guards `__sc*Booted` son de vida de página y evitan reinstalar un archivo ya evaluado.

Estado persistente permitido:

- `scTheme:v1`: `system | light | dark`;
- `scCatalogView:v3`: `compact | list`.

`normal` sólo existe como valor legacy de migración y se normaliza a `compact`. Búsqueda, filtros, categoría activa, scroll y estado de animación viven en memoria/DOM y no deben persistirse.

`data-sc-theme`, `data-sc-theme-resolved` y `data-sc-catalog-view` son contratos de documento. No crear una segunda fuente de verdad para esos estados.

## Lifecycle y DOM dinámico

Hay dos lifetimes deliberados:

- **page lifetime**: infraestructura cargada una sola vez, como storage policy, history y motion core;
- **component lifetime**: coordinadores con `init`/`destroy` o `install`/cleanup, capaces de evitar listeners, observers, RAFs y timers duplicados.

Cuando el DOM legacy puede reemplazar una superficie, el owner debe reparar referencias en vez de conservar nodos desconectados. `category-nav` y `catalog-tools` observan cambios estructurales por ese motivo.

Regla para cualquier mecanismo activo —listener, observer, timer, RAF, tween o nodo generado—: debe ser evidente quién lo crea, qué guard impide duplicarlo y cómo deja de ejecutar trabajo cuando su owner se desmonta o reemplaza.

## Motion

Motion es progressive enhancement. La UI funcional no puede depender de que GSAP cargue correctamente.

- `whenLoaded`: usar cuando un módulo necesita las dependencias cargadas pero todavía no requiere el gate de layout inicial.
- `whenReady`: usar cuando el efecto sólo debe activarse después del unlock global.
- `SC.motion.reduced()` es la fuente compartida para `prefers-reduced-motion`.
- Cada componente es dueño de sus tweens/timelines y debe cancelarlos antes de retargetear o desmontar.
- ScrollTrigger no debe sustituir el estado funcional del componente; sólo deriva motion/posición visual.

La semántica de una animación incluye timing, easing, interrupción, reversión y continuidad. Llegar al mismo estado final no basta para considerar una refactorización equivalente.

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

La lista tiene un único owner estructural: `components/catalog-tools/view-stability.css`. Usa la misma anatomía de dos columnas en todos los breakpoints (`media | contenido`) y sólo varían tokens responsive.

La búsqueda es **layout-neutral**: filtra, oculta y reordena el catálogo montado, pero nunca cambia ni persiste la vista. Si el usuario está en `compact`, los resultados siguen en `compact`; si está en `list`, siguen en `list`. `data-sc-catalog-view` es la única fuente de verdad de geometría de vista.

`components/catalog-tools/catalog-tools.css` es dueño del buscador, controles, filtros y grilla de densidad; no puede definir una geometría paralela de lista.

Ejemplos válidos de diferencias específicas por breakpoint:

- `components/mobile-header/`, porque el header mobile es una superficie distinta;
- navegación de categorías cuando desktop/mobile operan sobre DOM legacy diferente;
- dimensiones/padding del modal en pantallas pequeñas;
- columnas, anchos de imagen, gaps, tipografía y touch targets;
- offsets de motion cuando responden al espacio disponible.

No son diferencias válidas por sí solas: pricing, orden de traits, normalización editorial, fitting de imágenes, estructura de cards, estructura de lista o motion base de un componente compartido.

## Responsabilidades por carpeta

- `core/`: configuración e infraestructura transversal pequeña: variables, storage policy, a11y, theme, utilities y lifecycle.
- `templates/`: registry de templates.
- `motion/`: infraestructura de motion y efectos globales; nunca puede convertirse en requisito para la funcionalidad base.
- `mutations/`: adaptaciones controladas al runtime/DOM legacy.
- `features/catalog/`: layout del catálogo compartido.
- `features/content-normalizer/`: normalización incremental de contenido.
- `features/image-preloader/`: coordinación frontend de estados/prioridades de imágenes.
- `components/category-nav/`: rail, sticky state, indicador, scroll-spy, controles e interacción.
- `components/product-card/`: tarjeta, precio, traits, accesibilidad y motion.
- `components/product-modal/`: modal, foco, contenido, controles y motion.
- `components/catalog-tools/`: búsqueda, vistas y theme.
- `components/cart/`: comportamiento visual del carrito.
- `components/mobile-header/`: adaptación del header mobile.
- `components/section-heading/`: títulos y motion.

## Dependencias y compatibilidad

El código fuera de `override/` es una frontera de compatibilidad. En particular:

- `_js_dev/main.js` define el bootstrap legacy y el estado de prepaint;
- el DOM de carta, categorías y header proviene del runtime heredado;
- jQuery/SlickNav y handlers legacy pueden existir antes de montar el override;
- clases, IDs, anchors y selectores heredados usados por `core/variables.js` son contratos de integración, no nombres internos libres para renombrar.

`mutations/` existe para aislar excepciones a esa frontera. Si una corrección sólo funciona modificando el legacy o el backend, no debe esconderse como una abstracción nueva dentro de `override/`.

## Cómo extender sin aumentar deuda

1. Elegir el dominio que ya posee la responsabilidad. Crear otro módulo sólo si existe una razón independiente de cambio.
2. Si se agrega JavaScript, ubicarlo en la etapa correcta de `runtime-main.js` y reflejar su ruta literal en `main.js` para los validadores estáticos.
3. Si se agrega CSS, importarlo una sola vez desde `main.css` respetando el orden de cascade existente.
4. Si se agrega markup fijo propio, crear/actualizar el template del componente y registrarlo en `templates/registry.js`; no construir strings HTML en el coordinador.
5. Definir ownership de listeners/observers/RAFs/timers/tweens en el mismo dominio que los crea.
6. Caracterizar primero cualquier comportamiento con timing, DOM legacy o persistencia antes de refactorizarlo.
7. Ejecutar los validadores del repo y revisar el diff por cambios de layout/motion no intencionales.

No crear `utils`, managers, registries o wrappers adicionales para un solo caller sin una reducción concreta de conocimiento duplicado o estado.

## Debugging

- **Falla el bootstrap**: empezar por `main.js` y `runtime-main.js`; el error del loader identifica si falló la carga de un módulo.
- **Motion no se activa**: revisar en `<html>` `sc-motion-dependencies-loading`, `sc-motion-dependencies-ready` o `sc-motion-dependencies-failed`, y después el owner del efecto.
- **UI duplicada tras una mutación**: comprobar primero el guard del módulo y el cleanup/reparación del coordinador; no agregar otro observer como parche.
- **Categoría activa/sticky/indicador**: `components/category-nav/category-nav.js` coordina; `active-state.js`, `scroll-spy.js`, `rail.js` e `indicator.js` contienen las responsabilidades específicas.
- **Vista incorrecta**: verificar `data-sc-catalog-view` y `scCatalogView:v3`; búsqueda no debe modificar ninguno de los dos.
- **Tema incorrecto**: verificar `data-sc-theme`, `data-sc-theme-resolved` y `scTheme:v1` antes de tocar la animación del icono.
- **Búsqueda/filtros**: `search.js` captura y restaura el DOM existente; si aparecen restos después de limpiar, investigar restauración antes de recrear cards.
- **Modal**: separar problemas de contenido (`view.js`), foco/aislamiento (`a11y.js`) y transición (`motion.js`).

## Decisiones no obvias

- `main.js` mantiene rutas literales adicionales porque los validadores verifican que todo JS entregable esté declarado. El orden real pertenece únicamente a `runtime-main.js`.
- `category-nav` mueve el nodo legacy entre superficies en lugar de clonarlo para conservar listeners/estado del runtime original y evitar dos owners funcionales.
- búsqueda y filtros ocultan/reordenan las cards existentes; no crean un catálogo paralelo.
- motion externo se carga de forma asíncrona y sólo se convierte en requisito para efectos visuales, nunca para la UI base.

Estas decisiones sólo deben cambiar con evidencia de que el nuevo diseño elimina una restricción real sin introducir otra fuente de estado o coordinación.

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
- Búsqueda no puede escribir ni inferir una vista distinta de `data-sc-catalog-view`.
- Las dependencias externas de animación no pueden bloquear el montaje de UI funcional.

## Validación

Desde la raíz del repo:

```bash
node scripts/validate-overrides.mjs
node scripts/validate-production-boundary.mjs
node scripts/validate-responsive-contract.mjs
```

`validate-responsive-contract.mjs` bloquea regresiones como una tercera vista, una lista desktop paralela, crop `cover` sólo en ciertos breakpoints o ramas estructurales desktop-only en componentes que deben heredarse.

El laboratorio de GitHub Pages ejecuta estas validaciones antes de construir su réplica, pero sus transforms posteriores no forman parte del contrato de producción.
