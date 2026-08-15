(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,M=C&&C.motion,CFG=C&&C.productCard;if(!SC||!C||SC.__productCardRevealMotionBooted)return;SC.__productCardRevealMotionBooted=true;
var parts=SC.productCardMotionParts=SC.productCardMotionParts||{};

parts.setupReveal=function(gsap,ST,profile,reduce){
  var cards=gsap.utils.toArray(S.productCards),triggers=[],timer=0,rafA=0,rafB=0;
  function noop(){}
  function suppressReveal(){var state=SC.scrollState;return!!(state&&(state.programmatic||performance.now()<(state.suppressRevealUntil||0)));}
  function showNow(batch){gsap.killTweensOf(batch);gsap.set(batch,{autoAlpha:1,clearProps:'opacity,visibility'});}
  if(!cards.length)return noop;
  if(reduce){gsap.set(cards,{clearProps:'opacity,visibility'});return noop;}
  var initial=[],deferred=[];
  cards.forEach(function(card){
    if(card.classList.contains(K.staticInitialCard)){
      gsap.set(card,{autoAlpha:1,clearProps:'opacity,visibility'});
      return;
    }
    var rect=card.getBoundingClientRect();
    if(rect.bottom<CFG.behindViewportOffset)gsap.set(card,{autoAlpha:1,clearProps:'opacity,visibility'});
    else if(rect.top<=window.innerHeight*CFG.initialViewportRatio)initial.push(card);
    else deferred.push(card);
  });
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
  function reveal(batch){
    if(suppressReveal()){showNow(batch);return;}
    gsap.to(batch,{autoAlpha:1,duration:CFG.revealDuration,stagger:CFG.revealStagger,ease:M.easings.out,overwrite:'auto',onComplete:function(){gsap.set(batch,{clearProps:'opacity,visibility'});}});
  }
  if(deferred.length){
    gsap.set(deferred,{autoAlpha:0});
    triggers=ST.batch(deferred,{start:profile.start,once:true,interval:CFG.batchInterval,batchMax:profile.batchMax,onEnter:reveal,onEnterBack:reveal})||[];
    timer=window.setTimeout(function(){
      deferred.forEach(function(card){
        var rect=card.getBoundingClientRect(),style=getComputedStyle(card);
        if(rect.top<=innerHeight*CFG.rescueViewportRatio&&rect.bottom>=CFG.rescueBottomOffset&&(style.visibility==='hidden'||parseFloat(style.opacity)<CFG.rescueOpacityThreshold)){
          gsap.killTweensOf(card);
          if(suppressReveal())gsap.set(card,{autoAlpha:1,clearProps:'opacity,visibility'});
          else gsap.to(card,{autoAlpha:1,duration:CFG.rescueDuration,ease:M.easings.out,overwrite:true,clearProps:'opacity,visibility'});
        }
      });
      if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);
    },CFG.rescueDelay);
  }
  return function(){
    if(rafA)cancelAnimationFrame(rafA);
    if(rafB)cancelAnimationFrame(rafB);
    if(timer)clearTimeout(timer);
    triggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});
    gsap.killTweensOf(cards);
    gsap.set(cards,{clearProps:'opacity,visibility'});
  };
};
})();
