(function(){
'use strict';
var SC=window.SCOverride,parts=SC&&SC.cartParts;if(!SC||!parts||SC.__cartComponentBooted)return;SC.__cartComponentBooted=true;
if(!SC.motion||typeof SC.motion.whenReady!=='function')return;

SC.motion.whenReady(function(deps){
  var gsap=deps.gsap,ST=deps.ScrollTrigger,mm=gsap.matchMedia();
  mm.add({
    mobile:'(max-width: 767px)',
    tablet:'(min-width: 768px) and (max-width: 992px)',
    desktop:'(min-width: 993px)',
    reduceMotion:'(prefers-reduced-motion: reduce)'
  },function(ctx){
    var tablet=!!ctx.conditions.tablet,desktop=!!ctx.conditions.desktop,reduce=!!ctx.conditions.reduceMotion;
    var profile=desktop?{maxLag:14,velocityScale:0.0032}:tablet?{maxLag:10,velocityScale:0.0028}:{maxLag:8,velocityScale:0.0024};
    var cleanList=parts.setupList?parts.setupList(gsap,ST,reduce):function(){};
    var cleanScroll=parts.setupScroll?parts.setupScroll(gsap,ST,profile,reduce):function(){};
    var cleanBadges=parts.setupBadges?parts.setupBadges(gsap,reduce):function(){};
    return function(){cleanList();cleanScroll();cleanBadges();};
  });
});
})();