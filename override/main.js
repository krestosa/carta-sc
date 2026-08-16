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
var criticalStages=[
  [['core/variables.js','sc-override-variables-js']],
  [['core/utils.js','sc-override-utils-js']],
  [['core/render-lifecycle.js','sc-override-render-lifecycle-js']],
  [['motion/main.js','sc-override-motion-js']],
  [['core/runtime-loader.js','sc-override-runtime-loader-js']]
];
loadStages(criticalStages).then(function(){var SC=window.SCOverride;if(!SC||!SC.renderLifecycle)throw new Error('[SushiClub override] Render lifecycle unavailable');return SC.renderLifecycle.waitForStableLayout();}).then(function(){var SC=window.SCOverride;SC.renderLifecycle.markInitialViewport();if(SC.motion)SC.motion.unlock();return loadScript('components/section-heading/section-heading.js','sc-section-lines-motion-js');}).catch(function(error){if(window.console&&console.error)console.error('[SushiClub override] Error cargando bootstrap crítico',error);});
})();
