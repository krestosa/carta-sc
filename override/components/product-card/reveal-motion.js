/* Implementa la aparición progresiva de tarjetas sin ocultar el primer viewport. Separa
   tarjetas iniciales, diferidas y rescates para evitar parpadeos cuando motion carga tarde. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,CFG={behindViewportOffset:-20,revealDuration:.34,revealStagger:.03,batchInterval:.06,reflowDuration:.22,rescueBottomOffset:-30,rescueOpacityThreshold:.05,rescueDuration:.20,rescueDelay:900};if(!SC||!C||SC.__productCardRevealMotionBooted)return;SC.__productCardRevealMotionBooted=true;
var parts=SC.productCardMotionParts=SC.productCardMotionParts||{};
parts.setupReveal=function(gsap,ST,profile,reduce){
  var cards=gsap.utils.toArray(S.productCards),triggers=[],timer=0,revealAhead=Math.max(0,Number(profile&&profile.revealAhead)||0);
  function noop(){}
  /* Durante scroll programático muestra directamente para no competir con la navegación. */
  function suppressReveal(){var state=SC.scrollState;return!!(state&&(state.programmatic||performance.now()<(state.suppressRevealUntil||0)));}
  function showNow(batch){gsap.killTweensOf(batch);gsap.set(batch,{autoAlpha:1,clearProps:'opacity,visibility'});}
  function reveal(batch){gsap.killTweensOf(batch);gsap.to(batch,{autoAlpha:1,duration:CFG.revealDuration,stagger:CFG.revealStagger,ease:M.easings.out,overwrite:'auto',onComplete:function(){gsap.set(batch,{clearProps:'opacity,visibility'});}});}
  /* Rescata cualquier card visible que haya quedado oculta tras un cambio de layout. */
  function revealViewport(){
    var batch=[];cards.forEach(function(card){if(card.hidden||card.offsetParent===null)return;var rect=card.getBoundingClientRect();if(rect.top>innerHeight||rect.bottom<0)return;var style=getComputedStyle(card);if(style.visibility==='hidden'||parseFloat(style.opacity)<CFG.rescueOpacityThreshold)batch.push(card);});
    if(!batch.length)return;if(reduce||suppressReveal()){showNow(batch);return;}gsap.killTweensOf(batch);gsap.to(batch,{autoAlpha:1,duration:CFG.reflowDuration,ease:M.easings.out,overwrite:true,onComplete:function(){gsap.set(batch,{clearProps:'opacity,visibility'});}});
  }
  if(!cards.length){parts.revealViewport=null;return noop;}parts.revealViewport=revealViewport;
  if(reduce){gsap.set(cards,{clearProps:'opacity,visibility'});return function(){if(parts.revealViewport===revealViewport)parts.revealViewport=null;};}
  /* La zona inicial incluye el margen anticipado para no ocultar cards que están a punto de entrar. */
  var behind=[],initial=[],deferred=[],threshold=window.innerHeight+revealAhead;
  cards.forEach(function(card){var rect=card.getBoundingClientRect();if(rect.bottom<CFG.behindViewportOffset)behind.push(card);else if(rect.top<=threshold)initial.push(card);else deferred.push(card);});
  if(behind.length)showNow(behind);if(initial.length)showNow(initial);
  if(deferred.length){
    gsap.set(deferred,{autoAlpha:0});triggers=ST.batch(deferred,{start:profile.start,once:true,interval:CFG.batchInterval,batchMax:profile.batchMax,onEnter:reveal,onEnterBack:reveal})||[];
    /* El rescate cubre también la zona anticipada si un refresh deja una card oculta cerca del viewport. */
    timer=window.setTimeout(function(){var rescue=[];deferred.forEach(function(card){var rect=card.getBoundingClientRect();if(rect.top>innerHeight+revealAhead||rect.bottom<CFG.rescueBottomOffset)return;var style=getComputedStyle(card);if(style.visibility==='hidden'||parseFloat(style.opacity)<CFG.rescueOpacityThreshold)rescue.push(card);});if(rescue.length){gsap.killTweensOf(rescue);if(suppressReveal())gsap.set(rescue,{autoAlpha:1,clearProps:'opacity,visibility'});else gsap.to(rescue,{autoAlpha:1,duration:CFG.rescueDuration,ease:M.easings.out,overwrite:true,clearProps:'opacity,visibility'});}},CFG.rescueDelay);
  }
  return function(){if(parts.revealViewport===revealViewport)parts.revealViewport=null;if(timer)clearTimeout(timer);triggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});gsap.killTweensOf(cards);gsap.set(cards,{clearProps:'opacity,visibility'});};
};
})();
