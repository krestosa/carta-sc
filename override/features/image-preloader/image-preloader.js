(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{};if(SC.__imagePreloaderBooted)return;SC.__imagePreloaderBooted=true;
if(document.documentElement)document.documentElement.classList.add('sc-image-preloader-active');
var observer=null,intersection=null,started=false,criticalCount=0,CRITICAL_LIMIT=4,STAGE='.imgShop,.imgLiquidNoFillShop';
function markLoading(stage){if(!stage)return;stage.classList.remove('sc-image-ready');stage.classList.add('sc-image-loading');}
function markReady(stage){if(!stage)return;stage.classList.remove('sc-image-loading');stage.classList.add('sc-image-ready');}
function stageFor(img){return img&&img.closest?img.closest(STAGE):null;}
function revealDecoded(img,stage){stage=stageFor(img)||stage;if(!stage)return;if(img&&typeof img.decode==='function'&&img.naturalWidth){img.decode().catch(function(){}).then(function(){markReady(stage);});}else markReady(stage);}
function bindNativeImage(img,stage){if(!img||!stage)return;markLoading(stage);if(img.__scImagePreloaderBound)return;img.__scImagePreloaderBound=true;img.addEventListener('load',function(){revealDecoded(img,stage);});img.addEventListener('error',function(){markReady(stage);});}
function ensureIntersection(){if(intersection||!window.IntersectionObserver)return intersection;intersection=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;var img=entry.target;try{img.loading='eager';img.fetchPriority='auto';}catch(_){}intersection.unobserve(img);});},{rootMargin:'70% 0px'});return intersection;}
function setPriority(img){if(!img)return;try{img.decoding='async';if(!img.__scImagePriorityAssigned){img.__scImagePriorityAssigned=true;if(criticalCount<CRITICAL_LIMIT){criticalCount++;img.loading='eager';img.fetchPriority='high';}else{img.loading='lazy';img.fetchPriority='low';var io=ensureIntersection();if(io)io.observe(img);}}}catch(_){}}
function collectImage(img,stage){if(!img)return;stage=stage||stageFor(img);setPriority(img);if(!stage)return;bindNativeImage(img,stage);if(img.complete){if(img.naturalWidth)revealDecoded(img,stage);else markReady(stage);}}
function collectStage(stage){if(!stage)return;var img=stage.querySelector('img[src],img[srcset]');if(img)collectImage(img,stage);else markReady(stage);}
function scan(root){if(!root||root.nodeType!==1&&root.nodeType!==9)return;var stages=new Set();if(root.nodeType===1&&root.matches&&root.matches(STAGE))stages.add(root);if(root.querySelectorAll)Array.prototype.forEach.call(root.querySelectorAll(STAGE),function(stage){stages.add(stage);});stages.forEach(collectStage);}
function observe(){if(observer||!window.MutationObserver||!document.documentElement)return;observer=new MutationObserver(function(mutations){mutations.forEach(function(mutation){if(mutation.type==='attributes'){var img=mutation.target;if(img&&img.matches&&img.matches('img'))collectImage(img);return;}Array.prototype.forEach.call(mutation.addedNodes||[],function(node){if(node&&node.nodeType===1)scan(node);});});});observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','srcset']});}
function start(){if(started)return;started=true;scan(document);observe();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){scan(document);},{once:true});}
function destroy(){if(observer){observer.disconnect();observer=null;}if(intersection){intersection.disconnect();intersection=null;}document.documentElement.classList.remove('sc-image-preloader-active');started=false;}
SC.imagePreloader={start:start,scan:scan,destroy:destroy};
start();
})();
