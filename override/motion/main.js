(function(){
'use strict';
if(window.__scMotionCoreBooted)return;window.__scMotionCoreBooted=true;

var SC=window.SCOverride=window.SCOverride||{};
var queue=[],deps=null,unlocked=false,refreshLifecycleInstalled=false,refreshTimer=0;
var GSAP_SRC='https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js';
var ST_SRC='https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js';
var SCROLL_TO_SRC='https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollToPlugin.min.js';

function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function reduced(){return window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
function loadScript(src,id,done){
  var old=document.getElementById(id);
  if(old){
    if(old.dataset.loaded==='true'||(id==='sc-gsap-core'&&window.gsap)||(id==='sc-gsap-scrolltrigger'&&window.ScrollTrigger)||(id==='sc-gsap-scrollto'&&window.ScrollToPlugin))return done(true);
    old.addEventListener('load',function(){done(true);},{once:true});
    old.addEventListener('error',function(){done(false);},{once:true});
    return;
  }
  var script=document.createElement('script');script.id=id;script.src=src;script.async=true;
  script.onload=function(){script.dataset.loaded='true';done(true);};
  script.onerror=function(){if(window.console&&console.warn)console.warn('[SushiClub motion] No se pudo cargar:',src);done(false);};
  document.head.appendChild(script);
}
function loadPlugins(done){
  var pending=2,failed=false;
  function complete(ok){if(!ok)failed=true;if(--pending===0)done(!failed);}
  loadScript(ST_SRC,'sc-gsap-scrolltrigger',complete);
  loadScript(SCROLL_TO_SRC,'sc-gsap-scrollto',complete);
}
function flush(){
  if(!unlocked||!deps)return;
  var callbacks=queue.splice(0);
  callbacks.forEach(function(fn){try{fn(deps);}catch(error){if(window.console&&console.error)console.error('[SushiClub motion]',error);}});
}
function whenReady(fn){if(typeof fn!=='function')return;if(unlocked&&deps)fn(deps);else queue.push(fn);}
function run(fn){if(!deps||!unlocked||typeof fn!=='function')return false;fn(deps);return true;}
function refresh(delay){
  if(!deps||!deps.ScrollTrigger)return;
  if(refreshTimer)window.clearTimeout(refreshTimer);
  refreshTimer=window.setTimeout(function(){
    refreshTimer=0;
    deps.ScrollTrigger.refresh();
  },delay==null?0:delay);
}
function installRefreshLifecycle(){
  if(refreshLifecycleInstalled||!deps||!unlocked)return;refreshLifecycleInstalled=true;
  if(document.readyState==='complete')refresh(120);else window.addEventListener('load',function(){refresh(120);},{once:true});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(120);}).catch(function(){});
}
function unlock(){unlocked=true;installRefreshLifecycle();flush();}
function initialize(){
  if(!window.gsap||!window.ScrollTrigger||!window.ScrollToPlugin)return;
  window.gsap.registerPlugin(window.ScrollTrigger,window.ScrollToPlugin);
  window.ScrollTrigger.config({limitCallbacks:true});
  if(window.ScrollToPlugin.config)window.ScrollToPlugin.config({autoKill:true});
  deps={gsap:window.gsap,ScrollTrigger:window.ScrollTrigger,ScrollToPlugin:window.ScrollToPlugin};
  installRefreshLifecycle();flush();
}

SC.motion={whenReady:whenReady,run:run,refresh:refresh,reduced:reduced,unlock:unlock,isReady:function(){return!!(deps&&unlocked);}};

ready(function(){
  loadScript(GSAP_SRC,'sc-gsap-core',function(ok){
    if(!ok)return;
    loadPlugins(function(pluginsOk){if(pluginsOk)initialize();});
  });
});
})();