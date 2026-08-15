(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,CFG=C&&C.cart;if(!SC||!C||SC.__cartBadgeMotionBooted)return;SC.__cartBadgeMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};

parts.setupBadges=function(gsap,reduce){
  var observers=[],badges=gsap.utils.toArray(S.cartBadge);
  badges.forEach(function(badge){
    var observer=new MutationObserver(function(){
      gsap.killTweensOf(badge);
      if(reduce){
        gsap.fromTo(badge,{autoAlpha:0.72},{autoAlpha:1,duration:CFG.badgeReducedDuration,ease:M.easings.out,clearProps:'opacity,visibility'});
      }else{
        gsap.timeline().to(badge,{scale:CFG.badgePulseScale,duration:CFG.badgePulseUpDuration,ease:M.easings.out}).to(badge,{scale:1,duration:CFG.badgePulseDownDuration,ease:M.easings.out});
      }
    });
    observer.observe(badge,{childList:true,characterData:true,subtree:true});observers.push(observer);
  });
  return function(){
    observers.forEach(function(observer){observer.disconnect();});
    badges.forEach(function(badge){gsap.killTweensOf(badge);gsap.set(badge,{clearProps:'transform,opacity,visibility'});});
  };
};
})();
