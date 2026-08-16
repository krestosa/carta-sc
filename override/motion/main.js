(function(){
'use strict';
if(window.__scMotionCoreBooted)return;window.__scMotionCoreBooted=true;

var SC=window.SCOverride=window.SCOverride||{},C=SC.config||{},M=C.motion||{},URL=C.urls||{},MEDIA=C.media||{};
var queue=[],deps=null,unlocked=false,refreshLifecycleInstalled=false,refreshTimer=0,lastRefreshAt=0,refreshing=false,REFRESH_DELAY=120,MIN_REFRESH_GAP=120;
var IDS={core:'sc-gsap-core',scrollTrigger:'sc-gsap-scrolltrigger'};
var GSAP_SRC=URL.gsap,ST_SRC=URL.scrollTrigger;

function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function reduced(){return (C.queries&&C.queries.reducedMotion?C.queries.reducedMotion:window.matchMedia(MEDIA.reducedMotion)).matches;}
function loadScript(src,id,done){
  if(!src)return done(false);
  var old=document.getElementById(id);
  if(old){
    if(old.dataset.loaded==='true'||(id===IDS.core&&window.gsap)||(id===IDS.scrollTrigger&&window.ScrollTrigger))return done(true);
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
  loadScript(ST_SRC,IDS.scrollTrigger,done);
}
function flush(){
  if(!unlocked||!deps)return;
  var callbacks=queue.splice(0);
  callbacks.forEach(function(fn){try{fn(deps);}catch(error){if(window.console&&console.error)console.error('[SushiClub motion]',error);}});
}
function whenReady(fn){if(typeof fn!=='function')return;if(unlocked&&deps)fn(deps);else queue.push(fn);}
function run(fn){if(!deps||!unlocked||typeof fn!=='function')return false;fn(deps);return true;}
function runRefresh(){
  refreshTimer=0;if(!deps||!deps.ScrollTrigger||refreshing)return;
  refreshing=true;lastRefreshAt=performance.now();
  try{deps.ScrollTrigger.refresh();}
  catch(error){if(!(error&&error.name==='SecurityError')&&window.console&&console.error)console.error('[SushiClub motion]',error);}
  finally{refreshing=false;}
}
function refresh(delay){
  if(!deps||!deps.ScrollTrigger)return;
  if(refreshTimer)window.clearTimeout(refreshTimer);
  var requested=Math.max(0,delay==null?0:delay),elapsed=performance.now()-lastRefreshAt,wait=Math.max(requested,Math.max(0,MIN_REFRESH_GAP-elapsed));
  refreshTimer=window.setTimeout(runRefresh,wait);
}
function clearIconMotion(host){
  var state=host&&host.__scIconMotion;if(!state)return;
  if(state.timer)window.clearTimeout(state.timer);
  if(state.animation)try{state.animation.cancel();}catch(_){}
  host.__scIconMotion=null;
}
function morphIcon(path,shape,options){
  if(!path||!shape)return false;
  if(path.getAttribute('d')===shape)return true;
  var opts=options||{},animate=opts.animate!==false,host=path.ownerSVGElement||path;
  clearIconMotion(host);
  if(!animate||reduced()||!host.animate){path.setAttribute('d',shape);return true;}
  var requested=(opts.duration==null?.18:opts.duration)*1000,duration=Math.max(110,Math.min(220,requested)),state={animation:null,timer:0,target:shape};
  host.__scIconMotion=state;
  state.timer=window.setTimeout(function(){if(host.__scIconMotion===state)path.setAttribute('d',shape);},duration*.46);
  state.animation=host.animate([
    {opacity:1,transform:'scale(1)',offset:0},
    {opacity:.18,transform:'scale(.78)',offset:.46},
    {opacity:.18,transform:'scale(.78)',offset:.54},
    {opacity:1,transform:'scale(1)',offset:1}
  ],{duration:duration,easing:'cubic-bezier(.23,1,.32,1)'});
  state.animation.onfinish=function(){
    if(host.__scIconMotion!==state)return;
    if(state.timer)window.clearTimeout(state.timer);path.setAttribute('d',shape);host.__scIconMotion=null;
  };
  state.animation.oncancel=function(){if(host.__scIconMotion===state)host.__scIconMotion=null;};
  return true;
}
function installRefreshLifecycle(){
  if(refreshLifecycleInstalled||!deps||!unlocked)return;refreshLifecycleInstalled=true;
  if(document.readyState==='complete')refresh(REFRESH_DELAY);else window.addEventListener('load',function(){refresh(REFRESH_DELAY);},{once:true});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(REFRESH_DELAY);}).catch(function(){});
}
function unlock(){unlocked=true;installRefreshLifecycle();flush();}
function initialize(){
  if(!window.gsap||!window.ScrollTrigger)return;
  window.gsap.registerPlugin(window.ScrollTrigger);
  window.ScrollTrigger.config({limitCallbacks:true});
  deps={gsap:window.gsap,ScrollTrigger:window.ScrollTrigger};
  installRefreshLifecycle();flush();
}

SC.motion={whenReady:whenReady,run:run,refresh:refresh,reduced:reduced,morphIcon:morphIcon,unlock:unlock,isReady:function(){return!!(deps&&unlocked);},isMorphReady:function(){return true;}};

ready(function(){
  loadScript(GSAP_SRC,IDS.core,function(ok){if(!ok)return;loadPlugins(function(pluginsOk){if(pluginsOk)initialize();});});
});
})();
