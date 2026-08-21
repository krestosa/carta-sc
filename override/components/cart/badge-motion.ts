(function(){
'use strict';
/* Anima el badge del carrito cuando cambia su contenido. Agrupa mutaciones por frame
   para evitar pulsos duplicados y usa solo opacidad cuando reduced motion está activo. */
var SC=window.SCOverride,C=SC&&SC.config,M=C&&C.motion,CFG={badgeReducedDuration:.12,badgeReducedOpacity:.72,badgePulseUpDuration:.07,badgePulseDownDuration:.10,badgePulseScale:1.08};if(!SC||!C||SC.__cartBadgeMotionBooted)return;SC.__cartBadgeMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};

parts.setupBadges=function(engine:MotionEngine,reduce:boolean):()=>void{
  var observers:MutationObserver[]=[],badges=Array.from(document.querySelectorAll<HTMLElement>('.shopMenuRightIcon .badge, .shopMenuRightIcon .badget')),pending=new Set<HTMLElement>(),active=new WeakMap<HTMLElement,MotionHandle[]>(),raf=0;
  function stop(badge:HTMLElement):void{var list=active.get(badge);if(list)list.forEach(function(handle){handle.cancel();});active.delete(badge);}
  function clear(badge:HTMLElement):void{badge.style.removeProperty('transform');badge.style.removeProperty('opacity');badge.style.removeProperty('visibility');badge.style.removeProperty('will-change');}
  function animate(badge:HTMLElement):void{stop(badge);if(reduce){badge.style.opacity=String(CFG.badgeReducedOpacity);var fade=engine.opacity(badge,1,{duration:CFG.badgeReducedDuration,ease:M.easings.out,clear:true,onComplete:function(){active.delete(badge);clear(badge);}});active.set(badge,[fade]);return;}var handles:MotionHandle[]=[],up=engine.transform(badge,{scale:CFG.badgePulseScale},{duration:CFG.badgePulseUpDuration,ease:M.easings.out,onComplete:function(){var down=engine.transform(badge,{scale:1},{duration:CFG.badgePulseDownDuration,ease:M.easings.out,clear:true,onComplete:function(){active.delete(badge);clear(badge);}});handles.push(down);}});handles.push(up);active.set(badge,handles);}
  function flush():void{raf=0;var batch=Array.from(pending);pending.clear();batch.forEach(animate);}
  function schedule(badge:HTMLElement):void{pending.add(badge);if(!raf)raf=requestAnimationFrame(flush);}
  badges.forEach(function(badge){var observer=new MutationObserver(function(){schedule(badge);});observer.observe(badge,{childList:true,characterData:true,subtree:true});observers.push(observer);});
  return function(){observers.forEach(function(observer){observer.disconnect();});if(raf)cancelAnimationFrame(raf);pending.clear();badges.forEach(function(badge){stop(badge);clear(badge);});};
};
})();
