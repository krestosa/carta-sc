(function(){
'use strict';
/* Anima el badge del carrito cuando cambia su contenido. Agrupa mutaciones por frame
   para evitar pulsos duplicados y usa solo opacidad cuando reduced motion está activo. */
var SC=window.SCOverride,C=SC&&SC.config,CFG={reducedOpacity:.72,pulseScale:1.06,pulseY:-1};if(!SC||!C||SC.__cartBadgeMotionBooted)return;SC.__cartBadgeMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};

parts.setupBadges=function(gsap,reduce){
  var observers=[],badges=gsap.utils.toArray('.shopMenuRightIcon .badge, .shopMenuRightIcon .badget'),pending=new Set(),raf=0;
  function animate(badge){
    gsap.killTweensOf(badge);var spatial=SC.motion.springSpec('spatial','fast'),effects=SC.motion.springSpec('effects','fast');
    if(reduce){gsap.fromTo(badge,{autoAlpha:CFG.reducedOpacity},{autoAlpha:1,duration:effects.duration,ease:effects.ease,clearProps:'opacity,visibility'});return;}
    gsap.set(badge,{willChange:'transform'});
    gsap.timeline({onComplete:function(){gsap.set(badge,{clearProps:'transform,willChange'});}})
      .to(badge,{scale:CFG.pulseScale,y:CFG.pulseY,duration:spatial.duration*.55,ease:spatial.ease,overwrite:'auto',force3D:true},0)
      .to(badge,{scale:1,y:0,duration:spatial.duration*.72,ease:spatial.ease,overwrite:'auto',force3D:true},spatial.duration*.18);
  }
  function flush(){raf=0;var batch=Array.from(pending);pending.clear();batch.forEach(animate);}
  function schedule(badge){pending.add(badge);if(!raf)raf=requestAnimationFrame(flush);}
  badges.forEach(function(badge){var observer=new MutationObserver(function(){schedule(badge);});observer.observe(badge,{childList:true,characterData:true,subtree:true});observers.push(observer);});
  return function(){observers.forEach(function(observer){observer.disconnect();});if(raf)cancelAnimationFrame(raf);pending.clear();badges.forEach(function(badge){gsap.killTweensOf(badge);gsap.set(badge,{clearProps:'transform,opacity,visibility,willChange'});});};
};
})();