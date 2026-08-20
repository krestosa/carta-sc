(function(){
'use strict';
/* Anima el badge del carrito cuando cambia su contenido. Agrupa mutaciones por frame
   para evitar pulsos duplicados y usa solo opacidad cuando reduced motion está activo. */
var SC=window.SCOverride,C=SC&&SC.config,M=C&&C.motion,CFG={badgeReducedDuration:.12,badgeReducedOpacity:.72,badgePulseUpDuration:.07,badgePulseDownDuration:.10,badgePulseScale:1.08};if(!SC||!C||SC.__cartBadgeMotionBooted)return;SC.__cartBadgeMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};

parts.setupBadges=function(gsap:GsapLike,reduce:boolean):()=>void{
  var observers:MutationObserver[]=[],badges=gsap.utils.toArray<HTMLElement>('.shopMenuRightIcon .badge, .shopMenuRightIcon .badget'),pending=new Set<HTMLElement>(),raf=0;
  function animate(badge:HTMLElement):void{
    gsap.killTweensOf(badge);
    if(reduce){gsap.fromTo(badge,{autoAlpha:CFG.badgeReducedOpacity},{autoAlpha:1,duration:CFG.badgeReducedDuration,ease:M.easings.out,clearProps:'opacity,visibility'});}
    else{gsap.timeline().to(badge,{scale:CFG.badgePulseScale,duration:CFG.badgePulseUpDuration,ease:M.easings.out}).to(badge,{scale:1,duration:CFG.badgePulseDownDuration,ease:M.easings.out});}
  }
  function flush():void{raf=0;var batch=Array.from(pending);pending.clear();batch.forEach(animate);}
  function schedule(badge:HTMLElement):void{pending.add(badge);if(!raf)raf=requestAnimationFrame(flush);}
  badges.forEach(function(badge:HTMLElement):void{var observer=new MutationObserver(function():void{schedule(badge);});observer.observe(badge,{childList:true,characterData:true,subtree:true});observers.push(observer);});
  return function():void{observers.forEach(function(observer:MutationObserver):void{observer.disconnect();});if(raf)cancelAnimationFrame(raf);pending.clear();badges.forEach(function(badge:HTMLElement):void{gsap.killTweensOf(badge);gsap.set(badge,{clearProps:'transform,opacity,visibility'});});};
};
})();
