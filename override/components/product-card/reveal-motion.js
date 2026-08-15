(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__productCardRevealMotionBooted)return;SC.__productCardRevealMotionBooted=true;
var parts=SC.productCardMotionParts=SC.productCardMotionParts||{};

parts.setupReveal=function(gsap,ST,profile,reduce){
  var cards=gsap.utils.toArray('.listadoShop .productoShop'),triggers=[],timer=0,rafA=0,rafB=0;
  function noop(){}
  if(!cards.length)return noop;
  if(reduce){gsap.set(cards,{clearProps:'opacity,visibility'});return noop;}
  var initial=[],deferred=[];
  cards.forEach(function(card){
    var rect=card.getBoundingClientRect();
    if(rect.bottom<-20)gsap.set(card,{autoAlpha:1,clearProps:'opacity,visibility'});
    else if(rect.top<=window.innerHeight*0.96)initial.push(card);
    else deferred.push(card);
  });
  if(initial.length){
    gsap.set(initial,{autoAlpha:0});
    rafA=requestAnimationFrame(function(){
      rafA=0;
      rafB=requestAnimationFrame(function(){
        rafB=0;
        gsap.to(initial,{autoAlpha:1,duration:0.34,stagger:0.032,ease:'power2.out',overwrite:'auto',onComplete:function(){gsap.set(initial,{clearProps:'opacity,visibility'});}});
      });
    });
  }
  function reveal(batch){
    gsap.to(batch,{autoAlpha:1,duration:0.34,stagger:0.03,ease:'power2.out',overwrite:'auto',onComplete:function(){gsap.set(batch,{clearProps:'opacity,visibility'});}});
  }
  if(deferred.length){
    gsap.set(deferred,{autoAlpha:0});
    triggers=ST.batch(deferred,{start:profile.start,once:true,interval:0.06,batchMax:profile.batchMax,onEnter:reveal,onEnterBack:reveal})||[];
    timer=window.setTimeout(function(){
      deferred.forEach(function(card){
        var rect=card.getBoundingClientRect(),style=getComputedStyle(card);
        if(rect.top<=innerHeight*1.03&&rect.bottom>=-30&&(style.visibility==='hidden'||parseFloat(style.opacity)<0.05)){
          gsap.killTweensOf(card);
          gsap.to(card,{autoAlpha:1,duration:0.20,ease:'power2.out',overwrite:true,clearProps:'opacity,visibility'});
        }
      });
      ST.refresh();
    },900);
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