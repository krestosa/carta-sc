(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{};if(SC.__imagePreloaderBooted)return;SC.__imagePreloaderBooted=true;

/* Toggles de política: carga batched y calentamiento explícito de la caché HTTP. */
var LOAD_ALL_IMAGES_IN_BATCHES=true,CACHE_IMAGES=true;
var BATCH_SYNC=6,BATCH_SIZE=6,BATCH_BUDGET_MS=3,BATCH_IDLE_TIMEOUT=900,BATCH_DELAY_MS=40;
var MOBILE_LOGO='https://www.sushiclub.com.ar/gfx/web-sushiclub2_black_m2.png';
interface ImageBinding { stage:HTMLElement; token:number; load:()=>void; error:()=>void; }
var observer:MutationObserver|null=null,intersection:IntersectionObserver|null=null,bindings=new Map<HTMLImageElement,ImageBinding>(),cacheWarmUrls=new Set<string>(),readyHandler:(()=>void)|null=null,started=false,generation=0,criticalCount=0,criticalLimitValue=0,initialQueue:HTMLElement[]=[],initialIdle=0,initialTimer=0,STAGE='.imgShop,.imgLiquidNoFillShop';

/* Prioriza el logo móvil antes de construir el header. */
function preloadCriticalMedia():void{
  if(!document.head||!window.matchMedia('(max-width: 992px)').matches||document.querySelector('link[data-sc-mobile-logo-preload]')||document.querySelector('img[data-sc-lcp-logo="1"]'))return;
  var link=document.createElement('link');link.rel='preload';link.as='image';link.href=MOBILE_LOGO;link.setAttribute('fetchpriority','high');link.setAttribute('data-sc-mobile-logo-preload','');document.head.appendChild(link);
}
function decorateCriticalMedia():void{
  var logo=document.querySelector<HTMLImageElement>('.brandOnlyMobile img')||document.querySelector<HTMLImageElement>('img[src="'+MOBILE_LOGO+'"]');
  if(logo){logo.loading='eager';logo.decoding='async';try{logo.fetchPriority='high';}catch(_error){}if(!logo.hasAttribute('width'))logo.setAttribute('width','333');if(!logo.hasAttribute('height'))logo.setAttribute('height','100');}
  var banner=document.querySelector<HTMLImageElement>('img.imgBannerShop');if(banner)banner.decoding='async';
}
preloadCriticalMedia();

/* Estados visuales de cada contenedor de imagen. */
function markLoading(stage:HTMLElement|null,active:boolean):void{if(!stage)return;stage.classList.remove('sc-image-ready');stage.classList.add('sc-image-loading');stage.classList.toggle('sc-image-active',active);}
function markReady(stage:HTMLElement|null):void{if(!stage)return;stage.classList.remove('sc-image-loading','sc-image-active');stage.classList.add('sc-image-ready');}
function stageFor(img:HTMLImageElement|null):HTMLElement|null{return img?img.closest<HTMLElement>(STAGE):null;}
function nearViewport(img:HTMLImageElement|null):boolean{if(!img)return false;var rect=img.getBoundingClientRect(),margin=160;return rect.bottom>=-margin&&rect.top<=innerHeight+margin;}

/* Define cuántas imágenes iniciales cargan con prioridad normal. */
function criticalLimit():number{var root=document.documentElement,mode=root.getAttribute('data-sc-catalog-view')||'compact';if(mode==='list')return 1;if(window.matchMedia('(max-width: 640px)').matches)return 1;if(window.matchMedia('(max-width: 992px)').matches)return mode==='compact'?2:1;return mode==='compact'?3:2;}
function catalogueRoot():ParentNode{return document.querySelector<HTMLElement>('.containerShop')||document;}

/* Calienta la caché HTTP sin blobs ni Cache Storage. */
function selectedUrl(img:HTMLImageElement|null):string{return img?(img.currentSrc||img.src||img.getAttribute('src')||''):'';}
function warmHttpCache(img:HTMLImageElement|null):void{
  if(!CACHE_IMAGES||!window.fetch||!img)return;var url=selectedUrl(img);if(!url||/^(?:data|blob):/i.test(url)||cacheWarmUrls.has(url))return;cacheWarmUrls.add(url);
  try{window.fetch(url,{cache:'force-cache',mode:'no-cors',credentials:'same-origin'}).catch(function(){cacheWarmUrls.delete(url);});}catch(_error){cacheWarmUrls.delete(url);}
}

/* Vincula load/error sin ocultar imágenes ya completas. */
function revealLoaded(img:HTMLImageElement,stage:HTMLElement,token:number):void{var current=stageFor(img)||stage;if(!current||!started||token!==generation)return;markReady(current);warmHttpCache(img);}
function unbindNativeImage(img:HTMLImageElement):void{var binding=bindings.get(img);if(!binding)return;if(intersection)intersection.unobserve(img);img.removeEventListener('load',binding.load);img.removeEventListener('error',binding.error);bindings.delete(img);}
function bindNativeImage(img:HTMLImageElement,stage:HTMLElement,active:boolean):void{
  if(img.complete){markReady(stage);warmHttpCache(img);unbindNativeImage(img);return;}markLoading(stage,active);
  var current=bindings.get(img);if(current){current.stage=stage;current.token=generation;return;}
  var binding:ImageBinding={stage:stage,token:generation,load:function(){},error:function(){}};
  binding.load=function():void{revealLoaded(img,binding.stage,binding.token);unbindNativeImage(img);};
  binding.error=function():void{if(started&&binding.token===generation)markReady(binding.stage);unbindNativeImage(img);};
  bindings.set(img,binding);img.addEventListener('load',binding.load);img.addEventListener('error',binding.error);
  if(img.complete){markReady(stage);warmHttpCache(img);unbindNativeImage(img);}
}
function unbindNativeImages():void{Array.from(bindings.keys()).forEach(unbindNativeImage);}
function release(root:Node):void{
  if(root.nodeType!==1)return;var element=root as Element;
  if(element.matches('img'))unbindNativeImage(element as HTMLImageElement);
  element.querySelectorAll<HTMLImageElement>('img').forEach(unbindNativeImage);
}

/* Sólo el trabajo visual se activa cerca del viewport; la descarga batched puede seguir offscreen. */
function promote(img:HTMLImageElement,visible:boolean):void{if(img.complete)return;try{if(visible&&img.fetchPriority==='low')img.fetchPriority='auto';}catch(_error){}if(visible)warmHttpCache(img);var stage=stageFor(img);if(stage)markLoading(stage,visible);}
function ensureIntersection():IntersectionObserver|null{
  if(intersection||!window.IntersectionObserver)return intersection;
  intersection=new IntersectionObserver(function(entries:IntersectionObserverEntry[]){entries.forEach(function(entry:IntersectionObserverEntry){if(!entry.isIntersecting||!intersection)return;var img=entry.target as HTMLImageElement;promote(img,true);intersection.unobserve(img);});},{rootMargin:'160px 0px'});return intersection;
}
function setPriority(img:HTMLImageElement):boolean{
  try{
    img.decoding='async';
    if(!img.__scImagePriorityAssigned){
      img.__scImagePriorityAssigned=true;
      if(criticalCount<criticalLimitValue){criticalCount++;img.loading='eager';img.fetchPriority='auto';}
      else if(LOAD_ALL_IMAGES_IN_BATCHES){img.loading='eager';img.fetchPriority='low';}
      else{img.loading='lazy';img.fetchPriority='low';}
    }
    var active=nearViewport(img);
    if(CACHE_IMAGES&&(LOAD_ALL_IMAGES_IN_BATCHES||active||img.complete))warmHttpCache(img);
    if(!img.complete){if(active)promote(img,true);else{var io=ensureIntersection();if(io)io.observe(img);}}
    return active;
  }catch(_error){return false;}
}

/* Recolecta imágenes existentes y nuevas. */
function collectImage(img:HTMLImageElement,stage?:HTMLElement|null):void{var current=stage||stageFor(img),active=setPriority(img);if(!current)return;if(img.complete){markReady(current);warmHttpCache(img);unbindNativeImage(img);return;}bindNativeImage(img,current,active);}
function collectStage(stage:HTMLElement|undefined):void{if(!stage)return;var img=stage.querySelector<HTMLImageElement>('img[src],img[srcset]');if(img)collectImage(img,stage);else markReady(stage);}
function stagesIn(root:ParentNode|Node|null):HTMLElement[]{
  var stages:HTMLElement[]=[];if(!root)return stages;
  if(root.nodeType===1){var element=root as HTMLElement;if(element.matches(STAGE))stages.push(element);element.querySelectorAll<HTMLElement>(STAGE).forEach(function(stage:HTMLElement){if(stages.indexOf(stage)<0)stages.push(stage);});}
  else if(root.nodeType===9)(root as Document).querySelectorAll<HTMLElement>(STAGE).forEach(function(stage:HTMLElement){stages.push(stage);});
  return stages;
}
function scan(root:ParentNode|Node=document):void{if(!started)return;stagesIn(root).forEach(collectStage);}

/* Procesa todo el catálogo en lotes espaciados. */
function cancelInitialScan():void{if(initialIdle&&window.cancelIdleCallback)window.cancelIdleCallback(initialIdle);if(initialTimer)clearTimeout(initialTimer);initialIdle=0;initialTimer=0;initialQueue=[];}
function runInitialBatch(deadline:IdleDeadline|null):void{
  initialIdle=0;initialTimer=0;if(!started)return;var start=performance.now(),count=0;
  while(initialQueue.length&&count<BATCH_SIZE&&performance.now()-start<BATCH_BUDGET_MS&&(!deadline||deadline.didTimeout||deadline.timeRemaining()>2)){collectStage(initialQueue.shift());count++;}
  if(initialQueue.length)scheduleInitialBatch();
}
function scheduleInitialBatch():void{
  if(!started||!initialQueue.length||initialIdle||initialTimer)return;
  initialTimer=window.setTimeout(function(){initialTimer=0;if(!started||!initialQueue.length)return;if(typeof window.requestIdleCallback==='function'){initialIdle=window.requestIdleCallback(runInitialBatch,{timeout:BATCH_IDLE_TIMEOUT});return;}runInitialBatch(null);},BATCH_DELAY_MS);
}
function scanInitial(root:ParentNode|Node):void{cancelInitialScan();var stages=stagesIn(root),sync=Math.min(BATCH_SYNC,stages.length);for(var i=0;i<sync;i++)collectStage(stages[i]);initialQueue=stages.slice(sync);scheduleInitialBatch();}

/* Observa cambios de imágenes sin rescans global. */
function observe(root:ParentNode|Node):void{
  if(observer||!window.MutationObserver||!document.documentElement)return;
  observer=new MutationObserver(function(mutations:MutationRecord[]){mutations.forEach(function(mutation:MutationRecord){
    if(mutation.type==='attributes'){
      if(mutation.target.nodeType===1){var img=mutation.target as Element;if(img.matches('img'))collectImage(img as HTMLImageElement);}return;
    }
    mutation.removedNodes.forEach(function(node:Node){release(node);});
    mutation.addedNodes.forEach(function(node:Node){if(node.nodeType===1){var element=node as Element;if(element.matches('img'))collectImage(element as HTMLImageElement);else scan(element);}});
  });});
  var target=root.nodeType===1?root as Node:document.documentElement;observer.observe(target,{subtree:true,childList:true,attributes:true,attributeFilter:['src','srcset']});
}

/* Arranque y limpieza del preloader. */
function activate():void{if(!started)return;criticalCount=0;criticalLimitValue=criticalLimit();decorateCriticalMedia();var root=catalogueRoot();observe(root);scanInitial(root);}
function start():void{
  if(started)return;started=true;generation++;document.documentElement.classList.add('sc-image-preloader-active');
  if(document.readyState==='loading'){if(!readyHandler){readyHandler=function():void{readyHandler=null;activate();};document.addEventListener('DOMContentLoaded',readyHandler,{once:true});}}else activate();
}
function destroy():void{
  started=false;generation++;
  if(readyHandler){document.removeEventListener('DOMContentLoaded',readyHandler);readyHandler=null;}
  cancelInitialScan();if(observer){observer.disconnect();observer=null;}if(intersection){intersection.disconnect();intersection=null;}unbindNativeImages();document.documentElement.classList.remove('sc-image-preloader-active');
}
SC.imagePreloader={start:start,scan:scan,destroy:destroy,warmCache:warmHttpCache,loadAllInBatches:LOAD_ALL_IMAGES_IN_BATCHES,cacheImages:CACHE_IMAGES};
start();
})();
