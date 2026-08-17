(function(){
'use strict';
if(window.__scMotionCoreBooted)return;window.__scMotionCoreBooted=true;

var SC=window.SCOverride=window.SCOverride||{},C=SC.config||{},M=C.motion||{},URL=C.urls||{},MEDIA=C.media||{};
var readyQueue=[],loadedQueue=[],deps=null,unlocked=false,refreshLifecycleInstalled=false,refreshTimer=0,lastRefreshAt=0,refreshing=false,REFRESH_DELAY=120,MIN_REFRESH_GAP=120;
var IDS={core:'sc-gsap-core',morphSVG:'sc-gsap-morphsvg',scrollTrigger:'sc-gsap-scrolltrigger',splitText:'sc-gsap-splittext'};
var SOURCES={core:URL.gsap,morphSVG:URL.morphSVG,scrollTrigger:URL.scrollTrigger,splitText:URL.splitText};
var ROOT=document.documentElement;
if(ROOT)ROOT.classList.add('sc-motion-dependencies-loading');

function reduced(){return (C.queries&&C.queries.reducedMotion?C.queries.reducedMotion:window.matchMedia(MEDIA.reducedMotion)).matches;}
function globalReady(name){return!!(name&&window[name]);}
function loadScript(src,id,globalName){
  return new Promise(function(resolve,reject){
    if(globalReady(globalName))return resolve(window[globalName]);
    if(!src)return reject(new Error('[SushiClub motion] Falta URL para '+id));
    var old=document.getElementById(id);
    if(old){
      if(old.dataset.loaded==='true'||globalReady(globalName))return resolve(window[globalName]||true);
      old.addEventListener('load',function(){
        if(globalName&&!globalReady(globalName))return reject(new Error('[SushiClub motion] '+globalName+' no quedó disponible'));
        resolve(window[globalName]||true);
      },{once:true});
      old.addEventListener('error',function(){reject(new Error('[SushiClub motion] No se pudo cargar '+src));},{once:true});
      return;
    }
    var script=document.createElement('script');
    script.id=id;script.src=src;script.async=true;
    script.onload=function(){
      script.dataset.loaded='true';
      if(globalName&&!globalReady(globalName))return reject(new Error('[SushiClub motion] '+globalName+' no quedó disponible'));
      resolve(window[globalName]||true);
    };
    script.onerror=function(){reject(new Error('[SushiClub motion] No se pudo cargar '+src));};
    document.head.appendChild(script);
  });
}
function flushQueue(queue){var callbacks=queue.splice(0);callbacks.forEach(function(fn){try{fn(deps);}catch(error){if(window.console&&console.error)console.error('[SushiClub motion]',error);}});}
function whenLoaded(fn){if(typeof fn!=='function')return;if(deps)fn(deps);else loadedQueue.push(fn);}
function whenReady(fn){if(typeof fn!=='function')return;if(deps&&unlocked)fn(deps);else readyQueue.push(fn);}
function run(fn){if(!deps||!unlocked||typeof fn!=='function')return false;fn(deps);return true;}
function runLoaded(fn){if(!deps||typeof fn!=='function')return false;fn(deps);return true;}
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
  var opts=options||{},animate=opts.animate!==false,host=path.ownerSVGElement||path,gsap=deps&&deps.gsap,MorphSVGPlugin=deps&&deps.MorphSVGPlugin;
  clearIconMotion(host);
  if(!animate||reduced()||!gsap||!MorphSVGPlugin){
    var raw=typeof shape==='string'?shape:(shape.getAttribute&&shape.getAttribute('d'));
    if(raw)path.setAttribute('d',raw);
    return true;
  }
  var duration=Math.max(.16,Math.min(.5,opts.duration==null?.32:opts.duration)),state={timeline:null};
  host.__scIconMotion=state;
  state.timeline=gsap.timeline({onComplete:function(){if(host.__scIconMotion===state)host.__scIconMotion=null;}})
    .to(path,{duration:duration,ease:opts.ease||'power2.inOut',morphSVG:{shape:shape,map:opts.map||'complexity'},overwrite:'auto'},0);
  return true;
}

function bindMicroInteraction(control,target,options){
  if(!control||!target)return function(){};
  var opts=options||{},tween=null,destroyed=false,hover=false,focus=false,pressed=false;
  function focusVisible(){try{return control.matches(':focus-visible');}catch(_){return document.activeElement===control;}}
  function kill(){if(tween){try{tween.kill();}catch(_){}tween=null;}}
  function clear(){var g=deps&&deps.gsap;if(g)g.set(target,{clearProps:'transform,willChange'});else{target.style.removeProperty('transform');target.style.removeProperty('will-change');}}
  function activeAngle(){var a=opts.active&&Number(opts.active.rotation);return Number.isFinite(a)&&a?a:(opts.rotation==null?6:Number(opts.rotation)||6);}
  function pressAngle(){var a=opts.press&&Number(opts.press.rotation);if(Number.isFinite(a)&&a)return a;return-activeAngle()*.58;}
  function home(duration){
    if(destroyed)return;kill();var g=deps&&deps.gsap;if(!g||reduced()){clear();return;}
    g.set(target,{willChange:'transform'});
    tween=g.to(target,{rotation:0,duration:duration==null?.085:duration,ease:'power3.out',overwrite:'auto',transformOrigin:opts.transformOrigin||'50% 50%',force3D:true,onComplete:function(){tween=null;clear();}});
  }
  function pulse(kind){
    if(destroyed)return;kill();var g=deps&&deps.gsap;if(!g||reduced()){clear();return;}
    var angle=kind==='press'?pressAngle():activeAngle(),out=kind==='press'?.07:.095,back=kind==='press'?.105:.135;
    g.set(target,{willChange:'transform',transformOrigin:opts.transformOrigin||'50% 50%'});
    tween=g.timeline({onComplete:function(){tween=null;clear();}})
      .to(target,{rotation:angle,duration:out,ease:'power2.out',overwrite:'auto',force3D:true},0)
      .to(target,{rotation:0,duration:back,ease:'power3.out',overwrite:'auto',force3D:true},out);
  }
  function pointerEnter(event){if(event.pointerType==='touch')return;if(!hover){hover=true;pulse('active');}}
  function pointerLeave(){hover=false;pressed=false;home(.075);}
  function pointerDown(){pressed=true;pulse('press');}
  function pointerUp(){pressed=false;if(!hover&&!focus)home(.07);}
  function focusIn(){var visible=focusVisible();if(visible&&!focus){focus=true;pulse('active');}}
  function focusOut(){focus=false;pressed=false;home(.075);}
  function keyDown(event){if(event.repeat||(event.key!=='Enter'&&event.key!==' '))return;pressed=true;pulse('press');}
  function keyUp(event){if(event.key!=='Enter'&&event.key!==' ')return;pressed=false;home(.07);}
  control.addEventListener('pointerenter',pointerEnter);control.addEventListener('pointerleave',pointerLeave);control.addEventListener('pointerdown',pointerDown);control.addEventListener('pointerup',pointerUp);control.addEventListener('pointercancel',pointerLeave);control.addEventListener('focus',focusIn);control.addEventListener('blur',focusOut);control.addEventListener('keydown',keyDown);control.addEventListener('keyup',keyUp);
  return function(){
    if(destroyed)return;destroyed=true;
    control.removeEventListener('pointerenter',pointerEnter);control.removeEventListener('pointerleave',pointerLeave);control.removeEventListener('pointerdown',pointerDown);control.removeEventListener('pointerup',pointerUp);control.removeEventListener('pointercancel',pointerLeave);control.removeEventListener('focus',focusIn);control.removeEventListener('blur',focusOut);control.removeEventListener('keydown',keyDown);control.removeEventListener('keyup',keyUp);
    kill();clear();
  };
}

function installRefreshLifecycle(){if(refreshLifecycleInstalled||!deps||!unlocked)return;refreshLifecycleInstalled=true;if(document.readyState==='complete')refresh(REFRESH_DELAY);else window.addEventListener('load',function(){refresh(REFRESH_DELAY);},{once:true});if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(REFRESH_DELAY);}).catch(function(){});}
function initialize(){
  if(!window.gsap||!window.MorphSVGPlugin||!window.ScrollTrigger||!window.SplitText)throw new Error('[SushiClub motion] Dependencias GSAP incompletas');
  window.gsap.registerPlugin(window.MorphSVGPlugin,window.ScrollTrigger,window.SplitText);
  window.ScrollTrigger.config({limitCallbacks:true});
  deps={gsap:window.gsap,MorphSVGPlugin:window.MorphSVGPlugin,ScrollTrigger:window.ScrollTrigger,SplitText:window.SplitText};
  if(ROOT){ROOT.classList.remove('sc-motion-dependencies-loading');ROOT.classList.add('sc-motion-dependencies-ready');}
  flushQueue(loadedQueue);
  if(unlocked){installRefreshLifecycle();flushQueue(readyQueue);}
  return deps;
}
function loadDependencies(){
  return loadScript(SOURCES.core,IDS.core,'gsap').then(function(){
    return Promise.all([
      loadScript(SOURCES.morphSVG,IDS.morphSVG,'MorphSVGPlugin'),
      loadScript(SOURCES.scrollTrigger,IDS.scrollTrigger,'ScrollTrigger'),
      loadScript(SOURCES.splitText,IDS.splitText,'SplitText')
    ]);
  }).then(initialize).catch(function(error){
    if(ROOT){ROOT.classList.remove('sc-motion-dependencies-loading');ROOT.classList.add('sc-motion-dependencies-failed');}
    if(window.console&&console.error)console.error('[SushiClub motion]',error);
    throw error;
  });
}
var dependencyPromise=loadDependencies();
function ready(){return dependencyPromise;}
function prepare(){return dependencyPromise;}
function unlock(){if(unlocked)return;unlocked=true;if(deps){installRefreshLifecycle();flushQueue(readyQueue);}}

SC.motion={
  ready:ready,
  prepare:prepare,
  whenLoaded:whenLoaded,
  whenReady:whenReady,
  run:run,
  runLoaded:runLoaded,
  refresh:refresh,
  reduced:reduced,
  morphIcon:morphIcon,
  bindMicroInteraction:bindMicroInteraction,
  unlock:unlock,
  isReady:function(){return!!(deps&&unlocked);},
  isLoaded:function(){return!!deps;},
  isMorphReady:function(){return!!(deps&&deps.MorphSVGPlugin);}
};
})();