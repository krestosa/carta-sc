(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,M=C&&C.motion;
if(!SC||!C||!SC.motion||typeof SC.motion.whenReady!=='function'||window.__scSectionLinesMotionBooted)return;
window.__scSectionLinesMotionBooted=true;
var initialized=false,splitPromise=null,SPLIT_TEXT_ID='sc-gsap-splittext',RULE_PROPERTY='--sc-section-rule-scale',CFG={ruleDuration:.72,textDuration:.52,textStagger:.045,triggerStart:'clamp(top 90%)',lineOffsetPercent:105},REFRESH_DELAY=60;
function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function loadSplitText(){
  if(window.SplitText)return Promise.resolve(window.SplitText);if(splitPromise)return splitPromise;
  splitPromise=new Promise(function(resolve){
    var old=document.getElementById(SPLIT_TEXT_ID);if(old){if(old.dataset.loaded==='true'||window.SplitText)return resolve(window.SplitText||null);old.addEventListener('load',function(){resolve(window.SplitText||null);},{once:true});old.addEventListener('error',function(){resolve(null);},{once:true});return;}
    var script=document.createElement('script');script.id=SPLIT_TEXT_ID;script.src=C.urls.splitText;script.async=true;script.onload=function(){script.dataset.loaded='true';resolve(window.SplitText||null);};script.onerror=function(){resolve(null);};document.head.appendChild(script);
  });return splitPromise;
}
function targets(){return Array.prototype.filter.call(document.querySelectorAll(".listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion"),function(el){return(el.textContent||'').replace(/\s+/g,' ').trim().length>0;});}
function isParentCategory(el){return !!(el.parentElement&&el.parentElement.classList.contains(S.sectionTitle.slice(1)));}
function isInitial(el){if(el.classList.contains(K.staticInitialSection))return true;var parent=el.closest(S.sectionTitle+', '+S.sectionSubtitle);if(parent&&parent.classList.contains(K.staticInitialSection))return true;var r=el.getBoundingClientRect();return r.top<window.innerHeight&&r.bottom>0;}
function initMotion(deps,SplitText){
  if(initialized||!SplitText)return;initialized=true;var gsap=deps.gsap,elements=targets(),splits=[],tweens=[];
  elements.forEach(function(el){
    var parentCategory=isParentCategory(el),initial=isInitial(el);
    if(parentCategory){el.classList.add("sc-section-rule-host");if(initial)gsap.set(el,{[RULE_PROPERTY]:1});else{gsap.set(el,{[RULE_PROPERTY]:0});tweens.push(gsap.to(el,{[RULE_PROPERTY]:1,duration:CFG.ruleDuration,ease:M.easings.strongOut,overwrite:'auto',scrollTrigger:{trigger:el,start:CFG.triggerStart,once:true}}));}}
    if(initial)return;
    splits.push(SplitText.create(el,{type:'lines',mask:'lines',linesClass:"sc-section-text-line",autoSplit:true,onSplit:function(self){return gsap.from(self.lines,{yPercent:CFG.lineOffsetPercent,autoAlpha:0,duration:CFG.textDuration,ease:M.easings.strongOut,stagger:CFG.textStagger,overwrite:'auto',scrollTrigger:{trigger:el,start:CFG.triggerStart,once:true,invalidateOnRefresh:true}});}}));
  });
  function refresh(){SC.motion.refresh(REFRESH_DELAY);}refresh();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(refresh).catch(function(){});
  function cleanup(){tweens.forEach(function(tween){if(tween&&tween.scrollTrigger)tween.scrollTrigger.kill();if(tween)tween.kill();});splits.forEach(function(split){if(split&&split.revert)split.revert();});elements.forEach(function(el){el.classList.remove("sc-section-rule-host");gsap.set(el,{clearProps:RULE_PROPERTY});});}
  window.__scSectionLinesCleanup=cleanup;SC.sectionHeading=SC.sectionHeading||{};SC.sectionHeading.cleanup=cleanup;
}
SC.motion.whenReady(function(deps){ready(function(){if(SC.motion.reduced())return;loadSplitText().then(function(SplitText){if(!SplitText)return;requestAnimationFrame(function(){requestAnimationFrame(function(){initMotion(deps,SplitText);});});});});});
})();
