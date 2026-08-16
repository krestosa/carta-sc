(function(){
'use strict';
if(window.__scMotionCoreBooted)return;window.__scMotionCoreBooted=true;

var SC=window.SCOverride=window.SCOverride||{},C=SC.config||{},M=C.motion||{},URL=C.urls||{},MEDIA=C.media||{};
var queue=[],deps=null,unlocked=false,refreshLifecycleInstalled=false,refreshTimer=0,REFRESH_DELAY=120;
var morphState='loading',morphQueue=[];
var IDS={core:'sc-gsap-core',scrollTrigger:'sc-gsap-scrolltrigger',scrollTo:'sc-gsap-scrollto',morphSVG:'sc-gsap-morphsvg'};
var GSAP_SRC=URL.gsap,ST_SRC=URL.scrollTrigger,SCROLL_TO_SRC=URL.scrollTo,MORPH_SRC=URL.morphSVG;

function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function reduced(){return (C.queries&&C.queries.reducedMotion?C.queries.reducedMotion:window.matchMedia(MEDIA.reducedMotion)).matches;}
function loadScript(src,id,done){
  if(!src)return done(false);
  var old=document.getElementById(id);
  if(old){
    if(old.dataset.loaded==='true'||(id===IDS.core&&window.gsap)||(id===IDS.scrollTrigger&&window.ScrollTrigger)||(id===IDS.scrollTo&&window.ScrollToPlugin)||(id===IDS.morphSVG&&window.MorphSVGPlugin))return done(true);
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
  var pending=2,state={scrollTrigger:false,scrollTo:false};
  function complete(name,ok){state[name]=ok;if(--pending===0)done(state.scrollTrigger&&state.scrollTo);}
  loadScript(ST_SRC,IDS.scrollTrigger,function(ok){complete('scrollTrigger',ok);});
  loadScript(SCROLL_TO_SRC,IDS.scrollTo,function(ok){complete('scrollTo',ok);});
}
function runMorph(request){
  var gsap=(deps&&deps.gsap)||window.gsap,plugin=(deps&&deps.MorphSVGPlugin)||window.MorphSVGPlugin;
  if(!gsap||!plugin)return false;
  var path=request.path,shape=request.shape,opts=request.options||{};
  if(!path||!shape||path.getAttribute('d')===shape)return true;
  gsap.killTweensOf(path);
  gsap.to(path,{
    duration:opts.duration==null?.28:opts.duration,
    ease:opts.ease||((M.easings&&M.easings.out)||'power2.out'),
    morphSVG:{shape:shape,map:opts.map||'size'},
    overwrite:true,
    onComplete:function(){path.setAttribute('d',shape);if(typeof opts.onComplete==='function')opts.onComplete();}
  });
  return true;
}
function queueMorph(path,shape,options){
  for(var i=morphQueue.length-1;i>=0;i--){if(morphQueue[i].path===path){morphQueue[i]={path:path,shape:shape,options:options};return;}}
  morphQueue.push({path:path,shape:shape,options:options});
}
function flushMorph(){
  if(morphState==='loading')return;
  var pending=morphQueue.splice(0);
  pending.forEach(function(request){
    if(morphState==='ready'&&runMorph(request))return;
    if(request.path)request.path.setAttribute('d',request.shape);
  });
}
function enableMorph(ok){
  if(!ok||!window.gsap||!window.MorphSVGPlugin){morphState='failed';flushMorph();return;}
  window.gsap.registerPlugin(window.MorphSVGPlugin);
  morphState='ready';
  if(deps)deps.MorphSVGPlugin=window.MorphSVGPlugin;
  flushMorph();
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
  refreshTimer=window.setTimeout(function(){refreshTimer=0;deps.ScrollTrigger.refresh();},delay==null?0:delay);
}
function morphIcon(path,shape,options){
  if(!path||!shape)return false;
  if(path.getAttribute('d')===shape)return true;
  var opts=options||{},animate=opts.animate!==false;
  if(!animate||reduced()){path.setAttribute('d',shape);return true;}
  if(morphState==='ready'&&runMorph({path:path,shape:shape,options:opts}))return true;
  if(morphState==='failed'){path.setAttribute('d',shape);return true;}
  queueMorph(path,shape,opts);return true;
}
function installRefreshLifecycle(){
  if(refreshLifecycleInstalled||!deps||!unlocked)return;refreshLifecycleInstalled=true;
  if(document.readyState==='complete')refresh(REFRESH_DELAY);else window.addEventListener('load',function(){refresh(REFRESH_DELAY);},{once:true});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(REFRESH_DELAY);}).catch(function(){});
}
function unlock(){unlocked=true;installRefreshLifecycle();flush();flushMorph();}
function initialize(){
  if(!window.gsap||!window.ScrollTrigger||!window.ScrollToPlugin)return;
  window.gsap.registerPlugin(window.ScrollTrigger,window.ScrollToPlugin);
  if(window.MorphSVGPlugin){window.gsap.registerPlugin(window.MorphSVGPlugin);morphState='ready';}
  window.ScrollTrigger.config({limitCallbacks:true});
  if(window.ScrollToPlugin.config)window.ScrollToPlugin.config({autoKill:true});
  deps={gsap:window.gsap,ScrollTrigger:window.ScrollTrigger,ScrollToPlugin:window.ScrollToPlugin,MorphSVGPlugin:window.MorphSVGPlugin||null};
  installRefreshLifecycle();flush();flushMorph();
}

SC.motion={whenReady:whenReady,run:run,refresh:refresh,reduced:reduced,morphIcon:morphIcon,unlock:unlock,isReady:function(){return!!(deps&&unlocked);},isMorphReady:function(){return morphState==='ready';}};

ready(function(){
  loadScript(GSAP_SRC,IDS.core,function(ok){
    if(!ok){morphState='failed';flushMorph();return;}
    loadPlugins(function(pluginsOk){if(pluginsOk)initialize();});
    loadScript(MORPH_SRC,IDS.morphSVG,enableMorph);
  });
});
})();
