(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{};if(SC.__imagePreloaderBooted)return;SC.__imagePreloaderBooted=true;
var observer=null,intersection=null,bindings=new Map(),readyHandler=null,started=false,generation=0,criticalCount=0,criticalLimitValue=0,STAGE='.imgShop,.imgLiquidNoFillShop';
function markLoading(stage,active){if(!stage)return;stage.classList.remove('sc-image-ready');stage.classList.add('sc-image-loading');stage.classList.toggle('sc-image-active',!!active);}
function markReady(stage){if(!stage)return;stage.classList.remove('sc-image-loading','sc-image-active');stage.classList.add('sc-image-ready');}
function stageFor(img){return img&&img.closest?img.closest(STAGE):null;}
function criticalLimit(){var root=document.documentElement,mode=root&&root.getAttribute('data-sc-catalog-view')||'compact';if(mode==='list')return 1;if(window.matchMedia('(max-width: 640px)').matches)return mode==='compact'?2:1;if(window.matchMedia('(max-width: 992px)').matches)return mode==='compact'?3:2;return mode==='compact'?4:3;}
function catalogueRoot(){return document.querySelector('.containerShop')||document;}
function revealLoaded(img,stage,token){stage=stageFor(img)||stage;if(!stage||!started||token!==generation)return;markReady(stage);}
function bindNativeImage(img,stage,active){if(!img||!stage)return;markLoading(stage,active);var binding=bindings.get(img);if(binding){binding.stage=stage;binding.token=generation;return;}binding={stage:stage,token:generation,load:null,error:null};binding.load=function(){revealLoaded(img,binding.stage,binding.token);};binding.error=function(){if(started&&binding.token===generation)markReady(binding.stage);};bindings.set(img,binding);img.addEventListener('load',binding.load);img.addEventListener('error',binding.error);}
function unbindNativeImages(){bindings.forEach(function(binding,img){img.removeEventListener('load',binding.load);img.removeEventListener('error',binding.error);});bindings.clear();}
function promote(img,visible){if(!img||img.complete)return;try{img.loading='eager';img.fetchPriority=visible?'auto':'low';}catch(_){}var stage=stageFor(img);if(stage)markLoading(stage,!!visible);}
function ensureIntersection(){if(intersection||!window.IntersectionObserver)return intersection;intersection=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;var img=entry.target;promote(img,true);intersection.unobserve(img);});},{rootMargin:'900px 0px'});return intersection;}
function setPriority(img){if(!img)return false;try{img.decoding='async';if(!img.__scImagePriorityAssigned){img.__scImagePriorityAssigned=true;if(criticalCount<criticalLimitValue){criticalCount++;img.loading='eager';img.fetchPriority='auto';}else{img.loading='lazy';img.fetchPriority='low';}}if(img.loading==='lazy'&&!img.complete){var io=ensureIntersection();if(io)io.observe(img);}return img.loading!=='lazy'||img.complete;}catch(_){return false;}}
function collectImage(img,stage){if(!img)return;stage=stage||stageFor(img);var active=setPriority(img);if(!stage)return;bindNativeImage(img,stage,active);if(img.complete)markReady(stage);}
function collectStage(stage){if(!stage)return;var img=stage.querySelector('img[src],img[srcset]');if(img)collectImage(img,stage);else markReady(stage);}
function scan(root){if(!started||!root||root.nodeType!==1&&root.nodeType!==9)return;var stages=new Set();if(root.nodeType===1&&root.matches&&root.matches(STAGE))stages.add(root);if(root.querySelectorAll)Array.prototype.forEach.call(root.querySelectorAll(STAGE),function(stage){stages.add(stage);});stages.forEach(collectStage);}
function observe(root){if(observer||!window.MutationObserver||!document.documentElement)return;observer=new MutationObserver(function(mutations){mutations.forEach(function(mutation){if(mutation.type==='attributes'){var img=mutation.target;if(img&&img.matches&&img.matches('img'))collectImage(img);return;}Array.prototype.forEach.call(mutation.addedNodes||[],function(node){if(node&&node.nodeType===1){if(node.matches&&node.matches('img'))collectImage(node);else scan(node);}});});});observer.observe(root&&root.nodeType===1?root:document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','srcset']});}
function activate(){if(!started)return;criticalCount=0;criticalLimitValue=criticalLimit();var root=catalogueRoot();scan(root);observe(root);}
function start(){
  if(started)return;started=true;generation++;if(document.documentElement)document.documentElement.classList.add('sc-image-preloader-active');
  if(document.readyState==='loading'){if(!readyHandler){readyHandler=function(){readyHandler=null;activate();};document.addEventListener('DOMContentLoaded',readyHandler,{once:true});}}else activate();
}
function destroy(){started=false;generation++;if(readyHandler){document.removeEventListener('DOMContentLoaded',readyHandler);readyHandler=null;}if(observer){observer.disconnect();observer=null;}if(intersection){intersection.disconnect();intersection=null;}unbindNativeImages();if(document.documentElement)document.documentElement.classList.remove('sc-image-preloader-active');}
SC.imagePreloader={start:start,scan:scan,destroy:destroy};
start();
})();
