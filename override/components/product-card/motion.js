(function(){
'use strict';
var SC=window.SCOverride,parts=SC&&SC.productCardMotionParts;
if(!SC||!parts||SC.__productCardMotionBooted)return;SC.__productCardMotionBooted=true;
var installed=false;

function install(){
  if(installed||!SC.motion||typeof SC.motion.whenReady!=='function')return;
  installed=true;
  SC.motion.whenReady(function(deps){
    var gsap=deps.gsap,ST=deps.ScrollTrigger,mm=gsap.matchMedia();
    mm.add({
      mobile:'(max-width: 767px)',
      tablet:'(min-width: 768px) and (max-width: 992px)',
      desktop:'(min-width: 993px)',
      reduceMotion:'(prefers-reduced-motion: reduce)'
    },function(ctx){
      var tablet=!!ctx.conditions.tablet,desktop=!!ctx.conditions.desktop,reduce=!!ctx.conditions.reduceMotion;
      var profile=desktop?{batchMax:8,start:'clamp(top 91%)'}:tablet?{batchMax:6,start:'clamp(top 92%)'}:{batchMax:4,start:'clamp(top 93%)'};
      return parts.setupReveal?parts.setupReveal(gsap,ST,profile,reduce):function(){};
    });
    if(parts.installParallax)parts.installParallax(gsap,ST);
  });
}
install();
SC.productCardMotion={install:install};
})();