(function(){
'use strict';
if(window.__scMotionCoreBooted)return;window.__scMotionCoreBooted=true;

/* Estado compartido y dependencia GSAP. */
var SC=window.SCOverride=window.SCOverride||{},C=SC.config||{},M=C.motion||{},URL=C.urls||{},MEDIA=C.media||{};
var readyQueue=[],loadedQueue=[],deps=null,unlocked=false,curveCache={};
var CORE_ID='sc-gsap-core',ROOT=document.documentElement;
if(ROOT)ROOT.classList.add('sc-motion-dependencies-loading');

function reduced(){return (C.queries&&C.queries.reducedMotion?C.queries.reducedMotion:window.matchMedia(MEDIA.reducedMotion)).matches;}
function loadScript(src,id,globalName){
  return new Promise(function(resolve,reject){
    if(globalName&&window[globalName])return resolve(window[globalName]);
    if(!src)return reject(new Error('[SushiClub motion] Falta URL para '+id));
    var old=document.getElementById(id);
    if(old){
      if(old.dataset.loaded==='true'||(globalName&&window[globalName]))return resolve(window[globalName]||true);
      old.addEventListener('load',function(){if(globalName&&!window[globalName])return reject(new Error('[SushiClub motion] '+globalName+' no quedó disponible'));resolve(window[globalName]||true);},{once:true});
      old.addEventListener('error',function(){reject(new Error('[SushiClub motion] No se pudo cargar '+src));},{once:true});
      return;
    }
    var script=document.createElement('script');script.id=id;script.src=src;script.async=true;
    script.onload=function(){script.dataset.loaded='true';if(globalName&&!window[globalName])return reject(new Error('[SushiClub motion] '+globalName+' no quedó disponible'));resolve(window[globalName]||true);};
    script.onerror=function(){reject(new Error('[SushiClub motion] No se pudo cargar '+src));};document.head.appendChild(script);
  });
}

/* Convierte las curvas CSS compartidas en funciones numéricas para GSAP. */
function curve(name){
  var source=String(M.curves&&M.curves[name]||M.curves&&M.curves.standard||'cubic-bezier(.2,0,0,1)'),cached=curveCache[source];if(cached)return cached;
  var match=source.match(/cubic-bezier\(\s*([-+.\d]+)\s*,\s*([-+.\d]+)\s*,\s*([-+.\d]+)\s*,\s*([-+.\d]+)\s*\)/i);if(!match)return function(p){return p;};
  var x1=Number(match[1]),y1=Number(match[2]),x2=Number(match[3]),y2=Number(match[4]);
  function sample(a,b,t){var c=3*a,d=3*(b-a)-c,e=1-c-d;return((e*t+d)*t+c)*t;}
  function slope(a,b,t){var c=3*a,d=3*(b-a)-c,e=1-c-d;return(3*e*t+2*d)*t+c;}
  cached=function(p){if(p<=0)return 0;if(p>=1)return 1;var t=p;for(var i=0;i<5;i++){var x=sample(x1,x2,t)-p,m=slope(x1,x2,t);if(Math.abs(x)<1e-5||Math.abs(m)<1e-6)break;t=Math.max(0,Math.min(1,t-x/m));}return sample(y1,y2,t);};
  curveCache[source]=cached;return cached;
}

function flushQueue(queue){var callbacks=queue.splice(0);callbacks.forEach(function(fn){try{fn(deps);}catch(error){if(window.console&&console.error)console.error('[SushiClub motion]',error);}});}
function whenLoaded(fn){if(typeof fn!=='function')return;if(deps)fn(deps);else loadedQueue.push(fn);}
function whenReady(fn){if(typeof fn!=='function')return;if(deps&&unlocked)fn(deps);else readyQueue.push(fn);}
function run(fn){if(!deps||!unlocked||typeof fn!=='function')return false;fn(deps);return true;}
function runLoaded(fn){if(!deps||typeof fn!=='function')return false;fn(deps);return true;}
/* Conserva el contrato previo; no hay triggers globales que refrescar. */
function refresh(){}

function initialize(){
  if(!window.gsap)throw new Error('[SushiClub motion] GSAP no quedó disponible');deps={gsap:window.gsap};
  if(ROOT){ROOT.classList.remove('sc-motion-dependencies-loading');ROOT.classList.remove('sc-motion-dependencies-failed');ROOT.classList.add('sc-motion-dependencies-ready');}
  flushQueue(loadedQueue);if(unlocked)flushQueue(readyQueue);return deps;
}
function loadDependencies(){return loadScript(URL.gsap,CORE_ID,'gsap').then(initialize).catch(function(error){if(ROOT){ROOT.classList.remove('sc-motion-dependencies-loading');ROOT.classList.add('sc-motion-dependencies-failed');}if(window.console&&console.error)console.error('[SushiClub motion]',error);return null;});}
var dependencyPromise=loadDependencies();
function ready(){return dependencyPromise;}
function prepare(){return dependencyPromise;}
function unlock(){if(unlocked)return;unlocked=true;if(deps)flushQueue(readyQueue);}
SC.motion={ready:ready,prepare:prepare,whenLoaded:whenLoaded,whenReady:whenReady,run:run,runLoaded:runLoaded,refresh:refresh,reduced:reduced,curve:curve,unlock:unlock,isReady:function(){return!!(deps&&unlocked);},isLoaded:function(){return!!deps;}};
})();