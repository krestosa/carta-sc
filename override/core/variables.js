(function(){
'use strict';
/* Configuración compartida del runtime: breakpoints, selectores y dependencias de motion.
   Centralizar estos contratos evita que cada componente duplique valores o detecciones. */
var SC=window.SCOverride=window.SCOverride||{},config=SC.config=SC.config||{},GSAP_VERSION='3.15.0',GSAP_DIST='https://cdn.jsdelivr.net/npm/gsap@'+GSAP_VERSION+'/dist/';
function merged(defaults,current){return Object.assign({},defaults,current||{});}
config.media=merged({phone:'(max-width: 640px)',mobile:'(max-width: 767px)',tablet:'(min-width: 768px) and (max-width: 992px)',compact:'(max-width: 992px)',compactWide:'(min-width: 641px) and (max-width: 992px)',desktop:'(min-width: 993px)',reducedMotion:'(prefers-reduced-motion: reduce)',reducedTransparency:'(prefers-reduced-transparency: reduce)',moreContrast:'(prefers-contrast: more)',forcedColors:'(forced-colors: active)'},config.media);
config.queries=config.queries||{};['phone','mobile','tablet','compact','compactWide','desktop','reducedMotion','reducedTransparency','moreContrast','forcedColors'].forEach(function(name){if(!config.queries[name])config.queries[name]=window.matchMedia(config.media[name]);});
config.urls=merged({gsap:GSAP_DIST+'gsap.min.js',morphSVG:GSAP_DIST+'MorphSVGPlugin.min.js',scrollTrigger:GSAP_DIST+'ScrollTrigger.min.js',splitText:GSAP_DIST+'SplitText.min.js'},config.urls);
config.selectors=merged({container:'.containerShop',productList:'.listadoShop',productCard:'.productoShop',productCards:'.listadoShop .productoShop',productLink:'a.fancyboxModalAddProd',productTitle:'.title-shop1',productDescription:'.descrip',productTraits:'.sabores',sectionTitle:'.titleShopSeccion',sectionSubtitle:'.subTitleShopSeccion',categoryToolbar:'.sc-catalog-toolbar',legacyPullDownOpen:'.topPullDown.open',legacyMobileOpen:'.topShopMenuMobile._open'},config.selectors);
config.classes=merged({catalogLayoutReady:'sc-catalog-layout-ready',catalogSearching:'sc-catalog-searching',staticInitialSection:'sc-static-initial-section'},config.classes);
config.motion=merged({geometryRefreshDelay:180},config.motion);
config.motion.springs=merged({spatial:{fast:{damping:.9,stiffness:1400},default:{damping:.9,stiffness:700},slow:{damping:.9,stiffness:300}},effects:{fast:{damping:1,stiffness:3800},default:{damping:1,stiffness:1600},slow:{damping:1,stiffness:800}}},config.motion.springs);
config.motion.stagger=merged({fast:.012,default:.016,slow:.020,maxTotal:.12},config.motion.stagger);
config.motion.distance=merged({fast:28,slow:180},config.motion.distance);
config.motion.curves=merged({standard:'cubic-bezier(.2,0,0,1)',expand:'cubic-bezier(.3,0,0,1)',enter:'cubic-bezier(.05,.7,.1,1)',exit:'cubic-bezier(.3,0,.8,.15)',linear:'linear'},config.motion.curves);
})();