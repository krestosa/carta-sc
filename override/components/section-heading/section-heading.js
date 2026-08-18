/* Anima headings y coordina el orden visual real del catálogo. Cada unidad espera a la
   anterior dentro de su .listadoShop: título -> subtítulo -> cards -> siguiente subtítulo. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion;
if(!SC||!C||!SC.motion||typeof SC.motion.whenReady!=='function'||SC.__sectionHeadingBooted)return;SC.__sectionHeadingBooted=true;
var initialized=false,motionDeps=null,generation=0,rafA=0,rafB=0,observer=null,pending=null,elements=[],tweens=[],triggers=[],RULE_PROPERTY='--sc-section-rule-scale',CFG={initialThreshold:.96,ruleDuration:.40,refreshDelay:60};

/* Coordinador compartido: la unidad siguiente arranca sólo cuando termina la anterior. */
var order=SC.catalogRevealOrder;
if(!order){
  var states=new WeakMap();
  function host(node){return node&&node.parentElement&&node.parentElement.matches&&node.parentElement.matches(S.sectionTitle)?node.parentElement:node;}
  function unit(node){if(!node||!node.matches)return null;if(node.matches(S.productCard)||node.matches(S.sectionSubtitle))return node;if(node.matches(S.sectionTitle))return node.querySelector(':scope > div');return null;}
  function previous(node){
    var current=host(node),list=current&&current.closest&&current.closest(S.productList);if(!current||!list)return null;
    var sibling=current.previousElementSibling;while(sibling&&sibling.parentElement===list){var found=unit(sibling);if(found)return found;sibling=sibling.previousElementSibling;}return null;
  }
  function stateFor(node){var state=states.get(node);if(!state){state={ready:false,waiters:[]};states.set(node,state);}return state;}
  function reset(node){if(node)stateFor(node).ready=false;}
  function markReady(node){if(!node)return;var state=stateFor(node);if(state.ready)return;state.ready=true;var queue=state.waiters.splice(0);queue.forEach(function(fn){try{fn();}catch(error){if(window.console&&console.error)console.error('[SushiClub catalog reveal]',error);}});}
  function whenPreviousReady(node,callback){if(typeof callback!=='function')return;var prev=previous(node);if(!prev){callback();return;}var state=stateFor(prev);if(state.ready){callback();return;}state.waiters.push(callback);}
  order=SC.catalogRevealOrder={previous:previous,reset:reset,markReady:markReady,whenPreviousReady:whenPreviousReady};
}

function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function targets(){return Array.prototype.filter.call(document.querySelectorAll('.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion'),function(el){return(el.textContent||'').replace(/\s+/g,' ').trim().length>0;});}
function isParentCategory(el){return!!(el.parentElement&&el.parentElement.classList.contains(S.sectionTitle.slice(1)));}
function profile(){var w=window.innerWidth||document.documentElement.clientWidth||0;if(w>=993)return{y:22,duration:.74,start:'clamp(top 92%)'};if(w>=641)return{y:20,duration:.68,start:'clamp(top 93%)'};return{y:18,duration:.62,start:'clamp(top 94%)'};}
function refresh(token){if(initialized&&token===generation)SC.motion.refresh(CFG.refreshDelay);}
function prepare(gsap,el,p){var vars={autoAlpha:0,y:p.y,force3D:false,willChange:'transform,opacity'};order.reset(el);if(isParentCategory(el)){el.classList.add('sc-section-rule-host');vars[RULE_PROPERTY]=0;}gsap.set(el,vars);}
function showNow(gsap,el){gsap.killTweensOf(el);var vars={autoAlpha:1,y:0,clearProps:'transform,opacity,visibility,willChange'};if(isParentCategory(el))vars[RULE_PROPERTY]=1;gsap.set(el,vars);order.markReady(el);}
/* El heading sube completo; al terminar libera exactamente la siguiente unidad del DOM. */
function reveal(gsap,el,p){
  gsap.killTweensOf(el);var parent=isParentCategory(el),tl=gsap.timeline({onComplete:function(){gsap.set(el,{clearProps:'transform,opacity,visibility,willChange'});if(parent)gsap.set(el,{clearProps:RULE_PROPERTY});order.markReady(el);}});
  tl.to(el,{autoAlpha:1,y:0,duration:p.duration,ease:M.easings.strongOut,force3D:false,overwrite:'auto'},0);
  if(parent)tl.to(el,{[RULE_PROPERTY]:1,duration:CFG.ruleDuration,ease:M.easings.strongOut,overwrite:'auto'},0);
  tweens.push(tl);return tl;
}
function startReveal(gsap,el,p){order.whenPreviousReady(el,function(){reveal(gsap,el,p);});}
function revealDeferred(gsap,el,p){if(!pending||!pending.has(el))return;pending.delete(el);if(observer)observer.unobserve(el);startReveal(gsap,el,p);}
function initMotion(deps,token){
  if(initialized||token!==generation)return;initialized=true;var gsap=deps.gsap,ST=deps.ScrollTrigger,p=profile(),initial=[],deferred=[];elements=targets();tweens=[];triggers=[];
  if(SC.motion.reduced()){elements.forEach(function(el){showNow(gsap,el);});return;}
  elements.forEach(function(el){if(el.hidden||el.offsetParent===null){showNow(gsap,el);return;}var r=el.getBoundingClientRect();if(r.bottom<0){showNow(gsap,el);return;}prepare(gsap,el,p);if(r.top<=innerHeight*CFG.initialThreshold)initial.push(el);else deferred.push(el);});
  /* Dos frames garantizan que el estado oculto se pinte antes de iniciar la cola. */
  if(initial.length){rafA=requestAnimationFrame(function(){rafA=0;rafB=requestAnimationFrame(function(){rafB=0;initial.forEach(function(el){startReveal(gsap,el,p);});});});}
  if(deferred.length){
    pending=new Set(deferred);
    deferred.forEach(function(el){triggers.push(ST.create({trigger:el,start:p.start,once:true,invalidateOnRefresh:true,onEnter:function(){revealDeferred(gsap,el,p);}}));});
    /* Firefox conserva una vía nativa si ScrollTrigger pierde geometría tras un relayout. */
    if(window.IntersectionObserver){observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting)revealDeferred(gsap,entry.target,p);});},{root:null,rootMargin:'0px',threshold:0});deferred.forEach(function(el){observer.observe(el);});}
  }
  refresh(token);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(token);}).catch(function(){});
}
function init(){if(initialized||!motionDeps)return;initMotion(motionDeps,++generation);}
function destroy(){
  generation++;if(rafA){cancelAnimationFrame(rafA);rafA=0;}if(rafB){cancelAnimationFrame(rafB);rafB=0;}if(observer){observer.disconnect();observer=null;}if(pending)pending.clear();pending=null;
  triggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});tweens.forEach(function(tween){if(tween&&tween.kill)tween.kill();});
  if(motionDeps){var gsap=motionDeps.gsap;elements.forEach(function(el){order.markReady(el);el.classList.remove('sc-section-rule-host');gsap.set(el,{clearProps:'transform,opacity,visibility,willChange'});gsap.set(el,{clearProps:RULE_PROPERTY});});}
  initialized=false;elements=[];tweens=[];triggers=[];
}
SC.sectionHeading={init:init,destroy:destroy,cleanup:destroy,whenBeforeCardReady:function(card,callback){order.whenPreviousReady(card,callback);}};
SC.motion.whenReady(function(deps){motionDeps=deps;ready(init);});
})();
