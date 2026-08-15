(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config;if(!SC||!U||!C||SC.__categoryNavCoreBooted)return;SC.__categoryNavCoreBooted=true;
var S=C.selectors,K=C.classes,CFG=C.categoryNav,M=C.motion,N=SC.categoryNav=SC.categoryNav||{},each=U.each,offsetCache=null,autoTween=null,autoRaf=0,autoToken=0;
var scrollState=SC.scrollState=SC.scrollState||{};scrollState.programmatic=false;scrollState.suppressRevealUntil=0;
N.mq=C.queries.desktop;
function anchor(href){if(!href||href[0]!=='#'||href==='#')return null;var id=href.slice(1);try{id=decodeURIComponent(id);}catch(_){}return document.getElementById(id)||document.getElementsByName(id)[0]||null;}
function parentLink(a){return !!(a&&a.matches&&a.matches(S.categoryParentLink)&&!a.classList.contains('anchorLinkSub')&&!a.closest('.topPullDown,.dropdown-menu'));}
function links(root){return Array.prototype.filter.call((root||document).querySelectorAll(S.categoryParentLink),parentLink);}
function invalidateOffset(){offsetCache=null;}
function offset(){
  if(offsetCache!==null)return offsetCache;var bottom=0;
  [S.topBar,S.topShop,S.categoryToolbar,S.categoryMobileWrapper].forEach(function(selector){each(document.querySelectorAll(selector),function(node){if(!U.visible(node))return;var style=getComputedStyle(node),rect=node.getBoundingClientRect();if((style.position==='fixed'||style.position==='sticky')&&rect.top<=CFG.currentMarkOffset&&rect.bottom>0)bottom=Math.max(bottom,rect.bottom);});});
  offsetCache=Math.ceil(Math.max(0,bottom))+CFG.offsetGap;return offsetCache;
}
function closeLegacy(){if(SC.mutations&&SC.mutations.closeLegacyCategoryMenus)return SC.mutations.closeLegacyCategoryMenus();each(document.querySelectorAll(S.legacyPullDownOpen),function(node){node.classList.remove('open');});each(document.querySelectorAll(S.legacyMobileOpen),function(node){node.classList.remove('_open');});}
function cleanHash(){if(SC.mutations&&SC.mutations.cleanCategoryHash)return SC.mutations.cleanCategoryHash();if(/^#anchor/i.test(location.hash||''))try{history.replaceState(history.state,document.title,location.pathname+location.search);}catch(_){} }
function setProgrammatic(on,grace){scrollState.programmatic=!!on;scrollState.suppressRevealUntil=on?Infinity:(grace?performance.now()+CFG.programmaticGraceMs:0);}
function cancelAutoScroll(userInterrupt){autoToken++;if(autoTween){var tween=autoTween;autoTween=null;try{tween.kill();}catch(_){}}if(autoRaf){cancelAnimationFrame(autoRaf);autoRaf=0;}if(userInterrupt){setProgrammatic(false,false);if(N.releaseSpyHold)N.releaseSpyHold();if(N.scheduleSpy)N.scheduleSpy();}}
function finishAutoScroll(token){if(token!==autoToken)return;autoTween=null;autoRaf=0;setProgrammatic(false,true);if(N.releaseSpyHold)N.releaseSpyHold();if(N.scheduleSpy)N.scheduleSpy();}
function durationFor(distance){var range=CFG.scrollMaxDuration-CFG.scrollMinDuration;return Math.min(CFG.scrollMaxDuration,Math.max(CFG.scrollMinDuration,CFG.scrollMinDuration+Math.pow(Math.min(1,distance/CFG.scrollDistanceScale),.62)*range));}
function scrollPlan(target){var y=target.getBoundingClientRect().top+(pageYOffset||document.documentElement.scrollTop||0)-offset(),max=Math.max(0,document.documentElement.scrollHeight-innerHeight);y=Math.max(0,Math.min(max,y));var startY=pageYOffset||document.documentElement.scrollTop||0,distance=Math.abs(y-startY),instant=C.queries.reducedMotion.matches||distance<CFG.currentMarkOffset;return{y:y,distance:distance,duration:instant?0:durationFor(distance)};}
function fallbackScroll(y,token,duration){var startY=pageYOffset||document.documentElement.scrollTop||0,delta=y-startY,start=performance.now(),ms=duration*1000;function frame(now){if(token!==autoToken)return;var p=Math.min(1,(now-start)/ms),e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;scrollTo(0,startY+delta*e);if(p<1)autoRaf=requestAnimationFrame(frame);else finishAutoScroll(token);}autoRaf=requestAnimationFrame(frame);}
function scrollToTarget(target,plan){plan=plan||scrollPlan(target);cancelAutoScroll(false);var token=++autoToken;setProgrammatic(true,false);if(!plan.duration){scrollTo(0,plan.y);finishAutoScroll(token);return;}var duration=plan.duration,used=false;if(SC.motion&&SC.motion.run)used=SC.motion.run(function(deps){var gsap=deps.gsap;autoTween=gsap.to(window,{scrollTo:{y:plan.y,autoKill:true,onAutoKill:function(){if(token===autoToken)cancelAutoScroll(true);}},duration:duration,ease:M.easings.inOut,overwrite:'auto',onComplete:function(){finishAutoScroll(token);},onInterrupt:function(){if(token===autoToken)cancelAutoScroll(true);}});});if(!used)fallbackScroll(plan.y,token,duration);}
function activateAndScroll(target){var plan=scrollPlan(target);if(N.holdSpy)N.holdSpy(target);if(N.setActive)N.setActive(target,true);scrollToTarget(target,plan);}
function onCategory(event){if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;var link=event.target&&event.target.closest?event.target.closest(S.categoryLink):null;if(!link||link.closest('.topPullDown,.dropdown-menu')||!(link.closest(S.categoryToolbar)||link.closest('.wtopShopMenuMobile '+S.categoryMobileRail)))return;var target=anchor(link.getAttribute('href'));if(!target)return;event.preventDefault();event.stopImmediatePropagation();closeLegacy();cleanHash();activateAndScroll(target);}
function onSelect(event){var select=event.target;if(!select||!select.matches||!select.matches(S.categorySelect))return;var target=anchor(select.value);if(!target)return;event.preventDefault();event.stopImmediatePropagation();closeLegacy();cleanHash();activateAndScroll(target);}
function interrupt(){if(scrollState.programmatic)cancelAutoScroll(true);}
window.addEventListener('wheel',interrupt,{passive:true});window.addEventListener('touchstart',interrupt,{passive:true});
N.resolveAnchor=N.anchor=anchor;N.parentLink=parentLink;N.links=links;N.offset=offset;N.invalidateOffset=invalidateOffset;N.closeLegacy=closeLegacy;N.cleanHash=cleanHash;N.scrollToTarget=scrollToTarget;N.onCategory=onCategory;N.onSelect=onSelect;N.isAutoScrolling=function(){return!!scrollState.programmatic;};
})();
