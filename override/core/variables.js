(function(){
'use strict';
/* Configuración compartida del runtime: breakpoints, selectores y dependencias de motion.
   Centralizar estos contratos evita que cada componente duplique valores o detecciones. */
var SC=window.SCOverride=window.SCOverride||{},config=SC.config=SC.config||{},GSAP_VERSION='3.15.0',GSAP_DIST='https://cdn.jsdelivr.net/npm/gsap@'+GSAP_VERSION+'/dist/';
function merged(defaults,current){return Object.assign({},defaults,current||{});}

/* Define media queries una sola vez y conserva instancias reutilizables de matchMedia. */
config.media=merged({
  phone:'(max-width: 640px)',
  mobile:'(max-width: 767px)',
  tablet:'(min-width: 768px) and (max-width: 992px)',
  compact:'(max-width: 992px)',
  compactWide:'(min-width: 641px) and (max-width: 992px)',
  desktop:'(min-width: 993px)',
  reducedMotion:'(prefers-reduced-motion: reduce)',
  reducedTransparency:'(prefers-reduced-transparency: reduce)',
  moreContrast:'(prefers-contrast: more)',
  forcedColors:'(forced-colors: active)'
},config.media);
config.queries=config.queries||{};
['phone','mobile','tablet','compact','compactWide','desktop','reducedMotion','reducedTransparency','moreContrast','forcedColors'].forEach(function(name){
  if(!config.queries[name])config.queries[name]=window.matchMedia(config.media[name]);
});

/* Manifiesto de GSAP usado por motion/main.js antes de montar módulos interactivos. */
config.urls=merged({
  gsap:GSAP_DIST+'gsap.min.js',
  morphSVG:GSAP_DIST+'MorphSVGPlugin.min.js',
  scrollTrigger:GSAP_DIST+'ScrollTrigger.min.js',
  splitText:GSAP_DIST+'SplitText.min.js'
},config.urls);

/* Selectores comunes para que los módulos apunten al mismo DOM y al mismo estado legacy. */
config.selectors=merged({
  container:'.containerShop',
  productList:'.listadoShop',
  productCard:'.productoShop',
  productCards:'.listadoShop .productoShop',
  productLink:'a.fancyboxModalAddProd',
  productTitle:'.title-shop1',
  productDescription:'.descrip',
  productTraits:'.sabores',
  sectionTitle:'.titleShopSeccion',
  sectionSubtitle:'.subTitleShopSeccion',
  categoryToolbar:'.sc-catalog-toolbar',
  legacyPullDownOpen:'.topPullDown.open',
  legacyMobileOpen:'.topShopMenuMobile._open'
},config.selectors);

/* Clases de estado compartidas entre layout, búsqueda y primer viewport. */
config.classes=merged({
  catalogLayoutReady:'sc-catalog-layout-ready',
  catalogSearching:'sc-catalog-searching',
  staticInitialSection:'sc-static-initial-section'
},config.classes);

/* Ajustes de motion realmente globales; cada componente conserva sus propios tiempos. */
config.motion=merged({geometryRefreshDelay:180},config.motion);
config.motion.easings=merged({out:'power2.out',strongOut:'power3.out',in:'power2.in',inOut:'power2.inOut'},config.motion.easings);
})();