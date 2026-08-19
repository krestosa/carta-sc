(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{},C=SC.config;
if(SC.__renderLifecycleBooted)return;SC.__renderLifecycleBooted=true;

/* Límites para esperar layout, fuentes y header sin bloquear el arranque. */
var STABLE_LAYOUT_TIMEOUT=900,FONT_TIMEOUT=1100,MOBILE_HEADER_TIMEOUT=500,desktopQuery=C.queries.desktop,waitObserver=null,waiters=[];

function afterLayoutFrame(resolve){requestAnimationFrame(function(){requestAnimationFrame(resolve);});}
function whenDomReady(){return document.readyState==='loading'?new Promise(function(resolve){document.addEventListener('DOMContentLoaded',resolve,{once:true});}):Promise.resolve();}
function withTimeout(promise,ms){return Promise.race([Promise.resolve(promise).catch(function(){}),new Promise(function(resolve){window.setTimeout(resolve,ms);})]);}

/* Compatibilidad con el bundler: el primer viewport ya no necesita preparación de reveal. */
function markInitialViewport(){}
function freezeInitialViewport(){}

/* Comparte un solo observer entre esperas de estado DOM. */
function disconnectWaitObserver(){if(waitObserver){waitObserver.disconnect();waitObserver=null;}}
function removeWaiter(waiter){var index=waiters.indexOf(waiter);if(index>=0)waiters.splice(index,1);if(!waiters.length)disconnectWaitObserver();}
function finishWaiter(waiter){if(waiter.settled)return;waiter.settled=true;if(waiter.timer)clearTimeout(waiter.timer);removeWaiter(waiter);waiter.resolve();}
function evaluateWaiters(){waiters.slice().forEach(function(waiter){if(!waiter.settled&&waiter.predicate())finishWaiter(waiter);});}
function ensureWaitObserver(){if(waitObserver||!window.MutationObserver||!document.documentElement)return;waitObserver=new MutationObserver(evaluateWaiters);waitObserver.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','src','srcset']});}
function waitFor(predicate,timeout){return new Promise(function(resolve){function start(){if(predicate()){resolve();return;}var waiter={predicate:predicate,resolve:resolve,timer:0,settled:false};waiters.push(waiter);ensureWaitObserver();waiter.timer=window.setTimeout(function(){finishWaiter(waiter);},timeout);}if(document.documentElement)start();else document.addEventListener('DOMContentLoaded',start,{once:true});});}

/* Esperas mínimas antes de habilitar motion dependiente del layout. */
function waitForCatalogLayout(){if(!desktopQuery.matches)return Promise.resolve();return waitFor(function(){return!!(document.body&&document.body.classList.contains(C.classes.catalogLayoutReady));},STABLE_LAYOUT_TIMEOUT);}
function waitForCatalogTools(){return waitFor(function(){return!!(document.body&&document.body.classList.contains('sc-catalog-tools-ready'));},STABLE_LAYOUT_TIMEOUT);}
function waitForMobileHeader(){if(desktopQuery.matches)return Promise.resolve();return waitFor(function(){return!!document.querySelector('body > .slicknav_menu.sc-mobile-main-menu');},MOBILE_HEADER_TIMEOUT);}
function waitForFonts(){if(!document.fonts||!document.fonts.ready)return Promise.resolve();return withTimeout(document.fonts.ready,FONT_TIMEOUT);}
function waitForStableLayout(){return whenDomReady().then(function(){var waits=[waitForCatalogLayout(),waitForCatalogTools(),waitForMobileHeader()];if(desktopQuery.matches)waits.push(waitForFonts());return Promise.all(waits);}).then(function(){return new Promise(afterLayoutFrame);});}

SC.renderLifecycle={markInitialViewport:markInitialViewport,freezeInitialViewport:freezeInitialViewport,waitForStableLayout:waitForStableLayout};
})();