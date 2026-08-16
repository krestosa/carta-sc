(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{},U=SC.utils;
if(window.__scDeferredRuntimeBooted)return;window.__scDeferredRuntimeBooted=true;
var version=window.__scCatalogAssetVersion||'unversioned',base='override/',started=false,readyPromise=null;
function asset(path){return base+path+'?v='+version;}
function loadScript(path,id){return new Promise(function(resolve,reject){var existing=id&&document.getElementById(id);if(existing){if(existing.dataset.loaded==='true')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}var script=document.createElement('script');if(id)script.id=id;script.src=asset(path);script.async=false;script.onload=function(){script.dataset.loaded='true';resolve();};script.onerror=reject;document.head.appendChild(script);});}
function loadAll(items){return Promise.all(items.map(function(item){return loadScript(item[0],item[1]);}));}
function loadStages(stages){return stages.reduce(function(chain,stage){return chain.then(function(){return loadAll(stage);});},Promise.resolve());}
var beforeTemplates=[
  [
    ['features/image-preloader/image-preloader.js','sc-image-preloader-js'],
    ['templates/registry.js','sc-override-template-registry-js']
  ],
  [
    ['motion/global-ui.js','sc-global-ui-motion-js'],
    ['mutations/dom-normalization.js','sc-override-dom-normalization-js'],
    ['mutations/history.js','sc-override-history-js'],
    ['mutations/legacy-category-hover.js','sc-override-category-hover-js'],
    ['components/category-nav/core.js','sc-category-nav-core-js'],
    ['features/content-normalizer/rules.js','sc-content-normalizer-rules-js'],
    ['components/product-card/data.js','sc-product-card-data-js'],
    ['components/product-card/reveal-motion.js','sc-product-card-reveal-motion-js'],
    ['components/product-modal/view.js','sc-product-modal-view-js'],
    ['components/product-modal/a11y.js','sc-product-modal-a11y-js'],
    ['components/product-modal/motion.js','sc-product-modal-motion-js'],
    ['components/mobile-header/mobile-header.js','sc-override-mobile-header-js'],
    ['components/cart/list-motion.js','sc-cart-list-motion-js'],
    ['components/cart/scroll-motion.js','sc-cart-scroll-motion-js'],
    ['components/cart/badge-motion.js','sc-cart-badge-motion-js']
  ]
];
var afterTemplates=[
  [
    ['features/content-normalizer/dom.js','sc-content-normalizer-dom-js'],
    ['components/category-nav/layout.js','sc-category-nav-layout-js'],
    ['components/category-nav/rail-controls.js','sc-category-nav-rail-controls-js'],
    ['components/category-nav/rail-position.js','sc-category-nav-rail-position-js'],
    ['components/category-nav/sticky-state.js','sc-category-nav-sticky-state-js'],
    ['components/category-nav/indicator.js','sc-category-nav-indicator-js'],
    ['components/catalog-tools/search.js','sc-catalog-tools-search-js'],
    ['components/catalog-tools/theme.js','sc-catalog-tools-theme-js'],
    ['components/catalog-tools/view.js','sc-catalog-tools-view-js'],
    ['components/product-card/a11y.js','sc-product-card-a11y-js'],
    ['components/product-card/content.js','sc-product-card-content-js'],
    ['components/product-card/motion.js','sc-product-card-motion-js'],
    ['components/cart/cart.js','sc-override-cart-js']
  ],
  [
    ['features/content-normalizer/observer.js','sc-content-normalizer-observer-js'],
    ['features/content-normalizer/content-normalizer.js','sc-override-content-normalizer-js'],
    ['components/category-nav/rail.js','sc-category-nav-rail-js'],
    ['components/category-nav/active-state.js','sc-category-nav-active-state-js'],
    ['components/category-nav/scroll-spy.js','sc-category-nav-scroll-spy-js'],
    ['components/category-nav/motion.js','sc-category-nav-motion-js']
  ],
  [
    ['components/category-nav/category-nav.js','sc-override-category-nav-js'],
    ['components/product-card/product-card.js','sc-override-product-card-js'],
    ['components/product-modal/product-modal.js','sc-override-product-modal-js'],
    ['components/catalog-tools/catalog-tools.js','sc-catalog-tools-js']
  ]
];
function run(){
  if(started)return readyPromise;started=true;
  readyPromise=loadStages(beforeTemplates).then(function(){var templates=SC.templates;if(!templates||typeof templates.ready!=='function')throw new Error('[SushiClub override] Template registry unavailable');return templates.ready();}).then(function(){return loadStages(afterTemplates);}).catch(function(error){if(window.console&&console.error)console.error('[SushiClub override] Error cargando runtime diferido',error);throw error;});
  return readyPromise;
}
function schedule(){
  function afterReady(){requestAnimationFrame(function(){requestAnimationFrame(run);});}
  if(U&&typeof U.ready==='function')U.ready(afterReady);else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',afterReady,{once:true});else afterReady();
}
SC.deferredRuntime={start:run,ready:function(){return readyPromise||Promise.resolve();}};
schedule();
})();
