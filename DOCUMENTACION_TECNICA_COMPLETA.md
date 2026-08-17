# Documentación técnica — carta-sc

> Fuente de verdad para la separación entre el frontend entregable y el laboratorio de réplica. El código prevalece sobre este documento si alguna descripción queda desactualizada.

## 1. Alcance real del repositorio

El trabajo propio que puede entregarse para integración en producción vive en:

`override/`

Su responsabilidad es exclusivamente frontend: estilos, layout, markup de componentes, comportamiento UI, accesibilidad, observers/listeners de interfaz, normalización visual/editorial, animaciones y optimizaciones de rendering causadas por esta capa.

El backend real, HTML generado por servidor, endpoints, infraestructura, headers, CDN, cache, compresión, publicación de assets y deployment pertenecen a Sistemas.

La réplica de GitHub Pages no define el contrato de producción.

## 2. Superficies del repositorio

```text
.
├── override/                              # frontend entregable
├── scripts/
│   ├── validate-overrides.mjs             # valida override/ sin depender del snapshot
│   ├── validate-production-boundary.mjs   # bloquea dependencias hacia el lab
│   └── validate-responsive-contract.mjs   # bloquea divergencia entre breakpoints
├── lab/pages/                             # laboratorio de réplica/Lighthouse
├── .github/workflows/
│   └── lab-pages-replica.yml              # entrypoint obligatorio de GitHub Actions
├── index.html                             # snapshot/fixture de integración
├── _css_dev/                              # assets legacy del snapshot
├── _js_dev/                               # runtime legacy/dev del snapshot
├── css/                                   # CSS legacy del snapshot
├── js/                                    # JS legacy del snapshot
└── DOCUMENTACION_TECNICA_COMPLETA.md
```

Los archivos legacy de raíz son una fixture de compatibilidad para reproducir la carta y probar `override/`. No son backend fuente ni forman parte del paquete UX entregable.

## 3. Contrato de `override/`

`override/` debe seguir siendo funcional conceptualmente aunque desaparezcan `lab/`, `.github/`, `.pages-site` y cualquier optimización específica de GitHub Pages.

Puede contener:

- CSS y design tokens;
- layout responsive;
- templates HTML de componentes;
- JavaScript frontend;
- búsqueda/vistas de catálogo;
- modal y navegación de categorías;
- accesibilidad frontend;
- theme;
- motion;
- normalización de contenido;
- gestión visual de imágenes;
- correcciones de reflow/repaint/CLS cuya causa esté dentro del frontend propio.

No puede contener:

- ramas por hostname de GitHub Pages;
- reescrituras de HTML del servidor;
- transforms de `.pages-site`;
- generación de WebP/srcset para simular infraestructura;
- cache/CDN/headers;
- políticas de GTM/reCAPTCHA propias del benchmark;
- media crítica generada por CI;
- clases o lifecycle exclusivos del prepaint del laboratorio.

### Validación

```bash
node scripts/validate-overrides.mjs
node scripts/validate-production-boundary.mjs
node scripts/validate-responsive-contract.mjs
```

`validate-overrides.mjs` valida la unidad frontend sin requerir `index.html` ni `_js_dev/main.js`.

`validate-production-boundary.mjs` bloquea dependencias accidentales hacia el laboratorio, incluidos hosts, paths, data attributes y estados de prepaint específicos de Pages.

`validate-responsive-contract.mjs` impide volver a crear implementaciones paralelas por breakpoint para comportamiento que debe heredarse.

## 4. Contrato responsive

La regla de ownership es **desktop-first**: desktop define la estructura y el comportamiento compartidos. Tablet y phone heredan ese contrato y sólo sobrescriben lo que de verdad depende del viewport.

Esto no significa que desktop deba verse igual que mobile. Significa que un fix funcional común no puede existir sólo dentro de un `@media` móvil ni tener una implementación desktop paralela.

### Vistas de catálogo

Hay exactamente dos vistas seleccionables en todos los breakpoints:

1. `compact`: grilla de alta densidad;
2. `list`: lista.

El antiguo modo `normal`/baja densidad ya no es seleccionable. Si aparece desde `localStorage` o una preferencia legacy, se migra a `compact`.

La densidad se adapta exclusivamente mediante columnas/tokens:

- desktop: 4 columnas;
- tablet: 3 columnas;
- phone: 2 columnas.

