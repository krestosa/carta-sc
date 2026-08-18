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
/* Application-level GSAP dependency manifest. These files are loaded eagerly
   by motion/main.js and registered before interactive override modules mount. */
config.urls=merged({
  gsap:GSAP_DIST+'gsap.min.js',
  flip:GSAP_DIST+'Flip.min.js',
  morphSVG:GSAP_DIST+'MorphSVGPlugin.min.js',
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
  staticInitialSection:'sc-static-initial-section'
},config.classes);

/* Runtime settings genuinely shared across modules. */
config.motion=merged({geometryRefreshDelay:180},config.motion);
config.motion.easings=merged({out:'power2.out',strongOut:'power3.out',in:'power2.in',inOut:'power2.inOut'},config.motion.easings);
})();