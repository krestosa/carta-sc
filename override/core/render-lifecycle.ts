(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{},C=SC.config,S=C&&C.selectors,K=C&&C.classes;
if(SC.__renderLifecycleBooted)return;SC.__renderLifecycleBooted=true;

type Waiter={predicate:()=>boolean;resolve:()=>void;timer:number;settled:boolean};

/* Límites para esperar layout, fuentes y header sin bloquear el arranque. */
var STABLE_LAYOUT_TIMEOUT=900,FONT_TIMEOUT=1100,MOBILE_HEADER_TIMEOUT=500,desktopQuery=C.queries.desktop,waitObserver:MutationObserver|null=null,waiters:Waiter[]=[],initialViewportObserver:IntersectionObserver|null=null,initialViewportStarted=false,initialViewportFrozen=false;

/* Marca títulos visibles al inicio para evitar un reveal tardío. */
function markStaticInitial(node:Element|null|undefined):void{
  if(!node||node.nodeType!==1)return;
  node.classList.add(K.staticInitialSection);var host=node.matches(S.sectionTitle)?node.querySelector(':scope > div'):node;if(host)host.classList.add(K.staticInitialSection);
}
function applyInitialViewportEntries(entries:readonly IntersectionObserverEntry[]):void{for(var i=0;i<entries.length;i++){var entry=entries[i];if(!entry||!entry.isIntersecting)continue;markStaticInitial(entry.target);if(initialViewportObserver)initialViewportObserver.unobserve(entry.target);}}
function markInitialViewport():void{
  if(initialViewportFrozen||initialViewportStarted||!window.IntersectionObserver)return;
  var nodes=document.querySelectorAll<Element>(S.productList+' '+S.sectionTitle+','+S.productList+' '+S.sectionSubtitle);if(!nodes.length)return;
  initialViewportStarted=true;initialViewportObserver=new IntersectionObserver(applyInitialViewportEntries,{root:null,threshold:0});
  for(var i=0;i<nodes.length;i++){var node=nodes[i];if(node)initialViewportObserver.observe(node);}
}
function freezeInitialViewport():void{
  if(initialViewportFrozen)return;initialViewportFrozen=true;
  if(initialViewportObserver){applyInitialViewportEntries(initialViewportObserver.takeRecords());initialViewportObserver.disconnect();initialViewportObserver=null;}
}

/* Espera dos frames para leer geometría ya estabilizada. */
function afterLayoutFrame(resolve:()=>void):void{requestAnimationFrame(function(){requestAnimationFrame(resolve);});}
function whenDomReady():Promise<void>{return document.readyState==='loading'?new Promise<void>(function(resolve){document.addEventListener('DOMContentLoaded',function(){resolve();},{once:true});}):Promise.resolve();}
function withTimeout(promise:PromiseLike<unknown>,ms:number):Promise<void>{return Promise.race([Promise.resolve(promise).then(function(){},function(){}),new Promise<void>(function(resolve){window.setTimeout(resolve,ms);})]);}

/* Comparte un solo observer entre esperas de estado DOM. */
function disconnectWaitObserver():void{if(waitObserver){waitObserver.disconnect();waitObserver=null;}}
function removeWaiter(waiter:Waiter):void{var index=waiters.indexOf(waiter);if(index>=0)waiters.splice(index,1);if(!waiters.length)disconnectWaitObserver();}
function finishWaiter(waiter:Waiter):void{if(waiter.settled)return;waiter.settled=true;if(waiter.timer)clearTimeout(waiter.timer);removeWaiter(waiter);waiter.resolve();}
function evaluateWaiters():void{waiters.slice().forEach(function(waiter:Waiter){if(!waiter.settled&&waiter.predicate())finishWaiter(waiter);});}
function ensureWaitObserver():void{if(waitObserver||!window.MutationObserver||!document.documentElement)return;waitObserver=new MutationObserver(evaluateWaiters);waitObserver.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','src','srcset']});}
function waitFor(predicate:()=>boolean,timeout:number):Promise<void>{return new Promise<void>(function(resolve){function start():void{if(predicate()){resolve();return;}var waiter:Waiter={predicate:predicate,resolve:resolve,timer:0,settled:false};waiters.push(waiter);ensureWaitObserver();waiter.timer=window.setTimeout(function(){finishWaiter(waiter);},timeout);}if(document.documentElement)start();else document.addEventListener('DOMContentLoaded',start,{once:true});});}

/* Esperas mínimas antes de habilitar motion dependiente del layout. */
function waitForCatalogLayout():Promise<void>{if(!desktopQuery.matches)return Promise.resolve();return waitFor(function(){return!!(document.body&&document.body.classList.contains(K.catalogLayoutReady));},STABLE_LAYOUT_TIMEOUT);}
function waitForCatalogTools():Promise<void>{return waitFor(function(){return!!(document.body&&document.body.classList.contains('sc-catalog-tools-ready'));},STABLE_LAYOUT_TIMEOUT);}
function waitForMobileHeader():Promise<void>{if(desktopQuery.matches)return Promise.resolve();return waitFor(function(){return!!document.querySelector('body > .slicknav_menu.sc-mobile-main-menu');},MOBILE_HEADER_TIMEOUT);}
function waitForFonts():Promise<void>{if(!document.fonts||!document.fonts.ready)return Promise.resolve();return withTimeout(document.fonts.ready,FONT_TIMEOUT);}
function waitForStableLayout():Promise<void>{
  return whenDomReady().then(function(){
    var waits:Promise<void>[]=[waitForCatalogLayout(),waitForCatalogTools(),waitForMobileHeader()];
    if(desktopQuery.matches)waits.push(waitForFonts());
    return Promise.all(waits);
  }).then(function(){return new Promise<void>(afterLayoutFrame);});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',markInitialViewport,{once:true});else markInitialViewport();
SC.renderLifecycle={markInitialViewport:markInitialViewport,freezeInitialViewport:freezeInitialViewport,waitForStableLayout:waitForStableLayout};
})();
