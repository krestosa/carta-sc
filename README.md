# carta-sc

Este repositorio tiene dos superficies deliberadamente separadas.

## Producción frontend

`override/` es la única capa de UX que debe considerarse entregable para integrar en producción. Contiene presentación, layout, componentes, comportamiento de interfaz y compatibilidad frontend.

La integración real no debe depender de GitHub Pages, de `.pages-site`, de reescrituras de HTML hechas por este repositorio, de conversión de imágenes durante CI ni de decisiones de cache/CDN/headers simuladas aquí.

El backend, HTML generado por servidor, infraestructura, headers, CDN, compresión, políticas de cache, publicación de assets y deployment pertenecen al equipo de Sistemas.

La validación de la capa entregable se ejecuta con:

```bash
node scripts/validate-overrides.mjs
```

## Laboratorio de réplica y Lighthouse

`lab/pages/` existe únicamente para construir `https://krestosa.github.io/carta-sc/` como réplica estática y permitir auditorías de Lighthouse/PageSpeed.

Nada dentro de `lab/pages/` es un requisito de producción. Sus transformaciones pueden simular optimizaciones que en el sitio real deberían resolverse por Sistemas.

Regla de promoción: un hallazgo del laboratorio sólo puede modificar `override/` cuando la causa está en código frontend propiedad de esta capa y el arreglo sigue siendo correcto sin depender de GitHub Pages. Ejemplos válidos: reflows causados por un componente, listeners duplicados, CSS inestable o una animación costosa. Ejemplos que deben permanecer en el laboratorio o convertirse en recomendación para Sistemas: `srcset` generado en CI, compresión/formatos de assets, headers, CDN, cache, bundles del backend o reescrituras del HTML servidor.

Ver `lab/pages/README.md` para el pipeline de benchmark.