`override/components/catalog-tools/view.js`, `override/main.js` y la fixture `_js_dev/main.js` usan el mismo contrato `compact | list`. `_js_dev/main.js` sigue siendo sólo fixture de desarrollo y no forma parte del handoff.

### Lista canónica

La estructura de lista tiene un único owner:

`override/components/catalog-tools/view-stability.css`

Su anatomía es la misma en desktop, tablet y phone:

```text
┌──────────── media ────────────┬──────────── contenido ────────────┐
│                               │ título                            │
│                               │ precio + precio anterior + traits │
│                               │ espacio flexible                  │
│                               │ descripción                       │
└───────────────────────────────┴───────────────────────────────────┘
```

Los breakpoints sólo cambian tokens de tamaño:

- desktop: imagen de lista 210 px, gap 18 px;
- tablet: imagen 160 px, gap 14 px;
- phone: imagen 150 px, gap 12 px.

El fitting de producto sigue siendo `object-fit: contain` en todos los breakpoints. No existe una variante desktop con crop `cover`.

Los resultados de búsqueda reutilizan esta misma geometría de lista; no mantienen una segunda grilla paralela.

### Ownership de tools y densidad

`override/components/catalog-tools/catalog-tools.css` es dueño de:

- buscador;
- acciones de vista/theme;
- quick filters/traits;
- grilla de alta densidad;
- adaptación responsive del módulo de tools.

No puede contener selectores estructurales de `data-sc-catalog-view='list'`. Esto evita que una lista desktop/tablet/mobile compita por especificidad con el owner canónico.

### Reglas compartidas promovidas a base

Los siguientes comportamientos se sacaron de ramas desktop/mobile duplicadas y ahora se heredan:

- estructura de product card;
- estructura y fitting de imagen de producto;
- título y descripción de card;
- pricing y orden `precio -> precio anterior -> traits` en densidad/lista;
- headings de sección;
- contenedor y grid del catálogo;
- normalización editorial de títulos/descripciones;
- motion base del modal.

### Excepciones breakpoint-specific válidas

Se mantienen ramas responsive cuando existe una diferencia real, por ejemplo:

- `components/mobile-header/`: el header mobile es una superficie propia;
- category-nav desktop/mobile cuando operan sobre DOM legacy diferente;
- dimensiones/padding/footer del modal en pantallas pequeñas;
- cantidad de columnas;
- anchos de imagen y gaps;
- tamaños tipográficos;
- touch targets;
- offsets de motion dependientes del espacio disponible.

No constituyen por sí solos una razón válida para bifurcar: pricing, traits, normalización editorial, fitting de imágenes, estructura de cards, estructura de lista o motion base compartido.

## 5. Ownership interno de `override/`

- `core/`: configuración compartida, utilities, theme, a11y y lifecycle frontend.
- `templates/`: registry de templates editables.
- `motion/`: infraestructura y efectos de motion.
- `mutations/`: adaptaciones controladas al DOM/runtime legacy.
- `features/catalog/`: comportamiento/layout transversal del catálogo.
- `features/content-normalizer/`: normalización incremental de contenido.
- `features/image-preloader/`: estados y prioridades de imágenes desde frontend.
- `components/category-nav/`: toolbar, rail, sticky state, indicador y scroll spy.
- `components/product-card/`: cards, pricing, traits, contenido y accesibilidad.
- `components/product-modal/`: modal, foco, contenido y controles.
- `components/catalog-tools/`: búsqueda, densidad/lista y theme.
- `components/cart/`: comportamiento visual del carrito.
- `components/mobile-header/`: adaptación responsive del header.
- `components/section-heading/`: headings y motion.

El markup fijo nuevo pertenece a archivos `.html` del componente. Los módulos no deben duplicar listeners/observers/timers al reinicializar.

## 6. Snapshot de integración

`index.html`, `_css_dev/`, `_js_dev/`, `css/` y `js/` representan la superficie legacy contra la que se desarrolla el override.

Su función es:

- conservar selectores y estructura de integración;
- permitir reproducir la UI fuera del backend real;
- detectar incompatibilidades con el DOM existente;
- alimentar el laboratorio estático.

No deben interpretarse como una reimplementación del backend ni como archivos que Sistemas deba sustituir por los del repositorio.

