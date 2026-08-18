/* Anima títulos y separadores de sección cuando entran al viewport. El primer contenido
   visible queda estático y el resto usa SplitText responsive ligado al scroll. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,M=C&&C.motion;
if(!SC||!C||!SC.motion||typeof SC.motion.whenReady!=='function'||SC.__sectionHeadingBooted)return;SC.__sectionHeadingBooted=true;
var initialized=false,motionDeps=null,generation=0,elements=[],splits=[],tweens=[],RULE_PROPERTY='--sc-section-rule-scale',CFG={ruleDuration:.40,textStagger:.08,triggerStart:'clamp(top bottom+=128px)',triggerEnd:'clamp(top bottom-=12px)',lineOffsetPercent:120},REFRESH_DELAY=60;
/* Resuelve targets y conserva estáticos únicamente los títulos marcados en el viewport inicial. */
function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function targets(){return Array.prototype.filter.call(document.querySelectorAll('.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion'),function(el){return(el.textContent||'').replace(/\s+/g,' ').trim().length>0;});}
function isParentCategory(el){return!!(el.parentElement&&el.parentElement.classList.contains(S.sectionTitle.slice(1)));}
function isInitial(el){if(el.classList.contains(K.staticInitialSection))return true;var parent=el.closest(S.sectionTitle+', '+S.sectionSubtitle);return!!(parent&&parent.classList.contains(K.staticInitialSection));}
/* SplitText no debe dejar aria-label sobre el div interno del h2, porque ese atributo es inválido allí. */
function clearInvalidHostAria(el){if(el&&el.classList&&el.classList.contains('sc-section-rule-host'))el.removeAttribute('aria-label');}
function refresh(token){if(initialized&&token===generation)SC.motion.refresh(REFRESH_DELAY);}
/* Replica el patrón responsive del demo: máscara por líneas, autoSplit y movimiento vertical por scroll. */
function initMotion(deps,token){
  var SplitText=deps&&deps.SplitText;if(initialized||token!==generation||!SplitText)return;initialized=true;var gsap=deps.gsap;elements=targets();splits=[];tweens=[];
  elements.forEach(function(el){
    var parentCategory=isParentCategory(el),initial=isInitial(el);
    if(parentCategory){el.classList.add('sc-section-rule-host');clearInvalidHostAria(el);if(initial)gsap.set(el,{[RULE_PROPERTY]:1});else{gsap.set(el,{[RULE_PROPERTY]:0});tweens.push(gsap.to(el,{[RULE_PROPERTY]:1,duration:CFG.ruleDuration,ease:M.easings.strongOut,overwrite:'auto',scrollTrigger:{trigger:el,start:CFG.triggerStart,once:true}}));}}
    if(initial)return;
    splits.push(SplitText.create(el,{type:'words,lines',mask:'lines',linesClass:'sc-section-text-line',autoSplit:true,aria:'none',onSplit:function(self){clearInvalidHostAria(el);return gsap.from(self.lines,{yPercent:CFG.lineOffsetPercent,stagger:CFG.textStagger,ease:'none',overwrite:'auto',scrollTrigger:{trigger:el,start:CFG.triggerStart,end:CFG.triggerEnd,scrub:true,invalidateOnRefresh:true}});}}));clearInvalidHostAria(el);
  });
  refresh(token);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(token);}).catch(function(){});
}
function init(){if(initialized||!motionDeps||!motionDeps.SplitText||SC.motion.reduced())return;initMotion(motionDeps,++generation);}
/* Revierte splits, triggers y propiedades para que un remount parta siempre del DOM original. */
function destroy(){
  generation++;
  if(initialized&&motionDeps){var gsap=motionDeps.gsap;tweens.forEach(function(tween){if(tween&&tween.scrollTrigger)tween.scrollTrigger.kill();if(tween)tween.kill();});splits.forEach(function(split){if(split&&split.revert)split.revert();});elements.forEach(function(el){clearInvalidHostAria(el);el.classList.remove('sc-section-rule-host');gsap.set(el,{clearProps:RULE_PROPERTY});});}
  initialized=false;elements=[];splits=[];tweens=[];
}
SC.sectionHeading={init:init,destroy:destroy,cleanup:destroy};
SC.motion.whenReady(function(deps){motionDeps=deps;ready(init);});
})();
