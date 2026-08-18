/* Orquesta el reveal de tarjetas por breakpoint y expone un reflow seguro cuando cambia
   la geometría. La implementación concreta vive separada en reveal-motion.js. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,parts=SC&&SC.productCardMotionParts;
if(!SC||!C||!parts||SC.__productCardMotionBooted)return;SC.__productCardMotionBooted=true;
/* Perfiles exclusivos: <=640, 641-992 y >=993. triggerRatio replica el punto de entrada
   de ScrollTrigger y permite confirmar la geometría antes de consumir cada reveal. */
var installed=false,reflowRaf=0,PROFILES={
  mobile:{start:'clamp(top 92%)',triggerRatio:.92,initialY:8,revealY:8},
  tablet:{start:'clamp(top 91%)',triggerRatio:.91,initialY:9,revealY:10},
  desktop:{start:'clamp(top 90%)',triggerRatio:.90,initialY:10,revealY:12}
};
/* Espera dos frames antes de rescatar cards visibles y refrescar geometría de motion. */
function reflow(){
  if(reflowRaf)cancelAnimationFrame(reflowRaf);
  reflowRaf=requestAnimationFrame(function(){reflowRaf=requestAnimationFrame(function(){reflowRaf=0;if(parts.revealViewport)parts.revealViewport();if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);});});
}
/* Registra una única instancia responsive y delega su cleanup al contexto de GSAP. */
function install(){
  if(installed||!SC.motion||typeof SC.motion.whenReady!=='function')return;
  installed=true;
  SC.motion.whenReady(function(deps){
    var gsap=deps.gsap,ST=deps.ScrollTrigger,mm=gsap.matchMedia(),profiles=PROFILES;
    mm.add({mobile:C.media.phone,tablet:C.media.compactWide,desktop:C.media.desktop,reduceMotion:C.media.reducedMotion},function(ctx){
      var tablet=!!ctx.conditions.tablet,desktop=!!ctx.conditions.desktop,reduce=!!ctx.conditions.reduceMotion;
      var profile=desktop?profiles.desktop:tablet?profiles.tablet:profiles.mobile;
      return parts.setupReveal?parts.setupReveal(gsap,ST,profile,reduce):function(){};
    });
  });
}
install();SC.productCardMotion={install:install,reflow:reflow};
})();
