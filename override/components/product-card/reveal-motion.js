/* Reveal de la tarjeta completa. El skeleton vive dentro de la card y no condiciona su
   entrada; las cards esperan sólo al título/subtítulo anterior y luego salen en orden. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,CFG={behindViewportOffset:-20,initialThreshold:.96,initialDuration:.40,initialStagger:.12,revealDuration:.40,revealStagger:.11,batchInterval:.06,reflowDuration:.24,reflowStagger:.06,rescueBottomOffset:-30,rescueOpacityThreshold:.05,rescueDelay:900};if(!SC||!C||SC.__productCardRevealMotionBooted)return;SC.__productCardRevealMotionBooted=true;
var parts=SC.productCardMotionParts=SC.productCardMotionParts||{};
parts.setupReveal=function(gsap,ST,profile,reduce){
  var cards=gsap.utils.toArray(S.productCards),triggers=[],timer=0,observer=null,pending=null,initialPending=null,initialRafA=0,initialRafB=0,revealAhead=Math.max(0,Number(profile&&profile.revealAhead)||0);
  function noop(){}
  function suppressReveal(){var state=SC.scrollState;return!!(state&&(state.programmatic||performance.now()<(state.suppressRevealUntil||0)));}
  function clear(batch){gsap.set(batch,{clearProps:'top,opacity,visibility,willChange'});}
  function gate(card,callback){var heading=SC.sectionHeading;if(heading&&typeof heading.whenBeforeCardReady==='function'){heading.whenBeforeCardReady(card,callback);return;}callback();}
  function consumeDeferred(batch){if(!pending)return batch||[];var fresh=[];(batch||[]).forEach(function(card){if(!pending.has(card))return;pending.delete(card);if(observer)observer.unobserve(card);fresh.push(card);});return fresh;}
  function groupKey(card){var node=card&&card.previousElementSibling;while(node){if(node.matches&&node.matches(S.sectionSubtitle+','+S.sectionTitle))return node;node=node.previousElementSibling;}return card&&card.closest?card.closest(S.productList):null;}
  function showCard(card){gsap.killTweensOf(card);gsap.set(card,{autoAlpha:1,top:0});clear([card]);if(initialPending)initialPending.delete(card);}
  function animateCard(card,duration,delay){gsap.killTweensOf(card);gsap.to(card,{autoAlpha:1,top:0,duration:duration,delay:delay||0,ease:M.easings.strongOut,overwrite:'auto',onComplete:function(){clear([card]);if(initialPending)initialPending.delete(card);}});}
  /* Cada grupo conserva orden DOM mediante delay escalonado, sin depender de otra card. */
  function queueCards(batch,immediate,consume,duration,stagger){
    batch=consume?consumeDeferred(batch):(batch||[]);if(!batch.length)return;var counts=new Map();
    batch.forEach(function(card){var key=groupKey(card),index=counts.get(key)||0;counts.set(key,index+1);gate(card,function(){if(immediate)showCard(card);else animateCard(card,duration,index*stagger);});});
  }
  function showNow(batch){queueCards(batch,true,true,0,0);}
  function reveal(batch){queueCards(batch,false,true,CFG.revealDuration,CFG.revealStagger);}
  function revealViewport(){var batch=[];cards.forEach(function(card){if(initialPending&&initialPending.has(card))return;if(card.hidden||card.offsetParent===null)return;var rect=card.getBoundingClientRect();if(rect.top>innerHeight||rect.bottom<0)return;var style=getComputedStyle(card);if(style.visibility==='hidden'||parseFloat(style.opacity)<CFG.rescueOpacityThreshold)batch.push(card);});if(!batch.length)return;if(reduce||suppressReveal()){showNow(batch);return;}batch=consumeDeferred(batch);if(!batch.length)return;queueCards(batch,false,false,CFG.reflowDuration,CFG.reflowStagger);}
  if(!cards.length){parts.revealViewport=null;return noop;}parts.revealViewport=revealViewport;
  if(reduce){clear(cards);return function(){if(parts.revealViewport===revealViewport)parts.revealViewport=null;};}
  var inactive=[],behind=[],initial=[],deferred=[];cards.forEach(function(card){if(card.hidden||card.offsetParent===null){inactive.push(card);return;}var rect=card.getBoundingClientRect();if(rect.bottom<CFG.behindViewportOffset)behind.push(card);else if(rect.top<=innerHeight*CFG.initialThreshold)initial.push(card);else deferred.push(card);});if(inactive.length)inactive.forEach(showCard);if(behind.length)behind.forEach(showCard);
  /* La card se prepara aunque su imagen siga mostrando skeleton. */
  if(initial.length){initialPending=new Set(initial);gsap.set(initial,{autoAlpha:0,top:profile.initialY,willChange:'top,opacity'});initialRafA=requestAnimationFrame(function(){initialRafA=0;initialRafB=requestAnimationFrame(function(){initialRafB=0;queueCards(initial,false,false,CFG.initialDuration,CFG.initialStagger);});});}
  if(deferred.length){pending=new Set(deferred);gsap.set(deferred,{autoAlpha:0,top:profile.revealY,willChange:'top,opacity'});triggers=ST.batch(deferred,{start:profile.start,once:true,interval:CFG.batchInterval,batchMax:profile.batchMax,onEnter:reveal,onEnterBack:reveal})||[];if(window.IntersectionObserver){observer=new IntersectionObserver(function(entries){var batch=[];entries.forEach(function(entry){if(entry.isIntersecting)batch.push(entry.target);});if(!batch.length)return;if(suppressReveal())showNow(batch);else reveal(batch);},{root:null,rootMargin:'0px',threshold:0});deferred.forEach(function(card){observer.observe(card);});}timer=setTimeout(function(){var rescue=[];deferred.forEach(function(card){if(pending&&!pending.has(card))return;var rect=card.getBoundingClientRect();if(rect.top>innerHeight+revealAhead||rect.bottom<CFG.rescueBottomOffset)return;var style=getComputedStyle(card);if(style.visibility==='hidden'||parseFloat(style.opacity)<CFG.rescueOpacityThreshold)rescue.push(card);});if(rescue.length){if(suppressReveal())showNow(rescue);else reveal(rescue);}},CFG.rescueDelay);}
  return function(){if(parts.revealViewport===revealViewport)parts.revealViewport=null;if(initialRafA)cancelAnimationFrame(initialRafA);if(initialRafB)cancelAnimationFrame(initialRafB);if(timer)clearTimeout(timer);if(observer)observer.disconnect();if(initialPending)initialPending.clear();if(pending)pending.clear();triggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});gsap.killTweensOf(cards);clear(cards);};
};
})();
