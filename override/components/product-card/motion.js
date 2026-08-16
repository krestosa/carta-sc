(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,parts=SC&&SC.productCardMotionParts;
if(!SC||!C||!parts||SC.__productCardMotionBooted)return;SC.__productCardMotionBooted=true;
var installed=false,reflowRaf=0,PROFILES={mobile:{batchMax:4,start:'clamp(top 93%)'},tablet:{batchMax:6,start:'clamp(top 92%)'},desktop:{batchMax:8,start:'clamp(top 91%)'}};
function reflow(){
  if(reflowRaf)cancelAnimationFrame(reflowRaf);
  reflowRaf=requestAnimationFrame(function(){reflowRaf=requestAnimationFrame(function(){reflowRaf=0;if(parts.revealViewport)parts.revealViewport();if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);});});
}
function install(){
  if(installed||!SC.motion||typeof SC.motion.whenReady!=='function')return;
  installed=true;
  SC.motion.whenReady(function(deps){
    var gsap=deps.gsap,ST=deps.ScrollTrigger,mm=gsap.matchMedia(),profiles=PROFILES;
    mm.add({mobile:C.media.mobile,tablet:C.media.tablet,desktop:C.media.desktop,reduceMotion:C.media.reducedMotion},function(ctx){
      var tablet=!!ctx.conditions.tablet,desktop=!!ctx.conditions.desktop,reduce=!!ctx.conditions.reduceMotion;
      var profile=desktop?profiles.desktop:tablet?profiles.tablet:profiles.mobile;
      return parts.setupReveal?parts.setupReveal(gsap,ST,profile,reduce):function(){};
    });
  });
}
install();SC.productCardMotion={install:install,reflow:reflow};
})();
