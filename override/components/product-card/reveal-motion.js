/* Reveal individual de la tarjeta completa. Cada card entra a la misma cola DOM que los
   headings cuando su propio trigger se activa; no hay batch, stagger ni dependencia futura. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,CFG={behindViewportOffset:-20,initialThreshold:.96,initialDuration:.34,revealDuration:.34,reflowDuration:.22,rescueBottomOffset:-30,rescueOpacityThreshold:.05,rescueDelay:900};if(!SC||!C||SC.__productCardRevealMotionBooted)return;SC.__productCardRevealMotionBooted=true;
var parts=SC.productCardMotionParts=SC.productCardMotionParts||{},queue=SC.catalogRevealQueue;
parts.setupReveal=function(gsap,ST,profile,reduce){
  var cards=gsap.utils.toArray(S.productCards),triggers=[],timer=0,observer=null,pending=null,initialPending=null,initialRafA=0,initialRafB=0,revealAhead=Math.max(0,Number(profile&&profile.revealAhead)||0);
  function noop(){}
  function suppressReveal(){var state=SC.scrollState;return!!(state&&(state.programmatic||performance.now()<(state.suppressRevealUntil||0)));}
  function clear(card){gsap.set(card,{clearProps:'top,opacity,visibility,willChange'});}
  function complete(card){if(initialPending)initialPending.delete(card);if(queue&&queue.complete)queue.complete(card);}
  function showCard(card){gsap.killTweensOf(card);gsap.set(card,{autoAlpha:1,top:0});clear(card);complete(card);}
  function animateCard(card,duration,done){gsap.killTweensOf(card);gsap.to(card,{autoAlpha:1,top:0,duration:duration,ease:M.easings.strongOut,overwrite:'auto',onComplete:function(){clear(card);if(initialPending)initialPending.delete(card);if(done)done();}});}
  function removePending(card){if(!pending||!pending.has(card))return false;pending.delete(card);if(observer)observer.unobserve(card);return true;}
  function requestCard(card,duration){
    if(!card)return;if(pending&&!removePending(card))return;
    if(suppressReveal()||reduce||!queue||typeof queue.enqueue!=='function'){showCard(card);return;}
    queue.enqueue(card,function(done){animateCard(card,duration,done);});
  }
  function revealViewport(){
    cards.forEach(function(card){if(initialPending&&initialPending.has(card))return;if(card.hidden||card.offsetParent===null)return;var rect=card.getBoundingClientRect();if(rect.top>innerHeight||rect.bottom<0)return;var style=getComputedStyle(card);if(style.visibility==='hidden'||parseFloat(style.opacity)<CFG.rescueOpacityThreshold)requestCard(card,CFG.reflowDuration);});
  }
  if(!cards.length){parts.revealViewport=null;return noop;}parts.revealViewport=revealViewport;
  if(reduce){cards.forEach(showCard);return function(){if(parts.revealViewport===revealViewport)parts.revealViewport=null;};}
  var inactive=[],behind=[],initial=[],deferred=[];
  pending=new Set();
  cards.forEach(function(card){
    if(queue&&queue.isDone&&queue.isDone(card)){clear(card);return;}
    if(card.hidden||card.offsetParent===null){inactive.push(card);return;}var rect=card.getBoundingClientRect();
    if(rect.bottom<CFG.behindViewportOffset)behind.push(card);else if(rect.top<=innerHeight*CFG.initialThreshold)initial.push(card);else deferred.push(card);
  });
  inactive.forEach(showCard);behind.forEach(showCard);
  if(initial.length){
    initialPending=new Set(initial);initial.forEach(function(card){pending.add(card);});gsap.set(initial,{autoAlpha:0,top:profile.initialY,willChange:'top,opacity'});
    initialRafA=requestAnimationFrame(function(){initialRafA=0;initialRafB=requestAnimationFrame(function(){initialRafB=0;initial.forEach(function(card){requestCard(card,CFG.initialDuration);});});});
  }
  if(deferred.length){
    deferred.forEach(function(card){pending.add(card);});gsap.set(deferred,{autoAlpha:0,top:profile.revealY,willChange:'top,opacity'});
    deferred.forEach(function(card){triggers.push(ST.create({trigger:card,start:profile.start,once:true,invalidateOnRefresh:true,onEnter:function(){requestCard(card,CFG.revealDuration);},onEnterBack:function(){requestCard(card,CFG.revealDuration);}}));});
    if(window.IntersectionObserver){observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting)requestCard(entry.target,CFG.revealDuration);});},{root:null,rootMargin:'0px',threshold:0});deferred.forEach(function(card){observer.observe(card);});}
    timer=setTimeout(function(){deferred.forEach(function(card){if(!pending||!pending.has(card))return;var rect=card.getBoundingClientRect();if(rect.top>innerHeight+revealAhead||rect.bottom<CFG.rescueBottomOffset)return;var style=getComputedStyle(card);if(style.visibility==='hidden'||parseFloat(style.opacity)<CFG.rescueOpacityThreshold)requestCard(card,CFG.reflowDuration);});},CFG.rescueDelay);
  }
  return function(){
    if(parts.revealViewport===revealViewport)parts.revealViewport=null;if(initialRafA)cancelAnimationFrame(initialRafA);if(initialRafB)cancelAnimationFrame(initialRafB);if(timer)clearTimeout(timer);if(observer)observer.disconnect();
    if(pending){pending.forEach(function(card){if(queue&&queue.cancel)queue.cancel(card);});pending.clear();pending=null;}if(initialPending)initialPending.clear();triggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});gsap.killTweensOf(cards);cards.forEach(clear);
  };
};
})();
