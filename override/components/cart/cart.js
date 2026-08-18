(function(){
'use strict';
/* Coordina las tres capas de motion del carrito: aparición de filas, respuesta al scroll
   y feedback del badge. Selecciona un perfil por breakpoint y comparte un único cleanup. */
var SC=window.SCOverride,C=SC&&SC.config,parts=SC&&SC.cartParts,PROFILES={mobile:{maxLag:8,velocityScale:.0024},tablet:{maxLag:10,velocityScale:.0028},desktop:{maxLag:14,velocityScale:.0032}};if(!SC||!C||!parts||SC.__cartComponentBooted)return;SC.__cartComponentBooted=true;
if(!SC.motion||typeof SC.motion.whenReady!=='function')return;
SC.motion.whenReady(function(deps){
  var gsap=deps.gsap,ST=deps.ScrollTrigger,mm=gsap.matchMedia(),profiles=PROFILES;
  /* Cada contexto activa solo la intensidad que corresponde y respeta reduced motion. */
  mm.add({mobile:C.media.mobile,tablet:C.media.tablet,desktop:C.media.desktop,reduceMotion:C.media.reducedMotion},function(ctx){
    var tablet=!!ctx.conditions.tablet,desktop=!!ctx.conditions.desktop,reduce=!!ctx.conditions.reduceMotion;
    var profile=desktop?profiles.desktop:tablet?profiles.tablet:profiles.mobile;
    var cleanList=parts.setupList?parts.setupList(gsap,ST,reduce):function(){};
    var cleanScroll=parts.setupScroll?parts.setupScroll(gsap,ST,profile,reduce):function(){};
    var cleanBadges=parts.setupBadges?parts.setupBadges(gsap,reduce):function(){};
    return function(){cleanList();cleanScroll();cleanBadges();};
  });
});
})();
