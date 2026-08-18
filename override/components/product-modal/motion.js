(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,MS=SC&&SC.productModalSelectors,M=C&&C.motion,CFG={openOffsetY:10,openScale:.992,closeOffsetY:6,closeScale:.994,openBackdropDuration:.14,openDialogDuration:.20,openDialogDelay:.015,closeDialogDuration:.11,closeBackdropDuration:.13,closeBackdropDelay:.005};if(!SC||!C||!MS||SC.__productModalMotionBooted)return;SC.__productModalMotionBooted=true;
function nextToken(modal){var token=(modal.__scModalMotionToken||0)+1;modal.__scModalMotionToken=token;return token;}
function current(modal,token){return modal&&modal.__scModalMotionToken===token;}
function origin(dialog,source){
  if(!dialog)return;var value='50% 50%';
  if(source&&document.documentElement.contains(source)){
    var a=source.getBoundingClientRect(),d=dialog.getBoundingClientRect();if(d.width>0&&d.height>0){var x=((a.left+a.width*.5-d.left)/d.width)*100,y=((a.top+a.height*.5-d.top)/d.height)*100;x=Math.max(12,Math.min(88,x));y=Math.max(10,Math.min(90,y));value=x.toFixed(2)+'% '+y.toFixed(2)+'%';}
  }
  dialog.style.transformOrigin=value;
}
function clear(modal,dialog,gsap){if(!modal||!dialog||!gsap)return;gsap.set(modal,{clearProps:'opacity,visibility,willChange'});gsap.set(dialog,{clearProps:'transform,opacity,visibility,willChange'});}
function cancel(modal){if(!modal)return;nextToken(modal);if(!SC.motion||!SC.motion.runLoaded)return;SC.motion.runLoaded(function(deps){var dialog=modal.querySelector(MS.dialog);deps.gsap.killTweensOf([modal,dialog]);});}
function open(modal,source){
  if(!modal)return;var token=nextToken(modal),ran=SC.motion&&SC.motion.run&&SC.motion.run(function(deps){
    var gsap=deps.gsap,dialog=modal.querySelector(MS.dialog);if(!dialog)return;gsap.killTweensOf([modal,dialog]);origin(dialog,source);gsap.set(modal,{autoAlpha:0,willChange:'opacity'});gsap.set(dialog,{autoAlpha:0,y:CFG.openOffsetY,scale:CFG.openScale,willChange:'transform,opacity'});
    gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){if(!current(modal,token))return;clear(modal,dialog,gsap);}})
      .to(modal,{autoAlpha:1,duration:CFG.openBackdropDuration,ease:M.easings.out},0)
      .to(dialog,{autoAlpha:1,y:0,scale:1,duration:CFG.openDialogDuration,ease:M.easings.strongOut},CFG.openDialogDelay);
  });
  if(!ran){var dialog=modal.querySelector(MS.dialog);origin(dialog,source);}
}
function reopen(modal,source){
  if(!modal)return;var token=nextToken(modal),ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,dialog=modal.querySelector(MS.dialog);if(!dialog)return;gsap.killTweensOf([modal,dialog]);origin(dialog,source);gsap.set(modal,{willChange:'opacity'});gsap.set(dialog,{willChange:'transform,opacity'});
    gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){if(!current(modal,token))return;clear(modal,dialog,gsap);}})
      .to(modal,{autoAlpha:1,duration:.11,ease:M.easings.out},0)
      .to(dialog,{autoAlpha:1,y:0,scale:1,duration:.16,ease:M.easings.strongOut},0);
  });
  if(!ran){var dialog=modal.querySelector(MS.dialog);origin(dialog,source);modal.style.removeProperty('opacity');modal.style.removeProperty('visibility');}
}
function close(modal,done){
  if(!modal){if(done)done();return;}var token=nextToken(modal);
  if(SC.motion&&SC.motion.reduced&&SC.motion.reduced()){if(done)done();return;}
  var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,dialog=modal.querySelector(MS.dialog);if(!dialog){if(done)done();return;}gsap.killTweensOf([modal,dialog]);gsap.set(modal,{willChange:'opacity'});gsap.set(dialog,{willChange:'transform,opacity'});
    gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){if(!current(modal,token))return;if(done)done();}})
      .to(dialog,{autoAlpha:0,y:CFG.closeOffsetY,scale:CFG.closeScale,duration:CFG.closeDialogDuration,ease:M.easings.in},0)
      .to(modal,{autoAlpha:0,duration:CFG.closeBackdropDuration,ease:M.easings.inOut},CFG.closeBackdropDelay);
  });
  if(!ran&&done)done();
}
SC.productModalMotion={open:open,reopen:reopen,close:close,cancel:cancel};
})();