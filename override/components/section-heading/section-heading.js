(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,M=C&&C.motion,CFG=C&&C.sectionHeading;
if(!SC||!C||!SC.motion||typeof SC.motion.whenReady!=='function'||window.__scSectionLinesMotionBooted)return;
window.__scSectionLinesMotionBooted=true;
var initialized=false,splitPromise=null;
function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function loadSplitText(){
  if(window.SplitText)return Promise.resolve(window.SplitText);if(splitPromise)return splitPromise;
  splitPromise=new Promise(function(resolve){
    var old=document.getElementById('sc-gsap-splittext');if(old){if(old.dataset.loaded==='true'||window.SplitText)return resolve(window.SplitText||null);old.addEventListener('load',function(){resolve(window.SplitText||null);},{once:true});old.addEventListener('error',function(){resolve(null);},{once:true});return;}
    var script=document.createElement('script');script.id='sc-gsap-splittext';script.src=C.urls.splitText;script.async=true;script.onload=function(){script.dataset.loaded='true';resolve(window.SplitText||null);};script.onerror=function(){resolve(null);};document.head.appendChild(script);
  });return splitPromise;
}
function targets(){return Array.prototype.filter.call(document.querySelectorAll(S.sectionMotionTargets),function(el){return(el.textContent||'').replace(/\s+/g,' ').trim().length>0;});}
function isParentCategory(el){return !!(el.parentElement&&el.parentElement.classList.contains(S.sectionTitle.slice(1)));}
function isInitial(el){if(el.classList.contains(K.staticInitialSection))return true;var parent=el.closest(S.sectionTitle+', '+S.sectionSubtitle);if(parent&&parent.classList.contains(K.staticInitialSection))return true;var r=el.getBoundingClientRect();return r.top<window.innerHeight&&r.bottom>0;}
function initMotion(deps,SplitText){
  if(initialized||!SplitText)return;initialized=true;var gsap=deps.gsap,elements=targets(),splits=[],tweens=[];
  elements.forEach(function(el){
    var parentCategory=isParentCategory(el),initial=isInitial(el);
    if(parentCategory){el.classList.add(K.sectionRuleHost);if(initial)gsap.set(el,{'--sc-section-rule-scale':1});else{gsap.set(el,{'--sc-section-rule-scale':0});tweens.push(gsap.to(el,{'--sc-section-rule-scale':1,duration:CFG.ruleDuration,ease:M.easings.strongOut,overwrite:'auto',scrollTrigger:{trigger:el,start:CFG.triggerStart,once:true}}));}}
    if(initial)return;
    splits.push(SplitText.create(el,{type:'lines',mask:'lines',linesClass:'sc-section-text-line',autoSplit:true,onSplit:function(self){return gsap.from(self.lines,{yPercent:CFG.lineOffsetPercent,autoAlpha:0,duration:CFG.textDuration,ease:M.easings.strongOut,stagger:CFG.textStagger,overwrite:'auto',scrollTrigger:{trigger:el,start:CFG.triggerStart,once:true,invalidateOnRefresh:true}});}}));
  });
  function refresh(){SC.motion.refresh(M.sectionRefreshDelay);}refresh();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(refresh).catch(function(){});
  function cleanup(){tweens.forEach(function(tween){if(tween&&tween.scrollTrigger)tween.scrollTrigger.kill();if(tween)tween.kill();});splits.forEach(function(split){if(split&&split.revert)split.revert();});elements.forEach(function(el){el.classList.remove(K.sectionRuleHost);gsap.set(el,{clearProps:'--sc-section-rule-scale'});});}
  window.__scSectionLinesCleanup=cleanup;SC.sectionHeading=SC.sectionHeading||{};SC.sectionHeading.cleanup=cleanup;
}
SC.motion.whenReady(function(deps){ready(function(){if(SC.motion.reduced())return;loadSplitText().then(function(SplitText){if(!SplitText)return;requestAnimationFrame(function(){requestAnimationFrame(function(){initMotion(deps,SplitText);});});});});});
})();
