(function(){
'use strict';
/* Configuración compartida del runtime: breakpoints, selectores y motion.
   Centralizar estos contratos evita que cada componente duplique valores o detecciones. */
var SC=window.SCOverride=window.SCOverride||{},config=SC.config=SC.config||{};
function merged<T extends object>(defaults:T,current:Partial<T>|null|undefined):T{return Object.assign({},defaults,current||{});}

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
var mediaNames:Array<keyof SCMediaConfig>=['phone','mobile','tablet','compact','compactWide','desktop','reducedMotion','reducedTransparency','moreContrast','forcedColors'];
mediaNames.forEach(function(name:keyof SCMediaConfig){
  var queries=config.queries as Partial<SCQueries>;
  if(!queries[name])queries[name]=window.matchMedia(config.media[name]);
});

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
var defaultEasings={out:'cubic.out',strongOut:'quart.out',in:'cubic.in',inOut:'cubic.inOut'};
config.motion=merged({geometryRefreshDelay:180,easings:defaultEasings},config.motion);
config.motion.easings=merged(defaultEasings,config.motion.easings);
})();
