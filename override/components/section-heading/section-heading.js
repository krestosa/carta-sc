/* Anima títulos y subtítulos y coordina una única secuencia DOM del catálogo:
   título -> subtítulo -> card -> card -> siguiente heading, sin lotes ni stagger. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion;
if(!SC||!C||!SC.motion||typeof SC.motion.whenReady!=='function'||SC.__sectionHeadingBooted)return;SC.__sectionHeadingBooted=true;
var initialized=false,motionDeps=null,generation=0,rafA=0,rafB=0,observer=null,pending=null,elements=[],tweens=[],triggers=[],RULE_PROPERTY='--sc-section-rule-scale',CFG={initialThreshold:.96,ruleDuration:.40,refreshDelay:60};

/* Cola compartida por headings y cards. Sólo una unidad puede animarse a la vez. */
var sequence=SC.catalogRevealSequence;
if(!sequence){
  var units=[],states=new WeakMap(),pumping=false;
  function host(node){return node&&node.parentElement&&node.parentElement.matches&&node.parentElement.matches(S.sectionTitle)?node.parentElement:node;}
  function collect(){units=Array.prototype.slice.call(document.querySelectorAll('.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion, .listadoShop .productoShop'));return units;}
  function state(node){var value=states.get(node);if(!value){value={requested:false,running:false,done:false,runner:null,immediate:false};states.set(node,value);}return value;}
  function passed(node){var target=host(node);if(!target||target.hidden||target.offsetParent===null)return true;var rect=target.getBoundingClientRect();return rect.bottom<-20;}
  function pump(){
    if(pumping)return;pumping=true;
    if(!units.length)collect();
    for(var i=0;i<units.length;i++){
      var node=units[i],value=state(node);
      if(value.done)continue;
      if(passed(node)){value.done=true;value.requested=false;value.running=false;value.runner=null;continue;}
      if(value.running||!value.requested||typeof value.runner!=='function'){pumping=false;return;}
      value.running=true;var runner=value.runner,immediate=value.immediate;pumping=false;
      try{runner(immediate);}catch(error){if(window.console&&console.error)console.error('[SushiClub catalog reveal]',error);complete(node);}return;
    }
    pumping=false;
  }
  function request(node,runner,immediate){if(!node||typeof runner!=='function')return;var value=state(node);if(value.done)return;value.runner=runner;value.requested=true;value.immediate=!!immediate;pump();}
  function complete(node){if(!node)return;var value=state(node);value.done=true;value.running=false;value.requested=false;value.runner=null;pump();}
  function finish(node){complete(node);}
  function isDone(node){return!!(node&&state(node).done);}
  sequence=SC.catalogRevealSequence={rebuild:collect,request:request,complete:complete,finish:finish,isDone:isDone,pump:pump};
}

function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function targets(){return Array.prototype.filter.call(document.querySelectorAll('.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion'),function(el){return(el.textContent||'').replace(/\s+/g,' ').trim().length>0;});}
function isParentCategory(el){return!!(el.parentElement&&el.parentElement.classList.contains(S.sectionTitle.slice(1)));}
function profile(){var w=window.innerWidth||document.documentElement.clientWidth||0;if(w>=993)return{y:22,duration:.74,start:'clamp(top 92%)'};if(w>=641)return{y:20,duration:.68,start:'clamp(top 93%)'};return{y:18,duration:.62,start:'clamp(top 94%)'};}
function refresh(token){if(initialized&&token===generation)SC.motion.refresh(CFG.refreshDelay);}
function prepare(gsap,el,p){var vars={autoAlpha:0,y:p.y,force3D:false,willChange:'transform,opacity'};if(isParentCategory(el)){el.classList.add('sc-section-rule-host');vars[RULE_PROPERTY]=0;}gsap.set(el,vars);}
function showNow(gsap,el){gsap.killTweensOf(el);var vars={autoAlpha:1,y:0,clearProps:'transform,opacity,visibility,willChange'};if(isParentCategory(el))vars[RULE_PROPERTY]=1;gsap.set(el,vars);sequence.complete(el);}
function reveal(gsap,el,p){
  gsap.killTweensOf(el);var parent=isParentCategory(el),tl=gsap.timeline({onComplete:function(){gsap.set(el,{clearProps:'transform,opacity,visibility,willChange'});if(parent)gsap.set(el,{clearProps:RULE_PROPERTY});sequence.complete(el);}});
  tl.to(el,{autoAlpha:1,y:0,duration:p.duration,ease:M.easings.strongOut,force3D:false,overwrite:'auto'},0);
  if(parent)tl.to(el,{[RULE_PROPERTY]:1,duration:CFG.ruleDuration,ease:M.easings.strongOut,overwrite:'auto'},0);
  tweens.push(tl);
}
function requestReveal(gsap,el,p,immediate){sequence.request(el,function(force){if(force)showNow(gsap,el);else reveal(gsap,el,p);},immediate);}
function revealDeferred(gsap,el,p){if(!pending||!pending.has(el))return;pending.delete(el);if(observer)observer.unobserve(el);requestReveal(gsap,el,p,false);}
function initMotion(deps,token){
  if(initialized||token!==generation)return;initialized=true;var gsap=deps.gsap,ST=deps.ScrollTrigger,p=profile(),initial=[],deferred=[];elements=targets();tweens=[];triggers=[];sequence.rebuild();
  if(SC.motion.reduced()){elements.forEach(function(el){showNow(gsap,el);});return;}
  elements.forEach(function(el){if(sequence.isDone(el)){showNow(gsap,el);return;}if(el.hidden||el.offsetParent===null){showNow(gsap,el);return;}var r=el.getBoundingClientRect();if(r.bottom<0){showNow(gsap,el);return;}prepare(gsap,el,p);if(r.top<=innerHeight*CFG.initialThreshold)initial.push(el);else deferred.push(el);});
  if(initial.length){rafA=requestAnimationFrame(function(){rafA=0;rafB=requestAnimationFrame(function(){rafB=0;initial.forEach(function(el){requestReveal(gsap,el,p,false);});});});}
  if(deferred.length){pending=new Set(deferred);deferred.forEach(function(el){triggers.push(ST.create({trigger:el,start:p.start,once:true,invalidateOnRefresh:true,onEnter:function(){revealDeferred(gsap,el,p);}}));});if(window.IntersectionObserver){observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting)revealDeferred(gsap,entry.target,p);});},{root:null,rootMargin:'0px',threshold:0});deferred.forEach(function(el){observer.observe(el);});}}
  refresh(token);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(token);}).catch(function(){});
}
function init(){if(initialized||!motionDeps)return;initMotion(motionDeps,++generation);}
function destroy(){generation++;if(rafA){cancelAnimationFrame(rafA);rafA=0;}if(rafB){cancelAnimationFrame(rafB);rafB=0;}if(observer){observer.disconnect();observer=null;}if(pending)pending.clear();pending=null;triggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});tweens.forEach(function(tween){if(tween&&tween.kill)tween.kill();});if(motionDeps){var gsap=motionDeps.gsap;elements.forEach(function(el){sequence.finish(el);el.classList.remove('sc-section-rule-host');gsap.set(el,{clearProps:'transform,opacity,visibility,willChange'});gsap.set(el,{clearProps:RULE_PROPERTY});});}initialized=false;elements=[];tweens=[];triggers=[];}
SC.sectionHeading={init:init,destroy:destroy,cleanup:destroy,sequence:sequence};
SC.motion.whenReady(function(deps){motionDeps=deps;ready(init);});
})();
