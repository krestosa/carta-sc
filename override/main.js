(function(){
'use strict';
if(window.__scOverrideMainBooted)return;window.__scOverrideMainBooted=true;
var version=window.__scCatalogAssetVersion||'unversioned',base='override/';
function bootstrapStaticNetwork(){
  if(window.__scStaticNetworkBooted)return;var $=window.jQuery;if(!$||typeof $.ajax!=='function')return;window.__scStaticNetworkBooted=true;
  var ajax=$.ajax;
  function urlOf(first,second){if(typeof first==='string')return first;if(first&&typeof first.url==='string')return first.url;return second&&typeof second.url==='string'?second.url:'';}
  function isKeepalive(url){if(!url)return false;try{var target=new URL(url,location.href);return target.origin===location.origin&&/\/carta_delivery\.php$/i.test(target.pathname)&&target.searchParams.get('keepalive')==='1';}catch(_){return false;}}
  $.ajax=function(first,second){if(!isKeepalive(urlOf(first,second)))return ajax.apply(this,arguments);return $.Deferred().resolve('', 'nocontent', null).promise();};
}
bootstrapStaticNetwork();
function asset(path){return base+path+'?v='+version;}
function loadScript(path,id){return new Promise(function(resolve,reject){var existing=id&&document.getElementById(id);if(existing){if(existing.dataset.loaded==='true')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}var script=document.createElement('script');if(id)script.id=id;script.src=asset(path);script.async=false;script.onload=function(){script.dataset.loaded='true';resolve();};script.onerror=reject;document.head.appendChild(script);});}
function loadAll(items){return Promise.all(items.map(function(item){return loadScript(item[0],item[1]);}));}
function loadStages(stages){return stages.reduce(function(chain,stage){return chain.then(function(){return loadAll(stage);});},Promise.resolve());}
var DEFERRED_MODULE_REFS=[
  "features/image-preloader/image-preloader.js",
  "templates/registry.js",
  "motion/global-ui.js",
  "mutations/dom-normalization.js",
  "mutations/history.js",
  "mutations/legacy-category-hover.js",
  "components/category-nav/core.js",
  "features/content-normalizer/rules.js",
  "components/product-card/data.js",
  "components/product-card/reveal-motion.js",
  "components/product-modal/view.js",
  "components/product-modal/a11y.js",
  "components/product-modal/motion.js",
  "components/mobile-header/mobile-header.js",
  "components/cart/list-motion.js",
  "components/cart/scroll-motion.js",
  "components/cart/badge-motion.js",
  "features/content-normalizer/dom.js",
  "components/category-nav/layout.js",
  "components/category-nav/rail-controls.js",
  "components/category-nav/rail-position.js",
  "components/category-nav/sticky-state.js",
  "components/category-nav/indicator.js",
  "components/catalog-tools/search.js",
  "components/catalog-tools/theme.js",
  "components/catalog-tools/view.js",
  "components/product-card/a11y.js",
  "components/product-card/content.js",
  "components/product-card/motion.js",
  "components/cart/cart.js",
  "features/content-normalizer/observer.js",
  "features/content-normalizer/content-normalizer.js",
  "components/category-nav/rail.js",
  "components/category-nav/active-state.js",
  "components/category-nav/scroll-spy.js",
  "components/category-nav/motion.js",
  "components/category-nav/category-nav.js",
  "components/product-card/product-card.js",
  "components/product-modal/product-modal.js",
  "components/catalog-tools/catalog-tools.js"
];
var criticalStages=[
  [['core/variables.js','sc-override-variables-js']],
  [['core/utils.js','sc-override-utils-js']],
  [['core/render-lifecycle.js','sc-override-render-lifecycle-js']],
  [['motion/main.js','sc-override-motion-js']],
  [['core/runtime-loader.js','sc-override-runtime-loader-js']]
];
loadStages(criticalStages).then(function(){var SC=window.SCOverride;if(!SC||!SC.renderLifecycle)throw new Error('[SushiClub override] Render lifecycle unavailable');return SC.renderLifecycle.waitForStableLayout();}).then(function(){var SC=window.SCOverride;SC.renderLifecycle.markInitialViewport();if(SC.motion)SC.motion.unlock();return loadScript('components/section-heading/section-heading.js','sc-section-lines-motion-js');}).catch(function(error){if(window.console&&console.error)console.error('[SushiClub override] Error cargando bootstrap crítico',error);});
})();
