(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,M=C&&C.motion,CFG={initialViewportRatio:.96,behindViewportOffset:-20,initialDuration:.34,initialStagger:.032,revealDuration:.34,revealStagger:.03,batchInterval:.06,reflowDuration:.22,rescueViewportRatio:1.03,rescueBottomOffset:-30,rescueOpacityThreshold:.05,rescueDuration:.20,rescueDelay:900};if(!SC||!C||SC.__productCardRevealMotionBooted)return;SC.__productCardRevealMotionBooted=true;
var parts=SC.productCardMotionParts=SC.productCardMotionParts||{};

parts.setupReveal=function(gsap,ST,profile,reduce){
  var cards=gsap.utils.toArray(S.productCards),triggers=[],timer=0,rafA=0,rafB=0;
  function noop(){}
  function suppressReveal(){var state=SC.scrollState;return!!(state&&(state.programmatic||performance.now()<(state.suppressRevealUntil||0)));}
  function showNow(batch){gsap.killTweensOf(batch);gsap.set(batch,{autoAlpha:1,clearProps:'opacity,visibility'});}
  function reveal(batch){
    gsap.killTweensOf(batch);
    gsap.to(batch,{autoAlpha:1,duration:CFG.revealDuration,stagger:CFG.revealStagger,ease:M.easings.out,overwrite:'auto',onComplete:function(){gsap.set(batch,{clearProps:'opacity,visibility'});}});
  }
  function revealViewport(){
    var batch=[];
    cards.forEach(function(card){
      if(card.hidden||card.offsetParent===null)return;
      var rect=card.getBoundingClientRect();
      if(rect.top>innerHeight||rect.bottom<0)return;
      var style=getComputedStyle(card);
      if(style.visibility==='hidden'||parseFloat(style.opacity)<CFG.rescueOpacityThreshold)batch.push(card);
    });
    if(!batch.length)return;
    if(reduce||suppressReveal()){showNow(batch);return;}
    gsap.killTweensOf(batch);
    gsap.to(batch,{autoAlpha:1,duration:CFG.reflowDuration,ease:M.easings.out,overwrite:true,onComplete:function(){gsap.set(batch,{clearProps:'opacity,visibility'});}});
  }
  if(!cards.length){parts.revealViewport=null;return noop;}
  parts.revealViewport=revealViewport;
  if(reduce){gsap.set(cards,{clearProps:'opacity,visibility'});return function(){if(parts.revealViewport===revealViewport)parts.revealViewport=null;};}
  var staticCards=[],behind=[],initial=[],deferred=[],threshold=window.innerHeight*CFG.initialViewportRatio;
  cards.forEach(function(card){
    if(card.classList.contains(K.staticInitialCard)){staticCards.push(card);return;}
    var rect=card.getBoundingClientRect();
    if(rect.bottom<CFG.behindViewportOffset)behind.push(card);
    else if(rect.top<=threshold)initial.push(card);
    else deferred.push(card);
  });
  if(staticCards.length)gsap.set(staticCards,{autoAlpha:1,clearProps:'opacity,visibility'});
  if(behind.length)gsap.set(behind,{autoAlpha:1,clearProps:'opacity,visibility'});
  if(initial.length){
    gsap.set(initial,{autoAlpha:0});
    rafA=requestAnimationFrame(function(){
      rafA=0;
      rafB=requestAnimationFrame(function(){
        rafB=0;
        gsap.to(initial,{autoAlpha:1,duration:CFG.initialDuration,stagger:CFG.initialStagger,ease:M.easings.out,overwrite:'auto',onComplete:function(){gsap.set(initial,{clearProps:'opacity,visibility'});}});
      });
    });
  }
  if(deferred.length){
    gsap.set(deferred,{autoAlpha:0});
    triggers=ST.batch(deferred,{start:profile.start,once:true,interval:CFG.batchInterval,batchMax:profile.batchMax,onEnter:reveal,onEnterBack:reveal})||[];
    timer=window.setTimeout(function(){
      var rescue=[];
      deferred.forEach(function(card){
        var rect=card.getBoundingClientRect();
        if(rect.top>innerHeight*CFG.rescueViewportRatio||rect.bottom<CFG.rescueBottomOffset)return;
        var style=getComputedStyle(card);
        if(style.visibility==='hidden'||parseFloat(style.opacity)<CFG.rescueOpacityThreshold)rescue.push(card);
      });
      if(rescue.length){
        gsap.killTweensOf(rescue);
        if(suppressReveal())gsap.set(rescue,{autoAlpha:1,clearProps:'opacity,visibility'});
        else gsap.to(rescue,{autoAlpha:1,duration:CFG.rescueDuration,ease:M.easings.out,overwrite:true,clearProps:'opacity,visibility'});
      }
      if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);
    },CFG.rescueDelay);
  }
  return function(){
    if(parts.revealViewport===revealViewport)parts.revealViewport=null;
    if(rafA)cancelAnimationFrame(rafA);
    if(rafB)cancelAnimationFrame(rafB);
    if(timer)clearTimeout(timer);
    triggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});
    gsap.killTweensOf(cards);
    gsap.set(cards,{clearProps:'opacity,visibility'});
  };
};
})();
