(function(){
'use strict';
if(window.__scMotionCoreBooted)return;window.__scMotionCoreBooted=true;

var SC=window.SCOverride=window.SCOverride||{};
var queue=[],deps=null,unlocked=false,globalInstalled=false;
var GSAP_SRC='https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js';
var ST_SRC='https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js';
var SCROLL_TO_SRC='https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollToPlugin.min.js';

function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function reduced(){return window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
function loadScript(src,id,done){
  var old=document.getElementById(id);
  if(old){
    if(old.dataset.loaded==='true'||(id==='sc-gsap-core'&&window.gsap)||(id==='sc-gsap-scrolltrigger'&&window.ScrollTrigger)||(id==='sc-gsap-scrollto'&&window.ScrollToPlugin))return done();
    old.addEventListener('load',done,{once:true});
    return;
  }
  var script=document.createElement('script');script.id=id;script.src=src;script.async=true;
  script.onload=function(){script.dataset.loaded='true';done();};
  script.onerror=function(){if(window.console&&console.warn)console.warn('[SushiClub motion] No se pudo cargar:',src);};
  document.head.appendChild(script);
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
  window.setTimeout(function(){deps.ScrollTrigger.refresh();},delay==null?0:delay);
}
function installGlobalMotion(){
  if(globalInstalled||!deps||!unlocked)return;globalInstalled=true;
  var gsap=deps.gsap;
  if(window.jQuery){
    window.jQuery(document).off('shown.bs.dropdown.scUxMotion').on('shown.bs.dropdown.scUxMotion',function(event){
      var menu=window.jQuery(event.target).find('> .dropdown-menu, .dropdown-menu').first()[0];if(!menu)return;
      gsap.fromTo(menu,{autoAlpha:0,y:reduced()?0:-3},{autoAlpha:1,y:0,duration:reduced()?0.12:0.16,ease:'power2.out',overwrite:true,clearProps:'transform,opacity,visibility'});
    });
  }
  if(document.readyState==='complete')refresh(120);else window.addEventListener('load',function(){refresh(120);},{once:true});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(120);}).catch(function(){});
}
function unlock(){unlocked=true;installGlobalMotion();flush();}

SC.motion={whenReady:whenReady,run:run,refresh:refresh,reduced:reduced,unlock:unlock,isReady:function(){return!!(deps&&unlocked);}};

ready(function(){
  loadScript(GSAP_SRC,'sc-gsap-core',function(){
    loadScript(ST_SRC,'sc-gsap-scrolltrigger',function(){
      loadScript(SCROLL_TO_SRC,'sc-gsap-scrollto',function(){
        if(!window.gsap||!window.ScrollTrigger||!window.ScrollToPlugin)return;
        window.gsap.registerPlugin(window.ScrollTrigger,window.ScrollToPlugin);
        window.ScrollTrigger.config({limitCallbacks:true});
        if(window.ScrollToPlugin.config)window.ScrollToPlugin.config({autoKill:true});
        deps={gsap:window.gsap,ScrollTrigger:window.ScrollTrigger,ScrollToPlugin:window.ScrollToPlugin};
        installGlobalMotion();flush();
      });
    });
  });
});
})();
