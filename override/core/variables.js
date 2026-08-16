(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{},config=SC.config=SC.config||{},GSAP_VERSION='3.15.0',GSAP_DIST='https://cdn.jsdelivr.net/npm/gsap@'+GSAP_VERSION+'/dist/';
function merged(defaults,current){return Object.assign({},defaults,current||{});}

config.media=merged({
  phone:'(max-width: 640px)',
  mobile:'(max-width: 767px)',
  tablet:'(min-width: 768px) and (max-width: 992px)',
  compact:'(max-width: 992px)',
  compactWide:'(min-width: 641px) and (max-width: 992px)',
  desktop:'(min-width: 993px)',
  reducedMotion:'(prefers-reduced-motion: reduce)'
},config.media);
config.queries=config.queries||{};
['phone','mobile','tablet','compact','compactWide','desktop','reducedMotion'].forEach(function(name){
  if(!config.queries[name])config.queries[name]=window.matchMedia(config.media[name]);
});
/* Application-level external dependencies. Icon transitions are native and do not require MorphSVG. */
config.urls=merged({
  gsap:GSAP_DIST+'gsap.min.js',
  scrollTrigger:GSAP_DIST+'ScrollTrigger.min.js',
  splitText:GSAP_DIST+'SplitText.min.js'
},config.urls);

/* Selectors shared across distinct runtime features. */
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

config.classes=merged({
  catalogLayoutReady:'sc-catalog-layout-ready',
  catalogSearching:'sc-catalog-searching',
  staticInitialCard:'sc-static-initial-card',
  staticInitialSection:'sc-static-initial-section'
},config.classes);

/* Runtime settings genuinely shared across modules. */
config.motion=merged({geometryRefreshDelay:180},config.motion);
config.motion.easings=merged({out:'power2.out',strongOut:'power3.out',in:'power2.in',inOut:'power2.inOut'},config.motion.easings);
})();
