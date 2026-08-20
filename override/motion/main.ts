(function(){
'use strict';
if(window.__scMotionCoreBooted)return;window.__scMotionCoreBooted=true;

/* Estado compartido y dependencias GSAP. */
var SC=window.SCOverride=window.SCOverride||{},C=SC.config||{},M=C.motion||{},URL=C.urls||{},MEDIA=C.media||{};
type MotionCallback=(deps:MotionDeps)=>void;
type MotionGlobalName='gsap'|'MorphSVGPlugin'|'ScrollTrigger'|'SplitText';
interface MicroPose { rotation?:number; }
interface MicroOptions {
  active?:MicroPose;press?:MicroPose;transformOrigin?:string;
  enterDuration?:number;exitDuration?:number;pressDuration?:number;pressReturnDuration?:number;
  enterEase?:string;exitEase?:string;
}
interface MorphOptions { animate?:boolean; duration?:number; ease?:string; map?:string; }
var readyQueue:MotionCallback[]=[],loadedQueue:MotionCallback[]=[],deps:MotionDeps|null=null,unlocked=false,refreshLifecycleInstalled=false,refreshTimer=0,lastRefreshAt=0,refreshing=false,REFRESH_DELAY=120,MIN_REFRESH_GAP=120;
var IDS={core:'sc-gsap-core',morphSVG:'sc-gsap-morphsvg',scrollTrigger:'sc-gsap-scrolltrigger',splitText:'sc-gsap-splittext'};
var SOURCES={core:URL.gsap as string|undefined,morphSVG:URL.morphSVG as string|undefined,scrollTrigger:URL.scrollTrigger as string|undefined,splitText:URL.splitText as string|undefined};
var ROOT=document.documentElement;ROOT.classList.add('sc-motion-dependencies-loading');

/* Carga scripts una sola vez y confirma su global. */
function reduced():boolean{return (C.queries&&C.queries.reducedMotion?C.queries.reducedMotion:window.matchMedia(MEDIA.reducedMotion)).matches;}
function globalValue(name:MotionGlobalName):unknown{
  if(name==='gsap')return window.gsap;
  if(name==='MorphSVGPlugin')return window.MorphSVGPlugin;
  if(name==='ScrollTrigger')return window.ScrollTrigger;
  return window.SplitText;
}
function globalReady(name:MotionGlobalName):boolean{return!!globalValue(name);}
function loadScript(src:string|undefined,id:string,globalName:MotionGlobalName):Promise<unknown>{
  return new Promise<unknown>(function(resolve,reject){
    if(globalReady(globalName))return resolve(globalValue(globalName));
    if(!src)return reject(new Error('[SushiClub motion] Falta URL para '+id));
    var old=document.getElementById(id) as HTMLScriptElement|null;
    if(old){
      if(old.dataset.loaded==='true'||globalReady(globalName))return resolve(globalValue(globalName)||true);
      old.addEventListener('load',function(){if(!globalReady(globalName))return reject(new Error('[SushiClub motion] '+globalName+' no quedó disponible'));resolve(globalValue(globalName)||true);},{once:true});
      old.addEventListener('error',function(){reject(new Error('[SushiClub motion] No se pudo cargar '+src));},{once:true});return;
    }
    var script=document.createElement('script');script.id=id;script.src=src;script.async=true;
    script.onload=function(){script.dataset.loaded='true';if(!globalReady(globalName))return reject(new Error('[SushiClub motion] '+globalName+' no quedó disponible'));resolve(globalValue(globalName)||true);};
    script.onerror=function(){reject(new Error('[SushiClub motion] No se pudo cargar '+src));};document.head.appendChild(script);
  });
}

/* Ejecuta callbacks cuando las dependencias están cargadas o habilitadas. */
function flushQueue(queue:MotionCallback[]):void{var callbacks=queue.splice(0);callbacks.forEach(function(fn:MotionCallback){if(!deps)return;try{fn(deps);}catch(error){console.error('[SushiClub motion]',error);}});}
function whenLoaded(fn:MotionCallback):void{if(typeof fn!=='function')return;if(deps)fn(deps);else loadedQueue.push(fn);}
function whenReady(fn:MotionCallback):void{if(typeof fn!=='function')return;if(deps&&unlocked)fn(deps);else readyQueue.push(fn);}
function run(fn:MotionCallback):boolean{if(!deps||!unlocked||typeof fn!=='function')return false;fn(deps);return true;}
function runLoaded(fn:MotionCallback):boolean{if(!deps||typeof fn!=='function')return false;fn(deps);return true;}

/* Agrupa refresh de ScrollTrigger para evitar trabajo repetido. */
function runRefresh():void{
  refreshTimer=0;if(!deps||!deps.ScrollTrigger||refreshing)return;refreshing=true;lastRefreshAt=performance.now();
  try{deps.ScrollTrigger.refresh();}catch(error){if(!(error instanceof DOMException&&error.name==='SecurityError'))console.error('[SushiClub motion]',error);}finally{refreshing=false;}
}
function refresh(delay?:number|null):void{if(!deps||!deps.ScrollTrigger)return;if(refreshTimer)window.clearTimeout(refreshTimer);var requested=Math.max(0,delay==null?0:delay),elapsed=performance.now()-lastRefreshAt,wait=Math.max(requested,Math.max(0,MIN_REFRESH_GAP-elapsed));refreshTimer=window.setTimeout(runRefresh,wait);}

/* Cambia geometría de iconos con MorphSVG o aplica el path directo. */
function clearIconMotion(host:SVGElement):void{var state=host.__scIconMotion;if(!state)return;if(state.timeline)try{state.timeline.kill();}catch(_error){}host.__scIconMotion=null;}
function morphIcon(path:SVGPathElement,shape:string|Element,options?:MorphOptions):boolean{
  if(!path||!shape)return false;var opts=options||{},animate=opts.animate!==false,host=(path.ownerSVGElement||path) as SVGElement,gsap=deps&&deps.gsap,MorphSVGPlugin=deps&&deps.MorphSVGPlugin;clearIconMotion(host);
  if(!animate||reduced()||!gsap||!MorphSVGPlugin){var raw=typeof shape==='string'?shape:shape.getAttribute('d');if(raw)path.setAttribute('d',raw);return true;}
  var duration=Math.max(.16,Math.min(.5,opts.duration==null?.32:opts.duration)),state:IconMotionState={timeline:null};host.__scIconMotion=state;
  state.timeline=gsap.timeline({onComplete:function(){if(host.__scIconMotion===state)host.__scIconMotion=null;}}).to(path,{duration:duration,ease:opts.ease||'power2.inOut',morphSVG:{shape:shape,map:opts.map||'complexity'},overwrite:'auto'},0);return true;
}

/* Unifica hover, foco, presión y teclado en microinteracciones. */
function bindMicroInteraction(control:HTMLElement,target:HTMLElement,options?:MicroOptions):()=>void{
  if(!control||!target)return function(){};
  var opts=options||{},tween:GsapTween|null=null,destroyed=false,hover=false,focus=false,pressed=false;
  function focusVisible():boolean{try{return control.matches(':focus-visible');}catch(_error){return document.activeElement===control;}}
  function kill():void{if(tween){try{tween.kill();}catch(_error){}tween=null;}}
  function angle(kind:'active'|'press'):number{var source=opts[kind],value=source&&Number(source.rotation);if(Number.isFinite(value)&&value)return value;return kind==='press'?-6:12;}
  function clear():void{var g=deps&&deps.gsap;if(g)g.set(target,{clearProps:'transform,willChange'});else{target.style.removeProperty('transform');target.style.removeProperty('will-change');}}
  function tweenTo(rotation:number,duration:number,ease:string,clearAtEnd:boolean):void{
    if(destroyed)return;kill();var g=deps&&deps.gsap;if(!g||reduced()){clear();return;}
    g.set(target,{willChange:'transform',transformOrigin:opts.transformOrigin||'50% 50%'});
    tween=g.to(target,{rotation:rotation,duration:duration,ease:ease,overwrite:'auto',force3D:true,onComplete:function(){tween=null;target.style.removeProperty('will-change');if(clearAtEnd)clear();}});
  }
  function active():void{tweenTo(angle('active'),opts.enterDuration==null?.1:opts.enterDuration,opts.enterEase||'power3.out',false);}
  function home():void{tweenTo(0,opts.exitDuration==null?.14:opts.exitDuration,opts.exitEase||'power3.out',true);}
  function press():void{
    if(destroyed)return;kill();var g=deps&&deps.gsap;if(!g||reduced()){clear();return;}var returnAngle=(hover||focus)?angle('active'):0;
    g.set(target,{willChange:'transform',transformOrigin:opts.transformOrigin||'50% 50%'});
    tween=g.timeline({onComplete:function(){tween=null;target.style.removeProperty('will-change');if(returnAngle===0)clear();}})
      .to(target,{rotation:angle('press'),duration:opts.pressDuration==null?.055:opts.pressDuration,ease:'power2.out',overwrite:'auto',force3D:true},0)
      .to(target,{rotation:returnAngle,duration:opts.pressReturnDuration==null?.085:opts.pressReturnDuration,ease:'power3.out',overwrite:'auto',force3D:true});
  }
  function pointerEnter(event:PointerEvent):void{if(event.pointerType==='touch')return;if(!hover){hover=true;if(!pressed)active();}}
  function pointerLeave():void{hover=false;pressed=false;if(focus)active();else home();}
  function pointerDown():void{pressed=true;press();}
  function pointerUp():void{pressed=false;if(hover||focus)active();else home();}
  function focusIn():void{var visible=focusVisible();if(visible&&!focus){focus=true;if(!pressed)active();}}
  function focusOut():void{focus=false;pressed=false;if(hover)active();else home();}
  function keyDown(event:KeyboardEvent):void{if(event.repeat||(event.key!=='Enter'&&event.key!==' '))return;pressed=true;press();}
  function keyUp(event:KeyboardEvent):void{if(event.key!=='Enter'&&event.key!==' ')return;pressed=false;if(hover||focus)active();else home();}
  control.addEventListener('pointerenter',pointerEnter);control.addEventListener('pointerleave',pointerLeave);control.addEventListener('pointerdown',pointerDown);control.addEventListener('pointerup',pointerUp);control.addEventListener('pointercancel',pointerLeave);control.addEventListener('focus',focusIn);control.addEventListener('blur',focusOut);control.addEventListener('keydown',keyDown);control.addEventListener('keyup',keyUp);
  return function():void{if(destroyed)return;destroyed=true;control.removeEventListener('pointerenter',pointerEnter);control.removeEventListener('pointerleave',pointerLeave);control.removeEventListener('pointerdown',pointerDown);control.removeEventListener('pointerup',pointerUp);control.removeEventListener('pointercancel',pointerLeave);control.removeEventListener('focus',focusIn);control.removeEventListener('blur',focusOut);control.removeEventListener('keydown',keyDown);control.removeEventListener('keyup',keyUp);kill();clear();};
}

/* Inicializa GSAP y habilita refresh después de layout/fuentes. */
function installRefreshLifecycle():void{if(refreshLifecycleInstalled||!deps||!unlocked)return;refreshLifecycleInstalled=true;if(document.readyState==='complete')refresh(REFRESH_DELAY);else window.addEventListener('load',function(){refresh(REFRESH_DELAY);},{once:true});if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(REFRESH_DELAY);}).catch(function(){});}
function initialize():MotionDeps{
  if(!window.gsap||!window.MorphSVGPlugin||!window.ScrollTrigger||!window.SplitText)throw new Error('[SushiClub motion] Dependencias GSAP incompletas');
  window.gsap.registerPlugin(window.MorphSVGPlugin,window.ScrollTrigger,window.SplitText);window.ScrollTrigger.config({limitCallbacks:true});
  deps={gsap:window.gsap,MorphSVGPlugin:window.MorphSVGPlugin,ScrollTrigger:window.ScrollTrigger,SplitText:window.SplitText};
  ROOT.classList.remove('sc-motion-dependencies-loading');ROOT.classList.remove('sc-motion-dependencies-failed');ROOT.classList.add('sc-motion-dependencies-ready');
  flushQueue(loadedQueue);if(unlocked){installRefreshLifecycle();flushQueue(readyQueue);}return deps;
}
function loadDependencies():Promise<MotionDeps|null>{
  return loadScript(SOURCES.core,IDS.core,'gsap').then(function(){return Promise.all([loadScript(SOURCES.morphSVG,IDS.morphSVG,'MorphSVGPlugin'),loadScript(SOURCES.scrollTrigger,IDS.scrollTrigger,'ScrollTrigger'),loadScript(SOURCES.splitText,IDS.splitText,'SplitText')]);}).then(function(){return initialize();}).catch(function(error:unknown){ROOT.classList.remove('sc-motion-dependencies-loading');ROOT.classList.add('sc-motion-dependencies-failed');console.error('[SushiClub motion]',error);return null;});
}
var dependencyPromise:Promise<MotionDeps|null>=loadDependencies();
function ready():Promise<MotionDeps|null>{return dependencyPromise;}
function prepare():Promise<MotionDeps|null>{return dependencyPromise;}
function unlock():void{if(unlocked)return;unlocked=true;if(deps){installRefreshLifecycle();flushQueue(readyQueue);}}
SC.motion={ready:ready,prepare:prepare,whenLoaded:whenLoaded,whenReady:whenReady,run:run,runLoaded:runLoaded,refresh:refresh,reduced:reduced,morphIcon:morphIcon,bindMicroInteraction:bindMicroInteraction,unlock:unlock,isReady:function(){return!!(deps&&unlocked);},isLoaded:function(){return!!deps;},isMorphReady:function(){return!!(deps&&deps.MorphSVGPlugin);}};
})();
