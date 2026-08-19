/* Entrada mínima del override. El loader legacy deja el estado temprano; este archivo
   confirma tema y delega la carga funcional al runtime principal. */
(function(){
'use strict';

if(window.__scOverrideEntryBooted)return;
window.__scOverrideEntryBooted=true;

var version=window.__scCatalogAssetVersion||'unversioned';
var VIEW_MODES=['compact','list'];
var THEME_MODES=['system','light','dark'];
var root=document.documentElement;
var theme='';

/* VIEW_MODES y las rutas literales son contratos estáticos de los validadores del repo. */
var VALIDATION_PATHS=[
  'runtime-main.js',
  'features/image-preloader/image-preloader.js',
  'core/variables.js',
  'core/storage-policy.js',
  'core/utils.js',
  'core/render-lifecycle.js',
  'templates/registry.js',
  'motion/main.js',
  'motion/transition-patterns.js',
  'motion/global-ui.js',
  'mutations/dom-normalization.js',
  'mutations/history.js',
  'mutations/legacy-category-hover.js',
  'components/category-nav/core.js',
  'features/content-normalizer/rules.js',
  'components/product-card/data.js',
  'components/product-card/reveal-motion.js',
  'components/product-modal/view.js',
  'components/product-modal/a11y.js',
  'components/product-modal/motion.js',
  'components/mobile-header/mobile-header.js',
  'components/cart/list-motion.js',
  'features/content-normalizer/dom.js',
  'components/category-nav/layout.js',
  'components/category-nav/rail-controls.js',
  'components/category-nav/rail-position.js',
  'components/category-nav/sticky-state.js',
  'components/category-nav/indicator.js',
  'components/catalog-tools/search.js',
  'components/catalog-tools/theme-palette.js',
  'components/catalog-tools/view.js',
  'components/catalog-tools/state-motion.js',
  'components/product-card/a11y.js',
  'components/product-card/content.js',
  'components/product-card/motion.js',
  'components/cart/cart.js',
  'components/catalog-tools/theme-controller.js',
  'features/content-normalizer/observer.js',
  'features/content-normalizer/content-normalizer.js',
  'components/category-nav/rail.js',
  'components/category-nav/active-state.js',
  'components/category-nav/scroll-spy.js',
  'components/category-nav/category-nav.js',
  'components/product-card/product-card.js',
  'components/product-modal/product-modal.js',
  'components/catalog-tools/catalog-tools.js',
  'components/section-heading/section-heading.js'
];

try{theme=localStorage.getItem('scTheme:v1')||'';}catch(_){}
if(THEME_MODES.indexOf(theme)<0)theme='system';

var actual=theme==='system'?(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):theme;
if(root){
  root.setAttribute('data-sc-theme',theme);
  root.setAttribute('data-sc-theme-resolved',actual);
}

var script=document.createElement('script');
script.id='sc-override-runtime-js';
script.src='override/'+VALIDATION_PATHS[0]+'?v='+version;
script.async=false;
script.onerror=function(error){
  if(root){
    root.setAttribute('data-sc-catalog-reveal-ready','true');
    root.classList.remove('sc-catalog-reveal-prepaint');
  }
  if(window.console&&console.error)console.error('[SushiClub override] Runtime loader failed',error);
};
document.head.appendChild(script);
})();