(function(){
'use strict';
if(window.__scMotionCoreBooted)return;window.__scMotionCoreBooted=true;

var SC=window.SCOverride=window.SCOverride||{},C=SC.config||{},M=C.motion||{},URL=C.urls||{},MEDIA=C.media||{};
var queue=[],deps=null,unlocked=false,dependenciesRequested=false,dependencyArmed=false,dependencyIdle=0,dependencyTimer=0,dependencyFallback=0,refreshLifecycleInstalled=false,refreshTimer=0,lastRefreshAt=0,refreshing=false,REFRESH_DELAY=120,MIN_REFRESH_GAP=120;
var IDS={core:'sc-gsap-core',scrollTrigger:'sc-gsap-scrolltrigger'};
var GSAP_SRC=URL.gsap,ST_SRC=URL.scrollTrigger;

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
function loadPlugins(done){loadScript(ST_SRC,IDS.scrollTrigger,done);}
function flush(){if(!unlocked||!deps)return;var callbacks=queue.splice(0);callbacks.forEach(function(fn){try{fn(deps);}catch(error){if(window.console&&console.error)console.error('[SushiClub motion]',error);}});}
function whenReady(fn){if(typeof fn!=='function')return;if(unlocked&&deps)fn(deps);else queue.push(fn);}
function run(fn){if(!deps||!unlocked||typeof fn!=='function')return false;fn(deps);return true;}
function runRefresh(){refreshTimer=0;if(!deps||!deps.ScrollTrigger||refreshing)return;refreshing=true;lastRefreshAt=performance.now();try{deps.ScrollTrigger.refresh();}catch(error){if(!(error&&error.name==='SecurityError')&&window.console&&console.error)console.error('[SushiClub motion]',error);}finally{refreshing=false;}}
function refresh(delay){if(!deps||!deps.ScrollTrigger)return;if(refreshTimer)window.clearTimeout(refreshTimer);var requested=Math.max(0,delay==null?0:delay),elapsed=performance.now()-lastRefreshAt,wait=Math.max(requested,Math.max(0,MIN_REFRESH_GAP-elapsed));refreshTimer=window.setTimeout(runRefresh,wait);}

function clearIconMotion(host){
  var state=host&&host.__scIconMotion;
  if(!state)return;
  if(state.timeline)try{state.timeline.kill();}catch(_){}
  host.__scIconMotion=null;
}
function morphIcon(path,shape,options){
  if(!path||!shape)return false;
  if(path.getAttribute('d')===shape)return true;

  var opts=options||{},animate=opts.animate!==false,host=path.ownerSVGElement||path;
  clearIconMotion(host);

  if(!animate||reduced()){
    path.setAttribute('d',shape);
    return true;
  }

  var gsap=deps&&unlocked&&deps.gsap;
  if(!gsap){
    /* Dependencies are intentionally lazy. Before GSAP is ready, prefer an
       immediate correct glyph over a second animation engine with different
       SVG timing characteristics across browsers. */
    path.setAttribute('d',shape);
    return true;
  }

  var duration=Math.max(.14,Math.min(.28,opts.duration==null?.22:opts.duration)),
      out=Math.max(.06,duration*.38),
      back=Math.max(.08,duration-out),
      state={timeline:null,target:shape};

  host.__scIconMotion=state;
  state.timeline=gsap.timeline({
    onComplete:function(){
      if(host.__scIconMotion!==state)return;
      gsap.set(host,{clearProps:'transform,opacity,visibility'});
      host.__scIconMotion=null;
    }
  });
  state.timeline
    .to(host,{scale:.8,autoAlpha:.18,duration:out,ease:'power2.in',transformOrigin:'50% 50%',force3D:false,onComplete:function(){path.setAttribute('d',shape);}},0)
    .to(host,{scale:1,autoAlpha:1,duration:back,ease:'power3.out',transformOrigin:'50% 50%',force3D:false},out);

  return true;
}

function installRefreshLifecycle(){if(refreshLifecycleInstalled||!deps||!unlocked)return;refreshLifecycleInstalled=true;if(document.readyState==='complete')refresh(REFRESH_DELAY);else window.addEventListener('load',function(){refresh(REFRESH_DELAY);},{once:true});if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(REFRESH_DELAY);}).catch(function(){});}
function requestDependencies(){
  if(dependenciesRequested||deps)return;dependenciesRequested=true;dependencyIdle=0;dependencyTimer=0;
  loadScript(GSAP_SRC,IDS.core,function(ok){if(!ok)return;loadPlugins(function(pluginsOk){if(pluginsOk)initialize();});});
}
function disarmDependencyTriggers(){
  if(!dependencyArmed)return;dependencyArmed=false;
  window.removeEventListener('pointerdown',triggerDependencies);window.removeEventListener('touchstart',triggerDependencies);window.removeEventListener('wheel',triggerDependencies);window.removeEventListener('keydown',triggerDependencies);
  if(dependencyFallback){window.clearTimeout(dependencyFallback);dependencyFallback=0;}
}
function triggerDependencies(event){
  if(event&&event.type==='keydown'&&/^(Shift|Control|Alt|Meta|CapsLock|Tab)$/.test(event.key||''))return;
  disarmDependencyTriggers();if(!unlocked||dependenciesRequested||deps)return;
  if(SC.renderLifecycle&&SC.renderLifecycle.freezeInitialViewport)SC.renderLifecycle.freezeInitialViewport();
  function request(){dependencyIdle=0;dependencyTimer=0;if(unlocked)requestDependencies();}
  if(typeof window.requestIdleCallback==='function'){dependencyIdle=window.requestIdleCallback(request,{timeout:300});return;}
  dependencyTimer=window.setTimeout(request,0);
}
function armDependencyTriggers(){
  if(dependencyArmed||dependenciesRequested||deps)return;dependencyArmed=true;
  window.addEventListener('pointerdown',triggerDependencies,{passive:true});window.addEventListener('touchstart',triggerDependencies,{passive:true});window.addEventListener('wheel',triggerDependencies,{passive:true});window.addEventListener('keydown',triggerDependencies);
  dependencyFallback=window.setTimeout(function(){triggerDependencies();},30000);
}
function unlock(){if(unlocked)return;unlocked=true;armDependencyTriggers();installRefreshLifecycle();flush();}
function initialize(){if(!window.gsap||!window.ScrollTrigger)return;window.gsap.registerPlugin(window.ScrollTrigger);window.ScrollTrigger.config({limitCallbacks:true});deps={gsap:window.gsap,ScrollTrigger:window.ScrollTrigger};installRefreshLifecycle();flush();}

SC.motion={whenReady:whenReady,run:run,refresh:refresh,reduced:reduced,morphIcon:morphIcon,unlock:unlock,isReady:function(){return!!(deps&&unlocked);},isMorphReady:function(){return true;}};

})();