La fixture `_js_dev/main.js` replica el contrato de vistas `compact | list` para evitar estados inconsistentes al desarrollar localmente, pero continúa fuera del paquete frontend entregable.

## 7. Laboratorio `lab/pages/`

`lab/pages/` existe únicamente para construir la réplica estática publicada en GitHub Pages y medirla con Lighthouse/PageSpeed.

Contiene:

```text
lab/pages/
├── README.md
├── build.sh
├── requirements.txt
├── .nojekyll
├── assets/
│   ├── prepaint.css
│   └── performance.css
└── scripts/
    ├── apply-lab-overrides.py
    ├── validate-snapshot-override-integration.mjs
    ├── compile-pages-templates.py
    ├── prepare-pages-artifact.py
    ├── optimize-pages-*.py
    ├── bundle-pages-*.py
    └── validate-pages-*.py
```

El workflow se mantiene en `.github/workflows/lab-pages-replica.yml` porque GitHub Actions exige esa ubicación. Su contenido pertenece conceptualmente al laboratorio.

### Flujo

1. valida `override/` como frontend independiente;
2. valida el límite production/lab;
3. valida el contrato responsive desktop-first;
4. valida la integración snapshot/override sólo para el laboratorio;
5. copia la fixture a `.pages-site`;
6. `apply-lab-overrides.py` inyecta CSS y lifecycle de first paint únicamente en staging;
7. compila templates y bundles para la réplica;
8. aplica transforms de delivery/media específicos del benchmark;
9. valida el artifact;
10. publica el artifact de laboratorio en GitHub Pages.

`.pages-site/` es output desechable y nunca es source de producción.

## 8. Regla para hallazgos de Lighthouse

Un hallazgo de Lighthouse puede modificar `override/` sólo si:

1. la causa raíz está dentro de `override/`;
2. el arreglo es correcto para cualquier servidor/integración real;
3. no depende de GitHub Pages ni de `.pages-site`;
4. mejora comportamiento frontend real sin alterar funcionalidad o layout esperado.

Ejemplos que sí pueden promoverse:

- forced reflow causado por un componente;
- listeners duplicados;
- animación costosa;
- CSS que genera layout shift;
- observer/scheduler ineficiente;
- dimensiones o layout que son propiedad directa del componente propio.

Ejemplos que deben quedar en el lab o convertirse en requerimiento para Sistemas:

- conversión de PNG/JPG a WebP/AVIF;
- `srcset` generado por CI;
- cache headers;
- CDN;
- Brotli/Gzip;
- preload emitido por el backend;
- server-side bundling;
- GTM/reCAPTCHA delivery policy;
- CSP/HSTS/COOP y demás headers;
- cambios en endpoints o HTML generado por servidor.

## 9. First-paint de Pages

Las reglas `sc-catalog-prepaint`, `sc-banner-media-ready`, `sc-mobile-logo-ready` y los assets `prepaint.css` / `performance.css` son del laboratorio.

No existen como dependencia dentro del source de producción. Durante el build del lab, `apply-lab-overrides.py` los incorpora únicamente a la copia `.pages-site` y amplía temporalmente `render-lifecycle.js` antes de bundlearla.

El lab ya no reinyecta geometrías de card/lista específicas de desktop/mobile: utiliza el mismo contrato responsive de `override/` y sólo añade sus optimizaciones de first paint sobre staging.

## 10. Handoff a Sistemas

El handoff debe diferenciar dos categorías:

**Frontend entregable:** cambios bajo `override/` y los requisitos mínimos para cargar esos assets/templates en el sitio real.

**Recomendaciones de infraestructura:** hallazgos observados en el benchmark que Sistemas debe implementar o evaluar en su propia capa: formatos de imagen, caching, headers, CDN, compresión, server bundles, prioridades de recursos y terceros.

Nunca presentar un transform de `lab/pages/` como requisito para que `override/` funcione.

## 11. Documentación histórica

La documentación anterior mezclaba el artifact de GitHub Pages con “producción”. Se conserva únicamente como referencia histórica a través del historial Git; `lab/pages/DOCUMENTACION_TECNICA_LAB_LEGACY.md` apunta al último commit anterior a esta limpieza.

Para el estado vigente:

- contrato frontend: este documento y `override/README.md`;
- laboratorio: `lab/pages/README.md`;
- comportamiento efectivo: código y validadores del SHA actual.
