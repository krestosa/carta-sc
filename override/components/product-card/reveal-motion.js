/* Reveal de tarjetas con opacidad, desplazamiento corto y stagger. Conserva rescates
   actuales y evita transforms sobre la card para mantener estable la imagen. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,CFG={behindViewportOffset:-20,initialThreshold:.96,initialDuration:.34,initialStagger:.032,initialLeadDelay:.36,revealDuration:.34,revealStagger:.03,batchInterval:.06,reflowDuration:.22,rescueBottomOffset:-30,rescueOpacityThreshold:.05,rescueDelay:900};if(!SC||!C||SC.__productCardRevealMotionBooted)return;SC.__productCardRevealMotionBooted=true;
var parts=SC.productCardMotionParts=SC.productCardMotionParts||{};
parts.setupReveal=function(gsap,ST,profile,reduce){
  var cards=gsap.utils.toArray(S.productCards),triggers=[],timer=0,observer=null,pending=null,initialPending=null,initialRafA=0,initialRafB=0,revealAhead=Math.max(0,Number(profile&&profile.revealAhead)||0);
  function noop(){}
  function suppressReveal(){var state=SC.scrollState;return!!(state&&(state.programmatic||performance.now()<(state.suppressRevealUntil||0)));}
  function clear(batch){gsap.set(batch,{clearProps:'top,opacity,visibility,willChange'});}
  function takePending(batch){if(!pending)return batch||[];var fresh=[];(batch||[]).forEach(function(card){if(!pending.has(card))return;pending.delete(card);if(observer)observer.unobserve(card);fresh.push(card);});return fresh;}
  function showNow(batch){batch=takePending(batch);if(!batch.length)return;gsap.killTweensOf(batch);gsap.set(batch,{autoAlpha:1,top:0});clear(batch);}
  function reveal(batch){
    batch=takePending(batch);if(!batch.length)return;gsap.killTweensOf(batch);
    gsap.to(batch,{autoAlpha:1,top:0,duration:CFG.revealDuration,stagger:CFG.revealStagger,ease:M.easings.out,overwrite:'auto',onComplete:function(){clear(batch);}});
  }
  /* El reflow no interrumpe la secuencia inicial título -> cards. */
  function revealViewport(){
    var batch=[];cards.forEach(function(card){if(initialPending&&initialPending.has(card))return;if(card.hidden||card.offsetParent===null)return;var rect=card.getBoundingClientRect();if(rect.top>innerHeight||rect.bottom<0)return;var style=getComputedStyle(card);if(style.visibility==='hidden'||parseFloat(style.opacity)<CFG.rescueOpacityThreshold)batch.push(card);});
    if(!batch.length)return;if(reduce||suppressReveal()){showNow(batch);return;}batch=takePending(batch);if(!batch.length)return;gsap.killTweensOf(batch);gsap.to(batch,{autoAlpha:1,top:0,duration:CFG.reflowDuration,ease:M.easings.out,overwrite:true,onComplete:function(){clear(batch);}});
  }
  if(!cards.length){parts.revealViewport=null;return noop;}parts.revealViewport=revealViewport;
  if(reduce){clear(cards);return function(){if(parts.revealViewport===revealViewport)parts.revealViewport=null;};}
  var behind=[],initial=[],deferred=[];
  cards.forEach(function(card){var rect=card.getBoundingClientRect();if(rect.bottom<CFG.behindViewportOffset)behind.push(card);else if(rect.top<=innerHeight*CFG.initialThreshold)initial.push(card);else deferred.push(card);});
  if(behind.length)showNow(behind);
  /* Estado inicial pintado en dos frames: primero sube el título y luego las cards. */
  if(initial.length){
    initialPending=new Set(initial);gsap.set(initial,{autoAlpha:0,top:profile.initialY,willChange:'top,opacity'});
    initialRafA=requestAnimationFrame(function(){initialRafA=0;initialRafB=requestAnimationFrame(function(){initialRafB=0;gsap.to(initial,{autoAlpha:1,top:0,duration:CFG.initialDuration,delay:CFG.initialLeadDelay,stagger:CFG.initialStagger,ease:M.easings.out,overwrite:'auto',onComplete:function(){clear(initial);if(initialPending)initialPending.clear();initialPending=null;}});});});
  }
  if(deferred.length){
    pending=new Set(deferred);gsap.set(deferred,{autoAlpha:0,top:profile.revealY,willChange:'top,opacity'});
    triggers=ST.batch(deferred,{start:profile.start,once:true,interval:CFG.batchInterval,batchMax:profile.batchMax,onEnter:reveal,onEnterBack:reveal})||[];
    /* Guard nativo sólo rescata al entrar realmente al viewport; no adelanta a los títulos. */
    if(profile&&profile.nativeRevealGuard&&window.IntersectionObserver){
      observer=new IntersectionObserver(function(entries){var batch=[];entries.forEach(function(entry){if(entry.isIntersecting)batch.push(entry.target);});if(!batch.length)return;if(suppressReveal())showNow(batch);else reveal(batch);},{root:null,rootMargin:'0px',threshold:0});
      deferred.forEach(function(card){observer.observe(card);});
    }
    timer=setTimeout(function(){var rescue=[];deferred.forEach(function(card){if(pending&&!pending.has(card))return;var rect=card.getBoundingClientRect();if(rect.top>innerHeight+revealAhead||rect.bottom<CFG.rescueBottomOffset)return;var style=getComputedStyle(card);if(style.visibility==='hidden'||parseFloat(style.opacity)<CFG.rescueOpacityThreshold)rescue.push(card);});if(rescue.length){if(suppressReveal())showNow(rescue);else reveal(rescue);}},CFG.rescueDelay);
  }
  return function(){
    if(parts.revealViewport===revealViewport)parts.revealViewport=null;if(initialRafA)cancelAnimationFrame(initialRafA);if(initialRafB)cancelAnimationFrame(initialRafB);if(timer)clearTimeout(timer);if(observer)observer.disconnect();if(initialPending)initialPending.clear();if(pending)pending.clear();triggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});gsap.killTweensOf(cards);clear(cards);
  };
};
})();
