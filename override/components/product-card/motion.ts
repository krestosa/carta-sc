/* Orquesta el motion propio de las cards por breakpoint. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,parts=SC&&SC.productCardMotionParts;if(!SC||!C||!parts||SC.__productCardMotionBooted)return;SC.__productCardMotionBooted=true;
if(!SC.motion||typeof SC.motion.whenReady!=='function')return;
SC.motion.whenReady(function(deps:MotionDeps){var gsap=deps.gsap,ST=deps.ScrollTrigger,mm=gsap.matchMedia();mm.add({phone:C.media.phone,tablet:C.media.tablet,desktop:C.media.desktop,reduceMotion:C.media.reducedMotion},function(ctx:GsapMatchMediaContext){var tablet=!!ctx.conditions.tablet,desktop=!!ctx.conditions.desktop,reduce=!!ctx.conditions.reduceMotion,profile=desktop?{initialY:12,revealY:16,threshold:.04}:tablet?{initialY:10,revealY:14,threshold:.035}:{initialY:8,revealY:12,threshold:.025};var clean=parts.setupReveal?parts.setupReveal(gsap,ST,profile,reduce):function(){};return function(){clean();};});});
})();
