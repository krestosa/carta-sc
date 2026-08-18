(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{};if(SC.__imagePreloaderBooted)return;SC.__imagePreloaderBooted=true;
var MOBILE_LOGO='https://www.sushiclub.com.ar/gfx/web-sushiclub2_black_m2.png';
var observer=null,intersection=null,bindings=new Map(),readyHandler=null,started=false,generation=0,criticalCount=0,criticalLimitValue=0,initialQueue=[],initialIdle=0,initialTimer=0,STAGE='.imgShop,.imgLiquidNoFillShop';
var INITIAL_SYNC=8,INITIAL_BATCH=8,INITIAL_BUDGET_MS=4,INITIAL_IDLE_TIMEOUT=1400;
function preloadCriticalMedia(){
  if(!document.head||!window.matchMedia('(max-width: 992px)').matches||document.querySelector('link[data-sc-mobile-logo-preload]')||document.querySelector('img[data-sc-lcp-logo="1"]'))return;
  var link=document.createElement('link');link.rel='preload';link.as='image';link.href=MOBILE_LOGO;link.setAttribute('fetchpriority','high');link.setAttribute('data-sc-mobile-logo-preload','');document.head.appendChild(link);
}
function decorateCriticalMedia(){
  var logo=document.querySelector('.brandOnlyMobile img')||document.querySelector('img[src="'+MOBILE_LOGO+'"]');if(logo){logo.loading='eager';logo.decoding='async';try{logo.fetchPriority='high';}catch(_){}if(!logo.hasAttribute('width'))logo.setAttribute('width','333');if(!logo.hasAttribute('height'))logo.setAttribute('height','100');}
  var banner=document.querySelector('img.imgBannerShop');if(banner)banner.decoding='async';
}
preloadCriticalMedia();
function markLoading(stage,active){if(!stage)return;stage.classList.remove('sc-image-ready');stage.classList.add('sc-image-loading');stage.classList.toggle('sc-image-active',!!active);}
function markReady(stage){if(!stage)return;stage.classList.remove('sc-image-loading','sc-image-active');stage.classList.add('sc-image-ready');}
function stageFor(img){return img&&img.closest?img.closest(STAGE):null;}
function criticalLimit(){var root=document.documentElement,mode=root&&root.getAttribute('data-sc-catalog-view')||'compact';if(mode==='list')return 1;if(window.matchMedia('(max-width: 640px)').matches)return 1;if(window.matchMedia('(max-width: 992px)').matches)return mode==='compact'?2:1;return mode==='compact'?3:2;}
function catalogueRoot(){return document.querySelector('.containerShop')||document;}
function revealLoaded(img,stage,token){stage=stageFor(img)||stage;if(!stage||!started||token!==generation)return;markReady(stage);}
function unbindNativeImage(img){var binding=bindings.get(img);if(!binding)return;if(intersection)intersection.unobserve(img);img.removeEventListener('load',binding.load);img.removeEventListener('error',binding.error);bindings.delete(img);}
function bindNativeImage(img,stage,active){if(!img||!stage)return;if(img.complete){markReady(stage);unbindNativeImage(img);return;}markLoading(stage,active);var binding=bindings.get(img);if(binding){binding.stage=stage;binding.token=generation;return;}binding={stage:stage,token:generation,load:null,error:null};binding.load=function(){revealLoaded(img,binding.stage,binding.token);unbindNativeImage(img);};binding.error=function(){if(started&&binding.token===generation)markReady(binding.stage);unbindNativeImage(img);};bindings.set(img,binding);img.addEventListener('load',binding.load);img.addEventListener('error',binding.error);if(img.complete){markReady(stage);unbindNativeImage(img);}}
function unbindNativeImages(){Array.from(bindings.keys()).forEach(unbindNativeImage);}
function release(root){if(!root||root.nodeType!==1)return;if(root.matches&&root.matches('img'))unbindNativeImage(root);if(root.querySelectorAll)Array.prototype.forEach.call(root.querySelectorAll('img'),unbindNativeImage);}
function promote(img,visible){if(!img||img.complete)return;try{if(visible&&img.fetchPriority==='low')img.fetchPriority='auto';}catch(_){}var stage=stageFor(img);if(stage)markLoading(stage,!!visible);}
function ensureIntersection(){if(intersection||!window.IntersectionObserver)return intersection;intersection=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;var img=entry.target;promote(img,true);intersection.unobserve(img);});},{rootMargin:'120px 0px'});return intersection;}
function setPriority(img){if(!img)return false;try{img.decoding='async';if(!img.__scImagePriorityAssigned){img.__scImagePriorityAssigned=true;if(criticalCount<criticalLimitValue){criticalCount++;img.loading='eager';img.fetchPriority='auto';}else{img.loading='lazy';img.fetchPriority='low';}}if(img.loading==='lazy'&&!img.complete){var io=ensureIntersection();if(io)io.observe(img);}return img.loading!=='lazy'||img.complete;}catch(_){return false;}}
function collectImage(img,stage){if(!img)return;stage=stage||stageFor(img);var active=setPriority(img);if(!stage)return;if(img.complete){markReady(stage);unbindNativeImage(img);return;}bindNativeImage(img,stage,active);}
function collectStage(stage){if(!stage)return;var img=stage.querySelector('img[src],img[srcset]');if(img)collectImage(img,stage);else markReady(stage);}
function stagesIn(root){var stages=[];if(!root||root.nodeType!==1&&root.nodeType!==9)return stages;if(root.nodeType===1&&root.matches&&root.matches(STAGE))stages.push(root);if(root.querySelectorAll)Array.prototype.forEach.call(root.querySelectorAll(STAGE),function(stage){if(stages.indexOf(stage)<0)stages.push(stage);});return stages;}
function scan(root){if(!started)return;stagesIn(root).forEach(collectStage);}
function cancelInitialScan(){if(initialIdle&&window.cancelIdleCallback)window.cancelIdleCallback(initialIdle);if(initialTimer)clearTimeout(initialTimer);initialIdle=0;initialTimer=0;initialQueue=[];}
function runInitialBatch(deadline){
  initialIdle=0;initialTimer=0;if(!started)return;var start=performance.now(),count=0;
  while(initialQueue.length&&count<INITIAL_BATCH&&performance.now()-start<INITIAL_BUDGET_MS&&(!deadline||deadline.didTimeout||deadline.timeRemaining()>2)){collectStage(initialQueue.shift());count++;}
  if(initialQueue.length)scheduleInitialBatch();
}
function scheduleInitialBatch(){if(!started||!initialQueue.length||initialIdle||initialTimer)return;if(typeof window.requestIdleCallback==='function'){initialIdle=window.requestIdleCallback(runInitialBatch,{timeout:INITIAL_IDLE_TIMEOUT});return;}initialTimer=window.setTimeout(function(){runInitialBatch(null);},32);}
function scanInitial(root){cancelInitialScan();var stages=stagesIn(root),sync=Math.min(INITIAL_SYNC,stages.length);for(var i=0;i<sync;i++)collectStage(stages[i]);initialQueue=stages.slice(sync);scheduleInitialBatch();}
function observe(root){if(observer||!window.MutationObserver||!document.documentElement)return;observer=new MutationObserver(function(mutations){mutations.forEach(function(mutation){if(mutation.type==='attributes'){var img=mutation.target;if(img&&img.matches&&img.matches('img'))collectImage(img);return;}Array.prototype.forEach.call(mutation.removedNodes||[],release);Array.prototype.forEach.call(mutation.addedNodes||[],function(node){if(node&&node.nodeType===1){if(node.matches&&node.matches('img'))collectImage(node);else scan(node);}});});});observer.observe(root&&root.nodeType===1?root:document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','srcset']});}
function activate(){if(!started)return;criticalCount=0;criticalLimitValue=criticalLimit();decorateCriticalMedia();var root=catalogueRoot();observe(root);scanInitial(root);}
function start(){
  if(started)return;started=true;generation++;if(document.documentElement)document.documentElement.classList.add('sc-image-preloader-active');
  if(document.readyState==='loading'){if(!readyHandler){readyHandler=function(){readyHandler=null;activate();};document.addEventListener('DOMContentLoaded',readyHandler,{once:true});}}else activate();
}
function destroy(){started=false;generation++;if(readyHandler){document.removeEventListener('DOMContentLoaded',readyHandler);readyHandler=null;}cancelInitialScan();if(observer){observer.disconnect();observer=null;}if(intersection){intersection.disconnect();intersection=null;}unbindNativeImages();if(document.documentElement)document.documentElement.classList.remove('sc-image-preloader-active');}
SC.imagePreloader={start:start,scan:scan,destroy:destroy};
start();
})();