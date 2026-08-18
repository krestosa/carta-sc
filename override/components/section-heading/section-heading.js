/* Anima títulos y subtítulos con una entrada ascendente visible. Cada card espera al
   heading inmediatamente anterior para preservar la secuencia título -> contenido. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion;
if(!SC||!C||!SC.motion||typeof SC.motion.whenReady!=='function'||SC.__sectionHeadingBooted)return;SC.__sectionHeadingBooted=true;
var initialized=false,motionDeps=null,generation=0,rafA=0,rafB=0,observer=null,pending=null,elements=[],tweens=[],triggers=[],states=new WeakMap(),RULE_PROPERTY='--sc-section-rule-scale',CFG={initialThreshold:.96,ruleDuration:.40,refreshDelay:60};
function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function targets(){return Array.prototype.filter.call(document.querySelectorAll('.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion'),function(el){return(el.textContent||'').replace(/\s+/g,' ').trim().length>0;});}
function isParentCategory(el){return!!(el.parentElement&&el.parentElement.classList.contains(S.sectionTitle.slice(1)));}
function profile(){var w=window.innerWidth||document.documentElement.clientWidth||0;if(w>=993)return{y:22,duration:.74,start:'clamp(top 92%)'};if(w>=641)return{y:20,duration:.68,start:'clamp(top 93%)'};return{y:18,duration:.62,start:'clamp(top 94%)'};}
function stateFor(el){var state=states.get(el);if(!state){state={ready:false,waiters:[]};states.set(el,state);}return state;}
function markReady(el){var state=stateFor(el);if(state.ready)return;state.ready=true;var queue=state.waiters.splice(0);queue.forEach(function(fn){try{fn();}catch(error){if(window.console&&console.error)console.error('[SushiClub section heading]',error);}});}
function headingTarget(node){if(!node)return null;if(node.matches&&node.matches(S.sectionSubtitle))return node;if(node.matches&&node.matches(S.sectionTitle))return node.querySelector(':scope > div');return null;}
function precedingHeading(card){var node=card&&card.previousElementSibling;while(node){var target=headingTarget(node);if(target)return target;node=node.previousElementSibling;}var section=card&&card.closest&&card.closest(S.productList);return section?headingTarget(section.querySelector(S.sectionTitle)):null;}
function whenBeforeCardReady(card,callback){if(typeof callback!=='function')return;var heading=precedingHeading(card);if(!heading){callback();return;}var state=stateFor(heading);if(state.ready){callback();return;}state.waiters.push(callback);}
function refresh(token){if(initialized&&token===generation)SC.motion.refresh(CFG.refreshDelay);}
function prepare(gsap,el,p){var vars={autoAlpha:0,y:p.y,force3D:false,willChange:'transform,opacity'};stateFor(el).ready=false;if(isParentCategory(el)){el.classList.add('sc-section-rule-host');vars[RULE_PROPERTY]=0;}gsap.set(el,vars);}
function showNow(gsap,el){gsap.killTweensOf(el);var vars={autoAlpha:1,y:0,clearProps:'transform,opacity,visibility,willChange'};if(isParentCategory(el))vars[RULE_PROPERTY]=1;gsap.set(el,vars);markReady(el);}
/* El texto sube con power3.out; el divisor acompaña pero no modifica geometría. */
function reveal(gsap,el,p,delay){
  gsap.killTweensOf(el);var parent=isParentCategory(el),tl=gsap.timeline({delay:delay||0,onComplete:function(){gsap.set(el,{clearProps:'transform,opacity,visibility,willChange'});if(parent)gsap.set(el,{clearProps:RULE_PROPERTY});markReady(el);}});
  tl.to(el,{autoAlpha:1,y:0,duration:p.duration,ease:M.easings.strongOut,force3D:false,overwrite:'auto'},0);
  if(parent)tl.to(el,{[RULE_PROPERTY]:1,duration:CFG.ruleDuration,ease:M.easings.strongOut,overwrite:'auto'},0);
  tweens.push(tl);return tl;
}
function revealDeferred(gsap,el,p){if(!pending||!pending.has(el))return;pending.delete(el);if(observer)observer.unobserve(el);reveal(gsap,el,p,0);}
function initMotion(deps,token){
  if(initialized||token!==generation)return;initialized=true;var gsap=deps.gsap,ST=deps.ScrollTrigger,p=profile(),initial=[],deferred=[];elements=targets();tweens=[];triggers=[];
  if(SC.motion.reduced()){elements.forEach(function(el){showNow(gsap,el);});return;}
  elements.forEach(function(el){var r=el.getBoundingClientRect();if(r.bottom<0){showNow(gsap,el);return;}prepare(gsap,el,p);if(r.top<=innerHeight*CFG.initialThreshold)initial.push(el);else deferred.push(el);});
  /* Dos frames garantizan que el estado oculto se pinte antes de iniciar el reveal. */
  if(initial.length){rafA=requestAnimationFrame(function(){rafA=0;rafB=requestAnimationFrame(function(){rafB=0;initial.forEach(function(el,i){reveal(gsap,el,p,i*.045);});});});}
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
  if(motionDeps){var gsap=motionDeps.gsap;elements.forEach(function(el){var state=stateFor(el);state.ready=true;var queue=state.waiters.splice(0);queue.forEach(function(fn){try{fn();}catch(_){}});el.classList.remove('sc-section-rule-host');gsap.set(el,{clearProps:'transform,opacity,visibility,willChange'});gsap.set(el,{clearProps:RULE_PROPERTY});});}
  initialized=false;elements=[];tweens=[];triggers=[];
}
SC.sectionHeading={init:init,destroy:destroy,cleanup:destroy,whenBeforeCardReady:whenBeforeCardReady};
SC.motion.whenReady(function(deps){motionDeps=deps;ready(init);});
})();
