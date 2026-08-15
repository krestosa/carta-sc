(function(){
'use strict';
if(window.__scOverrideMainBooted)return;window.__scOverrideMainBooted=true;
var version=window.__scCatalogAssetVersion||'unversioned';
var base='override/';
function asset(path){return base+path+'?v='+version;}
function loadScript(path,id){return new Promise(function(resolve,reject){var existing=id&&document.getElementById(id);if(existing){if(existing.dataset.loaded==='true')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}var script=document.createElement('script');if(id)script.id=id;script.src=asset(path);script.async=false;script.onload=function(){script.dataset.loaded='true';resolve();};script.onerror=reject;document.head.appendChild(script);});}
function loadAll(items){return Promise.all(items.map(function(item){return loadScript(item[0],item[1]);}));}
function loadStages(stages){return stages.reduce(function(chain,stage){return chain.then(function(){return loadAll(stage);});},Promise.resolve());}
loadStages([
  [
    ['core/variables.js','sc-override-variables-js'],
    ['core/utils.js','sc-override-utils-js'],
    ['core/render-lifecycle.js','sc-override-render-lifecycle-js'],
    ['motion/main.js','sc-override-motion-js']
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
    ['components/product-card/image-parallax.js','sc-product-card-parallax-motion-js'],
    ['components/product-modal/view.js','sc-product-modal-view-js'],
    ['components/product-modal/a11y.js','sc-product-modal-a11y-js'],
    ['components/product-modal/motion.js','sc-product-modal-motion-js'],
    ['components/mobile-header/mobile-header.js','sc-override-mobile-header-js'],
    ['components/cart/list-motion.js','sc-cart-list-motion-js'],
    ['components/cart/scroll-motion.js','sc-cart-scroll-motion-js'],
    ['components/cart/badge-motion.js','sc-cart-badge-motion-js']
  ],
  [
    ['features/content-normalizer/dom.js','sc-content-normalizer-dom-js'],
    ['components/category-nav/layout.js','sc-category-nav-layout-js'],
    ['components/category-nav/rail-controls.js','sc-category-nav-rail-controls-js'],
    ['components/category-nav/rail-position.js','sc-category-nav-rail-position-js'],
    ['components/category-nav/sticky-state.js','sc-category-nav-sticky-state-js'],
    ['components/category-nav/indicator.js','sc-category-nav-indicator-js'],
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
    ['components/product-modal/product-modal.js','sc-override-product-modal-js']
  ]
]).then(function(){return window.SCOverride.renderLifecycle.waitForStableLayout();}).then(function(){window.SCOverride.renderLifecycle.markInitialViewport();if(window.SCOverride.motion)window.SCOverride.motion.unlock();return loadScript('components/section-heading/section-heading.js','sc-section-lines-motion-js');}).catch(function(error){if(window.console&&console.error)console.error('[SushiClub override] Error cargando módulos',error);});
})();