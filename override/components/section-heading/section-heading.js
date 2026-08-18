/* Anima títulos de sección con el reveal ascendente usado antes de la optimización.
   ScrollTrigger dirige la entrada y un observer nativo evita títulos bloqueados. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion;
if(!SC||!C||!SC.motion||typeof SC.motion.whenReady!=='function'||SC.__sectionHeadingBooted)return;SC.__sectionHeadingBooted=true;
var initialized=false,motionDeps=null,generation=0,rafA=0,rafB=0,observer=null,pending=null,elements=[],tweens=[],triggers=[],RULE_PROPERTY='--sc-section-rule-scale',CFG={duration:.32,ruleDuration:.40,initialStagger:.035,initialThreshold:.96},REFRESH_DELAY=60;
function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function targets(){return Array.prototype.filter.call(document.querySelectorAll('.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion'),function(el){return(el.textContent||'').replace(/\s+/g,' ').trim().length>0;});}
function isParentCategory(el){return!!(el.parentElement&&el.parentElement.classList.contains(S.sectionTitle.slice(1)));}
function profile(){if(C.queries.desktop.matches)return{y:9,start:'clamp(top 92%)'};if(C.queries.compactWide.matches)return{y:8,start:'clamp(top 93%)'};return{y:7,start:'clamp(top 94%)'};}
function refresh(token){if(initialized&&token===generation)SC.motion.refresh(REFRESH_DELAY);}
function prepare(gsap,el,p){var vars={autoAlpha:0,y:p.y,force3D:false,willChange:'transform,opacity'};if(isParentCategory(el)){el.classList.add('sc-section-rule-host');vars[RULE_PROPERTY]=0;}gsap.set(el,vars);}
function showNow(gsap,el){gsap.killTweensOf(el);var vars={autoAlpha:1,y:0,clearProps:'transform,opacity,visibility,willChange'};if(isParentCategory(el))vars[RULE_PROPERTY]=1;gsap.set(el,vars);}
/* El texto sube primero y la regla acompaña sin modificar la geometría del heading. */
function reveal(gsap,el,delay){
  gsap.killTweensOf(el);var parent=isParentCategory(el),tl=gsap.timeline({delay:delay||0,onComplete:function(){gsap.set(el,{clearProps:'transform,opacity,visibility,willChange'});if(parent)gsap.set(el,{clearProps:RULE_PROPERTY});}});
  tl.to(el,{autoAlpha:1,y:0,duration:CFG.duration,ease:M.easings.out,force3D:false,overwrite:'auto'},0);
  if(parent)tl.to(el,{[RULE_PROPERTY]:1,duration:CFG.ruleDuration,ease:M.easings.strongOut,overwrite:'auto'},0);
  tweens.push(tl);return tl;
}
function revealDeferred(gsap,el){if(!pending||!pending.has(el))return;pending.delete(el);if(observer)observer.unobserve(el);reveal(gsap,el,0);}
function initMotion(deps,token){
  if(initialized||token!==generation)return;initialized=true;var gsap=deps.gsap,ST=deps.ScrollTrigger,p=profile(),initial=[],deferred=[];elements=targets();tweens=[];triggers=[];
  if(SC.motion.reduced()){elements.forEach(function(el){showNow(gsap,el);});return;}
  elements.forEach(function(el){var r=el.getBoundingClientRect();if(r.bottom<0){showNow(gsap,el);return;}prepare(gsap,el,p);if(r.top<=innerHeight*CFG.initialThreshold)initial.push(el);else deferred.push(el);});
  /* Dos frames aseguran un estado inicial realmente pintado antes del tween. */
  if(initial.length){rafA=requestAnimationFrame(function(){rafA=0;rafB=requestAnimationFrame(function(){rafB=0;initial.forEach(function(el,i){reveal(gsap,el,i*CFG.initialStagger);});});});}
  if(deferred.length){
    pending=new Set(deferred);
    deferred.forEach(function(el){triggers.push(ST.create({trigger:el,start:p.start,once:true,onEnter:function(){revealDeferred(gsap,el);}}));});
    /* Firefox y relayouts tardíos conservan una vía nativa de entrada sin duplicar tweens. */
    if(window.IntersectionObserver){observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting)revealDeferred(gsap,entry.target);});},{root:null,rootMargin:'0px',threshold:0});deferred.forEach(function(el){observer.observe(el);});}
  }
  refresh(token);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(token);}).catch(function(){});
}
function init(){if(initialized||!motionDeps)return;initMotion(motionDeps,++generation);}
function destroy(){
  generation++;if(rafA){cancelAnimationFrame(rafA);rafA=0;}if(rafB){cancelAnimationFrame(rafB);rafB=0;}if(observer){observer.disconnect();observer=null;}if(pending)pending.clear();pending=null;
  triggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});tweens.forEach(function(tween){if(tween&&tween.kill)tween.kill();});
  if(motionDeps){var gsap=motionDeps.gsap;elements.forEach(function(el){el.classList.remove('sc-section-rule-host');gsap.set(el,{clearProps:'transform,opacity,visibility,willChange'});gsap.set(el,{clearProps:RULE_PROPERTY});});}
  initialized=false;elements=[];tweens=[];triggers=[];
}
SC.sectionHeading={init:init,destroy:destroy,cleanup:destroy};
SC.motion.whenReady(function(deps){motionDeps=deps;ready(init);});
})();
