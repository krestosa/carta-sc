(function(){
'use strict';
if(window.__scOverrideMainBooted)return;window.__scOverrideMainBooted=true;
var version=window.__scCatalogAssetVersion||'unversioned';
var base='override/';
function bootstrapStaticNetwork(){
  if(window.__scStaticNetworkBooted)return;var $=window.jQuery;if(!$||typeof $.ajax!=='function')return;window.__scStaticNetworkBooted=true;
  var ajax=$.ajax;
  function urlOf(first,second){if(typeof first==='string')return first;if(first&&typeof first.url==='string')return first.url;return second&&typeof second.url==='string'?second.url:'';}
  function isKeepalive(url){if(!url)return false;try{var target=new URL(url,location.href);return target.origin===location.origin&&/\/carta_delivery\.php$/i.test(target.pathname)&&target.searchParams.get('keepalive')==='1';}catch(_){return false;}}
  $.ajax=function(first,second){if(!isKeepalive(urlOf(first,second)))return ajax.apply(this,arguments);return $.Deferred().resolve('', 'nocontent', null).promise();};
}
bootstrapStaticNetwork();
var VIEW_MODES=['compact','normal','list'],VIEW_STORE_KEY='scCatalogView:v3';
function bootstrapCatalogView(){
  var root=document.documentElement,mode='',ctx='',legacy='';if(!root)return;
  try{
    mode=localStorage.getItem(VIEW_STORE_KEY)||'';
    if(VIEW_MODES.indexOf(mode)<0){
      ctx=window.matchMedia('(max-width: 640px)').matches?'phone':window.matchMedia('(max-width: 992px)').matches?'tablet':'desktop';
      legacy=localStorage.getItem('scCatalogView:v2:'+ctx)||localStorage.getItem(ctx==='desktop'?'scCatalogView:desktop':'scCatalogView:mobile')||'';
      if(legacy==='list')mode='list';
      else if(ctx==='phone')mode=legacy==='two'?'compact':legacy==='one'?'normal':'';
      else if(ctx==='tablet')mode=legacy==='three'||legacy==='four'?'compact':legacy==='two'?'normal':'';
      else mode=legacy==='four'?'compact':legacy==='three'?'normal':'';
      if(VIEW_MODES.indexOf(mode)>=0){try{localStorage.setItem(VIEW_STORE_KEY,mode);}catch(_){}}
    }
  }catch(_){mode='';}
  if(VIEW_MODES.indexOf(mode)<0)mode='compact';
  root.setAttribute('data-sc-catalog-view',mode);
  if(document.body)document.body.setAttribute('data-sc-catalog-view',mode);
}
bootstrapCatalogView();
function asset(path){return base+path+'?v='+version;}
function loadScript(path,id){return new Promise(function(resolve,reject){var existing=id&&document.getElementById(id);if(existing){if(existing.dataset.loaded==='true')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}var script=document.createElement('script');if(id)script.id=id;script.src=asset(path);script.async=false;script.onload=function(){script.dataset.loaded='true';resolve();};script.onerror=reject;document.head.appendChild(script);});}
function loadAll(items){return Promise.all(items.map(function(item){return loadScript(item[0],item[1]);}));}
function loadStages(stages){return stages.reduce(function(chain,stage){return chain.then(function(){return loadAll(stage);});},Promise.resolve());}
var beforeTemplates=[
  [
    ['features/image-preloader/image-preloader.js','sc-image-preloader-js'],
    ['core/variables.js','sc-override-variables-js'],
    ['core/utils.js','sc-override-utils-js'],
    ['core/render-lifecycle.js','sc-override-render-lifecycle-js'],
    ['templates/registry.js','sc-override-template-registry-js'],
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
loadStages(beforeTemplates).then(function(){
  var templates=window.SCOverride&&window.SCOverride.templates;
  if(!templates||typeof templates.ready!=='function')throw new Error('[SushiClub override] Template registry unavailable');
  return templates.ready();
}).then(function(){return loadStages(afterTemplates);}).then(function(){return window.SCOverride.renderLifecycle.waitForStableLayout();}).then(function(){window.SCOverride.renderLifecycle.markInitialViewport();if(window.SCOverride.motion)window.SCOverride.motion.unlock();return loadScript('components/section-heading/section-heading.js','sc-section-lines-motion-js');}).catch(function(error){if(window.console&&console.error)console.error('[SushiClub override] Error cargando módulos',error);});
})();
