(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,M=C&&C.motion;
if(!SC||!C||!SC.motion||typeof SC.motion.whenReady!=='function'||SC.__sectionHeadingBooted)return;SC.__sectionHeadingBooted=true;
var initialized=false,pending=false,motionDeps=null,generation=0,firstRaf=0,secondRaf=0,elements=[],splits=[],tweens=[],RULE_PROPERTY='--sc-section-rule-scale',CFG={ruleDuration:.40,textDuration:.32,textStagger:.028,triggerStart:'clamp(top 90%)',lineOffsetPercent:68,singleLineOffset:8},REFRESH_DELAY=60;
function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function targets(){return Array.prototype.filter.call(document.querySelectorAll('.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion'),function(el){return(el.textContent||'').replace(/\s+/g,' ').trim().length>0;});}
function isParentCategory(el){return!!(el.parentElement&&el.parentElement.classList.contains(S.sectionTitle.slice(1)));}
function isInitial(el){if(el.classList.contains(K.staticInitialSection))return true;var parent=el.closest(S.sectionTitle+', '+S.sectionSubtitle);if(parent&&parent.classList.contains(K.staticInitialSection))return true;var r=el.getBoundingClientRect();return r.top<window.innerHeight&&r.bottom>0;}
function isSingleLine(el){var style=getComputedStyle(el),line=parseFloat(style.lineHeight),height=el.getBoundingClientRect().height;return isFinite(line)&&line>0&&height<=line*1.45;}
function clearInvalidHostAria(el){if(el&&el.classList&&el.classList.contains('sc-section-rule-host'))el.removeAttribute('aria-label');}
function refresh(token){if(initialized&&token===generation)SC.motion.refresh(REFRESH_DELAY);}
function initMotion(deps,token){
  var SplitText=deps&&deps.SplitText;if(initialized||token!==generation||!SplitText)return;initialized=true;pending=false;var gsap=deps.gsap;elements=targets();splits=[];tweens=[];
  elements.forEach(function(el){
    var parentCategory=isParentCategory(el),initial=isInitial(el);
    if(parentCategory){el.classList.add('sc-section-rule-host');clearInvalidHostAria(el);if(initial)gsap.set(el,{[RULE_PROPERTY]:1});else{gsap.set(el,{[RULE_PROPERTY]:0});tweens.push(gsap.to(el,{[RULE_PROPERTY]:1,duration:CFG.ruleDuration,ease:M.easings.strongOut,overwrite:'auto',scrollTrigger:{trigger:el,start:CFG.triggerStart,once:true}}));}}
    if(initial)return;
    if(isSingleLine(el)){
      tweens.push(gsap.from(el,{y:CFG.singleLineOffset,autoAlpha:0,duration:CFG.textDuration,ease:M.easings.strongOut,overwrite:'auto',scrollTrigger:{trigger:el,start:CFG.triggerStart,once:true,invalidateOnRefresh:true},clearProps:'transform,opacity,visibility'}));return;
    }
    splits.push(SplitText.create(el,{type:'lines',mask:'lines',linesClass:'sc-section-text-line',autoSplit:true,aria:'none',onSplit:function(self){clearInvalidHostAria(el);return gsap.from(self.lines,{yPercent:CFG.lineOffsetPercent,autoAlpha:0,duration:CFG.textDuration,ease:M.easings.strongOut,stagger:CFG.textStagger,overwrite:'auto',scrollTrigger:{trigger:el,start:CFG.triggerStart,once:true,invalidateOnRefresh:true}});}}));clearInvalidHostAria(el);
  });
  refresh(token);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(token);}).catch(function(){});
}
function init(){
  if(initialized||pending||!motionDeps||!motionDeps.SplitText||SC.motion.reduced())return;pending=true;var token=++generation;
  firstRaf=requestAnimationFrame(function(){firstRaf=0;if(token!==generation||!pending)return;secondRaf=requestAnimationFrame(function(){secondRaf=0;initMotion(motionDeps,token);});});
}
function destroy(){
  generation++;pending=false;if(firstRaf){cancelAnimationFrame(firstRaf);firstRaf=0;}if(secondRaf){cancelAnimationFrame(secondRaf);secondRaf=0;}
  if(initialized&&motionDeps){var gsap=motionDeps.gsap;tweens.forEach(function(tween){if(tween&&tween.scrollTrigger)tween.scrollTrigger.kill();if(tween)tween.kill();});splits.forEach(function(split){if(split&&split.revert)split.revert();});elements.forEach(function(el){clearInvalidHostAria(el);el.classList.remove('sc-section-rule-host');gsap.set(el,{clearProps:RULE_PROPERTY});});}
  initialized=false;elements=[];splits=[];tweens=[];
}
SC.sectionHeading={init:init,destroy:destroy,cleanup:destroy};
SC.motion.whenReady(function(deps){motionDeps=deps;ready(init);});
})();