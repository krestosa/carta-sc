/* Controla apertura, reapertura y cierre del modal con animaciones interrumpibles. Cada
   transición usa un token propio para que una interacción nueva invalide la anterior. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,MS=SC&&SC.productModalSelectors,CFG={openOffsetY:12,openScale:.986,closeOffsetY:8,closeScale:.992};
if(!SC||!C||!MS||SC.__productModalMotionBooted)return;SC.__productModalMotionBooted=true;
/* El token evita que callbacks de una transición vieja limpien una animación más reciente. */
function nextToken(modal){var token=(modal.__scModalMotionToken||0)+1;modal.__scModalMotionToken=token;return token;}
function current(modal,token){return modal&&modal.__scModalMotionToken===token;}
/* Calcula el origen desde la card que abrió el modal para que el movimiento tenga continuidad. */
function origin(dialog,source){
  if(!dialog)return;var value='50% 50%';
  if(source&&document.documentElement.contains(source)){
    var a=source.getBoundingClientRect(),d=dialog.getBoundingClientRect();if(d.width>0&&d.height>0){var x=((a.left+a.width*.5-d.left)/d.width)*100,y=((a.top+a.height*.5-d.top)/d.height)*100;x=Math.max(12,Math.min(88,x));y=Math.max(10,Math.min(90,y));value=x.toFixed(2)+'% '+y.toFixed(2)+'%';}
  }
  dialog.style.transformOrigin=value;
}
/* Limpia propiedades temporales para devolver el control del estado final al CSS. */
function clear(modal,dialog,gsap){if(!modal||!dialog||!gsap)return;gsap.set(modal,{clearProps:'opacity,visibility,willChange'});gsap.set(dialog,{clearProps:'transform,opacity,visibility,willChange'});}
function cancel(modal){if(!modal)return;nextToken(modal);if(!SC.motion||!SC.motion.runLoaded)return;SC.motion.runLoaded(function(deps){var dialog=modal.querySelector(MS.dialog);deps.gsap.killTweensOf([modal,dialog]);});}
/* Abre backdrop y diálogo con una respuesta rápida y specs separados para geometría y opacidad. */
function open(modal,source){
  if(!modal)return;var token=nextToken(modal),ran=SC.motion&&SC.motion.run&&SC.motion.run(function(deps){
    var gsap=deps.gsap,dialog=modal.querySelector(MS.dialog);if(!dialog)return;var spatial=SC.motion.springSpec('spatial','fast'),effects=SC.motion.springSpec('effects','fast');gsap.killTweensOf([modal,dialog]);origin(dialog,source);gsap.set(modal,{autoAlpha:0,willChange:'opacity'});gsap.set(dialog,{autoAlpha:0,y:CFG.openOffsetY,scale:CFG.openScale,willChange:'transform,opacity'});
    gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){if(!current(modal,token))return;clear(modal,dialog,gsap);}})
      .to(modal,{autoAlpha:1,duration:effects.duration,ease:effects.ease},0)
      .to(dialog,{autoAlpha:1,duration:effects.duration,ease:effects.ease},0)
      .to(dialog,{y:0,scale:1,duration:spatial.duration,ease:spatial.ease,force3D:true},0);
  });
  if(!ran){var dialog=modal.querySelector(MS.dialog);origin(dialog,source);}
}
/* Retargetea un modal ya montado con una respuesta corta y sin reiniciar su contexto. */
function reopen(modal,source){
  if(!modal)return;var token=nextToken(modal),ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,dialog=modal.querySelector(MS.dialog);if(!dialog)return;var spatial=SC.motion.springSpec('spatial','fast'),effects=SC.motion.springSpec('effects','fast');gsap.killTweensOf([modal,dialog]);origin(dialog,source);gsap.set(modal,{willChange:'opacity'});gsap.set(dialog,{willChange:'transform,opacity'});
    gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){if(!current(modal,token))return;clear(modal,dialog,gsap);}})
      .to(modal,{autoAlpha:1,duration:effects.duration,ease:effects.ease},0)
      .to(dialog,{autoAlpha:1,duration:effects.duration,ease:effects.ease},0)
      .to(dialog,{y:0,scale:1,duration:spatial.duration,ease:spatial.ease,force3D:true},0);
  });
  if(!ran){var dialog=modal.querySelector(MS.dialog);origin(dialog,source);modal.style.removeProperty('opacity');modal.style.removeProperty('visibility');}
}
/* El cierre usa la variante rápida para no bloquear la siguiente acción. */
function close(modal,done){
  if(!modal){if(done)done();return;}var token=nextToken(modal);
  if(SC.motion&&SC.motion.reduced&&SC.motion.reduced()){if(done)done();return;}
  var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,dialog=modal.querySelector(MS.dialog);if(!dialog){if(done)done();return;}var spatial=SC.motion.springSpec('spatial','fast'),effects=SC.motion.springSpec('effects','fast');gsap.killTweensOf([modal,dialog]);gsap.set(modal,{willChange:'opacity'});gsap.set(dialog,{willChange:'transform,opacity'});
    gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){if(!current(modal,token))return;if(done)done();}})
      .to(dialog,{y:CFG.closeOffsetY,scale:CFG.closeScale,duration:spatial.duration*.72,ease:spatial.ease,force3D:true},0)
      .to(dialog,{autoAlpha:0,duration:effects.duration,ease:effects.ease},0)
      .to(modal,{autoAlpha:0,duration:effects.duration,ease:effects.ease},effects.duration*.18);
  });
  if(!ran&&done)done();
}
SC.productModalMotion={open:open,reopen:reopen,close:close,cancel:cancel};
})();