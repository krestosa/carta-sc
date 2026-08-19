(function(){
'use strict';
if(window.__scMotionCoreBooted)return;window.__scMotionCoreBooted=true;

/* Estado compartido y dependencias GSAP. */
var SC=window.SCOverride=window.SCOverride||{},C=SC.config||{},M=C.motion||{},URL=C.urls||{},MEDIA=C.media||{};
var readyQueue=[],loadedQueue=[],deps=null,unlocked=false,refreshLifecycleInstalled=false,refreshTimer=0,lastRefreshAt=0,refreshing=false,REFRESH_DELAY=120,MIN_REFRESH_GAP=120;
var IDS={core:'sc-gsap-core',morphSVG:'sc-gsap-morphsvg',scrollTrigger:'sc-gsap-scrolltrigger',splitText:'sc-gsap-splittext'};
var SOURCES={core:URL.gsap,morphSVG:URL.morphSVG,scrollTrigger:URL.scrollTrigger,splitText:URL.splitText};
var ROOT=document.documentElement,springCache={};
if(ROOT)ROOT.classList.add('sc-motion-dependencies-loading');

/* Carga scripts una sola vez y confirma su global. */
function reduced(){return (C.queries&&C.queries.reducedMotion?C.queries.reducedMotion:window.matchMedia(MEDIA.reducedMotion)).matches;}
function globalReady(name){return!!(name&&window[name]);}
function loadScript(src,id,globalName){
  return new Promise(function(resolve,reject){
    if(globalReady(globalName))return resolve(window[globalName]);
    if(!src)return reject(new Error('[SushiClub motion] Falta URL para '+id));
    var old=document.getElementById(id);
    if(old){
      if(old.dataset.loaded==='true'||globalReady(globalName))return resolve(window[globalName]||true);
      old.addEventListener('load',function(){if(globalName&&!globalReady(globalName))return reject(new Error('[SushiClub motion] '+globalName+' no quedó disponible'));resolve(window[globalName]||true);},{once:true});
      old.addEventListener('error',function(){reject(new Error('[SushiClub motion] No se pudo cargar '+src));},{once:true});
      return;
    }
    var script=document.createElement('script');script.id=id;script.src=src;script.async=true;
    script.onload=function(){script.dataset.loaded='true';if(globalName&&!globalReady(globalName))return reject(new Error('[SushiClub motion] '+globalName+' no quedó disponible'));resolve(window[globalName]||true);};
    script.onerror=function(){reject(new Error('[SushiClub motion] No se pudo cargar '+src));};document.head.appendChild(script);
  });
}

/* Resuelve una respuesta de resorte normalizada y estable para GSAP. */
function springToken(kind,speed){
  var family=M.springs&&M.springs[kind]||M.springs&&M.springs.spatial||{},token=family[speed]||family.default;
  return token||{damping:1,stiffness:900};
}
function springValue(time,damping,stiffness){
  var omega=Math.sqrt(Math.max(.001,stiffness)),z=Math.max(.001,damping);
  if(z<1){
    var wd=omega*Math.sqrt(1-z*z),ratio=z/Math.sqrt(1-z*z);
    return 1-Math.exp(-z*omega*time)*(Math.cos(wd*time)+ratio*Math.sin(wd*time));
  }
  if(Math.abs(z-1)<.0001)return 1-Math.exp(-omega*time)*(1+omega*time);
  var root=Math.sqrt(z*z-1),r1=-omega*(z-root),r2=-omega*(z+root),c2=r1/(r1-r2),c1=1-c2;
  return 1-(c1*Math.exp(r1*time)+c2*Math.exp(r2*time));
}
function springDuration(damping,stiffness){
  var omega=Math.sqrt(Math.max(.001,stiffness)),threshold=.0015,duration=.08;
  if(damping<1){duration=-Math.log(threshold*Math.sqrt(Math.max(.001,1-damping*damping)))/(damping*omega);}
  else{for(duration=.08;duration<.75;duration+=.004)if(Math.abs(1-springValue(duration,damping,stiffness))<=threshold)break;}
  return Math.max(.08,Math.min(.75,duration));
}
function springSpec(kind,speed){
  kind=kind==='effects'?'effects':'spatial';speed=speed==='fast'||speed==='slow'?speed:'default';
  var key=kind+':'+speed,cached=springCache[key];if(cached)return cached;
  var token=springToken(kind,speed),damping=Number(token.damping)||1,stiffness=Number(token.stiffness)||900,duration=springDuration(damping,stiffness);
  var ease=function(p){if(p<=0)return 0;if(p>=1)return 1;return springValue(p*duration,damping,stiffness);};
  cached={kind:kind,speed:speed,damping:damping,stiffness:stiffness,duration:duration,ease:ease};springCache[key]=cached;return cached;
}
function speedFor(distance,size){
  var value=Math.max(Math.abs(Number(distance)||0),Math.abs(Number(size)||0)),limits=M.distance||{};
  if(value<=(limits.fast||28))return'fast';if(value>=(limits.slow||180))return'slow';return'default';
}
function stagger(speed,count){
  var tokens=M.stagger||{},base=Number(tokens[speed])||Number(tokens.default)||.016,max=Math.max(0,Number(tokens.maxTotal)||.12),n=Math.max(1,Number(count)||1);
  return n<=1?0:Math.min(base,max/(n-1));
}

/* Convierte las curvas CSS compartidas en funciones numéricas para animaciones manuales. */
function curve(name){
  var source=String(M.curves&&M.curves[name]||M.curves&&M.curves.standard||'cubic-bezier(.2,0,0,1)'),key='curve:'+source,cached=springCache[key];if(cached)return cached;
  var match=source.match(/cubic-bezier\(\s*([-+.\d]+)\s*,\s*([-+.\d]+)\s*,\s*([-+.\d]+)\s*,\s*([-+.\d]+)\s*\)/i);if(!match)return function(p){return p;};
  var x1=Number(match[1]),y1=Number(match[2]),x2=Number(match[3]),y2=Number(match[4]);
  function sample(a,b,t){var c=3*a,d=3*(b-a)-c,e=1-c-d;return((e*t+d)*t+c)*t;}
  function slope(a,b,t){var c=3*a,d=3*(b-a)-c,e=1-c-d;return(3*e*t+2*d)*t+c;}
  cached=function(p){
    if(p<=0)return 0;if(p>=1)return 1;var t=p;
    for(var i=0;i<5;i++){var x=sample(x1,x2,t)-p,m=slope(x1,x2,t);if(Math.abs(x)<1e-5||Math.abs(m)<1e-6)break;t=Math.max(0,Math.min(1,t-x/m));}
    return sample(y1,y2,t);
  };springCache[key]=cached;return cached;
}

/* Ejecuta callbacks cuando las dependencias están cargadas o habilitadas. */
function flushQueue(queue){var callbacks=queue.splice(0);callbacks.forEach(function(fn){try{fn(deps);}catch(error){if(window.console&&console.error)console.error('[SushiClub motion]',error);}});}
function whenLoaded(fn){if(typeof fn!=='function')return;if(deps)fn(deps);else loadedQueue.push(fn);}
function whenReady(fn){if(typeof fn!=='function')return;if(deps&&unlocked)fn(deps);else readyQueue.push(fn);}
function run(fn){if(!deps||!unlocked||typeof fn!=='function')return false;fn(deps);return true;}
function runLoaded(fn){if(!deps||typeof fn!=='function')return false;fn(deps);return true;}

/* Agrupa refresh de ScrollTrigger para evitar trabajo repetido. */
function runRefresh(){refreshTimer=0;if(!deps||!deps.ScrollTrigger||refreshing)return;refreshing=true;lastRefreshAt=performance.now();try{deps.ScrollTrigger.refresh();}catch(error){if(!(error&&error.name==='SecurityError')&&window.console&&console.error)console.error('[SushiClub motion]',error);}finally{refreshing=false;}}
function refresh(delay){if(!deps||!deps.ScrollTrigger)return;if(refreshTimer)window.clearTimeout(refreshTimer);var requested=Math.max(0,delay==null?0:delay),elapsed=performance.now()-lastRefreshAt,wait=Math.max(requested,Math.max(0,MIN_REFRESH_GAP-elapsed));refreshTimer=window.setTimeout(runRefresh,wait);}

/* Cambia geometría de iconos con MorphSVG o aplica el path directo. */
function clearIconMotion(host){var state=host&&host.__scIconMotion;if(!state)return;if(state.timeline)try{state.timeline.kill();}catch(_){}host.__scIconMotion=null;}
function morphIcon(path,shape,options){
  if(!path||!shape)return false;var opts=options||{},animate=opts.animate!==false,host=path.ownerSVGElement||path,gsap=deps&&deps.gsap,MorphSVGPlugin=deps&&deps.MorphSVGPlugin;clearIconMotion(host);
  if(!animate||reduced()||!gsap||!MorphSVGPlugin){var raw=typeof shape==='string'?shape:(shape.getAttribute&&shape.getAttribute('d'));if(raw)path.setAttribute('d',raw);return true;}
  var spec=springSpec('spatial',opts.speed||'fast'),state={timeline:null};host.__scIconMotion=state;
  state.timeline=gsap.timeline({onComplete:function(){if(host.__scIconMotion===state)host.__scIconMotion=null;}}).to(path,{duration:spec.duration,ease:spec.ease,morphSVG:{shape:shape,map:opts.map||'complexity'},overwrite:'auto'},0);return true;
}

/* Unifica hover, foco, presión y teclado en microinteracciones. */
function bindMicroInteraction(control,target,options){
  if(!control||!target)return function(){};
  var opts=options||{},tween=null,destroyed=false,hover=false,focus=false,pressed=false;
  function focusVisible(){try{return control.matches(':focus-visible');}catch(_){return document.activeElement===control;}}
  function kill(){if(tween){try{tween.kill();}catch(_){}tween=null;}}
  function angle(kind){var source=opts[kind],value=source&&Number(source.rotation);if(Number.isFinite(value)&&value)return value;return kind==='press'?-5:8;}
  function clear(){var g=deps&&deps.gsap;if(g)g.set(target,{clearProps:'transform,willChange'});else{target.style.removeProperty('transform');target.style.removeProperty('will-change');}}
  function tweenTo(rotation,speed,clearAtEnd){
    if(destroyed)return;kill();var g=deps&&deps.gsap;if(!g||reduced()){clear();return;}var spec=springSpec('spatial',speed||'fast');
    g.set(target,{willChange:'transform',transformOrigin:opts.transformOrigin||'50% 50%'});
    tween=g.to(target,{rotation:rotation,duration:spec.duration,ease:spec.ease,overwrite:'auto',force3D:true,onComplete:function(){tween=null;target.style.removeProperty('will-change');if(clearAtEnd)clear();}});
  }
  function active(){tweenTo(angle('active'),'fast',false);}
  function home(){tweenTo(0,'fast',true);}
  function press(){
    if(destroyed)return;kill();var g=deps&&deps.gsap;if(!g||reduced()){clear();return;}var spec=springSpec('spatial','fast'),returnAngle=(hover||focus)?angle('active'):0;
    g.set(target,{willChange:'transform',transformOrigin:opts.transformOrigin||'50% 50%'});
    tween=g.timeline({onComplete:function(){tween=null;target.style.removeProperty('will-change');if(returnAngle===0)clear();}})
      .to(target,{rotation:angle('press'),duration:spec.duration*.55,ease:spec.ease,overwrite:'auto',force3D:true},0)
      .to(target,{rotation:returnAngle,duration:spec.duration*.7,ease:spec.ease,overwrite:'auto',force3D:true},spec.duration*.18);
  }
  function pointerEnter(event){if(event.pointerType==='touch')return;if(!hover){hover=true;if(!pressed)active();}}
  function pointerLeave(){hover=false;pressed=false;if(focus)active();else home();}
  function pointerDown(){pressed=true;press();}
  function pointerUp(){pressed=false;if(hover||focus)active();else home();}
  function focusIn(){var visible=focusVisible();if(visible&&!focus){focus=true;if(!pressed)active();}}
  function focusOut(){focus=false;pressed=false;if(hover)active();else home();}
  function keyDown(event){if(event.repeat||(event.key!=='Enter'&&event.key!==' '))return;pressed=true;press();}
  function keyUp(event){if(event.key!=='Enter'&&event.key!==' ')return;pressed=false;if(hover||focus)active();else home();}
  control.addEventListener('pointerenter',pointerEnter);control.addEventListener('pointerleave',pointerLeave);control.addEventListener('pointerdown',pointerDown);control.addEventListener('pointerup',pointerUp);control.addEventListener('pointercancel',pointerLeave);control.addEventListener('focus',focusIn);control.addEventListener('blur',focusOut);control.addEventListener('keydown',keyDown);control.addEventListener('keyup',keyUp);
  return function(){if(destroyed)return;destroyed=true;control.removeEventListener('pointerenter',pointerEnter);control.removeEventListener('pointerleave',pointerLeave);control.removeEventListener('pointerdown',pointerDown);control.removeEventListener('pointerup',pointerUp);control.removeEventListener('pointercancel',pointerLeave);control.removeEventListener('focus',focusIn);control.removeEventListener('blur',focusOut);control.removeEventListener('keydown',keyDown);control.removeEventListener('keyup',keyUp);kill();clear();};
}

/* Inicializa GSAP y habilita refresh después de layout/fuentes. */
function installRefreshLifecycle(){if(refreshLifecycleInstalled||!deps||!unlocked)return;refreshLifecycleInstalled=true;if(document.readyState==='complete')refresh(REFRESH_DELAY);else window.addEventListener('load',function(){refresh(REFRESH_DELAY);},{once:true});if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(REFRESH_DELAY);}).catch(function(){});}
function initialize(){if(!window.gsap||!window.MorphSVGPlugin||!window.ScrollTrigger||!window.SplitText)throw new Error('[SushiClub motion] Dependencias GSAP incompletas');window.gsap.registerPlugin(window.MorphSVGPlugin,window.ScrollTrigger,window.SplitText);window.ScrollTrigger.config({limitCallbacks:true});deps={gsap:window.gsap,MorphSVGPlugin:window.MorphSVGPlugin,ScrollTrigger:window.ScrollTrigger,SplitText:window.SplitText};if(ROOT){ROOT.classList.remove('sc-motion-dependencies-loading');ROOT.classList.remove('sc-motion-dependencies-failed');ROOT.classList.add('sc-motion-dependencies-ready');}flushQueue(loadedQueue);if(unlocked){installRefreshLifecycle();flushQueue(readyQueue);}return deps;}
function loadDependencies(){return loadScript(SOURCES.core,IDS.core,'gsap').then(function(){return Promise.all([loadScript(SOURCES.morphSVG,IDS.morphSVG,'MorphSVGPlugin'),loadScript(SOURCES.scrollTrigger,IDS.scrollTrigger,'ScrollTrigger'),loadScript(SOURCES.splitText,IDS.splitText,'SplitText')]);}).then(initialize).catch(function(error){if(ROOT){ROOT.classList.remove('sc-motion-dependencies-loading');ROOT.classList.add('sc-motion-dependencies-failed');}if(window.console&&console.error)console.error('[SushiClub motion]',error);return null;});}
var dependencyPromise=loadDependencies();function ready(){return dependencyPromise;}function prepare(){return dependencyPromise;}function unlock(){if(unlocked)return;unlocked=true;if(deps){installRefreshLifecycle();flushQueue(readyQueue);}}
SC.motion={ready:ready,prepare:prepare,whenLoaded:whenLoaded,whenReady:whenReady,run:run,runLoaded:runLoaded,refresh:refresh,reduced:reduced,springSpec:springSpec,speedFor:speedFor,stagger:stagger,curve:curve,morphIcon:morphIcon,bindMicroInteraction:bindMicroInteraction,unlock:unlock,isReady:function(){return!!(deps&&unlocked);},isLoaded:function(){return!!deps;},isMorphReady:function(){return!!(deps&&deps.MorphSVGPlugin);}};
})();