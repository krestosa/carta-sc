(function(){
'use strict';
/* El carrito conserva sólo la aparición de filas; no añade inercia ni pulsos propios. */
var SC=window.SCOverride,C=SC&&SC.config,parts=SC&&SC.cartParts;if(!SC||!C||!parts||SC.__cartComponentBooted)return;SC.__cartComponentBooted=true;
if(!SC.motion||typeof SC.motion.whenReady!=='function')return;
SC.motion.whenReady(function(deps){var gsap=deps.gsap,ST=deps.ScrollTrigger,mm=gsap.matchMedia();mm.add({reduceMotion:C.media.reducedMotion},function(ctx){var reduce=!!ctx.conditions.reduceMotion;var cleanList=parts.setupList?parts.setupList(gsap,ST,reduce):function(){};return function(){cleanList();};});});
})();