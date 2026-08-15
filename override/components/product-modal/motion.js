(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__productModalMotionBooted)return;SC.__productModalMotionBooted=true;

function open(modal){
  if(!modal||!SC.motion||!SC.motion.run||SC.motion.reduced())return;
  SC.motion.run(function(deps){
    var gsap=deps.gsap,dialog=modal.querySelector('.sc-product-modal__dialog');if(!dialog)return;
    gsap.killTweensOf([modal,dialog]);
    gsap.set(modal,{autoAlpha:0});
    gsap.set(dialog,{autoAlpha:0,y:10,scale:.992,transformOrigin:'50% 50%'});
    gsap.timeline({defaults:{overwrite:'auto'}})
      .to(modal,{autoAlpha:1,duration:.14,ease:'power2.out'},0)
      .to(dialog,{autoAlpha:1,y:0,scale:1,duration:.20,ease:'power3.out',clearProps:'transform,opacity,visibility'},.015);
  });
}
function close(modal){
  if(!modal||!SC.motion||!SC.motion.run||SC.motion.reduced())return;
  SC.motion.run(function(deps){
    var gsap=deps.gsap,dialog=modal.querySelector('.sc-product-modal__dialog');if(!dialog)return;
    gsap.killTweensOf([modal,dialog]);
    gsap.timeline({defaults:{overwrite:'auto'}})
      .to(dialog,{autoAlpha:0,y:6,scale:.994,duration:.11,ease:'power2.in'},0)
      .to(modal,{autoAlpha:0,duration:.13,ease:'power2.inOut'},.005);
  });
}
SC.productModalMotion={open:open,close:close};
})();