/* Orquesta el reveal de tarjetas por breakpoint y expone un reflow seguro cuando cambia
   la geometría. La implementación concreta vive separada en reveal-motion.js. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,parts=SC&&SC.productCardMotionParts;
if(!SC||!C||!parts||SC.__productCardMotionBooted)return;SC.__productCardMotionBooted=true;
/* Recupera el desplazamiento histórico y deja que el título entre antes que las cards. */
var installed=false,reflowRaf=0,PROFILES={
  mobile:{batchMax:4,start:'clamp(top 92%)',initialY:8,revealY:8,revealAhead:48,nativeRevealGuard:true},
  tablet:{batchMax:6,start:'clamp(top 91%)',initialY:9,revealY:10,revealAhead:56,nativeRevealGuard:true},
  desktop:{batchMax:8,start:'clamp(top 90%)',initialY:10,revealY:12,revealAhead:64,nativeRevealGuard:true}
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
