(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__cartBadgeMotionBooted)return;SC.__cartBadgeMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};

parts.setupBadges=function(gsap,reduce){
  var observers=[];
  gsap.utils.toArray('.shopMenuRightIcon .badge, .shopMenuRightIcon .badget').forEach(function(badge){
    var observer=new MutationObserver(function(){
      gsap.killTweensOf(badge);
      if(reduce){
        gsap.fromTo(badge,{autoAlpha:0.72},{autoAlpha:1,duration:0.12,ease:'power2.out',clearProps:'opacity,visibility'});
      }else{
        gsap.timeline().to(badge,{scale:1.08,duration:0.07,ease:'power2.out'}).to(badge,{scale:1,duration:0.10,ease:'power2.out'});
      }
    });
    observer.observe(badge,{childList:true,characterData:true,subtree:true});observers.push(observer);
  });
  return function(){observers.forEach(function(observer){observer.disconnect();});};
};
})();