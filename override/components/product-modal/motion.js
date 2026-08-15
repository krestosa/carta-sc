(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,CFG=C&&C.productModal;if(!SC||!C||SC.__productModalMotionBooted)return;SC.__productModalMotionBooted=true;
function open(modal){
  if(!modal||!SC.motion||!SC.motion.run||SC.motion.reduced())return;
  SC.motion.run(function(deps){
    var gsap=deps.gsap,dialog=modal.querySelector(S.productModalDialog);if(!dialog)return;
    gsap.killTweensOf([modal,dialog]);gsap.set(modal,{autoAlpha:0});gsap.set(dialog,{autoAlpha:0,y:CFG.openOffsetY,scale:CFG.openScale,transformOrigin:'50% 50%'});
    gsap.timeline({defaults:{overwrite:'auto'}})
      .to(modal,{autoAlpha:1,duration:CFG.openBackdropDuration,ease:M.easings.out},0)
      .to(dialog,{autoAlpha:1,y:0,scale:1,duration:CFG.openDialogDuration,ease:M.easings.strongOut,clearProps:'transform,opacity,visibility'},CFG.openDialogDelay);
  });
}
function close(modal){
  if(!modal||!SC.motion||!SC.motion.run||SC.motion.reduced())return;
  SC.motion.run(function(deps){
    var gsap=deps.gsap,dialog=modal.querySelector(S.productModalDialog);if(!dialog)return;
    gsap.killTweensOf([modal,dialog]);
    gsap.timeline({defaults:{overwrite:'auto'}})
      .to(dialog,{autoAlpha:0,y:CFG.closeOffsetY,scale:CFG.closeScale,duration:CFG.closeDialogDuration,ease:M.easings.in},0)
      .to(modal,{autoAlpha:0,duration:CFG.closeBackdropDuration,ease:M.easings.inOut},CFG.closeBackdropDelay);
  });
}
SC.productModalMotion={open:open,close:close};
})();
