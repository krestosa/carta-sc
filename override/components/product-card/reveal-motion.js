/* Implementa la aparición progresiva de tarjetas sin ocultar el primer viewport. Separa
   tarjetas iniciales, diferidas y rescates para evitar parpadeos cuando motion carga tarde. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,CFG={behindViewportOffset:-20,revealDuration:.34,revealStagger:.03,batchInterval:.06,reflowDuration:.22,rescueBottomOffset:-30,rescueOpacityThreshold:.05,rescueDuration:.20,rescueDelay:900};if(!SC||!C||SC.__productCardRevealMotionBooted)return;SC.__productCardRevealMotionBooted=true;
var parts=SC.productCardMotionParts=SC.productCardMotionParts||{};
parts.setupReveal=function(gsap,ST,profile,reduce){
  var cards=gsap.utils.toArray(S.productCards),triggers=[],timer=0,observer=null,pending=null,revealAhead=Math.max(0,Number(profile&&profile.revealAhead)||0);
  function noop(){}
  /* Durante scroll programático muestra directamente para no competir con la navegación. */
  function suppressReveal(){var state=SC.scrollState;return!!(state&&(state.programmatic||performance.now()<(state.suppressRevealUntil||0)));}
  /* Cada card diferida puede resolverse una sola vez aunque coincidan ScrollTrigger y el guard nativo. */
  function takePending(batch){
    if(!pending)return batch||[];
    var fresh=[];(batch||[]).forEach(function(card){if(!pending.has(card))return;pending.delete(card);if(observer)observer.unobserve(card);fresh.push(card);});return fresh;
  }
  function showNow(batch){batch=takePending(batch);if(!batch.length)return;gsap.killTweensOf(batch);gsap.set(batch,{autoAlpha:1,clearProps:'opacity,visibility'});}
  function reveal(batch){batch=takePending(batch);if(!batch.length)return;gsap.killTweensOf(batch);gsap.to(batch,{autoAlpha:1,duration:CFG.revealDuration,stagger:CFG.revealStagger,ease:M.easings.out,overwrite:'auto',onComplete:function(){gsap.set(batch,{clearProps:'opacity,visibility'});}});}
  /* Rescata cualquier card visible que haya quedado oculta tras un cambio de layout. */
  function revealViewport(){
    var batch=[];cards.forEach(function(card){if(card.hidden||card.offsetParent===null)return;var rect=card.getBoundingClientRect();if(rect.top>innerHeight||rect.bottom<0)return;var style=getComputedStyle(card);if(style.visibility==='hidden'||parseFloat(style.opacity)<CFG.rescueOpacityThreshold)batch.push(card);});
    if(!batch.length)return;if(reduce||suppressReveal()){showNow(batch);return;}batch=takePending(batch);if(!batch.length)return;gsap.killTweensOf(batch);gsap.to(batch,{autoAlpha:1,duration:CFG.reflowDuration,ease:M.easings.out,overwrite:true,onComplete:function(){gsap.set(batch,{clearProps:'opacity,visibility'});}});
  }
  if(!cards.length){parts.revealViewport=null;return noop;}parts.revealViewport=revealViewport;
  if(reduce){gsap.set(cards,{clearProps:'opacity,visibility'});return function(){if(parts.revealViewport===revealViewport)parts.revealViewport=null;};}
  /* La zona inicial incluye el margen anticipado para no ocultar cards que están a punto de entrar. */
  var behind=[],initial=[],deferred=[],threshold=window.innerHeight+revealAhead;
  cards.forEach(function(card){var rect=card.getBoundingClientRect();if(rect.bottom<CFG.behindViewportOffset)behind.push(card);else if(rect.top<=threshold)initial.push(card);else deferred.push(card);});
  if(behind.length)showNow(behind);if(initial.length)showNow(initial);
  if(deferred.length){
    pending=new Set(deferred);gsap.set(deferred,{autoAlpha:0});
    triggers=ST.batch(deferred,{start:profile.start,once:true,interval:CFG.batchInterval,batchMax:profile.batchMax,onEnter:reveal,onEnterBack:reveal})||[];
    /* En mobile IntersectionObserver evita que una card quede oculta si ScrollTrigger conserva una geometría vieja. */
    if(profile&&profile.nativeRevealGuard&&window.IntersectionObserver){
      observer=new IntersectionObserver(function(entries){var batch=[];entries.forEach(function(entry){if(entry.isIntersecting)batch.push(entry.target);});if(!batch.length)return;if(suppressReveal())showNow(batch);else reveal(batch);},{root:null,rootMargin:'0px 0px '+revealAhead+'px 0px',threshold:0});
      deferred.forEach(function(card){observer.observe(card);});
    }
    timer=window.setTimeout(function(){var rescue=[];deferred.forEach(function(card){if(pending&&!pending.has(card))return;var rect=card.getBoundingClientRect();if(rect.top>innerHeight+revealAhead||rect.bottom<CFG.rescueBottomOffset)return;var style=getComputedStyle(card);if(style.visibility==='hidden'||parseFloat(style.opacity)<CFG.rescueOpacityThreshold)rescue.push(card);});if(rescue.length){if(suppressReveal())showNow(rescue);else reveal(rescue);}},CFG.rescueDelay);
  }
  return function(){if(parts.revealViewport===revealViewport)parts.revealViewport=null;if(timer)clearTimeout(timer);if(observer)observer.disconnect();if(pending)pending.clear();triggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});gsap.killTweensOf(cards);gsap.set(cards,{clearProps:'opacity,visibility'});};
};
})();
