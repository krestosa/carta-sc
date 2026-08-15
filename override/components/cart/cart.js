(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,parts=SC&&SC.cartParts;if(!SC||!C||!parts||SC.__cartComponentBooted)return;SC.__cartComponentBooted=true;
if(!SC.motion||typeof SC.motion.whenReady!=='function')return;
SC.motion.whenReady(function(deps){
  var gsap=deps.gsap,ST=deps.ScrollTrigger,mm=gsap.matchMedia(),profiles=C.cart.profiles;
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
