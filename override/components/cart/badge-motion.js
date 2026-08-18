(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,M=C&&C.motion,CFG={badgeReducedDuration:.12,badgeReducedOpacity:.72,badgePulseUpDuration:.07,badgePulseDownDuration:.10,badgePulseScale:1.08};if(!SC||!C||SC.__cartBadgeMotionBooted)return;SC.__cartBadgeMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};

parts.setupBadges=function(gsap,reduce){
  var observers=[],badges=gsap.utils.toArray('.shopMenuRightIcon .badge, .shopMenuRightIcon .badget'),pending=new Set(),raf=0;
  function animate(badge){
    gsap.killTweensOf(badge);
    if(reduce){gsap.fromTo(badge,{autoAlpha:CFG.badgeReducedOpacity},{autoAlpha:1,duration:CFG.badgeReducedDuration,ease:M.easings.out,clearProps:'opacity,visibility'});}
    else{gsap.timeline().to(badge,{scale:CFG.badgePulseScale,duration:CFG.badgePulseUpDuration,ease:M.easings.out}).to(badge,{scale:1,duration:CFG.badgePulseDownDuration,ease:M.easings.out});}
  }
  function flush(){raf=0;var batch=Array.from(pending);pending.clear();batch.forEach(animate);}
  function schedule(badge){pending.add(badge);if(!raf)raf=requestAnimationFrame(flush);}
  badges.forEach(function(badge){var observer=new MutationObserver(function(){schedule(badge);});observer.observe(badge,{childList:true,characterData:true,subtree:true});observers.push(observer);});
  return function(){
    observers.forEach(function(observer){observer.disconnect();});if(raf)cancelAnimationFrame(raf);pending.clear();
    badges.forEach(function(badge){gsap.killTweensOf(badge);gsap.set(badge,{clearProps:'transform,opacity,visibility'});});
  };
};
})();