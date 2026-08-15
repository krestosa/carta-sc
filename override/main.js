(function(){
'use strict';
if(window.__scOverrideMainBooted)return;window.__scOverrideMainBooted=true;

var version=window.__scCatalogAssetVersion||'20260815-override-modules-v1';
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
function loadSeries(items){
  return items.reduce(function(chain,item){
    return chain.then(function(){return loadScript(item[0],item[1]);});
  },Promise.resolve());
}
function markInitialViewport(){
  var vh=window.innerHeight||document.documentElement.clientHeight;
  document.querySelectorAll('.listadoShop .productoShop').forEach(function(card){
    var r=card.getBoundingClientRect();if(r.top<vh&&r.bottom>0)card.classList.add('sc-static-initial-card');
  });
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
      if(desktop.matches&&!document.body.classList.contains('sc-catalog-layout-ready')&&attempts++<45){
        return requestAnimationFrame(check);
      }
      requestAnimationFrame(function(){requestAnimationFrame(resolve);});
    }
    check();
  });
}

loadSeries([
  ['core/variables.js','sc-override-variables-js'],
  ['core/utils.js','sc-override-utils-js'],
  ['motion/main.js','sc-override-motion-js'],
  ['mutations/dom-normalization.js','sc-override-dom-normalization-js'],
  ['mutations/history.js','sc-override-history-js'],
  ['mutations/legacy-category-hover.js','sc-override-category-hover-js'],
  ['mutations/scroll-restoration.js','sc-override-scroll-restoration-js'],
  ['components/category-nav/category-nav.js','sc-override-category-nav-js'],
  ['components/product-card/product-card.js','sc-override-product-card-js'],
  ['components/product-modal/product-modal.js','sc-override-product-modal-js'],
  ['components/mobile-header/mobile-header.js','sc-override-mobile-header-js'],
  ['components/cart/cart.js','sc-override-cart-js'],
  ['features/content-normalizer/content-normalizer.js','sc-override-content-normalizer-js']
]).then(function(){
  return waitForStableLayout();
}).then(function(){
  markInitialViewport();
  if(window.SCOverride&&window.SCOverride.motion)window.SCOverride.motion.unlock();
  return loadScript('components/section-heading/section-heading.js','sc-section-lines-motion-js');
}).catch(function(error){
  if(window.console&&console.error)console.error('[SushiClub override] Error cargando módulos',error);
});
})();