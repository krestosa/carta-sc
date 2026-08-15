(function(){
'use strict';
if(window.__scOverrideMainBooted)return;window.__scOverrideMainBooted=true;

var version=window.__scCatalogAssetVersion||'unversioned';
var base='override/';
function asset(path){return base+path+'?v='+version;}
function loadScript(path,id){
  return new Promise(function(resolve,reject){
    var existing=id&&document.getElementById(id);
    if(existing){
      if(existing.dataset.loaded==='true')return resolve();
      existing.addEventListener('load',resolve,{once:true});
      existing.addEventListener('error',reject,{once:true});
      return;
    }
    var script=document.createElement('script');
    if(id)script.id=id;
    script.src=asset(path);script.async=false;
    script.onload=function(){script.dataset.loaded='true';resolve();};
    script.onerror=reject;
    document.head.appendChild(script);
  });
}
function loadAll(items){return Promise.all(items.map(function(item){return loadScript(item[0],item[1]);}));}
function loadStages(stages){return stages.reduce(function(chain,stage){return chain.then(function(){return loadAll(stage);});},Promise.resolve());}
function markInitialViewport(){
  var vh=window.innerHeight||document.documentElement.clientHeight;
  document.querySelectorAll('.listadoShop .productoShop').forEach(function(card){var r=card.getBoundingClientRect();if(r.top<vh&&r.bottom>0)card.classList.add('sc-static-initial-card');});
  document.querySelectorAll('.listadoShop .titleShopSeccion, .listadoShop .subTitleShopSeccion').forEach(function(section){
    var r=section.getBoundingClientRect();
    if(r.top<vh&&r.bottom>0){
      section.classList.add('sc-static-initial-section');
      var host=section.matches('.titleShopSeccion')?section.querySelector(':scope > div'):section;
      if(host)host.classList.add('sc-static-initial-section');
    }
  });
}
function waitForStableLayout(){
  return new Promise(function(resolve){
    var desktop=window.matchMedia('(min-width: 993px)'),attempts=0;
    function check(){
      if(!document.body)return requestAnimationFrame(check);
      if(desktop.matches&&!document.body.classList.contains('sc-catalog-layout-ready')&&attempts++<45)return requestAnimationFrame(check);
      requestAnimationFrame(function(){requestAnimationFrame(resolve);});
    }
    check();
  });
}

loadStages([
  [
    ['core/variables.js','sc-override-variables-js'],
    ['core/utils.js','sc-override-utils-js'],
    ['motion/main.js','sc-override-motion-js']
  ],
  [
    ['motion/global-ui.js','sc-global-ui-motion-js'],
    ['mutations/dom-normalization.js','sc-override-dom-normalization-js'],
    ['mutations/history.js','sc-override-history-js'],
    ['mutations/legacy-category-hover.js','sc-override-category-hover-js'],
    ['components/category-nav/core.js','sc-category-nav-core-js'],
    ['components/product-card/data.js','sc-product-card-data-js'],
    ['components/product-card/reveal-motion.js','sc-product-card-reveal-motion-js'],
    ['components/product-card/image-parallax.js','sc-product-card-parallax-motion-js'],
    ['components/product-modal/view.js','sc-product-modal-view-js'],
    ['components/product-modal/a11y.js','sc-product-modal-a11y-js'],
    ['components/product-modal/motion.js','sc-product-modal-motion-js'],
    ['components/mobile-header/mobile-header.js','sc-override-mobile-header-js'],
    ['components/cart/list-motion.js','sc-cart-list-motion-js'],
    ['components/cart/scroll-motion.js','sc-cart-scroll-motion-js'],
    ['components/cart/badge-motion.js','sc-cart-badge-motion-js'],
    ['features/content-normalizer/content-normalizer.js','sc-override-content-normalizer-js']
  ],
  [
    ['components/category-nav/layout.js','sc-category-nav-layout-js'],
    ['components/category-nav/rail.js','sc-category-nav-rail-js'],
    ['components/category-nav/state.js','sc-category-nav-state-js'],
    ['components/category-nav/motion.js','sc-category-nav-motion-js'],
    ['components/product-card/a11y.js','sc-product-card-a11y-js'],
    ['components/product-card/content.js','sc-product-card-content-js'],
    ['components/product-card/motion.js','sc-product-card-motion-js'],
    ['components/cart/cart.js','sc-override-cart-js']
  ],
  [
    ['components/category-nav/category-nav.js','sc-override-category-nav-js'],
    ['components/product-card/product-card.js','sc-override-product-card-js'],
    ['components/product-modal/product-modal.js','sc-override-product-modal-js']
  ]
]).then(function(){return waitForStableLayout();}).then(function(){
  markInitialViewport();
  if(window.SCOverride&&window.SCOverride.motion)window.SCOverride.motion.unlock();
  return loadScript('components/section-heading/section-heading.js','sc-section-lines-motion-js');
}).catch(function(error){if(window.console&&console.error)console.error('[SushiClub override] Error cargando módulos',error);});
})();